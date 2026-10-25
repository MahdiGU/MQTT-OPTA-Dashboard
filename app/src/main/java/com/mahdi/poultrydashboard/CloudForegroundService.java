package com.mahdi.poultrydashboard;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONObject;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public final class CloudForegroundService extends Service {
    static final String ACTION_START = "com.mahdi.poultrydashboard.START_CLOUD_MONITORING";
    static final String ACTION_STOP = "com.mahdi.poultrydashboard.STOP_CLOUD_MONITORING";
    static final String ACTION_PUBLISH = "com.mahdi.poultrydashboard.PUBLISH_COMMAND";
    static final String ACTION_PUBLISH_PRODUCTION = "com.mahdi.poultrydashboard.PUBLISH_PRODUCTION";
    static final String ACTION_DELETE_PRODUCTION = "com.mahdi.poultrydashboard.DELETE_PRODUCTION";
    static final String ACTION_SAVE_CONFIGURATION = "com.mahdi.poultrydashboard.SAVE_CONFIGURATION";
    static final String ACTION_REQUEST_HISTORY = "com.mahdi.poultrydashboard.REQUEST_HISTORY";
    static final String ACTION_REQUEST_PRODUCTION = "com.mahdi.poultrydashboard.REQUEST_PRODUCTION";
    static final String ACTION_REQUEST_CONFIGURATION = "com.mahdi.poultrydashboard.REQUEST_CONFIGURATION";
    static final String ACTION_EVENT = "com.mahdi.poultrydashboard.CLOUD_EVENT";
    static final String EXTRA_USERNAME = "username";
    static final String EXTRA_PASSWORD = "password";
    static final String EXTRA_REMEMBER = "remember";
    static final String EXTRA_PAYLOAD = "payload";
    static final String EXTRA_PRODUCTION_ID = "production_id";
    static final String EXTRA_CHICKEN_COUNT = "chicken_count";
    static final String EXTRA_EVENT_TYPE = "event_type";
    static final String EXTRA_EVENT_DATA = "event_data";

    private static final String MONITOR_CHANNEL = "cloud_monitoring";
    private static final String ALERT_CHANNEL = "temperature_alerts";
    private static final int MONITOR_NOTIFICATION_ID = 1201;
    private static final int TEMPERATURE_NOTIFICATION_ID = 3301;
    private static final long POLL_INTERVAL_MS = 5_000L;
    private static final long STALE_AFTER_MS = 20_000L;
    private static final long ALERT_COOLDOWN_MS = 30L * 60L * 1000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final ExecutorService cloudExecutor = Executors.newSingleThreadExecutor();
    private CredentialStore credentialStore;
    private SharedPreferences statePreferences;
    private SupabaseClient supabaseClient;
    private CredentialStore.Credentials activeCredentials;
    private boolean stopping;
    private boolean signedIn;
    private boolean pollInProgress;
    private boolean hot;
    private String latestSignature = "";

    @Override
    public void onCreate() {
        super.onCreate();
        credentialStore = new CredentialStore(this);
        statePreferences = getSharedPreferences("elmajd_runtime", MODE_PRIVATE);
        supabaseClient = new SupabaseClient();
        createNotificationChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_START : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopMonitoring();
            return START_NOT_STICKY;
        }
        if (ACTION_PUBLISH.equals(action)) {
            publish(intent == null ? null : intent.getStringExtra(EXTRA_PAYLOAD));
            return stickyMode();
        }
        if (ACTION_PUBLISH_PRODUCTION.equals(action)) {
            publishProduction(intent == null ? null : intent.getStringExtra(EXTRA_PAYLOAD));
            return stickyMode();
        }
        if (ACTION_DELETE_PRODUCTION.equals(action)) {
            deleteProduction(intent == null ? -1L : intent.getLongExtra(EXTRA_PRODUCTION_ID, -1L));
            return stickyMode();
        }
        if (ACTION_SAVE_CONFIGURATION.equals(action)) {
            saveConfiguration(intent == null ? -1 : intent.getIntExtra(EXTRA_CHICKEN_COUNT, -1));
            return stickyMode();
        }
        if (ACTION_REQUEST_HISTORY.equals(action)) {
            requestCloudHistory();
            return stickyMode();
        }
        if (ACTION_REQUEST_PRODUCTION.equals(action)) {
            requestProductionHistory();
            return stickyMode();
        }
        if (ACTION_REQUEST_CONFIGURATION.equals(action)) {
            requestConfiguration();
            return stickyMode();
        }

        startForeground(MONITOR_NOTIFICATION_ID, monitoringNotification("Connecting to Supabase..."));
        stopping = false;
        String email = intent == null ? null : intent.getStringExtra(EXTRA_USERNAME);
        String password = intent == null ? null : intent.getStringExtra(EXTRA_PASSWORD);
        boolean remember = intent != null && intent.getBooleanExtra(EXTRA_REMEMBER, false);
        boolean explicitLogin = email != null && password != null;
        if (explicitLogin) {
            activeCredentials = new CredentialStore.Credentials(email.trim(), password);
            if (remember) {
                try {
                    credentialStore.save(activeCredentials);
                    credentialStore.setMonitoringEnabled(true);
                } catch (Exception error) {
                    broadcast("error", "Could not securely save login: " + friendlyError(error));
                }
            } else {
                credentialStore.clear();
            }
        } else {
            activeCredentials = credentialStore.load();
        }

        if (activeCredentials == null
            || activeCredentials.supabaseEmail.isEmpty()
            || activeCredentials.supabasePassword.isEmpty()) {
            broadcast("error", "Supabase email and password are required.");
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        if (!signedIn || explicitLogin) connectCloud();
        else schedulePoll(0L);
        return stickyMode();
    }

    private int stickyMode() {
        return credentialStore.isMonitoringEnabled() ? START_STICKY : START_NOT_STICKY;
    }

    private void connectCloud() {
        handler.removeCallbacks(pollRunnable);
        signedIn = false;
        broadcast("connection", "connecting");
        broadcast("cloud_connection", "connecting");
        updateMonitorNotification("Connecting to Supabase...");
        CredentialStore.Credentials credentials = activeCredentials;
        cloudExecutor.execute(() -> {
            try {
                supabaseClient.signIn(credentials.supabaseEmail, credentials.supabasePassword);
                signedIn = true;
                broadcast("cloud_connection", "online");
                broadcast("connection", "online");
                updateMonitorNotification("Monitoring through Supabase");
                requestProductionHistory();
                requestConfiguration();
                schedulePoll(0L);
            } catch (Exception error) {
                signedIn = false;
                broadcast("cloud_error", friendlyError(error));
                broadcast("connection", "offline");
                updateMonitorNotification("Supabase connection failed");
            }
        });
    }

    private void schedulePoll(long delayMs) {
        if (stopping || !signedIn) return;
        handler.removeCallbacks(pollRunnable);
        handler.postDelayed(pollRunnable, delayMs);
    }

    private final Runnable pollRunnable = () -> {
        if (stopping || !signedIn || pollInProgress) return;
        pollInProgress = true;
        cloudExecutor.execute(() -> {
            try {
                String latest = supabaseClient.readLatest();
                JSONObject payload = new JSONObject(latest);
                if (payload.length() == 0) {
                    broadcast("device_status", "No telemetry");
                } else {
                    String receivedAt = payload.optString("received_at", "");
                    long ageMs = receivedAt.isEmpty()
                        ? Long.MAX_VALUE
                        : Math.max(0L, System.currentTimeMillis() - Instant.parse(receivedAt).toEpochMilli());
                    String brokerStatus = payload.optString("mqtt_status", "unknown");
                    String deviceStatus = ageMs > STALE_AFTER_MS ? "Delayed" : brokerStatus;
                    broadcast("device_status", deviceStatus);
                    broadcast("connection", ageMs > STALE_AFTER_MS ? "delayed" : "online");
                    String signature = payload.optString("device_id") + ":" + payload.optLong("seq")
                        + ":" + receivedAt;
                    if (!signature.equals(latestSignature)) {
                        latestSignature = signature;
                        statePreferences.edit().putString("latest_payload", latest).apply();
                        broadcast("telemetry", latest);
                        handleTemperatureAlert(payload.getJSONObject("i1").optDouble("temp_c"));
                    }
                }
            } catch (Exception error) {
                broadcast("cloud_error", friendlyError(error));
                broadcast("connection", "reconnecting");
            } finally {
                pollInProgress = false;
                schedulePoll(POLL_INTERVAL_MS);
            }
        });
    };

    private void publish(String payload) {
        if (payload == null || payload.trim().isEmpty()) {
            broadcast("publish_error", "Enter a command.");
            return;
        }
        if (!signedIn) {
            broadcast("publish_error", "Supabase is not connected.");
            return;
        }
        String command = payload.trim();
        cloudExecutor.execute(() -> {
            try {
                JSONObject response = new JSONObject(supabaseClient.sendCommand(command));
                broadcast("published", response.optString("payload", command));
            } catch (Exception error) {
                broadcast("publish_error", friendlyError(error));
            }
        });
    }

    private void publishProduction(String payload) {
        if (payload == null || payload.trim().isEmpty()) {
            broadcast("production_error", "Production data is empty.");
            return;
        }
        try {
            JSONObject input = new JSONObject(payload);
            String date = input.getString("date");
            LocalDate.parse(date);
            int stock = input.getInt("stock");
            int sortie = input.getInt("sortie");
            int mortality = input.getInt("mortality");
            if (stock < 0 || sortie < 0 || mortality < 0) {
                throw new IllegalArgumentException("Stock, sortie, and mortality cannot be negative.");
            }
            cloudExecutor.execute(() -> {
                try {
                    supabaseClient.saveProduction(input);
                    broadcast("production_saved", date);
                    requestProductionHistory();
                    requestConfiguration();
                } catch (Exception error) {
                    broadcast("production_error", friendlyError(error));
                }
            });
        } catch (Exception error) {
            broadcast("production_error", friendlyError(error));
        }
    }

    private void deleteProduction(long productionId) {
        if (productionId < 1L) {
            broadcast("production_delete_error", "Invalid production record.");
            return;
        }
        cloudExecutor.execute(() -> {
            try {
                supabaseClient.deleteProduction(productionId);
                broadcast("production_deleted", String.valueOf(productionId));
                requestProductionHistory();
                requestConfiguration();
            } catch (Exception error) {
                broadcast("production_delete_error", friendlyError(error));
            }
        });
    }

    private void saveConfiguration(int chickenCount) {
        if (chickenCount < 0) {
            broadcast("configuration_error", "The actual chicken count cannot be negative.");
            return;
        }
        cloudExecutor.execute(() -> {
            try {
                supabaseClient.saveConfiguration(chickenCount);
                broadcast("configuration_saved", String.valueOf(chickenCount));
                requestConfiguration();
            } catch (Exception error) {
                broadcast("configuration_error", friendlyError(error));
            }
        });
    }

    private void requestCloudHistory() {
        if (!signedIn) return;
        cloudExecutor.execute(() -> {
            try {
                broadcast("history", supabaseClient.readHistory(System.currentTimeMillis() - 43_200_000L));
            } catch (Exception error) {
                broadcast("history_error", friendlyError(error));
            }
        });
    }

    private void requestProductionHistory() {
        if (!signedIn) return;
        cloudExecutor.execute(() -> {
            try {
                broadcast("production_history", supabaseClient.readProduction(90));
            } catch (Exception error) {
                broadcast("production_history_error", friendlyError(error));
            }
        });
    }

    private void requestConfiguration() {
        if (!signedIn) return;
        cloudExecutor.execute(() -> {
            try {
                broadcast("configuration", supabaseClient.readConfiguration());
            } catch (Exception error) {
                broadcast("configuration_error", friendlyError(error));
            }
        });
    }

    private void handleTemperatureAlert(double temperature) {
        long now = System.currentTimeMillis();
        long lastAlert = statePreferences.getLong("last_temperature_alert", 0L);
        boolean isHot = temperature > 33.0;
        if (isHot && (!hot || now - lastAlert >= ALERT_COOLDOWN_MS)) {
            showTemperatureNotification(temperature);
            statePreferences.edit().putLong("last_temperature_alert", now).apply();
        }
        hot = isHot;
    }

    private void stopMonitoring() {
        stopping = true;
        signedIn = false;
        handler.removeCallbacksAndMessages(null);
        credentialStore.setMonitoringEnabled(false);
        broadcast("connection", "stopped");
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    private void broadcast(String type, String data) {
        if ("connection".equals(type)) {
            statePreferences.edit().putString("connection_state", data).apply();
        } else if ("device_status".equals(type)) {
            statePreferences.edit().putString("device_status", data).apply();
        }
        Intent event = new Intent(ACTION_EVENT)
            .setPackage(getPackageName())
            .putExtra(EXTRA_EVENT_TYPE, type)
            .putExtra(EXTRA_EVENT_DATA, data == null ? "" : data);
        sendBroadcast(event);
    }

    private void createNotificationChannels() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        NotificationChannel monitor = new NotificationChannel(
            MONITOR_CHANNEL,
            "Cloud monitoring",
            NotificationManager.IMPORTANCE_LOW
        );
        monitor.setDescription("Keeps the Supabase dashboard synchronized in the background");
        manager.createNotificationChannel(monitor);

        NotificationChannel alert = new NotificationChannel(
            ALERT_CHANNEL,
            "Temperature alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        alert.setDescription("Alerts when poultry-house temperature exceeds 33 C");
        manager.createNotificationChannel(alert);
    }

    private Notification monitoringNotification(String text) {
        Intent launch = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Intent stop = new Intent(this, CloudForegroundService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(
            this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new Notification.Builder(this, MONITOR_CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("ElMajd cloud monitoring")
            .setContentText(text)
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .addAction(new Notification.Action.Builder(null, "Stop monitoring", stopIntent).build())
            .build();
    }

    private void updateMonitorNotification(String text) {
        getSystemService(NotificationManager.class).notify(
            MONITOR_NOTIFICATION_ID,
            monitoringNotification(text)
        );
    }

    private void showTemperatureNotification(double temperature) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        Intent launch = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 2, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Notification notification = new Notification.Builder(this, ALERT_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("High poultry-house temperature")
            .setContentText(String.format(Locale.getDefault(), "Temperature is %.1f C (limit: 33 C)", temperature))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_ALARM)
            .build();
        getSystemService(NotificationManager.class).notify(TEMPERATURE_NOTIFICATION_ID, notification);
    }

    private static String friendlyError(Throwable error) {
        if (error == null) return "Unknown cloud error";
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
            ? error.getClass().getSimpleName()
            : message;
    }

    @Override
    public void onDestroy() {
        stopping = true;
        signedIn = false;
        handler.removeCallbacksAndMessages(null);
        cloudExecutor.shutdownNow();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

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
import android.provider.Settings;

import org.eclipse.paho.client.mqttv3.IMqttActionListener;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.IMqttToken;
import org.eclipse.paho.client.mqttv3.MqttAsyncClient;
import org.eclipse.paho.client.mqttv3.MqttCallbackExtended;
import org.eclipse.paho.client.mqttv3.MqttConnectOptions;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class MqttForegroundService extends Service implements MqttCallbackExtended {
    static final String ACTION_START = "com.mahdi.poultrydashboard.START_MONITORING";
    static final String ACTION_STOP = "com.mahdi.poultrydashboard.STOP_MONITORING";
    static final String ACTION_PUBLISH = "com.mahdi.poultrydashboard.PUBLISH";
    static final String ACTION_EVENT = "com.mahdi.poultrydashboard.MQTT_EVENT";
    static final String EXTRA_USERNAME = "username";
    static final String EXTRA_PASSWORD = "password";
    static final String EXTRA_REMEMBER = "remember";
    static final String EXTRA_PAYLOAD = "payload";
    static final String EXTRA_EVENT_TYPE = "event_type";
    static final String EXTRA_EVENT_DATA = "event_data";

    private static final String BROKER = "wss://s4aa124d.ala.us-east-1.emqxsl.com:8084/mqtt";
    private static final String TELEMETRY_TOPIC = "opta/outputs";
    private static final String STATUS_TOPIC = "opta/status";
    private static final String COMMAND_TOPIC = "opta/cmd";
    private static final String MONITOR_CHANNEL = "mqtt_monitoring";
    private static final String ALERT_CHANNEL = "temperature_alerts";
    private static final int MONITOR_NOTIFICATION_ID = 1201;
    private static final int TEMPERATURE_NOTIFICATION_ID = 3301;
    private static final long ALERT_COOLDOWN_MS = 30L * 60L * 1000L;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private MqttAsyncClient client;
    private MqttConnectOptions options;
    private CredentialStore credentialStore;
    private HistoryDatabase historyDatabase;
    private SharedPreferences statePreferences;
    private CredentialStore.Credentials activeCredentials;
    private boolean connectInProgress;
    private boolean stopping;
    private boolean hot;
    private long retryDelayMs = 3_000L;

    @Override
    public void onCreate() {
        super.onCreate();
        credentialStore = new CredentialStore(this);
        historyDatabase = new HistoryDatabase(this);
        statePreferences = getSharedPreferences("elmajd_runtime", MODE_PRIVATE);
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
            publish(intent.getStringExtra(EXTRA_PAYLOAD));
            return START_STICKY;
        }

        startForeground(MONITOR_NOTIFICATION_ID, monitoringNotification("Connecting to MQTT…"));
        stopping = false;
        String username = intent == null ? null : intent.getStringExtra(EXTRA_USERNAME);
        String password = intent == null ? null : intent.getStringExtra(EXTRA_PASSWORD);
        boolean remember = intent != null && intent.getBooleanExtra(EXTRA_REMEMBER, false);
        boolean explicitLogin = username != null && password != null;
        if (explicitLogin) {
            activeCredentials = new CredentialStore.Credentials(username.trim(), password);
            if (remember) {
                try {
                    credentialStore.save(activeCredentials.username, activeCredentials.password);
                    credentialStore.setMonitoringEnabled(true);
                } catch (Exception error) {
                    broadcast("error", "Could not securely save login: " + error.getMessage());
                }
            } else {
                credentialStore.clear();
            }
        } else {
            activeCredentials = credentialStore.load();
        }

        if (activeCredentials == null || activeCredentials.username.isEmpty() || activeCredentials.password.isEmpty()) {
            broadcast("error", "Username and password are required.");
            stopSelf();
            return START_NOT_STICKY;
        }
        handler.removeCallbacks(reconnectRunnable);
        if (!explicitLogin && client != null && client.isConnected()) {
            broadcast("connection", "online");
            updateMonitorNotification("Monitoring poultry equipment");
            return credentialStore.isMonitoringEnabled() ? START_STICKY : START_NOT_STICKY;
        }
        if (explicitLogin && client != null) {
            try {
                if (client.isConnected()) client.disconnectForcibly(500L, 500L);
                client.close();
            } catch (MqttException ignored) {
                // A fresh client below replaces the old login session.
            }
            client = null;
            connectInProgress = false;
        }
        prepareClient();
        connect();
        return credentialStore.isMonitoringEnabled() ? START_STICKY : START_NOT_STICKY;
    }

    private void prepareClient() {
        try {
            if (client != null && !client.isConnected()) client.close();
            client = new MqttAsyncClient(BROKER, clientId(), new MemoryPersistence());
            client.setCallback(this);
            options = new MqttConnectOptions();
            options.setCleanSession(true);
            options.setConnectionTimeout(12);
            options.setKeepAliveInterval(30);
            options.setUserName(activeCredentials.username);
            options.setPassword(activeCredentials.password.toCharArray());
            options.setAutomaticReconnect(false);
        } catch (MqttException error) {
            broadcast("error", friendlyError(error));
            scheduleReconnect();
        }
    }

    private void connect() {
        if (stopping || client == null || client.isConnected() || connectInProgress) return;
        connectInProgress = true;
        broadcast("connection", "connecting");
        updateMonitorNotification("Connecting to MQTT…");
        try {
            client.connect(options, null, new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                    connectInProgress = false;
                }

                @Override
                public void onFailure(IMqttToken asyncActionToken, Throwable exception) {
                    connectInProgress = false;
                    broadcast("error", friendlyError(exception));
                    scheduleReconnect();
                }
            });
        } catch (MqttException error) {
            connectInProgress = false;
            broadcast("error", friendlyError(error));
            scheduleReconnect();
        }
    }

    private void scheduleReconnect() {
        if (stopping) return;
        handler.removeCallbacks(reconnectRunnable);
        handler.postDelayed(reconnectRunnable, retryDelayMs);
        retryDelayMs = Math.min(60_000L, retryDelayMs * 2L);
        updateMonitorNotification("Connection lost · retrying");
        broadcast("connection", "reconnecting");
    }

    private final Runnable reconnectRunnable = () -> {
        if (client == null) prepareClient();
        connect();
    };

    @Override
    public void connectComplete(boolean reconnect, String serverURI) {
        retryDelayMs = 3_000L;
        try {
            client.subscribe(new String[]{TELEMETRY_TOPIC, STATUS_TOPIC}, new int[]{0, 0});
            broadcast("connection", "online");
            updateMonitorNotification("Monitoring poultry equipment");
        } catch (MqttException error) {
            broadcast("error", "Subscription failed: " + friendlyError(error));
        }
    }

    @Override
    public void connectionLost(Throwable cause) {
        connectInProgress = false;
        broadcast("connection", "reconnecting");
        scheduleReconnect();
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        String body = new String(message.getPayload(), StandardCharsets.UTF_8);
        if (STATUS_TOPIC.equals(topic)) {
            broadcast("device_status", body.trim().isEmpty() ? "Unknown" : body.trim());
            return;
        }
        if (!TELEMETRY_TOPIC.equals(topic)) return;
        try {
            JSONObject payload = new JSONObject(body);
            double temperature = payload.getJSONObject("i1").getDouble("temp_c");
            payload.getJSONObject("outputs");
            payload.getJSONObject("leds");
            payload.getJSONObject("inputs");
            long now = System.currentTimeMillis();
            historyDatabase.record(payload, now);
            statePreferences.edit().putString("latest_payload", body).apply();
            broadcast("telemetry", body);
            handleTemperatureAlert(temperature, now);
        } catch (Exception error) {
            broadcast("error", "Invalid telemetry: " + error.getMessage());
        }
    }

    private void handleTemperatureAlert(double temperature, long now) {
        long lastAlert = statePreferences.getLong("last_temperature_alert", 0L);
        boolean isHot = temperature > 33.0;
        if (isHot && (!hot || now - lastAlert >= ALERT_COOLDOWN_MS)) {
            showTemperatureNotification(temperature);
            statePreferences.edit().putLong("last_temperature_alert", now).apply();
        }
        hot = isHot;
    }

    private void publish(String payload) {
        if (payload == null || payload.trim().isEmpty()) {
            broadcast("publish_error", "Enter a command.");
            return;
        }
        if (client == null || !client.isConnected()) {
            broadcast("publish_error", "MQTT is not connected.");
            return;
        }
        try {
            MqttMessage message = new MqttMessage(payload.getBytes(StandardCharsets.UTF_8));
            message.setQos(0);
            message.setRetained(false);
            client.publish(COMMAND_TOPIC, message, payload, new IMqttActionListener() {
                @Override
                public void onSuccess(IMqttToken asyncActionToken) {
                    broadcast("published", String.valueOf(asyncActionToken.getUserContext()));
                }

                @Override
                public void onFailure(IMqttToken asyncActionToken, Throwable exception) {
                    broadcast("publish_error", friendlyError(exception));
                }
            });
        } catch (MqttException error) {
            broadcast("publish_error", friendlyError(error));
        }
    }

    @Override
    public void deliveryComplete(IMqttDeliveryToken token) {
        // Command result is reported by the publish action listener.
    }

    private void stopMonitoring() {
        stopping = true;
        handler.removeCallbacks(reconnectRunnable);
        credentialStore.setMonitoringEnabled(false);
        if (client != null) {
            try {
                if (client.isConnected()) client.disconnectForcibly(1_000L, 1_000L);
                client.close();
            } catch (MqttException ignored) {
                // The process is stopping; no further recovery is needed.
            }
        }
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

    private String clientId() {
        String androidId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        if (androidId == null) androidId = Long.toHexString(System.nanoTime());
        String suffix = androidId.replaceAll("[^A-Za-z0-9]", "");
        if (suffix.length() > 12) suffix = suffix.substring(suffix.length() - 12);
        return "elmajd-android-" + suffix;
    }

    private void createNotificationChannels() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        NotificationChannel monitor = new NotificationChannel(
            MONITOR_CHANNEL,
            "Background monitoring",
            NotificationManager.IMPORTANCE_LOW
        );
        monitor.setDescription("Keeps MQTT monitoring active when ElMajd Automation is closed");
        manager.createNotificationChannel(monitor);

        NotificationChannel alert = new NotificationChannel(
            ALERT_CHANNEL,
            "Temperature alerts",
            NotificationManager.IMPORTANCE_HIGH
        );
        alert.setDescription("Alerts when poultry-house temperature exceeds 33 °C");
        manager.createNotificationChannel(alert);
    }

    private Notification monitoringNotification(String text) {
        Intent launch = new Intent(this, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            this, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        Intent stop = new Intent(this, MqttForegroundService.class).setAction(ACTION_STOP);
        PendingIntent stopIntent = PendingIntent.getService(
            this, 1, stop, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new Notification.Builder(this, MONITOR_CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("ElMajd monitoring is active")
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
            .setContentText(String.format(Locale.getDefault(), "Temperature is %.1f °C (limit: 33 °C)", temperature))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_ALARM)
            .build();
        getSystemService(NotificationManager.class).notify(TEMPERATURE_NOTIFICATION_ID, notification);
    }

    private static String friendlyError(Throwable error) {
        if (error == null) return "Unknown MQTT error";
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
            ? error.getClass().getSimpleName()
            : message;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        historyDatabase.close();
        if (client != null) {
            try {
                if (client.isConnected()) client.disconnectForcibly(500L, 500L);
                client.close();
            } catch (MqttException ignored) {
                // Android is destroying the service; START_STICKY will recreate it when enabled.
            }
        }
        if (!stopping && credentialStore.isMonitoringEnabled()) {
            broadcast("connection", "restarting");
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

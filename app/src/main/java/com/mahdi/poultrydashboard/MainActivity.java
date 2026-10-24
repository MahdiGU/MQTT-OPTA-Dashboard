package com.mahdi.poultrydashboard;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final int NOTIFICATION_PERMISSION_REQUEST = 33;
    private WebView dashboard;
    private boolean receiverRegistered;

    private final BroadcastReceiver mqttEvents = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String type = intent.getStringExtra(MqttForegroundService.EXTRA_EVENT_TYPE);
            String data = intent.getStringExtra(MqttForegroundService.EXTRA_EVENT_DATA);
            sendEventToDashboard(type, data);
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestNotificationPermission();

        dashboard = new WebView(this);
        WebSettings settings = dashboard.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        dashboard.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                dispatchCurrentState();
            }
        });
        dashboard.setWebChromeClient(new WebChromeClient());
        dashboard.addJavascriptInterface(new NativeBridge(), "ElMajdNative");
        setContentView(dashboard);

        if (savedInstanceState == null) {
            dashboard.loadUrl("file:///android_asset/index.html");
        } else {
            dashboard.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onStart() {
        super.onStart();
        IntentFilter filter = new IntentFilter(MqttForegroundService.ACTION_EVENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(mqttEvents, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(mqttEvents, filter);
        }
        receiverRegistered = true;
        dispatchCurrentState();
    }

    @Override
    protected void onStop() {
        if (receiverRegistered) {
            unregisterReceiver(mqttEvents);
            receiverRegistered = false;
        }
        super.onStop();
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private void startMonitoring(String username, String password, boolean remember) {
        Intent service = new Intent(this, MqttForegroundService.class)
            .setAction(MqttForegroundService.ACTION_START)
            .putExtra(MqttForegroundService.EXTRA_USERNAME, username)
            .putExtra(MqttForegroundService.EXTRA_PASSWORD, password)
            .putExtra(MqttForegroundService.EXTRA_REMEMBER, remember);
        startForegroundService(service);
    }

    private void startSavedMonitoring() {
        Intent service = new Intent(this, MqttForegroundService.class)
            .setAction(MqttForegroundService.ACTION_START);
        startForegroundService(service);
    }

    private void dispatchCurrentState() {
        if (dashboard == null) return;
        android.content.SharedPreferences state = getSharedPreferences("elmajd_runtime", MODE_PRIVATE);
        String connection = state.getString("connection_state", null);
        String deviceStatus = state.getString("device_status", null);
        String latest = state.getString("latest_payload", null);
        if (connection != null) sendEventToDashboard("connection", connection);
        if (deviceStatus != null) sendEventToDashboard("device_status", deviceStatus);
        if (latest != null) sendEventToDashboard("telemetry", latest);
    }

    private void sendEventToDashboard(String type, String data) {
        if (dashboard == null || type == null) return;
        String script = "window.elMajdNativeEvent&&window.elMajdNativeEvent("
            + JSONObject.quote(type) + "," + JSONObject.quote(data == null ? "" : data) + ")";
        dashboard.post(() -> dashboard.evaluateJavascript(script, null));
    }

    private final class NativeBridge {
        @JavascriptInterface
        public boolean hasSavedLogin() {
            return new CredentialStore(MainActivity.this).hasSavedCredentials();
        }

        @JavascriptInterface
        public String getSavedUsername() {
            return new CredentialStore(MainActivity.this).savedUsername();
        }

        @JavascriptInterface
        public void connect(String username, String password, boolean remember) {
            if (username == null || username.trim().isEmpty() || password == null || password.isEmpty()) {
                sendEventToDashboard("error", "Username and password are required.");
                return;
            }
            startMonitoring(username.trim(), password, remember);
        }

        @JavascriptInterface
        public void resumeSavedMonitoring() {
            if (new CredentialStore(MainActivity.this).hasSavedCredentials()) startSavedMonitoring();
        }

        @JavascriptInterface
        public void publish(String payload) {
            Intent service = new Intent(MainActivity.this, MqttForegroundService.class)
                .setAction(MqttForegroundService.ACTION_PUBLISH)
                .putExtra(MqttForegroundService.EXTRA_PAYLOAD, payload);
            startService(service);
        }

        @JavascriptInterface
        public void publishProduction(String payload) {
            Intent service = new Intent(MainActivity.this, MqttForegroundService.class)
                .setAction(MqttForegroundService.ACTION_PUBLISH_PRODUCTION)
                .putExtra(MqttForegroundService.EXTRA_PAYLOAD, payload);
            startService(service);
        }

        @JavascriptInterface
        public String getHistory() {
            HistoryDatabase database = new HistoryDatabase(MainActivity.this);
            try {
                return database.readLastTwelveHours(System.currentTimeMillis());
            } finally {
                database.close();
            }
        }

        @JavascriptInterface
        public void signOut() {
            new CredentialStore(MainActivity.this).clear();
            Intent stop = new Intent(MainActivity.this, MqttForegroundService.class)
                .setAction(MqttForegroundService.ACTION_STOP);
            startService(stop);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        dashboard.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (dashboard.canGoBack()) dashboard.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        dashboard.destroy();
        super.onDestroy();
    }
}

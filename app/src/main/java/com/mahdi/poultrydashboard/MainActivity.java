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

    private final BroadcastReceiver cloudEvents = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String type = intent.getStringExtra(CloudForegroundService.EXTRA_EVENT_TYPE);
            String data = intent.getStringExtra(CloudForegroundService.EXTRA_EVENT_DATA);
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
        IntentFilter filter = new IntentFilter(CloudForegroundService.ACTION_EVENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(cloudEvents, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(cloudEvents, filter);
        }
        receiverRegistered = true;
        dispatchCurrentState();
    }

    @Override
    protected void onStop() {
        if (receiverRegistered) {
            unregisterReceiver(cloudEvents);
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

    private void startMonitoring(
        String supabaseEmail,
        String supabasePassword,
        boolean remember
    ) {
        Intent service = new Intent(this, CloudForegroundService.class)
            .setAction(CloudForegroundService.ACTION_START)
            .putExtra(CloudForegroundService.EXTRA_USERNAME, supabaseEmail)
            .putExtra(CloudForegroundService.EXTRA_PASSWORD, supabasePassword)
            .putExtra(CloudForegroundService.EXTRA_REMEMBER, remember);
        startForegroundService(service);
    }

    private void startSavedMonitoring() {
        Intent service = new Intent(this, CloudForegroundService.class)
            .setAction(CloudForegroundService.ACTION_START);
        startForegroundService(service);
    }

    private void dispatchCurrentState() {
        if (dashboard == null) return;
        android.content.SharedPreferences state = getSharedPreferences("elmajd_runtime", MODE_PRIVATE);
        String connection = state.getString("connection_state", null);
        String deviceStatus = state.getString("device_status", null);
        String latest = state.getString("latest_payload", null);
        String productionHistory = state.getString("production_history", null);
        String configuration = state.getString("configuration", null);
        if (connection != null) sendEventToDashboard("connection", connection);
        if (deviceStatus != null) sendEventToDashboard("device_status", deviceStatus);
        if (latest != null) sendEventToDashboard("telemetry", latest);
        if (productionHistory != null) sendEventToDashboard("production_history", productionHistory);
        if (configuration != null) sendEventToDashboard("configuration", configuration);
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
        public String getSavedSupabaseEmail() {
            return new CredentialStore(MainActivity.this).savedSupabaseEmail();
        }

        @JavascriptInterface
        public void connect(
            String supabaseEmail,
            String supabasePassword,
            boolean remember
        ) {
            if (supabaseEmail == null || supabaseEmail.trim().isEmpty()
                || supabasePassword == null || supabasePassword.isEmpty()) {
                sendEventToDashboard("error", "Supabase email and password are required.");
                return;
            }
            startMonitoring(
                supabaseEmail.trim(),
                supabasePassword,
                remember
            );
        }

        @JavascriptInterface
        public void resumeSavedMonitoring() {
            if (new CredentialStore(MainActivity.this).hasSavedCredentials()) startSavedMonitoring();
        }

        @JavascriptInterface
        public void publish(String payload) {
            Intent service = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_PUBLISH)
                .putExtra(CloudForegroundService.EXTRA_PAYLOAD, payload);
            startService(service);
        }

        @JavascriptInterface
        public void publishProduction(String payload) {
            Intent service = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_PUBLISH_PRODUCTION)
                .putExtra(CloudForegroundService.EXTRA_PAYLOAD, payload);
            startService(service);
        }

        @JavascriptInterface
        public void deleteProduction(long productionId) {
            Intent service = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_DELETE_PRODUCTION)
                .putExtra(CloudForegroundService.EXTRA_PRODUCTION_ID, productionId);
            startService(service);
        }

        @JavascriptInterface
        public void saveConfiguration(int chickenCount) {
            Intent service = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_SAVE_CONFIGURATION)
                .putExtra(CloudForegroundService.EXTRA_CHICKEN_COUNT, chickenCount);
            startService(service);
        }

        @JavascriptInterface
        public String getHistory() {
            return "[]";
        }

        @JavascriptInterface
        public void requestCloudHistory() {
            Intent service = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_REQUEST_HISTORY);
            startService(service);
        }

        @JavascriptInterface
        public void requestProductionHistory() {
            Intent service = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_REQUEST_PRODUCTION);
            startService(service);
        }

        @JavascriptInterface
        public void requestConfiguration() {
            Intent service = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_REQUEST_CONFIGURATION);
            startService(service);
        }

        @JavascriptInterface
        public void signOut() {
            new CredentialStore(MainActivity.this).clear();
            Intent stop = new Intent(MainActivity.this, CloudForegroundService.class)
                .setAction(CloudForegroundService.ACTION_STOP);
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

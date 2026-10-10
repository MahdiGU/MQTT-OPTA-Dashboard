package com.mahdi.poultrydashboard;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Build;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
    private static final String ALERT_CHANNEL = "temperature_alerts";
    private static final int NOTIFICATION_PERMISSION_REQUEST = 33;
    private WebView dashboard;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        createNotificationChannel();
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

        dashboard.setWebViewClient(new WebViewClient());
        dashboard.setWebChromeClient(new WebChromeClient());
        dashboard.addJavascriptInterface(new NativeBridge(), "ElMajdNative");
        setContentView(dashboard);

        if (savedInstanceState == null) {
            dashboard.loadUrl("file:///android_asset/index.html");
        } else {
            dashboard.restoreState(savedInstanceState);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                ALERT_CHANNEL,
                "Temperature alerts",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alerts when poultry-house temperature exceeds 33 °C");
            getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
    }

    private void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, NOTIFICATION_PERMISSION_REQUEST);
        }
    }

    private final class NativeBridge {
        @JavascriptInterface
        public void notifyHighTemperature(double temperature) {
            runOnUiThread(() -> showTemperatureNotification(temperature));
        }
    }

    private void showTemperatureNotification(double temperature) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this,
            0,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        android.app.Notification notification = new android.app.Notification.Builder(this, ALERT_CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("High poultry-house temperature")
            .setContentText(String.format(java.util.Locale.getDefault(), "Temperature is %.1f °C (limit: 33 °C)", temperature))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setCategory(android.app.Notification.CATEGORY_ALARM)
            .build();
        getSystemService(NotificationManager.class).notify(3301, notification);
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        dashboard.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    public void onBackPressed() {
        if (dashboard.canGoBack()) {
            dashboard.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        dashboard.destroy();
        super.onDestroy();
    }
}

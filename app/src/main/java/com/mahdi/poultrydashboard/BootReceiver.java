package com.mahdi.poultrydashboard;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public final class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        CredentialStore store = new CredentialStore(context);
        if (!store.isMonitoringEnabled() || !store.hasSavedCredentials()) return;
        Intent service = new Intent(context, CloudForegroundService.class)
            .setAction(CloudForegroundService.ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(service);
        } else {
            context.startService(service);
        }
    }
}

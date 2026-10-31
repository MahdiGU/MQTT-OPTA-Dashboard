package com.mahdi.poultrydashboard;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public final class AlarmMessagingService extends FirebaseMessagingService {
    @Override public void onNewToken(String token){PushRegistration.tokenChanged(this,token);}
    @Override public void onMessageReceived(RemoteMessage message){
        if(!PushRegistration.active(this)||!PushRegistration.permitted(this))return;
        Map<String,String> data=message.getData();String delivery=data.get("delivery_key"),event=data.get("event_id");
        if(!PushRegistration.prefs(this).getString("bound_user","").equals(data.get("recipient_id")))return;
        if(delivery==null||event==null)return;
        SharedPreferences seen=getSharedPreferences("elmajd_push_seen",MODE_PRIVATE);
        if(seen.contains(delivery))return;
        NotificationManager manager=getSystemService(NotificationManager.class);
        manager.createNotificationChannel(new NotificationChannel("server_alarms","Farm server alarms",NotificationManager.IMPORTANCE_HIGH));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class)
            .putExtra("open_alarms",true).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new Notification.Builder(this,"server_alarms")
            .setSmallIcon(android.R.drawable.ic_dialog_alert).setContentTitle(data.getOrDefault("title","ElMAJD alarm"))
            .setContentText(data.getOrDefault("body","Open the app for details"))
            .setStyle(new Notification.BigTextStyle().bigText(data.getOrDefault("body","")))
            .setContentIntent(open).setAutoCancel(true).setCategory(Notification.CATEGORY_ALARM).build();
        manager.notify(event.hashCode(),notification);
        SharedPreferences.Editor edit=seen.edit();long cutoff=System.currentTimeMillis()-7L*86400000L;
        for(Map.Entry<String,?> entry:seen.getAll().entrySet())if(entry.getValue() instanceof Long && (Long)entry.getValue()<cutoff)edit.remove(entry.getKey());
        edit.putLong(delivery,System.currentTimeMillis()).apply();
    }
}

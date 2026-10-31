package com.mahdi.poultrydashboard;

import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.function.Consumer;

final class PushRegistration {
    static SharedPreferences prefs(Context context) { return context.getSharedPreferences("elmajd_push",Context.MODE_PRIVATE); }
    static synchronized String installation(Context context) {
        String id=prefs(context).getString("installation",null);
        if(id==null){id=UUID.randomUUID().toString();prefs(context).edit().putString("installation",id).commit();}
        return id;
    }
    static boolean permitted(Context context){return context.getSystemService(NotificationManager.class).areNotificationsEnabled();}
    static void activate(Context context){prefs(context).edit().putBoolean("allowed",true).apply();}
    static void deactivate(Context context){prefs(context).edit().putBoolean("allowed",false).putBoolean("registered",false).remove("bound_user").apply();}
    static boolean active(Context context){return prefs(context).getBoolean("allowed",false);}
    static boolean ready(Context context){return active(context)&&permitted(context)&&prefs(context).getBoolean("registered",false);}

    static void sync(Context context,SupabaseClient client,ExecutorService executor,Consumer<String> status){
        status.accept("Registering with Firebase...");
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task->{
            if(!active(context)||executor.isShutdown())return;
            if(!task.isSuccessful()){prefs(context).edit().putBoolean("registered",false).apply();status.accept("Firebase token unavailable; check Google Play services and network");return;}
            String token=task.getResult();prefs(context).edit().putString("token",token).apply();
            try{executor.execute(()->{
                if(!active(context))return;
                try{client.registerPush(installation(context),token,permitted(context));if(!active(context))return;prefs(context).edit().putBoolean("registered",true).putString("bound_user",client.pushUserId()).apply();status.accept(permitted(context)?"Registered — notifications enabled":"Registered — allow notifications in Android settings");}
                catch(Exception error){prefs(context).edit().putBoolean("registered",false).apply();status.accept("Phone registration failed — sign in again or retry");}
            });}catch(java.util.concurrent.RejectedExecutionException ignored){/* Service has stopped. */}
        });
    }
    static void tokenChanged(Context context,String token){
        prefs(context).edit().putString("token",token).apply();
        CredentialStore.Credentials login=new CredentialStore(context).load();
        if(!active(context)||login==null)return;
        new Thread(()->{
            try{
                SupabaseClient client=new SupabaseClient();client.signIn(login.supabaseEmail,login.supabasePassword);
                if(active(context)&&login.supabaseEmail.equals(new CredentialStore(context).savedSupabaseEmail())){
                    client.registerPush(installation(context),token,permitted(context));
                    if(active(context))prefs(context).edit().putString("bound_user",client.pushUserId()).apply();
                }
            }catch(Exception ignored){/* Next signed-in reconciliation retries. */}
        },"elmajd-push-token").start();
    }
}

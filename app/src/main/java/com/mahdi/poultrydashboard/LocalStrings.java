package com.mahdi.poultrydashboard;
import android.content.Context;
final class LocalStrings {
    static String language(Context context){return context.getSharedPreferences("elmajd_settings",Context.MODE_PRIVATE).getString("language","fr");}
    static String text(Context context,String source){
        if(!"fr".equals(language(context)))return source;
        switch(source){
            case "Cloud monitoring": return "Surveillance de l’élevage";
            case "Temperature alerts": return "Alertes de température";
            case "Farm server alarms": return "Alarmes serveur de l’élevage";
            case "ElMajd cloud monitoring": return "ElMAJD — surveillance connectée";
            case "Stop monitoring": return "Arrêter la surveillance";
            case "High poultry-house temperature": return "Température élevée du bâtiment";
            case "Connecting to Supabase...": return "Connexion à Supabase…";
            case "Starting live Supabase updates...": return "Démarrage des mesures en direct…";
            case "Live Supabase updates active": return "Mesures en direct actives";
            case "Supabase connection failed": return "Échec de la connexion à Supabase";
            case "Keeps the Supabase dashboard synchronized in the background": return "Synchronise les données en arrière-plan";
            case "Local fallback alerts at the last synchronized critical threshold": return "Alertes locales de secours au dernier seuil critique synchronisé";
            default:return source;
        }
    }
}

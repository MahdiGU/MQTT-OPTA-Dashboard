package com.mahdi.poultrydashboard;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

final class CredentialStore {
    static final class Credentials {
        final String supabaseEmail;
        final String supabasePassword;
        final String mqttUsername;
        final String mqttPassword;
        final String mqttClientId;

        Credentials(
            String supabaseEmail,
            String supabasePassword,
            String mqttUsername,
            String mqttPassword,
            String mqttClientId
        ) {
            this.supabaseEmail = supabaseEmail;
            this.supabasePassword = supabasePassword;
            this.mqttUsername = mqttUsername;
            this.mqttPassword = mqttPassword;
            this.mqttClientId = mqttClientId;
        }
    }

    private static final String PREFS = "elmajd_secure_state";
    private static final String KEY_ALIAS = "elmajd_mqtt_credentials";
    private static final String ENCRYPTED = "credentials";
    private static final String MONITORING = "monitoring_enabled";
    private final SharedPreferences preferences;

    CredentialStore(Context context) {
        preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    void save(Credentials credentials) throws Exception {
        JSONObject json = new JSONObject()
            .put("supabase_email", credentials.supabaseEmail)
            .put("supabase_password", credentials.supabasePassword)
            .put("mqtt_username", credentials.mqttUsername)
            .put("mqtt_password", credentials.mqttPassword)
            .put("mqtt_client_id", credentials.mqttClientId);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
        byte[] encrypted = cipher.doFinal(json.toString().getBytes(StandardCharsets.UTF_8));
        String value = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + "."
            + Base64.encodeToString(encrypted, Base64.NO_WRAP);
        preferences.edit().putString(ENCRYPTED, value).apply();
    }

    Credentials load() {
        String value = preferences.getString(ENCRYPTED, null);
        if (value == null) return null;
        try {
            String[] parts = value.split("\\.", 2);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(),
                new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
            String plain = new String(
                cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)),
                StandardCharsets.UTF_8
            );
            JSONObject json = new JSONObject(plain);
            return new Credentials(
                json.getString("supabase_email"),
                json.getString("supabase_password"),
                json.getString("mqtt_username"),
                json.getString("mqtt_password"),
                json.getString("mqtt_client_id")
            );
        } catch (Exception error) {
            clear();
            return null;
        }
    }

    String savedSupabaseEmail() {
        Credentials credentials = load();
        return credentials == null ? "" : credentials.supabaseEmail;
    }

    String savedMqttUsername() {
        Credentials credentials = load();
        return credentials == null ? "OPTAMG888" : credentials.mqttUsername;
    }

    String savedMqttClientId() {
        Credentials credentials = load();
        return credentials == null ? "" : credentials.mqttClientId;
    }

    boolean hasSavedCredentials() {
        return load() != null;
    }

    void clear() {
        preferences.edit().remove(ENCRYPTED).putBoolean(MONITORING, false).apply();
    }

    void setMonitoringEnabled(boolean enabled) {
        preferences.edit().putBoolean(MONITORING, enabled).apply();
    }

    boolean isMonitoringEnabled() {
        return preferences.getBoolean(MONITORING, false);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance("AndroidKeyStore");
        keyStore.load(null);
        java.security.Key existing = keyStore.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .build());
        return generator.generateKey();
    }
}

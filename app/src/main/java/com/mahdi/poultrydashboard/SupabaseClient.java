package com.mahdi.poultrydashboard;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

final class SupabaseClient {
    static final String BASE_URL = "https://zlmaombpfdznambrgqiv.supabase.co";
    static final String PUBLISHABLE_KEY = "sb_publishable_qiP1Lnh1iQ32EUEFKxRCiA_F8XiQ1uj";
    private static final String FARM_SLUG = "elmajd-poultry";

    private String email;
    private String password;
    private String accessToken;
    private String refreshToken;
    private String userId;
    private String farmId;
    private long expiresAtMs;

    void signIn(String email, String password) throws Exception {
        this.email = email;
        this.password = password;
        JSONObject body = new JSONObject().put("email", email).put("password", password);
        applySession(new JSONObject(request(
            "POST",
            "/auth/v1/token?grant_type=password",
            body.toString(),
            null,
            null
        )));
        loadFarm();
    }

    String readLatest() throws Exception {
        ensureSession();
        String path = "/rest/v1/device_latest?select=device_id,mqtt_status,received_at,seq,up_s,rssi,volts,temp_c,sensor_fault,d0,d1,d2,d3,l0,l1,l2,l3,i2,i3,i4,i5,i6,i7,i8"
            + "&farm_id=eq." + farmId + "&order=received_at.desc&limit=1";
        JSONArray rows = new JSONArray(request("GET", path, null, null, accessToken));
        if (rows.length() == 0) return "{}";
        return payloadFromLatestRow(rows.getJSONObject(0));
    }

    static String realtimeUrl() {
        return BASE_URL.replaceFirst("^https", "wss")
            + "/realtime/v1/websocket?apikey=" + PUBLISHABLE_KEY + "&vsn=1.0.0";
    }

    static String payloadFromLatestRow(JSONObject row) throws Exception {
        return new JSONObject()
            .put("device_id", row.optString("device_id", "arduino-opta"))
            .put("mqtt_status", row.optString("mqtt_status", "unknown"))
            .put("received_at", row.optString("received_at", ""))
            .put("seq", row.optLong("seq"))
            .put("up_s", row.optLong("up_s"))
            .put("rssi", row.optInt("rssi"))
            .put("outputs", new JSONObject()
                .put("D0", bit(row, "d0"))
                .put("D1", bit(row, "d1"))
                .put("D2", bit(row, "d2"))
                .put("D3", bit(row, "d3")))
            .put("leds", new JSONObject()
                .put("L0", bit(row, "l0"))
                .put("L1", bit(row, "l1"))
                .put("L2", bit(row, "l2"))
                .put("L3", bit(row, "l3")))
            .put("i1", new JSONObject()
                .put("volts", row.optDouble("volts"))
                .put("temp_c", row.optDouble("temp_c"))
                .put("fault", bit(row, "sensor_fault")))
            .put("inputs", new JSONObject()
                .put("I2", bit(row, "i2"))
                .put("I3", bit(row, "i3"))
                .put("I4", bit(row, "i4"))
                .put("I5", bit(row, "i5"))
                .put("I6", bit(row, "i6"))
                .put("I7", bit(row, "i7"))
                .put("I8", bit(row, "i8")))
            .toString();
    }

    RealtimeSession realtimeSession() throws Exception {
        ensureSession();
        return new RealtimeSession(accessToken, farmId, expiresAtMs);
    }

    String sendCommand(String payload) throws Exception {
        ensureSession();
        return request(
            "POST",
            "/functions/v1/send-mqtt-command",
            new JSONObject().put("payload", payload).toString(),
            null,
            accessToken
        );
    }

    void saveProduction(JSONObject input) throws Exception {
        ensureSession();
        request(
            "POST",
            "/rest/v1/rpc/record_daily_production",
            new JSONObject()
                .put("target_farm", farmId)
                .put("target_date", input.getString("date"))
                .put("stock_count", input.getInt("stock"))
                .put("sortie_count", input.getInt("sortie"))
                .put("mortality_count", input.getInt("mortality"))
                .toString(),
            null,
            accessToken
        );
    }

    void deleteProduction(long productionId) throws Exception {
        ensureSession();
        request(
            "POST",
            "/rest/v1/rpc/delete_daily_production",
            new JSONObject()
                .put("target_farm", farmId)
                .put("production_id", productionId)
                .toString(),
            null,
            accessToken
        );
    }

    void saveConfiguration(int chickenCount) throws Exception {
        ensureSession();
        JSONObject configuration = new JSONObject()
            .put("farm_id", farmId)
            .put("chicken_count", chickenCount)
            .put("updated_by", userId);
        request(
            "POST",
            "/rest/v1/flock_settings?on_conflict=farm_id",
            configuration.toString(),
            "resolution=merge-duplicates,return=minimal",
            accessToken
        );
    }

    String readConfiguration() throws Exception {
        ensureSession();
        String response = request(
            "GET",
            "/rest/v1/flock_settings?select=chicken_count,updated_at&farm_id=eq." + farmId + "&limit=1",
            null,
            null,
            accessToken
        );
        JSONArray rows = new JSONArray(response);
        return rows.length() == 0 ? "{}" : rows.getJSONObject(0).toString();
    }

    String readHistory(long sinceMs) throws Exception {
        ensureSession();
        String since = URLEncoder.encode(Instant.ofEpochMilli(sinceMs).toString(), StandardCharsets.UTF_8);
        String path = "/rest/v1/telemetry?select=recorded_at,temp_c,i2,i3,i4,i5,i6,i7"
            + "&farm_id=eq." + farmId + "&recorded_at=gte." + since + "&order=recorded_at.asc";
        JSONArray rows = new JSONArray(request("GET", path, null, null, accessToken));
        JSONArray result = new JSONArray();
        for (int index = 0; index < rows.length(); index++) {
            JSONObject row = rows.getJSONObject(index);
            result.put(new JSONObject()
                .put("t", Instant.parse(row.getString("recorded_at")).toEpochMilli())
                .put("temp", row.optDouble("temp_c"))
                .put("I2", row.optBoolean("i2") ? 1 : 0)
                .put("I3", row.optBoolean("i3") ? 1 : 0)
                .put("I4", row.optBoolean("i4") ? 1 : 0)
                .put("I5", row.optBoolean("i5") ? 1 : 0)
                .put("I6", row.optBoolean("i6") ? 1 : 0)
                .put("I7", row.optBoolean("i7") ? 1 : 0));
        }
        return result.toString();
    }

    String readProduction(int limit) throws Exception {
        ensureSession();
        String path = "/rest/v1/daily_production?select=id,production_date,stock,sortie,eggs,mortality,production_rate,chicken_count,updated_at"
            + "&farm_id=eq." + farmId + "&order=production_date.desc&limit=" + limit;
        return request("GET", path, null, null, accessToken);
    }

    private static int bit(JSONObject row, String key) {
        return row.optBoolean(key, false) ? 1 : 0;
    }

    static final class RealtimeSession {
        final String accessToken;
        final String farmId;
        final long expiresAtMs;

        private RealtimeSession(String accessToken, String farmId, long expiresAtMs) {
            this.accessToken = accessToken;
            this.farmId = farmId;
            this.expiresAtMs = expiresAtMs;
        }
    }

    private void ensureSession() throws Exception {
        if (email == null || password == null) throw new IllegalStateException("Cloud login is not available.");
        if (accessToken == null) {
            signIn(email, password);
            return;
        }
        if (System.currentTimeMillis() < expiresAtMs - 5L * 60L * 1000L) return;
        if (refreshToken == null) {
            signIn(email, password);
            return;
        }
        try {
            JSONObject body = new JSONObject().put("refresh_token", refreshToken);
            applySession(new JSONObject(request(
                "POST",
                "/auth/v1/token?grant_type=refresh_token",
                body.toString(),
                null,
                null
            )));
        } catch (Exception ignored) {
            signIn(email, password);
        }
    }

    private void applySession(JSONObject response) throws Exception {
        accessToken = response.getString("access_token");
        refreshToken = response.optString("refresh_token", null);
        userId = response.getJSONObject("user").getString("id");
        long expiresIn = response.optLong("expires_in", 3600L);
        expiresAtMs = System.currentTimeMillis() + expiresIn * 1000L;
    }

    private void loadFarm() throws Exception {
        String path = "/rest/v1/farms?select=id,name,slug&slug=eq." + FARM_SLUG + "&limit=1";
        JSONArray farms = new JSONArray(request("GET", path, null, null, accessToken));
        if (farms.length() == 0) {
            throw new IllegalStateException("This account is not assigned to the ElMajd farm.");
        }
        farmId = farms.getJSONObject(0).getString("id");
    }

    private String request(
        String method,
        String path,
        String body,
        String prefer,
        String bearerToken
    ) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) URI.create(BASE_URL + path).toURL().openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(12_000);
        connection.setReadTimeout(20_000);
        connection.setRequestProperty("apikey", PUBLISHABLE_KEY);
        connection.setRequestProperty("Accept", "application/json");
        if (bearerToken != null) connection.setRequestProperty("Authorization", "Bearer " + bearerToken);
        if (prefer != null) connection.setRequestProperty("Prefer", prefer);
        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json");
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        int status = connection.getResponseCode();
        InputStream stream = status >= 200 && status < 300
            ? connection.getInputStream()
            : connection.getErrorStream();
        String response = readAll(stream);
        connection.disconnect();
        if (status < 200 || status >= 300) {
            String message = response;
            try {
                JSONObject error = new JSONObject(response);
                message = error.optString("msg", error.optString("message", error.optString("error_description", response)));
            } catch (Exception ignored) {
                // Keep the server response as the diagnostic message.
            }
            throw new IllegalStateException("Cloud request failed (" + status + "): " + message);
        }
        return response == null || response.isEmpty() ? "{}" : response;
    }

    private static String readAll(InputStream stream) throws Exception {
        if (stream == null) return "";
        StringBuilder result = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) result.append(line);
        }
        return result.toString();
    }
}

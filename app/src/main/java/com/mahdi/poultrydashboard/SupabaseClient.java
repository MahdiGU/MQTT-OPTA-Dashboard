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
    private static final String BASE_URL = "https://zlmaombpfdznambrgqiv.supabase.co";
    private static final String PUBLISHABLE_KEY = "sb_publishable_qiP1Lnh1iQ32EUEFKxRCiA_F8XiQ1uj";
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

    boolean isReady() {
        return accessToken != null && farmId != null;
    }

    void saveProduction(JSONObject input) throws Exception {
        ensureSession();
        request(
            "POST",
            "/rest/v1/rpc/record_daily_production",
            new JSONObject()
                .put("target_farm", farmId)
                .put("target_date", input.getString("date"))
                .put("egg_count", input.getInt("eggs"))
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

    void uploadTelemetry(JSONObject payload, String deviceId, long recordedAtMs) throws Exception {
        ensureSession();
        JSONObject i1 = payload.getJSONObject("i1");
        JSONObject outputs = payload.getJSONObject("outputs");
        JSONObject inputs = payload.getJSONObject("inputs");
        JSONObject row = new JSONObject()
            .put("farm_id", farmId)
            .put("device_id", deviceId)
            .put("recorded_at", Instant.ofEpochMilli(recordedAtMs).toString())
            .put("seq", payload.optLong("seq"))
            .put("up_s", payload.optLong("up_s"))
            .put("rssi", payload.optInt("rssi"))
            .put("volts", i1.optDouble("volts"))
            .put("temp_c", i1.getDouble("temp_c"))
            .put("sensor_fault", i1.optInt("fault") == 1)
            .put("d0", outputs.optInt("D0") == 1)
            .put("d1", outputs.optInt("D1") == 1)
            .put("d2", outputs.optInt("D2") == 1)
            .put("d3", outputs.optInt("D3") == 1)
            .put("i2", inputs.optInt("I2") == 1)
            .put("i3", inputs.optInt("I3") == 1)
            .put("i4", inputs.optInt("I4") == 1)
            .put("i5", inputs.optInt("I5") == 1)
            .put("i6", inputs.optInt("I6") == 1)
            .put("i7", inputs.optInt("I7") == 1)
            .put("i8", inputs.optInt("I8") == 1)
            .put("raw_payload", payload);
        request("POST", "/rest/v1/telemetry", row.toString(), "return=minimal", accessToken);
    }

    String readHistory(long sinceMs) throws Exception {
        ensureSession();
        String since = URLEncoder.encode(Instant.ofEpochMilli(sinceMs).toString(), StandardCharsets.UTF_8);
        String path = "/rest/v1/telemetry?select=recorded_at,temp_c,i2,i3,i4,i5,i6"
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
                .put("I6", row.optBoolean("i6") ? 1 : 0));
        }
        return result.toString();
    }

    String readProduction(int limit) throws Exception {
        ensureSession();
        String path = "/rest/v1/daily_production?select=id,production_date,eggs,mortality,production_rate,updated_at"
            + "&farm_id=eq." + farmId + "&order=production_date.desc&limit=" + limit;
        return request("GET", path, null, null, accessToken);
    }

    private void ensureSession() throws Exception {
        if (email == null || password == null) throw new IllegalStateException("Cloud login is not available.");
        if (accessToken == null) {
            signIn(email, password);
            return;
        }
        if (System.currentTimeMillis() < expiresAtMs - 60_000L) return;
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

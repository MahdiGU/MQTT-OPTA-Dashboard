package com.mahdi.poultrydashboard;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

final class SupabaseRealtimeClient {
    interface Listener {
        void onSubscribed();
        void onRecord(JSONObject record);
        void onError(String message);
        void onDisconnected();
    }

    private static final String TOPIC = "realtime:device-latest";
    private static final long HEARTBEAT_SECONDS = 20L;

    private final OkHttpClient httpClient = new OkHttpClient.Builder()
        .connectTimeout(15L, TimeUnit.SECONDS)
        .readTimeout(0L, TimeUnit.MILLISECONDS)
        .build();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
    private final AtomicLong references = new AtomicLong();
    private final Listener listener;

    private volatile WebSocket socket;
    private volatile ScheduledFuture<?> heartbeat;
    private volatile String accessToken;
    private volatile String joinReference;
    private volatile boolean closing;
    private volatile boolean subscribed;

    SupabaseRealtimeClient(Listener listener) {
        this.listener = listener;
    }

    synchronized void connect(String token, String farmId) {
        closeSocket(false);
        closing = false;
        subscribed = false;
        accessToken = token;
        joinReference = nextReference();

        Request request = new Request.Builder()
            .url(SupabaseClient.realtimeUrl())
            .header("apikey", SupabaseClient.PUBLISHABLE_KEY)
            .build();
        WebSocket newSocket = httpClient.newWebSocket(request, new SocketListener(farmId, joinReference));
        socket = newSocket;
    }

    synchronized void updateAccessToken(String token) {
        if (token == null || token.equals(accessToken)) return;
        accessToken = token;
        WebSocket current = socket;
        if (current == null || !subscribed) return;
        String reference = nextReference();
        JSONObject payload = tokenPayload(token);
        current.send(message(TOPIC, "access_token", payload, reference, joinReference));
    }

    synchronized void disconnect() {
        closeSocket(true);
    }

    synchronized void shutdown() {
        closeSocket(true);
        scheduler.shutdownNow();
        httpClient.dispatcher().executorService().shutdown();
        httpClient.connectionPool().evictAll();
    }

    private synchronized void closeSocket(boolean permanent) {
        closing = true;
        subscribed = false;
        cancelHeartbeat();
        WebSocket current = socket;
        socket = null;
        if (current != null) {
            String reference = nextReference();
            current.send(message(TOPIC, "phx_leave", new JSONObject(), reference, joinReference));
            current.close(1000, "Client disconnect");
        }
        if (!permanent) closing = false;
    }

    private synchronized void startHeartbeat(WebSocket target) {
        cancelHeartbeat();
        heartbeat = scheduler.scheduleAtFixedRate(() -> {
            if (target != socket || closing) return;
            String reference = nextReference();
            target.send(message("phoenix", "heartbeat", new JSONObject(), reference, null));
        }, HEARTBEAT_SECONDS, HEARTBEAT_SECONDS, TimeUnit.SECONDS);
    }

    private synchronized void cancelHeartbeat() {
        if (heartbeat != null) heartbeat.cancel(true);
        heartbeat = null;
    }

    private String nextReference() {
        return String.valueOf(references.incrementAndGet());
    }

    private static String message(
        String topic,
        String event,
        JSONObject payload,
        String reference,
        String joinReference
    ) {
        try {
            return new JSONObject()
                .put("topic", topic)
                .put("event", event)
                .put("payload", payload == null ? new JSONObject() : payload)
                .put("ref", reference == null ? JSONObject.NULL : reference)
                .put("join_ref", joinReference == null ? JSONObject.NULL : joinReference)
                .toString();
        } catch (Exception error) {
            throw new IllegalStateException("Could not create Realtime message", error);
        }
    }

    private static JSONObject tokenPayload(String token) {
        try {
            return new JSONObject().put("access_token", token);
        } catch (Exception error) {
            throw new IllegalStateException("Could not create Realtime token message", error);
        }
    }

    private final class SocketListener extends WebSocketListener {
        private final String farmId;
        private final String expectedJoinReference;

        private SocketListener(String farmId, String expectedJoinReference) {
            this.farmId = farmId;
            this.expectedJoinReference = expectedJoinReference;
        }

        @Override
        public void onOpen(WebSocket webSocket, Response response) {
            if (webSocket != socket || closing) return;
            try {
                JSONObject change = new JSONObject()
                    .put("event", "*")
                    .put("schema", "public")
                    .put("table", "device_latest")
                    .put("filter", "farm_id=eq." + farmId);
                JSONObject config = new JSONObject()
                    .put("broadcast", new JSONObject().put("ack", false).put("self", false))
                    .put("presence", new JSONObject().put("enabled", false).put("key", ""))
                    .put("postgres_changes", new JSONArray().put(change))
                    .put("private", false);
                JSONObject payload = new JSONObject()
                    .put("config", config)
                    .put("access_token", accessToken);
                webSocket.send(message(TOPIC, "phx_join", payload, expectedJoinReference, expectedJoinReference));
                startHeartbeat(webSocket);
            } catch (Exception error) {
                listener.onError("Could not join Realtime: " + friendly(error));
                webSocket.cancel();
            }
        }

        @Override
        public void onMessage(WebSocket webSocket, String text) {
            if (webSocket != socket || closing) return;
            try {
                JSONObject envelope = new JSONObject(text);
                String event = envelope.optString("event");
                JSONObject payload = envelope.optJSONObject("payload");
                if ("phx_reply".equals(event)
                    && expectedJoinReference.equals(envelope.optString("ref"))) {
                    String status = payload == null ? "" : payload.optString("status");
                    if ("ok".equals(status)) markSubscribed();
                    else {
                        listener.onError("Realtime subscription was rejected: " + text);
                        webSocket.cancel();
                    }
                    return;
                }
                if ("system".equals(event)) {
                    if (payload != null && "ok".equals(payload.optString("status"))) markSubscribed();
                    else {
                        listener.onError("Realtime system error: " + text);
                        webSocket.cancel();
                    }
                    return;
                }
                if ("postgres_changes".equals(event) && payload != null) {
                    JSONObject data = payload.optJSONObject("data");
                    JSONObject record = data == null ? null : data.optJSONObject("record");
                    if (record != null) listener.onRecord(record);
                    return;
                }
                if ("phx_error".equals(event)) {
                    listener.onError("Supabase Realtime channel error");
                    webSocket.cancel();
                }
            } catch (Exception error) {
                listener.onError("Invalid Realtime message: " + friendly(error));
            }
        }

        @Override
        public void onClosing(WebSocket webSocket, int code, String reason) {
            webSocket.close(code, reason);
        }

        @Override
        public void onClosed(WebSocket webSocket, int code, String reason) {
            terminal(webSocket, null);
        }

        @Override
        public void onFailure(WebSocket webSocket, Throwable error, Response response) {
            terminal(webSocket, error);
        }

        private void markSubscribed() {
            if (subscribed) return;
            subscribed = true;
            listener.onSubscribed();
        }

        private void terminal(WebSocket webSocket, Throwable error) {
            synchronized (SupabaseRealtimeClient.this) {
                if (webSocket != socket) return;
                socket = null;
                subscribed = false;
                cancelHeartbeat();
                if (closing) return;
            }
            if (error != null) listener.onError("Realtime connection failed: " + friendly(error));
            listener.onDisconnected();
        }
    }

    private static String friendly(Throwable error) {
        String message = error == null ? null : error.getMessage();
        return message == null || message.trim().isEmpty()
            ? (error == null ? "Unknown error" : error.getClass().getSimpleName())
            : message;
    }
}

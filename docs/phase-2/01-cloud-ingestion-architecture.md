# Cloud Ingestion Architecture and Data Contract

## Runtime path

```text
Arduino Opta v4.0
  | MQTT QoS 0 telemetry (opta/outputs)
  v
EMQX authenticated client/rule
  | HTTPS webhook + protected shared secret
  v
Supabase Edge Function: ingest-mqtt
  | service-only RPC calls
  +--> devices / poultry_houses       registered identity and topics
  +--> telemetry                       replay-safe raw history
  +--> device_latest                   current state, source-time guarded
  +--> telemetry_five_minute           chart-ready aggregate buckets
  v
Android/Web clients
  | authenticated reads subject to farm membership/RLS
```

The Edge Function accepts an unauthenticated HTTP webhook only because EMQX cannot provide a Supabase user JWT. It authenticates the request with `EMQX_WEBHOOK_SECRET`, while database writes use protected server credentials. The public RPC names are not executable by `anon` or `authenticated`; only `service_role` can execute them.

## Registered pilot identity

| Field | Value |
| --- | --- |
| Farm slug | `elmajd-poultry` |
| House slug | `house-01` |
| MQTT client ID / cloud device ID | `opta-control-01` |
| Telemetry topic | `opta/outputs` |
| Status topic | `opta/status` |
| Command topic | `opta/cmd` |

An enabled registry row must match both the webhook MQTT client ID and topic. Unknown clients, disabled clients and unregistered topics are rejected before a telemetry write.

## Time and replay semantics

- `received_at` is assigned by the Edge Function when Supabase receives the webhook.
- `captured_at` comes from the firmware UTC epoch when NTP is valid.
- `recorded_at` uses `captured_at`, falling back to `received_at` when the firmware has no valid UTC time.
- Phase 2 uniqueness is `(farm_id, device_id, boot_id, seq)`.
- Repeating the same frame does not create a second history row.
- An older captured frame is kept in history but cannot replace a newer `device_latest` state.
- Legacy frames without a boot ID retain the former one-row-per-receipt-bucket protection.

## Five-minute history

Since 04 November 2026, every accepted raw insert updates its corresponding UTC five-minute history row directly from the incoming measurement. Each row retains the latest temperature (including null for a faulty/missing reading), voltage and I2-I8 states. Source time determines ordering, with receipt time breaking equal-source-time ties. Older replayed frames increase the lightweight sample count without replacing newer values. No per-interval minimum, maximum or average is calculated, and the trigger does not read raw history. Raw telemetry remains the evidence source. See [deployment and verification](../diagnostics/2026-11-04-five-minute-latest-values.md).

## Compatibility

The existing Android Realtime app remains compatible because the original `device_latest` columns are preserved. The new Phase 2 fields are additive. A later Android change should display `captured_at`, stale state, firmware, buffer/replay diagnostics and identity mismatch explicitly.

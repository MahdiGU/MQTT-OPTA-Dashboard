# Supabase–EMQX bridge

This branch begins the move to a cloud-centered architecture. The Arduino Opta
continues to use MQTT, while the Android app will ultimately communicate only
with Supabase.

```text
Arduino Opta -- MQTT --> EMQX -- HTTPS webhook --> Supabase
Arduino Opta <-- MQTT -- EMQX <-- HTTPS Publish API -- Supabase Edge Function
                                                   ^
                                                   |
                                            Android app
                                      Auth + REST + Realtime
```

## What is implemented in this first stage

- `ingest-mqtt` accepts authenticated EMQX webhooks for `opta/outputs` and
  `opta/status`.
- Every telemetry message updates `device_latest` for a fast live view.
- At most one history sample per device is stored in each five-minute bucket.
- `send-mqtt-command` accepts a signed-in farm member's command, records it in
  `device_commands`, and sends it through the EMQX HTTP Publish API.
- Commands remain plain strings. The server fixes QoS to `0` and retain to
  `false`; the Android client cannot override either value.
- Row Level Security lets authenticated farm members read live state and the
  command audit log. Only the server functions can write those tables.

The Android app has deliberately not been switched away from direct MQTT in
this stage. Keep the current app operating until both server functions have
been deployed and tested with the live EMQX deployment. This avoids a monitoring
gap during configuration.

## Required Supabase secrets

Configure these as Edge Function secrets; never place them in the Android app
or commit them to Git:

| Secret | Value |
| --- | --- |
| `EMQX_WEBHOOK_SECRET` | A new long random value shared only by EMQX and `ingest-mqtt` |
| `EMQX_API_BASE_URL` | The EMQX deployment API base ending in `/api/v5` |
| `EMQX_APP_ID` | EMQX API application ID |
| `EMQX_APP_SECRET` | EMQX API application secret |
| `EMQX_COMMAND_TOPIC` | Optional; defaults to `opta/cmd` |
| `FARM_SLUG` | Optional; defaults to `elmajd-poultry` |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to deployed Edge
Functions by Supabase. The service-role key stays server-side.

Example setup (replace placeholders locally; do not commit the resulting
values):

```text
supabase secrets set --project-ref zlmaombpfdznambrgqiv \
  EMQX_WEBHOOK_SECRET=... \
  EMQX_API_BASE_URL=https://.../api/v5 \
  EMQX_APP_ID=... \
  EMQX_APP_SECRET=... \
  EMQX_COMMAND_TOPIC=opta/cmd
```

## EMQX webhook rules

Create an HTTP connector pointing to:

```text
https://zlmaombpfdznambrgqiv.supabase.co/functions/v1/ingest-mqtt
```

Add this request header:

```text
x-emqx-webhook-secret: <the EMQX_WEBHOOK_SECRET value>
```

Create rules for `opta/outputs` and `opta/status`. The webhook body must include
the original MQTT topic, client ID, and payload. A suitable JSON shape is:

```json
{
  "topic": "${topic}",
  "clientid": "${clientid}",
  "payload": "${payload}"
}
```

Keep the Opta's existing Last Will/status behavior. Telemetry payloads continue
to use the documented JSON structure; command payloads continue to be plain
strings such as `D0 ON`.

## Deployment order

1. Review and apply `20261025073016_mqtt_cloud_bridge.sql`.
2. Set the five server secrets.
3. Deploy `ingest-mqtt` and `send-mqtt-command` using `supabase/config.toml`.
4. Configure and test the two EMQX rules.
5. Verify `device_latest`, five-minute `telemetry`, and `device_commands` in the
   Supabase Table Editor.
6. Only then update the Android app to read Supabase Realtime and call the
   command function, and remove phone-side MQTT credentials/background MQTT.

## Security boundaries

- The unauthenticated webhook endpoint is protected by a dedicated secret.
- Android users authenticate with Supabase; membership and role are checked on
  every command.
- EMQX API credentials and the Supabase service-role key exist only in Edge
  Function secrets.
- The command topic is server-controlled, and accepted command text is
  allow-listed.
- RLS is enabled on both new public tables.

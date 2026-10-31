# Alarm Architecture and Interfaces

```text
OPTA --> MQTT/EMQX --> ingest-mqtt --> telemetry (unique frames)
                                      |
                                      v
                         fresh-sample alarm state machine
                                      |
             one-minute cron ---------+-- offline/repeat/escalation
                                      |
                     alarm_events + audit + delivery queue
                                      |
                     [pending implementation: sender worker]
                          /                        \
                       FCM push                 Gmail API
                          |                        |
                     Android phones           user mailbox
```

## Default policy

| Condition | Activate | Recover | Repeat / escalation |
| --- | --- | --- | --- |
| Temperature warning | >=30 C continuously 5 min | <29 C continuously 5 min | Push every 30 min until acknowledged |
| Temperature critical | >=33 C continuously 2 min | <32 C continuously 5 min | Push every 10 min; email after 10 min unacknowledged |
| Sensor fault | Fault, missing temperature, or outside -50..100 C for 2 samples | 2 valid samples | Push every 30 min |
| Cistern I2-I4 / silo I5-I6 low | Input false continuously 5 min | Input true continuously 5 min | Push every 60 min |
| Cooling unavailable | Valid temp >= warning and I7 false for 2 min | I7 true for 2 min, or valid temp below warning minus 1 C | Push every 10 min; email after 10 min |
| Controller offline | No fresh accepted sample for 5 min | One fresh accepted sample | Push every 15 min; email after 10 min |

Evaluation runs continuously; there are no quiet hours. The warning and critical temperatures are configurable per house. Delays and repetition intervals currently use the approved constants. Fan-failure alarms remain excluded because relay/LED state does not confirm rotation.

## Freshness and timing

A sample must be unique, identity-matched, not marked replay, and within 30 seconds of its server receipt time. Source times must advance. Historical/replayed/future samples remain stored by Phase 2 but do not create or recover current alarms. When source time is absent, receipt-based recorded time remains a compatibility fallback.

A gap greater than 30 seconds resets pending persistence and consecutive-sample counters. Existing active alarms remain active until a valid recovery sequence occurs. This prevents a long missing-data interval from being treated as continuous evidence.

`private.alarm_device_clock` tracks fresh telemetry separately from MQTT online messages or replay receipt. A newly registered controller gets a five-minute grace period before offline activation. The cron job executes every minute, so offline detection and timed repeats/escalation can occur up to one minute after their policy deadline. Initial push records are inserted in the activation transaction.

## Tables

| Table | Purpose |
| --- | --- |
| `alarm_settings` | Per-house warning and critical thresholds |
| `alarm_events` | One open event per farm/device/condition; evidence, activation, acknowledgement and recovery |
| `alarm_audit` | Immutable application-facing activation, acknowledgement and resolution log |
| `alarm_configuration_audit` | Actor and old/new threshold values |
| `alarm_deliveries` | Per-event/user/channel/repetition queue; currently pending/cancelled only |
| `private.alarm_condition_state` | Persistence timers and sample counters |
| `private.alarm_device_clock` | Last fresh measurement and source ordering |

Recipients are current farm members with owner/admin/manager roles. Duplicate queue slots are suppressed. Acknowledgement and recovery cancel pending deliveries. Older unsent push slots are cancelled when a newer slot is queued, avoiding a notification flood after sender downtime. A future sender must recheck membership, event state, token validity and queue age immediately before dispatch.

## Client RPCs

Authenticated farm members can call:

```json
POST /rest/v1/rpc/acknowledge_alarm
{"target_event":"<alarm uuid>"}
```

Owner/admin/manager members can change their house thresholds:

```json
POST /rest/v1/rpc/configure_alarm_temperature
{"target_house":"<house uuid>","warning":30,"critical":33}
```

RLS limits reads to farm membership. Acknowledgement records the actual authenticated user and does not resolve the physical condition. Threshold changes reset pending duration evidence; active events retain their original threshold snapshot. Clients cannot directly insert alarm events, edit audit records or mark deliveries as sent.

`alarm_events` is published to Supabase Realtime. Application subscriptions and screens remain to be integrated.

## Provider setup still required

FCM requires a Firebase project, Android app registration, per-phone FCM tokens associated with authenticated users and protected server authorization. Gmail fallback will use Gmail API OAuth with send permission and protected refresh credentials. The sender worker must log attempts, retry temporary errors with backoff and disable invalid phone tokens. Provider acceptance must not be described as confirmed user receipt.

References: [Supabase Cron](https://supabase.com/docs/guides/cron), [FCM HTTP v1 authorization](https://firebase.google.com/docs/cloud-messaging/send/v1-api).

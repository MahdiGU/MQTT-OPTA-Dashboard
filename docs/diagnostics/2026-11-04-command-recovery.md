# OPTA command investigation — 04 November 2026

## What failed

- The Android Communication page enabled the command button only when the Supabase **Realtime WebSocket** was subscribed. The owner confirmed the button was grey when trying `D0 ON`. A live WebSocket is not needed to submit a command when the Supabase cloud session is signed in.
- `send-mqtt-command` verified each session with Supabase Auth `/user` before publishing. Three recent attempts returned HTTP 401 after about 36–37 seconds. The corresponding Auth `/user` logs had HTTP 500/504 database connection and request timeouts. The function incorrectly turned this temporary provider failure into “Invalid session.”
- The `D0 OFF` request at 18:25 UTC did succeed: the command audit is `sent`, EMQX returned a message ID, and telemetry changed D0/L0 from true at 18:25:09 to false at 18:25:14. There was no new command audit or function call for the later `D0 ON` attempt because the button was disabled.

## Changes

- Android 1.11.2 enables the command button from the cloud sign-in state, independent of the Realtime subscription. It keeps the command result visible when the WebSocket reconnects and shows a sending message while a request is in flight.
- Android can use an access token that is still valid for at least 30 seconds when an early refresh fails temporarily, instead of immediately forcing another password login.
- Migration `20261104183000_authorize_mqtt_command` adds a service-side authorization RPC that uses PostgREST's verified user JWT and requires owner or manager membership in the configured farm. It returns the user/farm IDs only for an allowed caller. Anonymous access is revoked.
- `send-mqtt-command` version 7 uses that RPC instead of Auth `/user` plus separate farm/member lookups. It retains plain-text commands, QoS 0, retain off, broker API publish, and the command audit. Temporary authorization service failures return 503 instead of a misleading 401.

## Verification and limits

- SQL checks with simulated JWT claims allowed the pilot owner and manager, denied an unrelated user, and confirmed the function grant is authenticated only.
- A mocked Edge Function test verified owner/manager authorization flow, audit creation, `D0 ON` payload, topic, QoS 0, retain off, and denial of invalid commands. It did not publish to the physical OPTA.
- The Android inline JavaScript parsed successfully. GitHub Actions run `41889249622` passed debug assembly, release compilation, and pilot signature verification for commit `d9be6ef`.
- Downloaded `artifacts/ElMajd-Automation-1.11.2.apk` (5,997,920 bytes). APK SHA-256: `d96577a9f5108f9ee129efaaf6ecabc49afc16f3862f0f9f792e1a1ae3f07cbe`. The artifact ZIP hash matched GitHub's recorded digest. Phone acceptance remains pending.
- Supabase's database and PostgREST relapsed during rollout. `PGRST002` and Auth timeouts mean this change alone cannot guarantee command delivery while the project is overloaded. Do not infer physical equipment action from an EMQX publish acknowledgement; compare a subsequent OPTA telemetry frame or physical indication.

## Service recovery during rollout

- Postgres logs showed slow schema introspection and statement timeouts; Auth also logged connection/request timeouts. The dashboard's Query Performance page itself timed out. These observations indicate database pressure, but do not conclusively identify a single resource bottleneck.
- Migration `20261104184100_postgrest_schema_recovery.sql` increases the authenticator statement timeout from 30 to 60 seconds and requests a PostgREST config/schema reload. The public REST probe still returned `503 PGRST002` after this change.
- Used the dashboard's **Fast database reboot** option at approximately 18:52 UTC to recover stalled connections. No paid compute upgrade was selected. Service recovery must be checked before treating command delivery as restored.
- The fast reboot did not restore reachability. Started a full project restart at approximately 18:57 UTC. At 19:00 UTC the management API still reported `RESTARTING`; the phone's sign-in attempt failed during this window. APK installation alone does not resolve this service outage.

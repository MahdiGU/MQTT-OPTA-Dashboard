# Phase 3 - Alarm and Notification Services

Branch: `Phase_3_Alarm_Notifications`  
Base: `Phase_2_Cloud_Ingestion`, commit `1242030`  
Started: 2026-10-31  
Status: alarm engine deployed; notification delivery and application integration pending

## Implemented

Server-side temperature warning/critical, sensor fault, cistern/silo low, cooling-unavailable and controller-offline alarms follow the approved Phase 0 defaults. Fresh telemetry advances duration/sample state. Recovery, acknowledgement, recurrence, configuration changes and evidence are stored in Supabase.

Push intentions are queued at activation; reminders and ten-minute critical email fallback are queued by a scheduled database job. No Firebase or Gmail send worker is connected yet. `pending` delivery records are intentions, not evidence that a phone or mailbox received a notification.

The existing Android version is unchanged. It does not yet display these server alarm events or register an FCM token. Its existing local notifications remain separate from the new server engine.

## Documents

- [Architecture, policy and interfaces](01-alarm-architecture.md)
- [Verification and deployment evidence](02-verification.md)
- [Task reports and next steps](03-task-reports.md)

## Next dependencies

Firebase project `elmajd-automation` now exists and access through the requested owner account is verified. Android package `com.mahdi.poultrydashboard` is registered and its SDK configuration is saved in `app/google-services.json`. See [Firebase registration](04-firebase-registration.md). FCM SDK integration, phone token registration, protected sender credentials and delivery remain pending. Authorize the approved Gmail mailbox through a secure Google OAuth flow. Neither ordinary mailbox passwords nor private keys should be committed or pasted into task comments.

Only an owner membership currently exists in the pilot farm. Add the manager's authenticated account to the farm before testing delivery to both users.

Milestone M3 remains open until the Android alarm center, token registration, sender/retry worker, provider delivery evidence and closed-app phone tests pass.

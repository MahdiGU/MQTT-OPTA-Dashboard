# Phase 3 - Alarm and Notification Services

Branch: `Phase_3_Alarm_Notifications`  
Base: `Phase_2_Cloud_Ingestion`, commit `1242030`  
Started: 2026-10-31  
Status: alarm engine and FCM worker deployed; Android 1.9.2 ready for phone validation; Gmail authorization/delivery pending

## Implemented

Server-side temperature warning/critical, sensor fault, cistern/silo low, cooling-unavailable and controller-offline alarms follow the approved Phase 0 defaults. Fresh telemetry advances duration/sample state. Recovery, acknowledgement, recurrence, configuration changes and evidence are stored in Supabase.

Push intentions are queued at activation; reminders and ten-minute critical email fallback are queued by a scheduled database job. The Firebase worker is now deployed and scheduled every minute, with per-phone retries and delivery records. Gmail sending remains pending. `sent` push records mean FCM accepted the message, not proof of user receipt.

Android 1.9.1 added the server alarm center; Android 1.9.2 adds phone registration, token rotation, foreground/background handling and a self-test button. The local immediate temperature fallback is suppressed after phone registration succeeds and notification permission is enabled, allowing the approved duration-based server policy to take over.

## Documents

- [Architecture, policy and interfaces](01-alarm-architecture.md)
- [Verification and deployment evidence](02-verification.md)
- [Task reports and next steps](03-task-reports.md)

## Next dependencies

Firebase project `elmajd-automation` is configured. Android package `com.mahdi.poultrydashboard` is registered; protected server credentials are in Vault. See [FCM delivery implementation](05-fcm-delivery.md). Install 1.9.2 and validate a real phone notification. Authorize the approved Gmail mailbox through a secure Google OAuth flow. Neither ordinary mailbox passwords nor private keys should be committed or pasted into task comments.

Owner and manager memberships are present. The manager membership was restored after the owner recreated that account; both users can register their own phones.

Milestone M3 remains open for real-phone delivery, closed-app/permission/sign-out tests and Gmail fallback evidence.

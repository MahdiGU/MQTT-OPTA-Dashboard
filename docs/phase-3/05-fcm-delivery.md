# Server Push Delivery and Android 1.9.2

Branch: `Phase_3_FCM_Delivery`, based on `Phase_5_App_Refinements`. Source commit: `63137b7857026de3f36c981653178f15c3084455`. No merge performed.

## Implemented

- Firebase Messaging Android SDK and Google Services build plugin; versions pinned to BoM 35.1.0 / plugin 4.5.0 from Google's Maven metadata.
- Authenticated phone registration tied to farm membership, Supabase user, stable installation UUID, Firebase token and notification permission.
- Token rotation synchronization, five-minute reconciliation and best-effort server unregistration on logout. Local logout suppression is immediate.
- FCM data messages displayed by a native messaging service in foreground/background. Messages are bound to a recipient ID and ignored after logout or account switch. A bounded-time duplicate cache suppresses repeat delivery IDs.
- Notification taps open the Alarms tab. Connection shows phone registration status and exposes registration retry and a self-only notification test.
- Local temperature fallback remains available until push registration succeeds; once registered with permission, the approved server delay/hysteresis policy takes over.
- Device state backup is disabled to avoid copying installation identity/credentials across phones.

## Backend

`dispatch-alarms` is an active Edge Function. Cron `elmajd-push-dispatch` calls it every minute with a Vault-managed worker secret. Unauthenticated access is rejected. A verified user JWT permits only a self-test to that user's authorized registered phones.

`push_devices` permits member reads of their own registrations and validated owner/manager registration RPCs. Arbitrary cross-user installation takeover is denied unless the caller presents the existing installation's secret Firebase token (same physical phone account switch).

Alarm delivery rows are claimed with leases and SKIP LOCKED. Per-phone outcomes prevent repeating a successful phone while another retries. Transient failures use bounded exponential retry; unregistered tokens are disabled. Just before sending, the worker rechecks alarm acknowledgement/recovery, membership, lease and current token ownership. Already accepted/in-flight FCM messages cannot be recalled after acknowledgement.

`push_delivery_attempts` stores provider IDs and error codes. `sent` means FCM acceptance, not confirmed on-screen display. Worker requests have timeouts; expired leases permit recovery. Existing acknowledgement/recovery cancels queued deliveries, and the prior maintenance policy collapses superseded reminders.

## Sender security

A dedicated service account `elmajd-alarm-sender` has the project-scoped Firebase Messaging API Admin role. It has no farm database or project-owner role. Its signing key and scheduler secret are stored in encrypted Supabase Vault, not in Git or the APK. The config RPC is executable only by service_role; anonymous and authenticated callers were verified to lack EXECUTE permission.

IAM provisioning used the previously authorized Google account. No user OAuth refresh credential was copied into the backend. Server credentials can be rotated independently of the app. Future hardening may replace the long-lived service-account key with workload identity federation.

## Verification

- `supabase/tests/fcm_delivery.sql`: transactional PASS for registration, takeover denial, worker lease exclusivity, per-phone retry, invalid-token disabling, unregistration and restricted worker/secret access.
- `tests/push-worker.mjs`: PASS with generated test signing keys and mocked endpoints for OAuth JWT signature/scope, request authentication, provider outcome parsing, self-only test and temporary-error retries.
- Android UI regression: PASS, including registration/self-test buttons and notification navigation.
- Real deployed worker: HTTP 200 with `processed: 0`, confirming sender OAuth authorization and database integration. Scheduled pg_net responses also returned HTTP 200 without timeout.
- No phones were registered at verification time. No real phone notification is claimed yet.
- Android build: [GitHub Actions 41228540345](https://github.com/MahdiGU/MQTT-OPTA-Dashboard/actions/runs/41228540345), successful.
- APK: `ElMajd-Automation-1.9.2.apk`, version code 21, 5,979,810 bytes. SHA-256: `25c2cff31b8b2f1d9725eee5b16dc1dbc0f05fa5557aed26f4d1118a3fe381c2`. Packaged UI matches tested source. Local artifact is under `artifacts/phase3-1.9.2-build/`.

## Phone acceptance steps

1. Install 1.9.2 over the existing app and allow notifications.
2. Sign in with the current Supabase account. Connection must show Registered / notifications enabled.
3. Tap **Send me a test notification** and confirm actual on-screen arrival; FCM acceptance alone is insufficient.
4. Test screen locked, app swiped away and notification-tap navigation. A controlled active server-alarm test is then needed for background delivery.
5. Verify sign-out suppresses messages, permission denial is reported, and a second phone/account receives only its own authorized farm notifications.

Android force-stop in system settings prevents delivery until reopening. Devices without working Google Play services are not covered by this FCM implementation. OEM battery/network restrictions and user-disabled notification channels remain part of phone acceptance.

## Still pending

Gmail fallback authorization and sender implementation, actual provider/phone tests, and full notification localization. The email queue remains an intention only; no fallback email is sent by this version. M3 remains open.

References: [FCM Android setup](https://firebase.google.com/docs/cloud-messaging/android/get-started), [FCM server authorization](https://firebase.google.com/docs/cloud-messaging/send/v1-api), [Supabase Vault](https://supabase.com/docs/guides/database/vault).

# Phase 5 - Android Application

Current Android version: **1.11.0 (23)** on `French_Account_Gmail`. See the [current delivery/acceptance record](../delivery/phase-3-5-completion.md) for paging, server previews, dated flock movements, French/account features, active Gmail, accessibility and release-signing checks. Earlier pending statements below belong to the 1.9.0 snapshot.

Branch: `Phase_5_Android_App`, based on `Phase_4_Production_Packaging`. Started 2026-10-31. Version: 1.9.0 (code 19).

Pilot feedback is implemented in [version 1.9.1](02-version-1.9.1-refinements.md) on `Phase_5_App_Refinements`: dedicated Alarms tab, expanded Overview, interactive carton card, opening-stock reference, carton edits/deletion and manager account provisioning.

## Implemented application slice

- Existing five mobile tabs are preserved. Production supports editing historical Stock/Sortie/mortality without changing the date. Server validation recalculates dependent records transactionally.
- Owner-only delete buttons; managers can edit, viewers cannot submit configuration/production/receipts. Backend permissions remain authoritative.
- Configuration includes dated carton receipts with notes, received/consumed/balance display and a shortage indicator. In-flight receipt submissions are disabled and retries retain an idempotency key.
- Status includes the shared server alarm list, active/recovered/acknowledged states and acknowledgement actions. Configuration exposes warning/critical thresholds through the audited RPC.
- Realtime subscriptions include production, server alarms and carton receipts; explicit refresh and periodic reconciliation remain available.
- Sensor charts read the server five-minute aggregates over 24 hours, automatically scale to observed min/max and break lines across missing/invalid measurements.
- Source capture and receipt times are displayed. Native freshness uses capture time where available. Missing temperature is displayed as unavailable. Fan state is labelled control status and cooling describes auxiliary feedback rather than claiming water-flow measurement.
- Live warning/critical labels follow synchronized server thresholds. Existing local fallback temperature notifications use the last synchronized critical value; their immediate behavior remains distinct from the server's duration-based policy until FCM cutover.
- Production/receipt dates and daily/weekly grouping use fixed GMT+1, without daylight-saving changes. Weekly production is the average recorded daily rate and mortality is summed.

## Validation

`tests/phase5-ui.cjs` uses a mocked native bridge and headless browser at 390 x 844. PASS: edit payload/record identity, hidden manager deletion, carton submission and in-flight duplicate prevention, thresholds, alarm acknowledgement, viewer restrictions, owner deletion, no horizontal overflow and no JavaScript page errors. This validates UI wiring, not real Android device behavior.

Backend acceptance tests are documented in Phase 4. GitHub Actions builds this branch using Java 17, Gradle 8.9 and Android SDK 35. The named package is `ElMajd-Automation-1.9.0.apk`; it has the existing debug signing identity so pilot updates remain compatible.

## Remaining tasks / dependencies

- Phase 3 FCM sender, token registration, Messaging SDK integration and Gmail delivery are still pending. Version 1.9.0 does not include Firebase push delivery. Existing local temperature alerts remain separate.
- Complete French localization and accessibility/phone-device acceptance.
- Verify production corrections, receipts and alarm acknowledgement on two actual phones.
- Validate force-stop/background/restart behavior after FCM is integrated.
- Add paginated historical production navigation and server-authoritative previews for dates outside the currently loaded 90 records. Current previews are advisory; the server always validates the submitted values and all dependent dates.
- Physical chart/data comparison, app security review and production signing/credential cleanup remain acceptance items.

Milestone M5 remains in progress. No installed-device, notification delivery or production go-live acceptance is claimed.

ClickUp reports are maintained here while its daily MCP allowance blocks task updates.

# Android 1.9.1 - Pilot Feedback

Branch: `Phase_5_App_Refinements`, based on `Phase_5_Android_App`. No merge performed.

## Navigation and Overview

Six tabs: Overview, Status, Alarms, Production, Configure, Connection. Alarms/history have a dedicated tab. Overview now contains actual flock, production performance and an interactive egg-tray/card showing available cartons. Tapping the card opens Packaging Inventory. Status retains equipment monitoring.

## Packaging rules (supersede the 1.9.0 shortage baseline)

- The earliest dated carton entry is the opening reference. Its date and all earlier production are excluded from consumption. Counting starts with production strictly after that date.
- Until a reference exists, available cartons and counted consumption are zero.
- Each day adds carton entries before deducting production consumption. Available cartons cannot become negative. Uncovered consumption is tracked separately; it does not create debt against a later delivery.
- Existing 1,000-carton entry on 2026-10-31 becomes the current opening reference: 1,000 received, zero counted consumption, 1,000 available.
- Owner and manager can add/adjust entries. Only owner/admin can delete. All adjustments/deletions retain before/after audit. Deleting the opening entry makes the next earliest dated entry the new reference; deleting all entries clears initialization.
- Production records are preserved. The per-production nominal carton estimate remains derived from eggs; inventory counts only records after the reference date.

## Manager pilot account

The previously designated manager was provisioned through Supabase's admin API and assigned only the farm's `manager` membership. Actual email/password sign-in passed, and a real authenticated attempt to delete the existing carton entry returned HTTP 403 without mutation. Credentials are in a local private handover file outside the repository. No password, session token, service key or personal email is included here.

The setup used a short-lived capability limited to this fixed manager/farm. Its Edge Function was immediately replaced with a disabled HTTP 410 response after successful creation. No general user-provisioning endpoint remains active.

## Verification

- `supabase/tests/packaging_opening_reference.sql`: PASS in a rolled-back transaction (no initialization, reference-day exclusion, zero floor, shortfall tracking, later deliveries, manager adjustment/denied deletion, owner deletion and audit).
- Existing Phase 4 tests updated for the opening-reference rule.
- `tests/phase5-ui.cjs`: PASS at 390 x 844 for six-tab navigation, correct section ownership, flock display, tray link, carton edit/delete permissions and payloads, production edit, duplicate prevention, thresholds, acknowledgement and viewer restrictions.
- Installed-device and two-phone acceptance still required.
- Firebase push/Gmail remain outside this update and are still pending Phase 3 delivery work.

## APK evidence

Source commit `b99aceb88402ee57890448e87801f86e6e5ac427` built successfully in [GitHub Actions run 41225956653](https://github.com/MahdiGU/MQTT-OPTA-Dashboard/actions/runs/41225956653).

- Package: `ElMajd-Automation-1.9.1.apk`, version code 20, 3,362,531 bytes.
- SHA-256: `ac74487341594de22c80408b226a1cbb008bf71a6b0cf723860b54c37bee4053`.
- Packaged UI matches tested source.
- Local output: `artifacts/phase5-1.9.1-build/ElMajd-Automation-1.9.1.apk`.

No phone installation is claimed by the build evidence. Use the private local handover file supplied to the owner for manager credentials; credentials are excluded from this public report.

# Phases 3, 4 and 5 — delivery and acceptance record

Updated: 2026-11-01. Branch: `French_Account_Gmail`. Android: **1.11.0 / version code 23**. No merge performed.

This report supersedes outdated pending-work statements in the earlier phase snapshots. Software implementation and automated verification are separate from installed-device, business-owner and operational acceptance.

## Current status

| Phase | Implemented and verified | Remaining acceptance |
|---|---|---|
| 3 — Alarms | Alarm lifecycle/thresholds/audit, minute scheduling, FCM phone registration/delivery, localized notifications, acknowledged/recovered history, Gmail OAuth sender, ten-minute email fallback, retries and delivery audit; approved public sender pages, OAuth Production publishing and fresh credential replacement | Controlled critical-condition push with app closed; two-phone/permission/sign-out/OEM tests and normal inbox placement |
| 4 — Production | Formula/mortality/rate rules, audited edits and owner-only deletion, carton receipts/opening-reference/zero-floor/shortfall, role matrix, dated flock movements and historical recalculation | Owner validation against actual production/packaging records and shared-phone workflow |
| 5 — Android | Six tabs, French/English, account/password management, live/history views, 24-hour charts, daily/weekly performance, historical paging, server previews, configuration and release-signing support | Install/upgrade 1.11.0, TalkBack/large-text/device/background UAT, production signing-key handover |

M3/M4/M5 remain open until their acceptance evidence is recorded. Earlier phone receipt of the FCM self-test is confirmed by the owner; that does not replace every critical-condition/background scenario.

## Phase 3: Gmail activation and evidence

The owner authorized the designated mailbox with a Desktop OAuth client. The local PKCE/state helper verified the sending identity and Gmail send scope. The credential was transferred over TLS directly into Supabase Vault without printing token/key values. The temporary setup endpoint was disabled, its service-only import function dropped, the local helper stopped and its generated refresh-credential file removed. The downloaded OAuth client file remains in the owner's designated folder.

The first sender test was accepted by Gmail. A second clearly labelled **TEST du secours Gmail** exercised the real minute worker, lease, authorization, Gmail API and completion/audit path. It used a temporary isolated farm with the existing owner as its sole recipient, no registered physical equipment and an event aged beyond the email escalation delay. The provider accepted exactly one attempt. The owner confirmed receipt **in spam**. The fixture, membership, event and delivery rows were removed afterward; no test farm remains. These tests did not change physical sensor readings or send equipment commands.

An initial worker HTTP 503 was followed by successful scheduled processing. Provider acceptance and owner-confirmed mailbox arrival are recorded separately. Diagnostic logging now identifies the failed stage without returning credentials. Normal email delivery remains subject to provider quotas, filtering and OAuth revocation/expiry. A lost response after provider acceptance can cause a duplicate retry; the sender includes a stable Message-ID and bounded retries.

The app's Connection page reads safe channel-readiness metadata from a member-authorized RPC; it does not read Vault. **Gmail configured** means a server credential is installed, not a guarantee that every future message reaches an inbox. A self-test targets only the authenticated user's confirmed address.

Operational follow-up: mark the approved sender as safe / the test as not junk in the receiving mailbox. The owner approved the sender information/privacy/terms pages and OAuth Production switch. The pages are live at https://elmajd-automation.web.app, their branding URLs/domain are saved, and Google now shows **En production**. Fresh consent after that switch was verified, provider-tested and installed in Vault, replacing the earlier Test-mode grant. Google verification is separate and has not been completed; the owner reviewed the unverified-app warning personally. See [OAuth publication record](oauth-publication.md).

Recovery email now uses the authorized Gmail adapter, avoiding Supabase's default SMTP recipient restrictions and localhost recovery links. Supabase's single-use code verification and password update were already tested with a disposable account; the owner's in-app recovery/remembered-login UAT remains pending.

## Phase 4: dated flock adjustments

Configuration now records effective date, category, actual count after adjustment and reason/reference. Categories: initial flock, birds received, transfer in, transfer out and count correction. A migration-time reference captures the existing count with zero movement, preserving existing production snapshots.

Only owner/admin and manager may record movements. The ledger is immutable to application clients. Corrections require a reason; incoming/outgoing categories enforce direction. Request IDs make retries idempotent. A transaction locks the current flock, applies the delta to production snapshots on/after the effective date, recalculates rates and rolls back any invalid result. Mortality remains a Production input.

Historical production inserted before a later movement excludes that future movement from its day's flock. Preview and write RPCs use the same rule. Direct client writes to `flock_settings` are revoked so movements cannot bypass the ledger. **Use Android 1.11.0 for flock configuration after this migration**; older APKs use the superseded direct-table configuration path. Existing production, monitoring and command RPC signatures remain compatible.

Before/after verification confirmed unchanged production-row count, egg/mortality totals and current flock during migration. Test fixtures were rolled back.

## Phase 5: history, previews and accessibility

Production history has 30-record cursor pages. Older pages keep their own visible rows while Overview and performance retain the latest cached records. Archived rows can be edited/deleted subject to server roles. Request IDs reject late page/preview responses; pending actions cannot be double-submitted. Successful writes reset/reload the appropriate history.

Before saving production, a read-only, tenant-restricted server preview checks the full predecessor history, date-specific flock, proposed production/rate/cartons and downstream records. Missing initial history produces zero as approved. Duplicate dates, over-mortality, negative/over-flock production and invalid later records are shown before save. The write transaction still revalidates; preview is not a reservation or guarantee against concurrent edits. Native numeric conversion rejects non-integers/out-of-range values rather than truncating them.

Added 44-pixel minimum targets, visible keyboard focus, reduced-motion behavior, status announcements and accessible chart measurement/min/max summaries. Missing/invalid measurements remain gaps. Dates and daily/weekly grouping stay fixed GMT+1 through DST changes.

The WebView loads only the bundled dashboard, blocks external navigation/network loads and arbitrary file access, and removes its bridge during cleanup. Cloud traffic remains in the native authenticated client. Remembered credentials use Android Keystore encryption.

## Release signing and upgrade

The named test APK retains the stable pilot signer for update compatibility. Protected production signing reads `ELMAJD_RELEASE_STORE_FILE`, `ELMAJD_RELEASE_STORE_PASSWORD`, `ELMAJD_RELEASE_KEY_ALIAS` and `ELMAJD_RELEASE_KEY_PASSWORD` from the environment. A normal release request fails if these are incomplete; CI explicitly compiles a non-installable unsigned release as a verification step. CI also verifies the signed pilot APK.

The repository's existing public pilot/debug keystore is not a production signing key. A private production key, protected backup and owner handover remain required. An Android app signed with a different key generally cannot update the existing pilot installation directly; plan that transition before release distribution. No production key or password was generated or committed by this delivery.

## Verification

- Rolled-back live database suites: alarm engine, FCM delivery, production/packaging, carton opening reference, server preview and dated flock movements — PASS.
- Provider tests: signed FCM OAuth, device outcomes/retries, Gmail UTF-8 MIME/headers, token reuse, transient/permanent errors, injection rejection, recovery recipient/throttle behavior and revocation checks — PASS.
- Browser UI: French/English, account flows, six tabs, role controls, audited edit/receipt/flock payloads, duplicate prevention, paging without Overview regression, stale/invalid preview rejection, numeric bounds and accessible chart summaries — PASS at 320/390 pixels.
- Fixed GMT+1 date and daily/weekly grouping checks across both Berlin DST transitions — PASS.
- RLS/readiness/advisor review: preview is SECURITY INVOKER; state-changing flock RPC and readiness RPC have explicit identity/membership checks, restricted grants and empty search paths. No new unprotected public table is introduced. Existing leaked-password-protection and deliberately restricted private-table advisories remain recorded.
- Android debug and unsigned release compilation plus pilot APK signer validation: PASS in [GitHub Actions run 41288156791](https://github.com/MahdiGU/MQTT-OPTA-Dashboard/actions/runs/41288156791), source `b95007e`. Named APK: `ElMajd-Automation-1.11.0.apk`, 5,997,868 bytes, SHA-256 `e2925190ed8ffbdf10c17b468b114f35ed63a67f2c707bac5046995ee3bd83c0`. Packaged `index.html`, `i18n.js`, `phase5.js`, `account.js` and `history.js` match tested source. Local handover: `artifacts/phase5-1.11.0-build/`.

## Required owner/manager acceptance

Use the [1.11.0 pilot acceptance sheet](pilot-acceptance-1.11.0.md) to record phone, account, calculation and delivery results. All unexecuted scenarios are explicitly marked pending.

1. Upgrade using the named 1.11.0 test APK; verify saved sign-in, live data and shared changes on both phones.
2. Exercise approved dated flock/production/carton cases, including invalid historical corrections and manager-denied deletion; verify stored values and rates.
3. Verify a controlled critical-condition notification while the app is closed/phone locked, acknowledgement cancellation, sign-out suppression and permission-denied behavior. Force-stop restrictions still apply.
4. Test the password-change/recovery screens with an owner-chosen password and verify remembered reconnect behavior.
5. Complete TalkBack/large-text/device chart checks and normal Gmail inbox acceptance, and hand over the private production signing key before closing M5. The Production-mode credential replacement is complete.

## ClickUp synchronization

After the connector's daily allowance reopened, the complete live 58-task plan and valid French statuses were retrieved. Reports were posted to 45 phase 0–5 tasks: **25 achevé**, **20 en cours**. The original task descriptions, dates and assignees were preserved. All target statuses were read back successfully; the other 13 phase 6/7 tasks remained unchanged. Gmail and Android parent report comments were also read back. `clickup-update-queue.json` now records every returned comment ID, status result and verification timestamp. M0–M5 and their parent phases remain in progress where external acceptance is pending.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Android WebView settings](https://developer.android.com/reference/android/webkit/WebSettings), [Android signing](https://developer.android.com/studio/publish/app-signing), [Google OAuth token expiry](https://developers.google.com/identity/protocols/oauth2), [Outlook safe senders](https://support.microsoft.com/en-us/outlook/safe-senders-in-outlook-com).

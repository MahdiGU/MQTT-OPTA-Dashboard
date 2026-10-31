# French interface, account management and Gmail fallback

Branch: `French_Account_Gmail`. Android version: **1.10.0 (22)**. No branches merged.

## Interface and phone notifications

French is the default. Login and Configuration include a French/English selector, persisted on the phone. App-generated text, dates, chart labels, validation prompts, foreground monitoring notifications and server push messages are localized. User-entered notes and MQTT protocol strings are preserved. Push registration stores a language preference per installation; older installations retain English until their next registration.

## Password management

Configuration → My account verifies the current password before changing it through Supabase Auth. New passwords require 12–128 characters. A remembered login is updated using the existing Android Keystore encryption; passwords are never stored in browser storage or event broadcasts.

Login → Forgot password requests a recovery code by email. The user enters that code and a new password inside the app. Supabase verifies the single-use recovery code and applies its expiry policy. This avoids recovery links pointing to localhost. The new `account-recovery` Edge Function generates recovery codes only for confirmed, unbanned accounts with an owner/manager farm membership. Responses do not disclose account existence. Requests are limited to one per minute and three per hour per normalized email. No public registration is introduced.

Supabase's hosted default email sender currently requires custom SMTP before templates can be edited and limits recipients to the project team. Recovery therefore uses the authorized Gmail adapter, independently of that default sender. **Recovery email remains unavailable until Gmail authorization is stored in Vault.** Signed-in password changes already work without Gmail.

## Gmail fallback

The existing minute scheduler calls `dispatch-alarms`. Push and email are processed independently. Existing alarm policy queues one email per recipient when an eligible alarm remains active and unacknowledged for ten minutes; this is independent of whether Firebase accepted a push. Acknowledgement or recovery cancels pending delivery. Before sending, the worker checks current membership, confirmed recipient email, account ban status and the lease. Recipient addresses come from Supabase Auth.

The Gmail adapter uses only the Gmail send permission, plus OpenID/email during the local authorization to verify the sender account. OAuth client secret and refresh token are stored together in Supabase Vault under `elmajd_gmail_oauth`; only service-role RPC access is granted. APKs contain no mailbox credentials. Delivery outcomes and provider message IDs are recorded in `email_delivery_attempts`. Temporary provider/network failures use bounded exponential retries, up to six attempts. A stable Message-ID is included; Gmail does not promise idempotent sending, so an accepted message followed by a lost response can result in a duplicate on retry. Provider acceptance is not proof of inbox delivery.

Connection → Send me a test email sends only to the signed-in user's confirmed email, with current owner/manager membership and server-side throttling. It cannot target an arbitrary address.

## Mailbox setup

1. In Google Cloud project `elmajd-automation`, enable Gmail API (already performed).
2. Google Auth Platform → Branding/Audience: configure an External app. For testing, add the sending mailbox as a test user.
3. Clients → Create client → Desktop app. Download JSON outside this repository.
4. Run `node scripts/gmail-authorize.cjs <client-json-path> <private-output-json-path>`. Open the URL it prints and authorize the sending mailbox. The helper validates OAuth state, uses PKCE, checks the returned mailbox, and saves the offline credential outside the repository without printing tokens.
5. Import that private JSON into the named Vault secret through an authorized administrative connection. Restrict local file access and remove unnecessary copies after successful import.
6. Run a self-test and verify actual inbox arrival, then perform a controlled alarm/acknowledgement test.

Google External apps left in Testing normally issue refresh tokens that expire after seven days for Gmail scopes. Switch to an appropriate production publishing configuration before unattended operation. Google may require verification depending on distribution and usage. Reauthorization can also be required after revocation, Gmail-related password changes or other Google security actions. Gmail sending quotas still apply.

## Verification and remaining acceptance

- Browser UI tests cover six tabs, role restrictions, French/English switching, unchanged MQTT command values, preserved user notes, recovery request/reset flows, mismatched-password rejection and clearing of sensitive fields.
- Live Supabase Auth tests used a temporary disposable account: password update, old-password rejection, recovery-code verification, rejection of code reuse and successful login with the reset password. The account was deleted and the temporary tester disabled immediately.
- Database transaction tests validated email claiming, leases, completion, acknowledgement checks and recovery throttling; all fixtures rolled back.
- New administrative RPCs reject anonymous and authenticated roles; service role alone can execute them. Email attempt rows have own-user/farm RLS.
- Provider tests validate UTF-8 MIME, refresh-token reuse, header injection rejection, transient/permanent errors, eligible-only recovery, generic responses and alarm authorization checks.
- Security advisor: the private throttle table deliberately has no client RLS policies; no direct client access is granted. Existing role-checked SECURITY DEFINER application RPC warnings remain intentional. Leaked-password screening is not enabled in the project and is not added by this change.
- Pending: actual Gmail OAuth grant/import, actual recovery-email and fallback inbox acceptance, and installation/phone acceptance of 1.10.0. Device background/force-stop limitations from 1.9.2 still apply.

## Build and handover

GitHub Actions build [41231110422](https://github.com/MahdiGU/MQTT-OPTA-Dashboard/actions/runs/41231110422) succeeded for source commit `e086dbe`. The named APK is `ElMajd-Automation-1.10.0.apk`, 5,992,397 bytes, SHA-256 `86f7a0f7d1c35bfef2ca2b878d360ab33fb0bf6e6c9a5e84a40b82cdbce6a7ef`. Packaged `index.html`, `i18n.js`, `phase5.js` and `account.js` match the tested sources byte for byte. Local handover: `artifacts/french-1.10.0-build/` (ignored by Git).

ClickUp search is available but task comments/status updates were rejected by its daily MCP limit (100/100). Reports for localization, FCM phone acceptance and Gmail integration are retained here for later task synchronization. No ClickUp update is claimed.

Sources: [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [Google OAuth offline access and token expiry](https://developers.google.com/identity/protocols/oauth2), [Gmail scopes](https://developers.google.com/workspace/gmail/api/auth/scopes).

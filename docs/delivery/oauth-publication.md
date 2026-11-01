# Gmail sender pages and OAuth publishing

Date: 2026-11-01. Project: `elmajd-automation`.

The owner explicitly approved publication of the reviewed sender pages, their use in Google branding, and changing OAuth publishing from Test to Production. The approval described that accounts outside the test-user list could then request OAuth consent; this does not grant them app/farm access.

## Published pages

- [Sender information](https://elmajd-automation.web.app/)
- [Data-handling notice](https://elmajd-automation.web.app/privacy)
- [Pilot conditions](https://elmajd-automation.web.app/terms)

Source: `oauth-site/`. Deployment: `firebase.oauth.json`, explicitly scoped to Firebase Hosting in the existing project. Preview channel: `oauth-review`, expiring 2026-11-08. The permanent live site does not depend on that preview expiry. No existing dashboard deployment was overwritten: the site's original live channel had no published version before this deployment.

All three live routes return HTTPS 200 with the configured CSP/security headers. Phone-width rendering was reviewed. No app login, telemetry, secret, analytics script or farm data is included in these pages.

## Google configuration

Saved homepage, privacy and terms URLs above, plus authorized domain `elmajd-automation.web.app`. Google confirmed that branding changes were saved. Audience now displays **En production**. The existing developer/support contacts were preserved.

Publication is not Google verification. Gmail send access is sensitive, and Google still displays its unverified-app warning. The owner reviews and acts on authentication/consent screens personally. Limited personal-use deployments may qualify for Google's verification exception; broader distribution needs a separate readiness review.

## Credential transition

The initially authorized Gmail credential is in Supabase Vault and has passed provider/worker tests. It was issued while OAuth was in Test. A fresh grant is requested after Production publication so the earlier Test-mode expiry is not relied upon. Keep the working credential until the fresh grant is verified; update the named Vault secret only through a short-lived, authenticated administrative transfer, disable/drop that transfer afterward, and delete the helper's local credential copy.

At this report revision the fresh consent is pending; do not claim the old credential has been replaced. Normal revocation/provider-security rules can still require reauthorization after Production publishing.

References: [Google audience](https://support.google.com/cloud/answer/15549945), [Google personal-use exception](https://support.google.com/cloud/answer/13464323), [Google OAuth policies](https://developers.google.com/identity/protocols/oauth2/policies).

# Firebase Project and Android Registration

Verified: 2026-10-31

| Item | Value |
| --- | --- |
| Selected Firebase project | `elmajd-automation` |
| Project display name supplied by owner | ElMAJD Automation |
| Project number / FCM sender ID | `858445952745` |
| Registered Android package | `com.mahdi.poultrydashboard` |
| Firebase Android app ID | `1:858445952745:android:3975eeba9ae97d3893a278` |
| SDK configuration | `app/google-services.json` |

The authenticated account requested by the owner successfully listed and registered applications in this project. Registration was checked through the Firebase CLI; the downloaded configuration was checked against the expected project and package.

The SDK configuration contains client identifiers and a client API key. It does not contain Firebase administrator credentials, OAuth refresh tokens or a server private key. Client configuration alone cannot dispatch server alarms.

## Remaining integration

1. Add the Google Services build plugin and Firebase Messaging Android SDK.
2. Implement messaging token generation/rotation and authenticated token registration in Supabase.
3. Implement notification channels and foreground/background message handling.
4. Configure protected server FCM authorization, then implement and schedule the delivery worker.
5. Test a real notification with the app open, backgrounded and closed; record provider acceptance separately from user receipt.

No APK was changed by registration alone. Push delivery is not yet enabled.

## Earlier project attempt

The setup initially created a separate Google Cloud project named `elmajd-automation-pilot`, but adding Firebase returned a permission error. The owner subsequently created and selected `elmajd-automation`. Only the selected project is used in the Android client configuration. The earlier Cloud project was left intact and no billing services were configured for it by this workflow.

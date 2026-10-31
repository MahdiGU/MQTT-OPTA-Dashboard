# Notification Delivery and Credential Rotation

## 1. What Firebase Cloud Messaging means

Firebase Cloud Messaging (FCM) is the service that sends an Android notification even when the ElMAJD application is in the background or closed. Supabase remains the source of alarm truth; FCM is only the delivery channel.

The implementation requires:

1. A Firebase project for ElMAJD Automation.
2. Registration of the Android application package.
3. Firebase configuration in the Android build.
4. Registration of each phone's FCM token in Supabase under the authenticated user/farm.
5. A server-side Supabase Edge Function or backend worker that sends the alarm notification using protected Firebase credentials.
6. Removal of expired device tokens and logging of delivery attempts.

Authorization to configure FCM means the owner permits creation/configuration of that Firebase project and the required server-side credentials. No Firebase administrative credential may be placed inside the APK or public repository.

## 2. What the email provider means

Push notifications can be disabled by the phone, blocked by battery settings or fail because the phone has no network connection. The proposed policy therefore sends a fallback email when a critical temperature, cooling-unavailable or controller-offline alarm remains unacknowledged.

An email delivery provider is the server-side service that actually sends this message. Examples include Resend, Brevo or SendGrid. The owner needs to choose one provider, verify the sender/domain if required and place its API credential in Supabase secrets. The Android app does not receive that credential.

For the pilot, the simplest decision is:

- approve FCM as the primary notification channel;
- choose one transactional email provider for critical fallback;
- keep SMS disabled;
- send alerts to the owner/admin and manager accounts.

## 3. What credential rotation means

Credential rotation means replacing a password, secret or key that may have been exposed, updating every authorized component to use the replacement, testing the replacement and then revoking the old value.

The supplied Arduino source contained populated Wi-Fi and MQTT connection values. The repository copy is redacted, but redaction does not make the original values private again. The tracked Android build also contains a development signing-store password that should not remain embedded in a public repository.

Recommended sequence:

1. Create a new device-specific EMQX password and verify least-privilege topic ACLs.
2. Update the Opta with the new MQTT credential and verify telemetry plus command subscription.
3. Revoke the old EMQX credential.
4. Change the pilot Wi-Fi password if the supplied source has been shared outside the trusted project team; update the Opta and other authorized devices.
5. Rotate the EMQX webhook secret and EMQX HTTP API credential if either was ever copied into source, attachments, screenshots or messages beyond the trusted administrators.
6. Store replacement Edge Function values only through Supabase project secrets.
7. Remove the development keystore password from `app/build.gradle.kts`; load it from a non-versioned Gradle property or environment variable. Production signing must use a separate protected key.
8. Run a secret scan and record only the rotation date and credential identifier, never the new value.

The MQTT client ID is an identifier, not normally a password. It should still be unique per controller, but it does not need secrecy. The MQTT password, Wi-Fi password, webhook secret, API secret and signing-key passwords do require secrecy.

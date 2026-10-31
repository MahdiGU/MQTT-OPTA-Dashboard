# Pilot Scope and Alarm Policy

Decision record: ADR-P0-001  
Status: Pilot temperature and delivery policy approved
Effective scope: one farm, one poultry house, one Arduino Opta controller, one owner/admin and one manager

## 1. Pilot scope

The pilot provides continuous monitoring, production and packaging records, alarms, Android and web access, and temporary supervised control commands. Remote commands remain available only for testing the current installation.

Remote command controls must:

- require an authenticated farm member with owner/admin or manager role;
- accept only an explicit allow-list of plain-text commands;
- publish with MQTT QoS 0 and retain disabled;
- create a server-side audit record with requester, time, payload and delivery result;
- be used only while an authorized person is present and able to observe the equipment;
- never be presented as proof that physical equipment is running.

Command acknowledgement, command expiry, physical feedback, equipment-specific interlocks and fail-safe behavior remain mandatory before any unsupervised or production control use.

## 2. Operating window and recipients

- Alarm evaluation runs 24 hours per day, 7 days per week.
- The pilot has no quiet hours.
- Owner/admin and manager receive pilot alarm notifications.
- Every authorized user may acknowledge an alarm.
- Owner/admin and manager may configure farm/house alarm thresholds.
- Farm/house overrides are supported, with the values below used as defaults.

## 3. Recommended pilot alarm matrix

| Alarm | Activation | Recovery and hysteresis | Delivery and repetition |
|---|---|---|---|
| Temperature warning | Temperature is at least 30.0 C for 5 minutes | Temperature is below 29.0 C for 5 minutes | In-app alarm and push to both pilot users. Repeat after 30 minutes while active and unacknowledged. |
| Temperature critical | Temperature is at least 33.0 C for 2 minutes | Temperature is below 32.0 C for 5 minutes | Immediate push. Repeat every 10 minutes while unacknowledged. Send email fallback after 10 minutes without acknowledgement. |
| Controller offline | No valid telemetry for 5 consecutive minutes | One valid authenticated telemetry message is accepted | Push immediately. Repeat after 15 minutes while unacknowledged. Send email fallback after 10 minutes. |
| Temperature sensor fault | The device reports a fault or invalid/out-of-range value for 2 consecutive samples | 2 consecutive valid samples | Push immediately. Repeat after 30 minutes while unacknowledged. |
| Cistern or silo low | Its binary point-level input remains 0 for 5 minutes | The same input remains 1 for 5 minutes | In-app alarm and push. Repeat after 60 minutes while active and unacknowledged. |
| Cooling unavailable | Temperature is at least 30.0 C and I7 remains 0 for 2 minutes | I7 remains 1 for 2 minutes, or temperature falls below 29.0 C | Critical push. Repeat every 10 minutes while unacknowledged and send email fallback after 10 minutes. |

## 4. Semantics and exclusions

- I2-I6 are binary point-level sensors. `1` means full/material detected and `0` means empty/not detected. They are not continuous percentages.
- I7 is a 24 V normally-open auxiliary contact. `1` means cooling is working and `0` means not working.
- I7 equal to 0 alone is not a failure alarm. Cooling unavailable is evaluated only when cooling is expected, represented for the pilot by temperature at or above 30.0 C.
- Fan relay/LED state is control status only. Fan-failure alarms are disabled until independent running feedback is installed.
- Low-temperature alarming is deferred because no threshold has been approved.

## 5. Notification architecture

1. A server-side alarm engine evaluates validated telemetry and device freshness.
2. The engine creates or updates one alarm event per condition and suppresses duplicates.
3. Supabase stores state transitions, measurements, threshold configuration and delivery attempts.
4. The Android and web clients show the in-app alarm center.
5. Firebase Cloud Messaging is the primary out-of-app channel.
6. Email is the fallback/escalation channel for critical temperature, cooling unavailable and controller offline.
7. SMS is deferred for the two-user pilot unless push and email prove insufficient.

## 6. Acknowledgement and resolution

- Acknowledgement records the user and time and suppresses routine repetitions.
- Acknowledgement does not clear the physical condition.
- Recovery occurs automatically only after the applicable recovery condition and delay are satisfied.
- Alarm history retains detection, first notification, acknowledgement, recovery and resolution timestamps.
- A new breach after recovery creates a new alarm event.

## 7. Approval record

| Item | Decision | Approver | Date |
|---|---|---|---|
| Two-stage 30/33 C policy | Approved | Mahdi Guermazi | 2026-10-31 |
| Delays and hysteresis | Approved as specified in this document | Mahdi Guermazi | 2026-10-31 |
| Firebase Cloud Messaging | Approved as primary Android push channel | Mahdi Guermazi | 2026-10-31 |
| Email provider | Gmail selected for fallback delivery; project mailbox supplied privately | Mahdi Guermazi | 2026-10-31 |
| SMS deferred | Approved for pilot | Mahdi Guermazi | 2026-10-31 |

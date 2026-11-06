# ElMAJD Automation - System Specification v0.5

Issued 2026-11-06. Controlled working baseline. Operational acceptance pending.

## System specification book

Industrial poultry-house monitoring, shared production records and supervised pilot commands.

| REVISION | ISSUED | IMPLEMENTATION BASELINE |
| --- | --- | --- |
| 0.5 | 06 November 2026 | Android 1.12.0 (26)<br>Opta 4.1.0-feed-chains |

Controlled working baseline. This revision reconciles approved requirements with development evidence. Software delivery is not field commissioning, business acceptance or production release approval.

Pilot: one farm, one poultry house, one Arduino Opta, one AFX00005 expansion and two users. Owner/admin: Mahdi Guermazi. Manager: Adnen Guermazi.

Supersedes specification v0.4 of 01 November 2026 for requirements and status.

## Document control and revision

Purpose: provide one current functional and technical baseline for the developed system, including implemented behavior, approved rules, known limitations and acceptance gates.

| Item | Controlled value |
| --- | --- |
| Document owner | Mahdi Guermazi, owner/admin |
| Operational pilot manager | Adnen Guermazi |
| Review date / cut-off | 06 November 2026. Implementation evidence through e0c3a9f. |
| Working branch | Opta_Feed_Chain_Expansion |
| Application build evidence | Source e0c3a9f. GitHub Actions 42181097343. |
| Issue status | Working baseline updated from development; no new owner acceptance is inferred |
| Secret handling | No passwords, access/refresh tokens, private keys or real production totals are included |

### Revision history

| Version | Change |
| --- | --- |
| 0.1 | Initial system requirements and conceptual blueprint. |
| 0.2 | Supervised command scope, pilot I/O, business rules and roles clarified. |
| 0.3 | Manager editing, fixed GMT+1 and carton receipts clarified; alarm policy proposed. |
| 0.4 | Replaces proposed architecture with the implemented cloud path; records approved/deployed alarms, FCM/Gmail, firmware metadata, six-tab Android UI, dated flock ledger, opening-reference cartons, password recovery, verification and remaining gates. |
| 0.5 | Adds AFX00005 feed chain monitoring and field acceptance. Updates five-minute history and command recovery evidence. |

Status terms: APPROVED = agreed requirement. IMPLEMENTED = source/deployment evidence exists. VERIFIED = stated test evidence exists. PENDING = acceptance or implementation is still missing. These terms are not interchangeable.

## Reading guide and contents

Use the requirements sections to assess behavior; use the evidence and acceptance sections to decide whether a milestone can close. The PDF is the review copy; the companion Markdown and JSON preserve the editable baseline.

| Pages | Subject |
| --- | --- |
| 4 | Scope, operating limits and terminology |
| 5-6 | Architecture and communication interfaces |
| 7-8 | Onboard I/O and AFX00005 feed chain feedback |
| 9-11 | Firmware, telemetry contract and time/resilience |
| 12-14 | Cloud data, Android screens, accounts and permissions |
| 15-17 | Production, flock changes and carton inventory |
| 18-19 | Alarm matrix and notification workflow |
| 20-21 | Security, release, reliability and operations |
| 22-23 | Evidence matrix and phase roadmap |
| 24 | Acceptance requirements |
| 25 | Open issues and change control |
| 26 | References and delivery identifiers |

### Precedence

The owner's later confirmed decisions take precedence over earlier proposals. This revision uses the latest delivery report and actual implementation sources when older phase reports describe historical pending work. A difference between an approved requirement and current code is recorded as a gap, not silently treated as approval.

### Traceability

Requirement identifiers in this book group related behaviors. Repository paths and test names on pages 22 and 26 provide implementation evidence. ClickUp remains the work-tracking system; its task statuses do not replace signed or recorded acceptance.

All development and acceptance dates in this issue are explicit. Production-day calculations use fixed GMT+1 year-round; audit/telemetry timestamps use UTC.

## Purpose, scope and definitions

- SCP-01: Monitor temperature, three water cisterns, two feed/alveole silos, cooling auxiliary feedback eight displayed fan/control indicators and 12 feed chain running feedback signals.
- SCP-02: Store validated telemetry and shared production, mortality, flock, packaging, alarm and audit records in Supabase.
- SCP-03: Provide Android access now; retain the secured web dashboard as Phase 6 work, not completed Android/web parity.
- SCP-04: Continue server alarm evaluation independently of whether an Android app is open.
- SCP-05: Retain supervised test commands with plain MQTT strings, QoS 0 and retain off.

### Explicit exclusions

Automatic environmental control, unattended operational switching, independent fan-failure detection, SMS delivery, power-loss-safe device buffering and production-approved remote control are not delivered by this pilot.

| Term | Meaning |
| --- | --- |
| Stock / Sortie | Eggs in storage / eggs dispatched during the production day. |
| Production / rate | Calculated eggs / calculated eggs divided by the day's remaining flock. |
| Full / empty | Binary sensor interpretation. The fill illustration is not a measured percentage or volume. |
| Fan/control state | Relay or LED command/indication state, not confirmed fan rotation. |
| Cooling working | I7 auxiliary contact active; no water-flow or pressure measurement is claimed. |
| Feed chain running | High signal on the assigned AFX00005 digital input confirms chain running feedback. |
| Sent / delivered | Provider or broker acceptance differs from physical execution or human receipt. |

Pumps, lighting, additional houses and independent fan rotation feedback remain future work. Existing schema support for membership across farms is not evidence of full multi-device command routing.

## Implemented system architecture

ARC-01: The Opta talks MQTT to EMQX. EMQX forwards telemetry through an HTTPS webhook. Supabase is the shared source of truth; Android uses Supabase Auth, REST/RPC and Realtime.

[Vector diagram included in the PDF.]

### Four separate responsibilities

- Opta: sample onboard and AFX00005 inputs, convert temperature, timestamp/buffer frames and apply received pilot commands.
- EMQX: authenticate MQTT clients, authorize topics, route messages, forward telemetry and accept server-side publish requests.
- Supabase: validate identity/schema, deduplicate history, maintain latest state and five-minute chart readings, enforce business rules, evaluate alarms and audit delivery.
- Android: display authorized cloud data, submit validated business/configuration actions and show native push notifications.

Supabase does not run as a permanent MQTT subscriber in this deployment. Short-lived Edge Functions receive HTTP requests; no extra always-on MQTT bridge service is required. The public sender-information website is not the secured farm dashboard.

## Communication interfaces

| Interface | Transport / format | Authentication / purpose |
| --- | --- | --- |
| Sensors -> Opta | 0-10 V analog; 24 V binary electrical signals | Physical installation; no network authentication. |
| AFX00005 -> Opta | Opta AUX expansion bus | First expansion slot. Digital running feedback for 12 chains. |
| Opta <-> EMQX | MQTT over TLS, port 8883; Wi-Fi in current firmware | Device MQTT username/password; unique registered client ID. |
| Telemetry / status | opta/outputs JSON; opta/status online/offline text | Telemetry QoS 0, retain false. Status/LWT is retained; the command retain rule does not apply to status. |
| EMQX -> ingest-mqtt | HTTPS POST; topic, clientid and payload envelope | Protected x-emqx-webhook-secret header; enabled device/topic registry. |
| Android <-> Supabase | HTTPS Auth, REST/RPC; WSS Realtime | Supabase user access token, farm membership and RLS. |
| Android -> command function | HTTPS JSON request containing a payload string | Validated user session and role; command audit. |
| Command function -> EMQX | HTTPS /api/v5/publish | Server-only EMQX API identity/secret. |
| EMQX -> Opta commands | opta/cmd; plain text such as D0 ON | MQTT subscription; QoS 0 and retain false, fixed server-side. |
| Alarm worker -> providers | HTTPS FCM HTTP v1 / Gmail API | Protected service-account / mailbox OAuth credentials. |
| Opta -> NTP | DNS, then UDP/123; local UDP port 2390 | Public time service; validates response before accepting UTC. |

### Pilot identifiers

Farm slug elmajd-poultry; house slug house-01; device and MQTT client ID opta-control-01. Supabase project zlmaombpfdznambrgqiv; Firebase project elmajd-automation. These identifiers are not passwords.

The proposed elmajd/{farm}/{house}/{device}/... topic hierarchy is future multi-device routing work. The existing pilot still uses opta/outputs, opta/status and opta/cmd.

## Hardware and logical I/O schedule

HW-01. The onboard Opta inputs keep the assignments below. The AFX00005 provides a separate set of terminals for feed chain running feedback, mapped on the next page.

| Channel | Signal / equipment | Meaning / telemetry |
| --- | --- | --- |
| I1 / A0 | PT100 via 0-10 V transmitter | i1.volts, i1.temp_c, i1.fault; analog, not digital. |
| I2 / A1 | 24 V PNP/NO; cistern 1 | inputs.I2; 1 full/detected, 0 empty. |
| I3 / A2 | 24 V PNP/NO; cistern 2 | inputs.I3; same binary meaning. |
| I4 / A3 | 24 V PNP/NO; cistern 3 | inputs.I4; same binary meaning. |
| I5 / A4 | 24 V PNP/NO; silo 1 | inputs.I5; 1 material detected, 0 empty. |
| I6 / A5 | 24 V PNP/NO; silo 2 | inputs.I6; same binary meaning. |
| I7 / A6 | 24 V NO auxiliary contact; cooling | inputs.I7; 1 working, 0 not working. |
| I8 / A7 | Reserved | inputs.I8 transmitted; no approved equipment assignment. |
| D0-D3 / L0-L3 | Four relay states + four LED states | Eight displayed control indicators; not eight independently confirmed fan-running inputs. |

### Temperature baseline and calibration

HW-02: Approved conversion is T(C) = -50 + 15 x input volts. Examples: 0 V = -50 C; 5 V = 25 C; 10 V = 100 C. The firmware uses 12-bit ADC sampling, 16-sample averaging and its approved divider/reference constants.

Required installed-chain accuracy remains +/-0.5 C, pending a trusted field comparison. The owner waived manufacturer/model paperwork as a pilot blocker; that waiver does not prove accuracy or replace electrical approval.

Final terminal numbers, cable/common/shield details, supply/protection/UPS sizing, grounding and installation-ready schematic remain pending. Level sensitivity is adjusted manually at each sensor.

## Feed chain feedback

FCH-01. Use one Arduino Opta AFX00005 (D1608E) digital expansion in the first slot immediately to the right of the base Opta. Monitor one chain per level across four rows. The terminals below are on the expansion.

| Rangée | Étage 1 | Étage 2 | Étage 3 |
| --- | --- | --- | --- |
| 1 | I1 | I2 | I3 |
| 2 | I4 | I5 | I6 |
| 3 | I7 | I8 | I9 |
| 4 | I10 | I11 | I12 |

FCH-02. Each input receives a running feedback signal. High means En marche and low means À l’arrêt. I13-I16 are unassigned. Verify the signal interface and terminal mapping against the Arduino specifications and the final cabinet drawing.

### Firmware and cloud contract

FCH-03. Read the expansion with Arduino_Opta_Blueprint 0.2.9 in the normal five-second capture cycle. Capture all input bits from one successful bus read. A missing module or failed read produces an unavailable reading. Capture and replay use the existing device identity and frame ordering.

FCH-04. Schema 2 adds optional feed_chains, a 12-bit integer from 0 to 4095. Bit 0 maps to I1 and bit 11 to I12. Zero represents 12 low inputs. JSON null means unavailable. Ingestion accepts earlier firmware that omits the field and converts malformed values to null. Supabase stores the reading and its receipt time in raw telemetry and source-ordered device_latest.

### Android display and commissioning

FCH-05. In État > Chaînes d’aliment, display all 12 signals in four rows with three levels, input labels and text states. Show Indisponible for missing or invalid data, an offline controller, an unavailable cloud session or a reading aged 20 seconds or more. Use capture time when present and the receipt time of that measurement otherwise. This view is read-only.

Build and automated checks passed. Field acceptance requires uploading 4.1.0 to the installed Opta and testing each of the 12 physical feedback inputs in Android 1.12.0. Record the results under ACC-FCH.

## Opta firmware architecture

FW-01: Development evolved the supplied v3.3 sketch into modular firmware. Current source version is 4.1.0-feed-chains, telemetry schema 2, built with Arduino IDE or Arduino CLI.

| Module | Responsibility |
| --- | --- |
| Config.h | Scoped identity, topic/timing constants, private credential placeholders and temperature mapping. |
| FirmwareTypes.h | Shared frame and sensor-reading structures. |
| IoManager | I1 conversion, onboard digital inputs, AFX00005 feedback, relay/LED states and connection indications. |
| TimeSync | Non-blocking NTP, retries, response validation and UTC capture. |
| TelemetryBuffer | Bounded 120-frame oldest-first RAM queue and dropped-frame counter. |
| TelemetryCodec | Versioned JSON encoding; null timestamps/temperature and replay diagnostics. |
| Main .ino | Wi-Fi/MQTT reconnect loop, five-second capture, command parser and queue drain. |

### Runtime requirements

- FW-02: Capture every 5 seconds even during network loss. Sequence numbers identify capture order, not publish order.
- FW-03: Reconnect Wi-Fi/MQTT without replacing the captured values of queued frames. After reconnect, drain oldest first.
- FW-04: Initialize relay outputs off on boot. This startup behavior is not a full equipment fail-safe design.
- FW-05: Keep field credentials out of Git. Populate only a protected commissioning copy.

### Build baseline and known field evidence

Verified toolchain: Arduino CLI 1.4.1, arduino:mbed_opta:opta core 4.6.0, ArduinoMqttClient 0.1.8 and Arduino_Opta_Blueprint 0.2.9. Identity mismatch was corrected by the owner. NTP success was confirmed after the Opta/Mbed UDP endPacket byte-count handling fix. Final commissioned binary checksum and full field test record remain required.

## Telemetry and command data contract

MSG-01: Preserve the original outputs, leds, i1 and inputs objects. Firmware metadata is additive. The following synthetic frame illustrates the current contract; captured_at is Unix UTC seconds, not an ISO string.

```json
{
  "schema": 2, "firmware": "4.1.0-feed-chains",
  "farm_id": "elmajd-poultry", "house_id": "house-01",
  "device_id": "opta-control-01", "boot_id": "example-boot-01",
  "seq": 12, "captured_at": 1793449800,
  "up_s": 345, "rssi": -45, "replay": 0,
  "buffer": {"pending": 0, "dropped": 0},
  "outputs": {"D0":0,"D1":1,"D2":0,"D3":0},
  "leds": {"L0":1,"L1":0,"L2":0,"L3":0},
  "i1": {"volts":5.00,"temp_c":25.0,"fault":0},
  "inputs": {"I2":0,"I3":1,"I4":0,"I5":0,"I6":0,"I7":1,"I8":0},
  "feed_chains": 2081
}
```

| Field / rule | Meaning |
| --- | --- |
| schema / firmware / identity | Version and registered farm/house/device attribution. |
| boot_id + seq | Deduplication across reconnects and sequence resets at reboot. |
| captured_at / up_s / rssi | Source UTC, source uptime and Wi-Fi signal quality. |
| replay / buffer | Historical replay flag, pending frames and overflow loss counter. |
| feed_chains | Optional expansion mask. 2081 reports I1, I6 and I12 high. |
| Faults / unknowns | Before time synchronization captured_at is null. Faulted temperature is null with fault=1; do not substitute a valid zero temperature. |

### Plain-string command grammar

MSG-02: D0-D3, LED0-LED3 or ALL, followed by ON, OFF, TOGGLE, 1 or 0. The HTTP wrapper is JSON, but the actual MQTT payload is plain text. QoS is 0 and retain is false. No command ID, expiry or device acknowledgement is supplied by this grammar.

Broker acceptance is not evidence of execution. QoS 0 is best effort; command retry/TOGGLE must not be treated as idempotent equipment operation.

## Time, freshness and resilience

| Requirement | Implemented behavior |
| --- | --- |
| TIME-01: Source time | captured_at comes from NTP UTC when valid; received_at is cloud receipt; recorded_at prefers source capture and otherwise uses receipt. |
| TIME-02: Production calendar | All production/flock/carton dates and daily/weekly grouping use fixed GMT+1 (Etc/GMT-1), without DST. |
| TIME-03: Identity / latest | Match enabled device/client/topic registration. Older captured frames may enter history but cannot replace a newer device_latest state. |
| TIME-04: Uniqueness | Current-frame key is farm_id, device_id, boot_id, seq; legacy frames retain compatibility deduplication. |
| TIME-05: Alarm freshness | Unique, matched, non-replay frames within 30 seconds of receipt with advancing source time qualify. Receipt-time fallback remains when source time is absent. |
| TIME-06: Persistence | A fresh-sample gap over 30 seconds resets pending duration/consecutive-sample evidence. Active events require a valid recovery sequence. |

### Device buffer limitations

BUF-01: Capacity is 120 frames, approximately 10 minutes at five-second sampling. Overflow drops the oldest frame and increments buffer.dropped. The queue is RAM-backed and is lost on power cycle. No persistent flash queue is claimed.

BUF-02: QoS 0 provides no broker-level delivery guarantee. Cloud deduplication prevents duplicate inserts; it does not recover an unobserved frame or prove that every attempted publish reached the database.

### Offline rule

OFF-01: The server evaluates no fresh accepted measurement for 5 minutes as offline, independently of MQTT status. A newly registered device receives a five-minute grace period. Minute scheduling can add up to about one minute to a timer deadline, excluding network/provider delays.

Online status messages or replayed backlog do not prove a current fresh measurement. The Android UI must retain last values with stale/source-time context rather than presenting old values as current.

## Cloud storage and application APIs

| Data group | Records / responsibility |
| --- | --- |
| Organization / devices | farms, poultry_houses, farm_members, devices; farm membership, logical identity and registered topics. |
| Telemetry | telemetry raw unique frames; device_latest source-time-guarded current state; telemetry_five_minute chart buckets. |
| Production / flock | daily_production; flock_settings current count; immutable flock_adjustments and business audit. |
| Packaging | carton_receipts; calculated carton_balance/opening reference/shortfall. |
| Alarms / notifications | alarm_settings, alarm_events, alarm_audit, alarm_configuration_audit, alarm_deliveries; phone registrations and provider attempts. |
| Protected internals | Alarm clocks/state, recovery throttles, worker configuration and encrypted Vault secrets. |

### Cloud requirements

- DB-01: ingest-mqtt validates the protected webhook, client/topic and telemetry attribution before service-only writes. Invalid or disabled identities must not mutate telemetry.
- DB-02. Keep the latest sample per device and UTC five-minute interval, including temperature, voltage and onboard binary states. Update that row directly from the incoming sample. Store older replay in raw history and preserve the newer chart reading. Keep the sample count.
- DB-03: Client reads require user authentication and farm-scoped RLS. Privileged write RPCs must verify identity, membership and role explicitly.
- DB-04: Business changes run transactionally; invalid dependent history rolls back the full change. Audit records are not directly editable by client applications.
- DB-05. Realtime updates shared state, including the feed chain reading in device_latest. Authenticated REST reconciles missed events and reconnects. DB-06. Retain feed chain readings in telemetry.raw_payload and device_latest.raw_payload with the receipt timestamp of the individual frame.

Shared storage is implemented. Exact retention, backup service level, restore drill, archival/export and disaster-recovery objectives remain open. Cloud storage must not be described as an unconditional permanent-retention guarantee.

## Android platform and screens

APP-01: ElMAJD Automation 1.12.0 (26), package com.mahdi.poultrydashboard. Minimum Android API 26; compile/target API 35; Java 17, OkHttp and Firebase Messaging. The UI is bundled HTML/CSS/JavaScript in a native WebView, backed by native authenticated cloud clients.

| Tab | Required / implemented content |
| --- | --- |
| Overview | Live temperature, latest production/rate with date, current flock, daily/weekly production performance and interactive available-carton tray. |
| Status | Temperature, separate cisterns I2-I4, silos I5-I6, interactive cooling I7, eight relay/LED fan-control indicators and 12 feed chain states grouped by row and level. Tap supported equipment for history. |
| Production | Date, Stock, Sortie and mortality; server preview, history pages, audited editing and role-limited deletion. No direct production or actual-flock input. |
| Alarms & History | Active/recovered/acknowledged events, evidence times, acknowledgement and notification-tap navigation. |
| Configuration | Dated flock changes, categorized reason/reference, carton receipts/adjustments, temperature thresholds, account password and language. |
| Connection | Cloud session and Realtime diagnostics, source/receipt freshness, controller state, sequence/uptime/RSSI, push/Gmail readiness and self-only tests; pilot command controls. |

### Charts and mobile behavior

APP-02: Sensor history is the latest 24 hours in five-minute cloud readings selected under DB-02; scale adapts to observed min/max. Missing/invalid data remains a gap. Binary states remain 0/1 rather than inferred volumes. Production charts switch daily/weekly; weekly mortality is summed and production rate is the average of recorded daily rates.

APP-03: French is default with a persistent English option. Provide 44-pixel targets, visible focus, reduced motion, status announcements and accessible measurement/range summaries. Physical TalkBack, large-text and device acceptance remain pending.

Earlier 12-hour UI text belongs to historical versions; the current approved chart baseline is 24 hours.

## Accounts, sessions and permissions

AUTH-01: Sign in with Supabase email/password. Android no longer requires direct MQTT credentials in the cloud mode. Broker client ID, username/password and topics are device/server deployment settings; cloud and broker accounts are separate.

| Action | Owner/admin | Manager |
| --- | --- | --- |
| Read authorized farm data / acknowledge alarms | Yes | Yes |
| Create or edit production, including historical entries | Yes | Yes |
| Delete production | Yes, audited | No |
| Initialize / adjust flock; configure thresholds | Yes | Yes |
| Add or edit dated carton receipts | Yes | Yes |
| Delete carton receipts | Yes, audited | No |
| Send supervised pilot commands | Yes | Yes |
| Read/update other farms without membership | No | No |

### Password management and remembered login

AUTH-02: Remembered credentials are encrypted with Android Keystore; backup is disabled to avoid copying installation identity/credentials. Signed-in password changes verify the current password first and update remembered login if enabled.

AUTH-03: Recovery uses a Gmail-delivered Supabase single-use code entered inside the app, not a localhost reset link. Confirmed, eligible owner/manager accounts receive mail; responses are generic, with one request/minute and three/hour per normalized address. Codes and new passwords must never enter logs.

AUTH-04. The command endpoint checks the authenticated user's farm membership and permits the owner and manager roles. Android uses the cloud session to enable sending during a Realtime reconnect. Pilot commands remain supervised.

Multi-farm membership is supported by the data model and read authorization. Current command routing is configured for the single pilot farm/topic; full multi-farm selection/routing remains future work.

## Production and mortality rules

| Requirement | Authoritative behavior |
| --- | --- |
| PROD-01: Inputs | Production date and nonnegative whole Stock, Sortie and mortality. Inputs must fit the supported integer range (0-2147483647). |
| PROD-02: Calculated eggs | Stock(today) + Sortie(today) - Stock(latest earlier saved date). With no earlier record, calculated eggs = 0. |
| PROD-03: Missing days | Use the latest available earlier record, not an assumed zero stock and not a requirement for an immediately preceding calendar date. |
| PROD-04: Flock/rate | Deduct mortality from the day's available flock. Rate = calculated eggs / day's remaining flock x 100, rounded to 2 decimals. Zero flock permits only zero eggs and rate 0. |
| PROD-05: Validation | Reject negative calculated production, production above remaining flock, excessive mortality, future dates and duplicate farm/date. |
| PROD-06: Historical change | Recalculate affected stock predecessors, mortality/flock snapshots, rates and cartons atomically. Reject any change that makes a later record invalid. |

### Worked example

Previous stock=1,000, current Stock=1,250, Sortie=500: production=750 eggs. If pre-mortality flock=1,002 and mortality=2, remaining flock=1,000 and daily rate=75.00%. This is an illustrative calculation, not live farm data.

### Preview and history

PROD-07: The read-only preview reads full saved history, including dates outside the loaded phone page. Saving revalidates the transaction; a preview is not a reservation. Stale responses cannot re-enable an invalid save.

PROD-08: History loads in 30-record cursor pages without replacing Overview's latest records. Owner and manager may edit historical Stock/Sortie/mortality; production date stays fixed on edit. Changing a date requires owner deletion/recreation. No month-end lock is implemented; historical corrections remain audited.

## Dated flock configuration

FLOCK-01: Actual flock belongs in Configuration. Enter effective date, actual count after the change, category and note/reference. Mortality belongs in Production and is not a second manual flock adjustment.

| Category | Meaning / validation |
| --- | --- |
| initial | Initial flock and start date before first production; cannot reinitialize an existing flock. |
| received | Birds received; must increase current count. |
| transfer_in | Inbound transfer; must increase current count. |
| transfer_out | Outbound removal/transfer; must decrease current count. |
| correction | Reasoned correction of count; note required. |
| reference | System-imported zero-delta migration baseline; not an additional flock movement. |

### Transaction and audit rules

- FLOCK-02: Compute movement delta from entered actual-after count minus current count. Preserve old/new counts, delta, effective date, actor, category, note and request ID.
- FLOCK-03: Apply delta to relevant production flock snapshots on/after the effective date; preserve earlier dates and recalculate later rates in one transaction.
- FLOCK-04: Historical production before a later movement must exclude that future movement. Reject production before an explicit initial flock date.
- FLOCK-05: Repeating the same request ID with identical data is idempotent; reusing it with different data fails. Clients cannot edit/delete ledger rows directly.
- FLOCK-06: Owner/admin and manager use the authorized RPC. Direct authenticated writes to flock_settings are revoked.

Upgrade to Android 1.11.0 for flock configuration: older APKs use a superseded direct-table write path. The reference migration preserved existing production rows/totals and the current flock; full business reconciliation remains an owner acceptance test.

## Carton inventory and opening reference

PACK-01: One carton holds 30 eggs. Consumption is ceil((calculated daily eggs / 30) x 1.10). The fixed 10% allowance is applied before rounding upward. Example: 750 eggs -> 27.5 -> 28 cartons.

| Requirement | Current rule |
| --- | --- |
| PACK-02: Opening reference | The earliest dated valid carton receipt establishes the inventory reference. No receipt means available stock is 0 and no consumption is counted yet. |
| PACK-03: Start counting | Exclude production on or before that opening date. Count consumption only from later production dates. |
| PACK-04: Daily balance | Process dated receipts and consumption chronologically. Available = max(previous available + incoming - used, 0). |
| PACK-05: Shortfall | Add max(used - previous available - incoming, 0) to a separate cumulative uncovered-use figure. Never display negative available stock. |
| PACK-06: Later receipts | Later deliveries add stock; they do not repay previously uncovered consumption. Same-day incoming is available for that day's counted use. |
| PACK-07: Receipt lifecycle | Configuration accepts positive whole cartons, date and note. Owner/manager add/edit; owner alone deletes. Preserve audit; additive retries are idempotent. |

### Inventory example

Opening date: receipt 10 cartons; that day's production is excluded. Next day: 30 eggs consume 2 cartons -> balance 8. Later usage of 12 leaves balance 0 and shortfall 4. A subsequent receipt of 5 gives balance 5; historical shortfall stays 4.

Editing/deleting the earliest receipt may move or remove the opening reference and change the entire derived balance. The user must review the recalculated result. Shortage is advisory and does not block a valid production record. No separate automatic packaging push/email alarm is claimed by the current implementation.

## Approved alarm policy

ALM-01: Owner-approved pilot defaults operate 24 hours/day, 7 days/week without quiet hours. Both pilot users receive alerts and may acknowledge. Temperature warning/critical thresholds are configurable per house; the listed timing constants are currently fixed.

| Condition | Activation | Recovery | Reminders / email |
| --- | --- | --- | --- |
| Temperature warning | Valid T >=30 C for 5 min | T <29 C for 5 min | Push every 30 min if unacknowledged; no email. |
| Temperature critical | Valid T >=33 C for 2 min | T <32 C for 5 min | Push every 10 min; email after 10 min unacknowledged. |
| Controller offline | No fresh accepted sample for 5 min | One fresh accepted sample | Push every 15 min; email after 10 min. |
| Temperature fault | Fault, missing/out-of-range T for 2 consecutive samples | 2 valid consecutive samples | Push every 30 min; no email. |
| Cistern/silo low | I2-I6 = 0 continuously 5 min | Affected input = 1 continuously 5 min | Push every 60 min; no email. |
| Cooling unavailable | Valid T >= warning and I7=0 for 2 min | I7=1 for 2 min, or valid T < warning minus 1 C | Push every 10 min; email after 10 min. |

### State and configuration rules

- ALM-02: Maintain one open event per farm/device/condition; retain evidence, activation, threshold snapshot, acknowledgement and recovery.
- ALM-03: Acknowledgement suppresses routine repeats and records user/time; it does not clear an active physical condition. Recovery follows the valid recovery rule.
- ALM-04: Threshold changes require owner/manager authorization and before/after audit; reset pending persistence evidence. Active events retain their original threshold snapshot.
- ALM-05: Do not raise fan-failure alarms without independent run feedback. I7=0 alone is not a cooling failure. Low-temperature and SMS policies remain deferred.

The state machine evaluates fresh samples; minute maintenance handles offline, reminders and escalation. Push scheduling is not a guaranteed immediate phone receipt.

## Notification delivery and lifecycle

[Vector diagram included in the PDF.]

NOT-01: The active dispatch-alarms worker processes push and email independently. Minute cron invokes maintenance and dispatch. Durable queue leases, recipient/state rechecks and provider attempt records support retry and recovery.

### Firebase Cloud Messaging

NOT-02: Register each phone against its authenticated user/farm and installation. Synchronize token rotation and permission state; disable invalid tokens. Recheck authorization before sending, record per-phone results and avoid repeating a successful phone while another retries. Native messages open Alarms; local logout suppresses messages immediately.

### Gmail fallback and recovery mail

NOT-03: Gmail API uses the authorized sender with send-only scope; protected offline credentials reside in Vault. Active, unacknowledged eligible alarms queue fallback after 10 minutes independently of push acceptance. Temporary failures use bounded retries; record provider IDs. Account recovery uses the same mail adapter.

NOT-04: OAuth now shows Production, approved sender/privacy/terms pages are live, and fresh post-publication consent replaced the Test-mode grant. Formal Google verification is not complete. Refresh grants can still be revoked or require reauthorization.

Owner-confirmed evidence: FCM self-test received; controlled scheduled Gmail fallback received in spam. API acceptance is not human receipt. Already in-flight provider messages cannot be recalled, and a lost response can cause a duplicate retry. App-closed/two-phone/OEM acceptance and normal inbox placement remain pending.

## Security and release requirements

| Requirement | Implementation / remaining condition |
| --- | --- |
| SEC-01: Transport / secrets | TLS/HTTPS/WSS; broker/API/webhook and provider credentials remain device/server-side. No service-role or provider private key in APK. Public project IDs/publishable keys are not administrative secrets. |
| SEC-02: Tenant boundaries | RLS for exposed data; member reads and role-checked RPCs. Privileged functions require explicit identity/tenant checks, restricted grants and controlled search paths. |
| SEC-03: Audit / validation | Production, receipts, flock, thresholds, alarms, command requests and provider attempts are traceable. Clients cannot overwrite audit or assert sent results. |
| SEC-04: Native client | Keystore-encrypted remembered login, disabled backup, bundled-only WebView, blocked arbitrary navigation/network/file loads and bridge cleanup. |
| SEC-05: Sender setup | Temporary credential transfer endpoint disabled, rotation/import RPC removed and generated local refresh-credential copy deleted after successful Vault update. |
| SEC-06: Pilot signer | Named test APK keeps stable pilot/debug signer for update compatibility. That public development signer is not a protected production identity. |
| SEC-07: Production release | Release signing requires protected ELMAJD_RELEASE_* environment values; normal release fails without them. CI unsigned release is compilation evidence, not an installable signed release. |

### Residual security work

Rotate potentially exposed development credentials, verify device-specific broker ACLs and private-key backup and ownership, and review advisor exceptions and leaked-password protection.

A different production signing key may prevent an in-place upgrade from the pilot installation. The release migration, account/session behavior and private signing-key handover require owner acceptance before broad distribution.

## Reliability and operations

| Requirement | Baseline / operational limit |
| --- | --- |
| OPS-01: Live data | Five-second device samples when connected; Realtime for interactive refresh, plus authenticated reconciliation. No hard end-to-end latency SLA is approved. |
| OPS-02: Background alarms | Server storage/evaluation continues with the app closed. Phone notification delivery still depends on network, permission, Google Play services and OEM policy. |
| OPS-03: Android force stop | An explicit system Force stop can prevent messages until app reopening. It differs from closing/swiping the UI. |
| OPS-04: Network interruption | Opta buffers up to 120 RAM frames; overflow/power loss can lose telemetry. Physical outage/replay testing is still required. |
| OPS-05: Cloud durability | Cloud-shared records are implemented. Retention duration, backup frequency, recovery-point/time objectives and an actual restore drill remain unapproved/unverified. |
| OPS-06: Observability | Use source/receipt freshness, ingest errors, alarm/provider attempts and cron/worker responses. Define operational monitoring, incident ownership and escalation before commissioning. |
| OPS-07: Localization | French/English and fixed GMT+1 are implemented; retain original user notes and protocol strings. Full field translation/accessibility acceptance remains pending. |
| OPS-08: Scale | Pilot is one house/controller and two users. Additional devices/farms require routing, ACL, capacity and membership acceptance; do not copy a shared device identity. |

### Normal support workflow

- Check Connection for cloud session, Realtime and provider readiness; distinguish cloud offline from controller stale.
- Inspect device_latest plus telemetry source/receipt times for sensor issues; inspect alarm_events and delivery attempts for notification issues.
- Use audited application RPCs for corrections; never repair ordinary business entries by untracked direct table edits.
- Keep a credential/key inventory without secret values and record rotation/restore results in restricted operational records.

## Implementation and evidence matrix

Evidence dates and versions refer to the recorded development and delivery checks. Field acceptance is recorded separately.

| Requirement group | Evidence | Status |
| --- | --- | --- |
| HW / FW / MSG | Modular firmware; pinned toolchain; source metadata. Owner confirmed identity and NTP fix. | Implemented; remaining field tests. |
| FCH-01 to FCH-05 | Opta 4.1.0 compilation, Android state and mapping checks, webhook validation and database replay fixture passed. Ingestion v10 deployed. | Physical mapping and loss-of-feedback tests pending. |
| TIME / DB / OFF | Replay guards and latest-value five-minute storage. Interval, duplicate, fault and receipt-time fallback tests passed. | Deployed and verified. Physical outage test pending. |
| PROD / FLOCK / PACK | phase4_production_packaging.sql, packaging_opening_reference.sql, production_preview.sql, flock_adjustments.sql. | Six total live SQL suites, including alarm/FCM, passed in rolled-back fixtures. |
| ALM / NOT | phase3_alarm_engine.sql, fcm_delivery.sql; push-worker.mjs, gmail-worker.mjs, mail-flows.mjs. | Provider/unit/transaction tests passed; owner confirmed self-test receipts. |
| APP / AUTH | Android browser, account and boundary tests. Pilot 1.11.2 sign-in and D0 ON/OFF verified with device telemetry. | Android 1.12.0 phone acceptance pending. |
| Release compilation | GitHub Actions 42181097343. Debug build, unsigned release compilation and pilot signature check passed. | Production signing handover pending. |
| Work tracking | 45 task reports posted and statuses read back; 25 achevé, 20 en cours; 13 other tasks unchanged. | Synchronized 01 November 2026; milestones remain open. |

Command role enforcement and observed pilot command results are recorded in the 04 November command recovery report. Feed chain verification used test readings.

Detailed evidence and preserved comment IDs: docs/delivery/phase-3-5-completion.md and docs/delivery/clickup-update-queue.json.

## Phases and remaining roadmap

| Phase | Delivered position | Remaining gate |
| --- | --- | --- |
| 0 - Baseline | Policies, decisions, criteria, RACI and risks documented. | Final electrical evidence, named technical accountability and credential-risk treatment. |
| 1 - Firmware | Five-second telemetry, NTP, RAM replay and AFX00005 feed chain reads. Firmware compilation passed. | I/O stimulation, trusted temperature comparison, outage/overflow/reboot and commissioned checksum. |
| 2 - Cloud | Registered identity, protected ingest, raw/latest/five-minute chart history and authoritative fresh clock. | Physical outage/replay, retention/backup objectives and restore evidence. |
| 3 - Alarms | Approved state engine, FCM, Gmail Production grant, audit/ack/recovery and providers implemented. | Controlled critical-condition delivery with app closed; two phones, permission/sign-out/OEM and inbox placement. |
| 4 - Business | Stock/Sortie/mortality, rates, dated flock and carton ledgers with audits/roles implemented. | Owner/manager reconciliation against real records and multi-phone acceptance. |
| 5 - Android | 1.12.0 with six tabs, feed chain feedback, French/account flows, paging and production previews. | Install/upgrade and device UAT; production key/backup/handover. |
| 6 - Secured web | Planned; sender notices are published separately. | Supabase Auth/RLS/Realtime client, feature parity, responsive/accessibility and web acceptance. |
| 7 - Commissioning | Planned; earlier automated evidence informs later testing. | Full integration/security, electrical sign-off, operations/restore/training and go-live acceptance. |

### Dependency sequence

Complete the remaining field and security checks alongside M3-M5 acceptance. Secured web work follows the cloud/role contract, then Phase 7 validates the complete installation. No date or assignee changes are introduced by this specification revision.

Parent phases and M0-M5 are still in progress. Completing a feature task does not close the phase gate or imply owner approval for production operation.

## Acceptance and test obligations

ACC-01: Record tester, date, phone/Android build, input/condition, expected result, actual result and objective evidence. Use isolated fixtures for synthetic business data or alarm simulation; do not inject invented live farm records.

| Gate | Required evidence |
| --- | --- |
| M1 / M2 field data | Match all I/O terminals; confirm +/-0.5 C chain; validate UTC/source times, identity, outage replay, duplicate prevention and overflow/power-cycle limits. |
| ACC-FCH / feed chains | Exercise I1-I12 individually. Verify the matching row and level shows En marche on high and À l’arrêt on low. Check Indisponible after loss of the expansion or stale data. Restore feedback and verify the state recovers. Record firmware, APK, terminal, source time and observed result. |
| M3 notifications | Critical condition follows configured delay; actual push arrives with app closed/phone locked; acknowledgement cancels queued repeats; valid recovery records history. Verify two phones, sign-out/permission denial and actual Gmail arrival. |
| M4 calculations | First entry=0; missing dates use latest earlier Stock; mortality/rate/flock movements and historical edits reconcile. Test positive inventory, opening reference, zero floor, shortfall, receipt edits/deletes and role denial. |
| M5 Android | Upgrade to 1.12.0; saved sign-in and current production remain correct; password change/recovery work; French/English, TalkBack/large text, charts/paging and background behavior verified. |
| Go-live | Electrical approval, private signing/key backup, exposed-credential treatment, backup restore, training and recorded residual-risk/command-scope acceptance. |

### Minimum business example

Initialize test flock=100. Day 1: Stock=10, Sortie=0, mortality=0 -> production=0. Day 2: Stock=20, Sortie=30, mortality=2 -> production=40, flock=98, rate=40.82%. With opening cartons=10 on day 1, day 2 consumption=2, available=8.

### Acceptance decisions

Owner accepts outcomes and any justified deviations; manager tests normal operational workflows. A pending result must remain pending. A waived criterion needs a recorded change and residual risk. Physical commands during tests remain supervised.

The 1.11.0 pilot acceptance sheet remains the reference for its original workflows. Use 1.12.0 and the ACC-FCH checks for this revision.

## Open issues and change control

| ID / type | Required next action | Accountability |
| --- | --- | --- |
| G-01 / command authorization | Owner/manager enforcement implemented. Retain the role denial evidence with the command acceptance record. | Cloud engineer and owner. |
| G-02 / hardware evidence | Commission the AFX00005 and complete ACC-FCH. Confirm the cabinet schematic, terminal labels and +/-0.5 C temperature accuracy. | Electrical/firmware roles to be named. |
| G-03 / acceptance | Complete pending M3-M5 tests with actual phones and business records; normal Gmail inbox placement remains open. | Owner and manager. |
| G-04 / operations | Choose raw telemetry, five-minute readings, business and audit retention, backups, RPO/RTO, restore tests and monitoring/incident owners. | Owner with cloud/database engineer. |
| G-05 / release security | Rotate exposed development credentials and hand over a private production signing key and protected backup/upgrade plan. | Owner and technical roles. |
| G-06 / control scope | Before unsupervised control: define command ID/ack/expiry, independent feedback, interlocks, equipment limits and fail-safe design. | Owner and qualified controls reviewer. |
| G-07 / scaling and web | Build/accept secured web parity; define farm/house/device selection, scoped topics and per-device command routing. | Phase 6/product/cloud. |
| G-08 / later enhancements | Independent fan-running feedback, persistent buffer, SMS and low-temperature policy remain deferred; packaging push/email alert policy not implemented. | Owner prioritization. |

### Resolved decisions - do not reopen as blockers

Two-stage temperature policy and FCM/Gmail choice are approved; sender grant is active in Production. Firmware transfer function is the approved baseline; manufacturer/model paperwork is waived for the pilot. Manager create/edit rights, fixed GMT+1 I7 monitoring sufficiency and the AFX00005 terminal mapping and high-signal meaning are confirmed.

Changes to safety scope, business formulas, permissions, schema or retention require a recorded decision, impact review, versioned implementation and regression evidence. Record the branch/commit and acceptance owner; no automatic merge or deployment follows approval of this book.

## References and delivery identifiers

| Artifact | Verified identifier |
| --- | --- |
| Specification baseline | v0.4 issued 01 November 2026. v0.5 issued 06 November 2026. |
| Source branch / review | Opta_Feed_Chain_Expansion. Implementation evidence through e0c3a9f. |
| Android test build | 1.12.0 (26). Source e0c3a9f. GitHub Actions 42181097343. |
| Named APK | ElMajd-Automation-1.12.0.apk, 5,999,971 bytes. |
| APK SHA-256 | fac839d34c10c3a3172e785e3d384cc32afc4d1bb3a65e0c9578f005ebe5345b |
| Firmware | opta_mqtt_control_v4_0_phase1, version 4.1.0-feed-chains, schema 2. |
| Supabase changes | Ingestion v10. Latest-value migration 20261104195046. |
| Editable specification | specification-v0.5.json and the companion Markdown in docs/specification. |
| Public sender pages | elmajd-automation.web.app, /privacy, /terms; information/consent notices only. |

### Implementation references

See the firmware README for the AFX00005 schedule. The 04 November diagnostic reports record the five-minute history change and command recovery. The phase 3-5 completion report records the earlier business, account and notification checks.

### Platform and delivery references

- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Firebase: receiving Android messages](https://firebase.google.com/docs/cloud-messaging/android/receive-messages)
- [Google: OAuth authorization and token lifetime](https://developers.google.com/identity/protocols/oauth2)
- [GitHub: current delivery and acceptance report](https://github.com/MahdiGU/MQTT-OPTA-Dashboard/blob/French_Account_Gmail/docs/delivery/phase-3-5-completion.md)
- [Arduino AFX00005 specification](https://docs.arduino.cc/hardware/opta-digital-exp)
- [Android 1.12.0 build](https://github.com/MahdiGU/MQTT-OPTA-Dashboard/actions/runs/42181097343)

This book documents the developed pilot and its residual gaps. It is not an installation wiring drawing, a safety certification, a Google verification certificate or a production release approval.

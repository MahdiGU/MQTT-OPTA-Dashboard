# Android 1.11.0 — remaining pilot acceptance

Prepared 2026-11-01 on `French_Account_Gmail`. This is a test sheet, not a record of completed phone tests. Record date, phone/Android version, tester, result and evidence for each row. Use the named `ElMajd-Automation-1.11.0.apk` (version code 23), preserving the existing pilot signer. The [delivery record](phase-3-5-completion.md) contains the build hash and automated evidence.

Mahdi is the owner/admin and Adnen is the manager. Both may create/edit production, change configuration and acknowledge alarms. Only the owner may delete production or carton receipts. Backend authorization is authoritative.

## M5 — installation, accounts and interface

| ID | Action | Expected result | Result/evidence |
|---|---|---|---|
| APP-01 | Upgrade the existing pilot installation to 1.11.0 on both phones; open and reconnect. | Correct version, saved login preserved where enabled, live values and source/receipt times shown. | Pending |
| APP-02 | Switch French/English, restart, and inspect Overview, Status, Production, Alarms, Configuration and Connection. | Chosen language persists; labels, validation and dates are consistent; stored notes and MQTT strings are preserved. | Pending |
| APP-03 | Enable large text and TalkBack; inspect tabs, forms and chart summaries. | Main actions remain usable, controls have understandable labels, measurements/ranges can be read. | Pending |
| APP-04 | Open old production pages, then return to Overview. | Older history loads without replacing the latest production shown in Overview. | Pending |
| AUTH-01 | Change an account password using its current password; reconnect with remembered login. | Current-password check required; new password works and saved login updates when enabled. | Pending |
| AUTH-02 | Request a recovery code, check inbox/spam, and reset inside the app. | No localhost redirect; single-use code and new password succeed; reused code fails. Never record codes/passwords in evidence. | Pending |
| AUTH-03 | Sign out on one phone, then sign in again. | Signed-out phone loses farm access and its active push registration; the other phone remains usable. | Pending |

## M4 — production, flock and cartons

Use a dedicated test farm or an owner-approved reconciliation plan for real entries. Do not introduce invented production or historical flock adjustments into operating records. The figures below are isolated test examples, not changes to perform against the live farm.

| ID | Action | Expected result | Result/evidence |
|---|---|---|---|
| DATA-01 | With a test flock of 100, create day 1 Stock=10, Sortie=0, mortality=0. Create day 2 Stock=20, Sortie=30, mortality=2. | First production=0. Day 2 production=40, remaining flock=98, rate approximately 40.82%. Preview agrees with saved data. | Pending |
| DATA-02 | In the same test history, skip day 3; day 4 Stock=25, Sortie=35, mortality=0. | Latest earlier stock is 20; production=40, using fixed GMT+1 calendar dates. | Pending |
| DATA-03 | Enter a negative result, production exceeding flock, excess mortality or a duplicate date. | Clear validation; no invalid record saved. A failed edit leaves dependent records unchanged. | Pending |
| DATA-04 | Manager edits a historical record; inspect later records and the other phone. | Audit identifies actor/change; downstream flock/rates recalculate and both phones refresh. Manager cannot delete. | Pending |
| DATA-05 | Owner deletes a disposable production record. | Database row is removed through the authorized workflow; mortality/downstream results reconcile and audit remains. | Pending |
| FLOCK-01 | Record a dated receipt/transfer with a note; inspect records before and after its date. | Only relevant dates include the movement. A correction requires a reason; invalid direction is rejected. | Pending |
| CARTON-01 | Add opening receipt=10 cartons; produce 30 eggs on the next production date. | Opening date is the reference; next day's consumption=ceil(30/30 × 1.10)=2, balance=8. | Pending |
| CARTON-02 | Exercise insufficient cartons, then a later receipt; edit a receipt as manager and delete a disposable receipt as owner. | Balance stays at least zero; shortfall is separate, later receipt does not repay old uncovered use; changes are audited and shared. | Pending |

## M3 — alarm delivery on actual phones

Use a controlled, separately identified alarm test. Prefer an isolated test device/farm with no connected actuators. Simulating telemetry must not issue commands or change real equipment. Provider tests and the owner's earlier self-test confirmations are already recorded; the rows below test the remaining installed-device behavior.

| ID | Action | Expected result | Result/evidence |
|---|---|---|---|
| ALARM-01 | Allow notifications on both phones. Generate a controlled critical condition lasting the configured activation delay; close the app normally and lock the phone. | Server creates one active alarm and phones receive push. Record source/event/delivery/phone times separately. | Pending |
| ALARM-02 | Leave an eligible test alarm active and unacknowledged for ten minutes. | Gmail fallback is sent according to policy; inspect inbox and spam and record actual arrival independently of API acceptance. | Pending |
| ALARM-03 | Acknowledge the controlled alarm before fallback, then recover the simulated condition with the configured hysteresis/delay. | Pending routine deliveries cancel, acknowledgement records actor/time, active condition is not falsely cleared by acknowledgement, recovery is recorded separately. | Pending |
| ALARM-04 | Deny notification permission on one phone; inspect Connection, then restore permission. | Permission problem is visible; no false claim of receipt; registration/delivery recover when allowed. | Pending |
| ALARM-05 | Sign out one phone while keeping the other signed in; repeat the isolated test. | Signed-out registration is excluded and the authorized phone still receives the alarm. | Pending |
| ALARM-06 | Reboot and test normal background behavior under the phone manufacturer's battery policy. Separately document an explicit Android Force stop. | Record actual behavior. Force stop can prevent delivery until reopening; do not treat it as normal app closure or promise continuous background execution. | Pending |

For inbox placement, mark the previously confirmed test as not junk and add the approved sender to safe senders in the receiving mailbox. Google OAuth Production publishing and the fresh grant are complete; formal Google verification remains separate.

## Gate decision

M3, M4 and M5 stay in progress until their required results are recorded and the owner accepts any deviations. Production signing-key creation/backup/handover remains a separate release item. Hardware calibration, electrical approval, outage/replay, retention/restore and credential-risk evidence from earlier phases also remain open. This sheet does not close operational commissioning or authorize a merge.

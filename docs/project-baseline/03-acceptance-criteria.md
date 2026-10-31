# Pilot Acceptance Criteria

Status: Draft baseline for approval  
Scope: one farm/house, one Opta, one owner/admin and one manager

## A. Requirements and evidence gate

| ID | Acceptance criterion | Evidence |
|---|---|---|
| AC-001 | Owner/admin approves the pilot alarm matrix or records approved deviations. | Signed decision record or ClickUp approval comment. |
| AC-002 | The authoritative Arduino source and exact core/library versions are stored without credentials. | Repository tag plus firmware manifest. |
| AC-003 | The final I/O and terminal schedule maps I1-I7 to field devices and cabinet terminals. | Approved schedule and wiring drawing. |
| AC-004 | PT100/transmitter range and transfer function are documented and the complete chain meets +/-0.5 C. | Calibration record and error calculation. |
| AC-005 | Critical Phase 0 risks have an owner, treatment and due date. | Approved risk register. |

## B. Telemetry and field behavior

| ID | Acceptance criterion | Evidence |
|---|---|---|
| AC-010 | Valid telemetry is attributed to the correct farm, house and device and contains a source timestamp, sequence and firmware version. | Captured payload and database row. |
| AC-011 | I2-I6 display full only for input 1 and empty only for input 0. | Field stimulation test for each input. |
| AC-012 | I7 displays cooling working only for auxiliary input 1. | Contact stimulation test. |
| AC-013 | Fan relay/LED values are labelled control status, not confirmed running. | Android/web UI inspection. |
| AC-014 | A connectivity interruption is buffered and replayed in order without duplicate history rows. | Outage/reconnect test report. |

## C. Cloud and alarms

| ID | Acceptance criterion | Evidence |
|---|---|---|
| AC-020 | Invalid device identity, invalid webhook secret and malformed payloads are rejected without database mutation. | Automated negative tests and logs. |
| AC-021 | No valid telemetry for five minutes creates one controller-offline alarm; valid telemetry resolves it. | Timed end-to-end test. |
| AC-022 | Temperature warning and critical alarms follow the approved thresholds, activation delays and recovery hysteresis. | Simulated time-series test. |
| AC-023 | Push delivery works while the Android application is closed; critical fallback email follows policy. | Device and delivery logs. |
| AC-024 | Acknowledgement records user/time, stops routine repeats and does not resolve an active physical condition. | Alarm history audit. |
| AC-025 | Tenant RLS prevents a user without farm membership from reading or changing farm data. | Automated allow/deny tests. |

## D. Production and packaging

| ID | Acceptance criterion | Evidence |
|---|---|---|
| AC-030 | Production equals current stock plus sortie minus the latest earlier stock; the first record is zero. | Formula test cases. |
| AC-031 | Mortality reduces the live flock transactionally and cannot exceed the available flock. | Database/RPC tests. |
| AC-032 | Production cannot be negative or exceed the remaining flock. | Validation tests. |
| AC-033 | One carton holds 30 eggs and carton consumption is rounded up after applying the fixed 10% allowance. | Calculation tests including boundary values. |
| AC-034 | Carton receipts add whole cartons to stock and retain date, actor and note. | Audit and balance test. |
| AC-035 | Manager may create/edit but not delete production; owner/admin may delete with audit history. | Role matrix tests. |
| AC-036 | Production dates use fixed GMT+1 without daylight-saving adjustment. | Boundary test around DST transition dates. |

## E. Applications and commands

| ID | Acceptance criterion | Evidence |
|---|---|---|
| AC-040 | Android and web show current value, source time, last update and stale/offline state. | UI test. |
| AC-041 | Twenty-four-hour charts use five-minute aggregates and show gaps instead of inventing values. | Chart/data comparison. |
| AC-042 | English and French interfaces contain no missing critical labels or validation messages. | Localization checklist. |
| AC-043 | Browser and Android artifacts contain no broker, service-role, webhook, Wi-Fi or production signing secrets. | Secret scan and manual review. |
| AC-044 | Pilot commands require owner/admin or manager, are allow-listed and audited, and publish with QoS 0 and retain disabled. | Positive/negative command test and broker evidence. |
| AC-045 | UI describes a command as sent only when accepted by the broker and does not claim physical execution without feedback. | UI and audit inspection. |

## F. Commissioning and operations

| ID | Acceptance criterion | Evidence |
|---|---|---|
| AC-050 | A qualified electrical reviewer approves supply, protection, isolation, grounding and terminal labeling. | Signed electrical review. |
| AC-051 | Backup and restore are executed successfully against a pilot snapshot. | Restore drill report. |
| AC-052 | Credential rotation is tested and documented. | Rotation log without secret values. |
| AC-053 | Owner/admin and manager complete user-acceptance scenarios and training. | Signed UAT/training record. |
| AC-054 | Residual risks and test-only remote-control restrictions are accepted before go-live. | Go-live decision record. |

## Acceptance rule

A milestone may close only when every mandatory criterion assigned to it has objective evidence. A verbal statement alone is not acceptance evidence. Any waived criterion requires an approved change request and a recorded residual risk.

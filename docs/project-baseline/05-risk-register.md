# Phase 0 Risk Register

Scale: likelihood and impact are Low, Medium, High or Critical. Status reflects the baseline review, not completion of mitigation.

| ID | Risk | Likelihood | Impact | Treatment and acceptance condition | Owner role | Status |
|---|---|---|---|---|---|---|
| R-001 | Historical firmware/build artifacts contain embedded development credentials or passwords. | High | Critical | Rotate affected credentials, remove secrets from source, scan history/artifacts, use secret injection, and document rotation. | Project owner + cloud/firmware/Android | Open - immediate |
| R-002 | Supervised test commands are mistaken for safe production control. | Medium | Critical | Keep test-only labeling, owner/manager authorization, allow-list, audit, QoS 0/no retain and on-site supervision. Add expiry, interlocks and explicit device acknowledgement before unsupervised use. | Project owner + firmware/cloud | Open |
| R-003 | Relay/LED state is interpreted as confirmed fan operation. | High | High | Label as control status, disable fan-failure alarms and add independent run feedback on an Opta extension later. | Electrical + Android/web | Open |
| R-004 | Temperature accuracy may differ from the +/-0.5 C field target even though the configured conversion range is correct. | Medium | High | The owner confirmed 0-10 V = -50 to 100 C as the baseline. Preserve the constants and perform a trusted-reference comparison during commissioning. | Firmware + electrical | Baseline confirmed; verification pending |
| R-005 | The historical Arduino source is used even though I1 and payload format are obsolete. | Medium | High | Establish a tagged authoritative source with the approved analog payload and versioned manifest. | Firmware | Open |
| R-006 | Connectivity loss creates missing or duplicated telemetry. | High | High | Implement bounded local buffering, persistent sequence/identity and idempotent cloud ingestion; execute outage/replay tests. | Firmware + cloud | Open |
| R-007 | Critical alarms stop when the Android application is force-stopped. | High | Critical | Evaluate alarms server-side and deliver FCM/email from backend services. | Cloud + Android | Open |
| R-008 | Cross-farm data access occurs through incomplete RLS or service-role exposure. | Medium | Critical | Farm-scope all tables/functions, add allow/deny tests, keep service credentials server-side and resolve Supabase advisor findings. | Cloud | Open |
| R-009 | Cooling auxiliary contact reports control state but not water flow. | Medium | Medium | Accept for pilot monitoring, describe limitation, and do not claim hydraulic proof. Reassess after pilot. | Owner + electrical | Accepted for pilot monitoring |
| R-010 | No installation-ready schematic or terminal schedule exists. | High | High | Produce and approve documents before field commissioning. | Electrical | Open |
| R-011 | Notification delivery provider is not selected/configured. | High | High | Authorize FCM and select email provider; test token lifecycle, fallback and delivery logging. | Owner + cloud | Open |
| R-012 | Fixed GMT+1 differs from local daylight-saving time and causes user confusion. | Medium | Medium | Store instants in UTC, calculate the production day using fixed UTC+1 and label the business timezone in UI/reports. | Cloud + Android/web | Accepted business rule |
| R-013 | Single-device pilot has no proven backup/restore or operational ownership. | Medium | High | Define retention, backup, restore drill, monitoring and incident contacts before go-live. | Owner + cloud | Open |

## Escalation rules

- Critical risks block pilot go-live unless mitigated or explicitly accepted in writing by the project owner.
- High risks require a named owner and due date before the affected phase begins.
- Any suspected credential exposure triggers rotation; do not wait for proof of misuse.
- Any unsafe or unexpected physical command suspends remote command testing until reviewed.

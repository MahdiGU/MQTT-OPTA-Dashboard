# Governance and RACI

## 1. Decision structure

### Named pilot roles

- **Owner/admin:** Mahdi Guermazi
- **Manager:** Adnen Guermazi

Contact email addresses are maintained outside this public repository.

- **Project owner / owner-admin:** final scope, risk and go-live authority; approves alarm defaults and external providers.
- **Project manager:** maintains ClickUp, schedule, dependencies, evidence and change log.
- **Firmware engineer:** Opta source, libraries, MQTT/device identity, buffering and calibration implementation.
- **Cloud engineer:** EMQX, Supabase, ingestion, alarms, notifications, RLS, backups and audit.
- **Android engineer:** application features, secure sessions, push, localization, signing and release tests.
- **Web engineer:** secured web application, Realtime behavior, role parity and accessibility.
- **Electrical engineer/reviewer:** terminal schedule, schematic, protection, isolation, grounding and field acceptance.
- **Pilot manager user:** operational acceptance, production workflow and alarm-response validation.

The ClickUp tasks are currently assigned to Mahdi Guermazi for coordination. The pilot application roles are assigned, but named technical owners for firmware, cloud, Android/web and electrical review must still be entered before M0 is approved, or Mahdi Guermazi must explicitly accept those responsibilities.

## 2. RACI matrix

R = Responsible, A = Accountable, C = Consulted, I = Informed.

| Deliverable | Owner | Project manager | Firmware | Cloud | Android | Web | Electrical | Pilot manager |
|---|---|---|---|---|---|---|---|---|
| Requirements and acceptance baseline | A | R | C | C | C | C | C | C |
| Alarm and notification policy | A | R | C | R | C | C | I | C |
| Firmware manifest and source | I | C | A/R | C | I | I | C | I |
| I/O schedule and electrical schematic | I | C | C | I | I | I | A/R | C |
| PT100 calibration | I | C | R | I | I | I | A | C |
| EMQX/Supabase ingestion | I | C | C | A/R | I | I | I | I |
| Alarm engine and delivery | A | C | C | R | C | C | I | C |
| Production/packaging rules | A | R | I | R | C | C | I | C |
| Android release | I | C | I | C | A/R | I | I | C |
| Web release | I | C | I | C | I | A/R | I | C |
| Security review and credential rotation | A | C | R | R | R | R | C | I |
| UAT and pilot acceptance | A | R | C | C | C | C | C | R |

## 3. Authorization baseline

| Capability | Owner/admin | Manager |
|---|---:|---:|
| View farm and device data | Yes | Yes |
| Acknowledge alarms | Yes | Yes |
| Configure alarm thresholds | Yes | Yes |
| Create production entries | Yes | Yes |
| Edit production entries, including historical/month-end | Yes | Yes |
| Delete production entries | Yes | No |
| Configure flock adjustments | Yes | Yes |
| Add carton receipts | Yes | Yes |
| Send supervised pilot commands | Yes | Yes |
| Manage users/roles | Yes | No |
| Approve go-live and residual risk | Yes | No |

## 4. Governance meetings and records

- Weekly implementation review: schedule, blockers, risks and decisions.
- Phase-gate review at every milestone: acceptance evidence and open exceptions.
- Incident review for any unsafe command, data loss, cross-farm access or missed critical alarm.
- ClickUp is the work record; repository documents and commits are the engineering evidence record.

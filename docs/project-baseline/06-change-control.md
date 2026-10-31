# Change Control Procedure

## 1. Purpose

Control changes to requirements, I/O, alarm policy, production formulas, roles, interfaces, credentials and release scope while preserving an auditable decision history.

## 2. Change request fields

Every change request must contain:

- unique ID and title;
- requester and request date;
- reason and expected benefit;
- affected requirement, I/O channel, application, database object or interface;
- safety, security, data, schedule and cost impact;
- backward-compatibility and migration impact;
- proposed tests and acceptance evidence;
- rollback plan;
- decision, approver and decision date.

## 3. Classification

| Class | Examples | Approval |
|---|---|---|
| Standard | Documentation correction with no behavioral effect | Project manager |
| Functional | UI behavior, report, non-safety business rule or schema extension | Owner plus affected technical owner |
| Safety/security | I/O meaning, control command, alarm threshold, authorization, credential or RLS change | Owner plus firmware/cloud/electrical/security reviewers as applicable |
| Emergency | Active security exposure, unsafe command or data-loss response | Technical owner may contain immediately; owner reviews and records afterward |

## 4. Workflow

1. Create the change request in ClickUp and link affected tasks.
2. Assess impact and classify the change.
3. Obtain required approval before implementation, except emergency containment.
4. Implement on a dedicated branch where code is affected.
5. Execute the stated tests and attach objective evidence.
6. Update specification, decision log, I/O schedule, schema or user documentation.
7. Merge/deploy only after approval; record the release or migration identifier.
8. Close the request after verification and rollback-window review.

## 5. Baseline versioning

- Phase 0 baseline begins at version 0.1.
- Approved requirement changes increment the baseline version.
- Code, firmware and database deliveries use their own version/commit identifiers and reference the applicable baseline.
- No task description or historical production record may be silently rewritten to hide a previous decision; use comments, audit records or superseding versions.

## 6. Emergency stop conditions

Suspend remote command testing and open a critical change/incident record if:

- a command affects an unintended output;
- a retained or replayed command is observed;
- physical state differs unexpectedly from the command/control state;
- an unauthorized user can send a command or access another farm;
- a credential or signing key is exposed;
- a critical alarm is not generated or delivered under the approved test conditions.

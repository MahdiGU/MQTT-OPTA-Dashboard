# Phase 0 Task Reports

Report date: 2026-10-31

## Task: Approve pilot alarm and notification policy

**Work completed**

- Converted the v0.3 recommendation into an implementable alarm matrix.
- Defined warning/critical temperature thresholds, delays, hysteresis, recovery and reminders.
- Defined offline, sensor-fault, binary level and cooling-unavailable alarms.
- Defined 24/7 operation, recipients, acknowledgement behavior and farm/house overrides.
- Selected FCM push as primary out-of-app delivery, in-app alarm center as the user record, email as critical fallback and SMS as deferred.

**Deliverable**

- `docs/project-baseline/01-pilot-scope-and-alarm-policy.md`

**Result**

The two-stage temperature defaults, delays, hysteresis and SMS deferral were approved by Mahdi Guermazi on 2026-10-31. Open decisions: authorize FCM and select the email provider.

## Task: Collect final firmware, libraries, transmitter documents and I/O schedule

**Work completed**

- Reviewed the v0.3 specification, repository, Android build definition, Supabase migrations/functions and the supplied authoritative Arduino v3.3 sketch.
- Added a credential-redacted v3.3 repository copy and recorded the original SHA-256 for provenance.
- Verified a successful Opta compile using Arduino CLI 1.4.1, Opta core 4.6.0 and ArduinoMqttClient 0.1.8; recorded flash and memory usage.
- Documented the approved logical I/O mapping.
- Confirmed that v3.3 implements analog I1 and the approved `i1` payload. Identified unpinned versions, an unverified -50 to 100 C transfer assumption, missing buffering/identity/acknowledgement features and embedded field credentials in the supplied original.
- Defined the required firmware manifest and missing hardware/calibration evidence.

**Deliverable**

- `docs/project-baseline/02-engineering-evidence-register.md`

**Result**

The authoritative `.ino` and verified toolchain/library versions are now available. The owner waived detailed PT100 manufacturer/calibration paperwork, but the installed range must still be matched to the firmware and a basic reference comparison recorded. The terminal schedule and final electrical schematic remain in progress because the hardware is almost ready. Credential rotation remains an immediate security action.

## Task: Freeze acceptance criteria, owners, risks and change process

**Work completed**

- Defined 29 objective acceptance criteria covering evidence, telemetry, alarms, cloud security, production, packaging, applications, commands and commissioning.
- Defined project roles, authorization and the RACI matrix.
- Created a 13-item risk register with treatment and escalation rules.
- Defined standard, functional, safety/security and emergency change-control workflows.

**Deliverables**

- `docs/project-baseline/03-acceptance-criteria.md`
- `docs/project-baseline/04-governance-and-raci.md`
- `docs/project-baseline/05-risk-register.md`
- `docs/project-baseline/06-change-control.md`

**Result**

Mahdi Guermazi is assigned as owner/admin and Adnen Guermazi as manager. Named technical owners and target dates must still be added for open High/Critical engineering risks.

## Milestone: M0 - Requirements baseline approved

**Gate review**

- Alarm policy: defined, pending approval.
- Acceptance criteria: defined, pending approval.
- Responsibility model: defined, named people pending.
- Risk and change process: defined; critical credential risk remains open.
- Engineering evidence: Arduino v3.3 received, audited and compiled; hardware/transmitter documents remain incomplete.

**Result**

M0 is not yet achieved. Do not mark the milestone complete until the project owner approves the baseline and every critical blocker has a named owner and due date.

## Phase parent report

Phase 0 documentation implementation is complete. The phase remains in review because approval and missing external evidence cannot be manufactured by the software team. Phase 1 software preparation may begin, but hardware commissioning and unsupervised command use remain blocked.

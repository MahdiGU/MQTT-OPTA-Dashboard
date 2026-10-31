# ElMAJD Automation - Phase 0 Project Baseline

Baseline version: 0.2  
Prepared: 2026-10-31  
Specification reviewed: ElMAJD Automation System Specification v0.3  
Implementation branch reviewed: `Android_Supabase_Realtime` at commit `4caf1df`

## Purpose

This package converts the Phase 0 planning tasks into an auditable implementation baseline. It defines the pilot scope, recommended alarm behavior, available and missing engineering evidence, measurable acceptance criteria, responsibilities, risks, and change control.

## Phase 0 status

| Work item | Result | Status |
|---|---|---|
| Alarm and notification policy | Two-stage temperature policy, FCM push and Gmail fallback approved by Mahdi Guermazi. | Policy and channels approved; implementation occurs in Phase 3 |
| Firmware, library, transmitter and I/O evidence | Arduino v3.3 was added, compiled and versioned; its 0-10 V = -50 to 100 C conversion is approved as the PT100 baseline. | Firmware/PT100 baseline verified; electrical evidence incomplete |
| Acceptance criteria, owners, risks and change process | Baseline documents are defined; Mahdi Guermazi is owner/admin and Adnen Guermazi is manager. | Pilot roles assigned; technical roles open |
| M0 requirements baseline | Gate criteria and blockers are explicit. | Not yet approved |

## Documents

- [Pilot scope and alarm policy](01-pilot-scope-and-alarm-policy.md)
- [Engineering evidence register](02-engineering-evidence-register.md)
- [Acceptance criteria](03-acceptance-criteria.md)
- [Governance and RACI](04-governance-and-raci.md)
- [Risk register](05-risk-register.md)
- [Change control](06-change-control.md)
- [Phase 0 task reports](07-phase-0-task-reports.md)
- [Owner decisions - 2026-10-31](08-owner-decisions-2026-10-31.md)
- [Notification delivery and credential rotation](09-notification-and-credential-decisions.md)

## Decisions required to close M0

1. Deliver or approve the final terminal schedule and installation-ready electrical schematic when the hardware is finalized.
2. Assign named people to the firmware, cloud, Android/web and electrical engineering responsibilities, or explicitly assign those responsibilities to the owner.
3. Rotate credentials found embedded in supplied/development artifacts and revoke the previous values.

M0 must remain open until the owner accepts the baseline and the critical evidence/security items have a named owner and target date.

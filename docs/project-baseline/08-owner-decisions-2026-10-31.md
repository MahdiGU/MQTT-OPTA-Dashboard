# Phase 0 Owner Decisions - 2026-10-31

Decision owner: Mahdi Guermazi  
Pilot manager: Adnen Guermazi

Personal email addresses are intentionally not stored in this public repository. They may be maintained in the private identity/ClickUp configuration.

## Decision status

| Item | Owner response | Recorded disposition |
|---|---|---|
| Two-stage temperature policy | Approved by Mahdi Guermazi | Approved for the pilot: warning at 30 C and critical at 33 C with the delays, recovery and hysteresis in ADR-P0-001. |
| Notification delivery configuration | Clarification requested | Policy is approved conceptually, but Firebase Cloud Messaging authorization and the email provider are not yet selected/configured. |
| PT100 manufacturer/model/calibration package | Considered not needed | Manufacturer/model paperwork is waived for the pilot. The configured input range and a basic field comparison remain necessary because the firmware converts voltage to temperature and the dashboard must not display a knowingly wrong value. The formal +/-0.5 C claim remains unverified until measured. |
| Terminal schedule/electrical schematic | Hardware almost ready | Work remains in progress. The final schedule/schematic is required before commissioning and may be delivered when the cabinet is finalized. |
| Pilot user roles | Named | Mahdi Guermazi is owner/admin. Adnen Guermazi is manager. Technical engineering roles remain to be named or explicitly assigned to the owner. |
| Credential rotation | Clarification requested | Open security action. Rotation means changing potentially exposed passwords/keys, updating authorized systems, revoking the old values and keeping replacement secrets out of Git and distributable artifacts. |

## Effect on M0

The alarm thresholds are approved and the two pilot user roles are named. M0 remains open for notification-service selection/authorization, final hardware documentation, technical-role ownership and credential rotation. PT100 manufacturer paperwork is waived, but the firmware conversion range must still be confirmed before temperature acceptance.

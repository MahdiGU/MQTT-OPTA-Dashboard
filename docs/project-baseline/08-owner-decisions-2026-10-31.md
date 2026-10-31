# Phase 0 Owner Decisions - 2026-10-31

Decision owner: Mahdi Guermazi  
Pilot manager: Adnen Guermazi

Personal email addresses are intentionally not stored in this public repository. They may be maintained in the private identity/ClickUp configuration.

## Decision status

| Item | Owner response | Recorded disposition |
|---|---|---|
| Two-stage temperature policy | Approved by Mahdi Guermazi | Approved for the pilot: warning at 30 C and critical at 33 C with the delays, recovery and hysteresis in ADR-P0-001. |
| Notification delivery configuration | Gmail project mailbox supplied | Gmail is selected as the fallback email service and FCM is approved as the primary Android push channel. The mailbox address is kept out of the public repository and will be supplied through private configuration. |
| PT100 manufacturer/model/calibration package | Firmware data confirmed correct | The firmware's 0-10 V = -50 to 100 C mapping is the approved baseline. Manufacturer/model paperwork is waived. A field comparison remains a commissioning verification, not a Phase 0 decision blocker. |
| Terminal schedule/electrical schematic | Hardware almost ready | Work remains in progress. The final schedule/schematic is required before commissioning and may be delivered when the cabinet is finalized. |
| Pilot user roles | Named | Mahdi Guermazi is owner/admin. Adnen Guermazi is manager. Technical engineering roles remain to be named or explicitly assigned to the owner. |
| Credential rotation | Clarification requested | Open security action. Rotation means changing potentially exposed passwords/keys, updating authorized systems, revoking the old values and keeping replacement secrets out of Git and distributable artifacts. |

## Effect on M0

The alarm thresholds, FCM/Gmail notification channels, PT100 conversion baseline and two pilot user roles are approved. M0 remains open for final hardware documentation, technical-role ownership and credential rotation.

# Current system specification

**Version 0.4, issued 01 November 2026.** Reconciled against the owner's decisions, specification v0.3 and development evidence through `94b6f40` on `French_Account_Gmail`. No merge performed.

- [Review PDF](ElMAJD_Automation_System_Specification_v0.4.pdf)
- [Readable/editable Markdown](ElMAJD_Automation_System_Specification_v0.4.md)
- [Structured authoring source](specification-v0.4.json)
- [PDF renderer](build_specification_v04.py)

The 25-page book replaces old proposed/pending statements with the current Opta 4.0.2, EMQX, Supabase and Android 1.11.0 architecture and contracts. It includes the approved alarm matrix, active FCM/Gmail delivery, password/account flows, six-tab Android UI, production/mortality rules, dated flock changes, carton opening reference and zero-floor inventory, verification evidence and remaining phase gates.

Implemented behavior is distinguished from approved requirements and unfinished acceptance. In particular, hardware calibration/electrical approval, device acceptance, protected production signing, operational retention/restore, secured web delivery and production command safety are not declared complete.

Two source discrepancies are recorded explicitly: the current firmware uses onboard inputs rather than an initialized A0602 expansion driver; the command endpoint still allows the legacy `worker` role beyond the approved owner/manager scope. This documentation update does not change runtime behavior or permissions.

## Rebuild

Requires Python with `reportlab` and `pypdf`, the repository app icon, and Arial fonts from `C:/Windows/Fonts`.

```text
python docs/specification/build_specification_v04.py
```

The renderer writes the PDF to `output/pdf/` and regenerates the Markdown here. After visual review, copy the PDF into this directory for repository distribution. No credentials or cloud access are needed to rebuild.

Quality review: 25 planned/actual pages, all headings present, no out-of-margin words or replacement glyphs; all pages rendered and visually inspected. Final changed pages were rendered again after wording correction. No app/database tests were rerun for this documentation-only change; historical implementation test results are attributed to their delivery evidence.

Original v0.1-v0.3 PDFs remain unchanged in the owner's specification folder. The new version is a controlled working baseline, not an inferred owner sign-off or go-live approval.

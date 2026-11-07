# Current system specification

**Version 0.6, issued 07 November 2026.** Based on implementation commit `8445db3` on `Opta_Feed_Chain_Expansion`.

- [Review PDF](ElMAJD_Automation_System_Specification_v0.6.pdf)
- [Editable Markdown](ElMAJD_Automation_System_Specification_v0.6.md)
- [Structured source](specification-v0.6.json)
- [PDF renderer](build_specification_v04.py)
- [Previous edition](ElMAJD_Automation_System_Specification_v0.5.pdf)

The 29-page book includes the Android 1.13.1 live 3D tab, eight fans in the corrected 2 + (2 x 2) + 2 arrangement, 12 feed chains and two blue cooling pads with shared I7 feedback. Pages 14-16 specify signal mapping, camera controls, freshness, local rendering, reference screenshots and ACC-3D field checks. It retains the AFX00005 terminal schedule, Opta 4.1.0 firmware, latest-value five-minute history, command authorization and recovery evidence. ACC-FCH and ACC-3D define the remaining physical checks.

## Rebuild

Requires Python with `reportlab` and `pypdf`, the repository app icon, and Arial fonts from `C:/Windows/Fonts`.

```text
python docs/specification/build_specification_v04.py 0.6
```

The renderer writes the PDF to `output/pdf/` and regenerates the companion Markdown. After review, copy the PDF into this directory for repository distribution.

The PDF was rendered and reviewed across all 29 pages. Text checks confirmed the contents, page numbering, headings, requirement identifiers, fan mapping, current APK/hash/build evidence and acceptance references. Screenshots use simulated preview readings. Physical phone and field acceptance remain pending.

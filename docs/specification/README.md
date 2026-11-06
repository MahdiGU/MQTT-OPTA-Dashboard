# Current system specification

**Version 0.5, issued 06 November 2026.** Based on implementation commit `e0c3a9f` on `Opta_Feed_Chain_Expansion`.

- [Review PDF](ElMAJD_Automation_System_Specification_v0.5.pdf)
- [Editable Markdown](ElMAJD_Automation_System_Specification_v0.5.md)
- [Structured source](specification-v0.5.json)
- [PDF renderer](build_specification_v04.py)
- [Previous edition](ElMAJD_Automation_System_Specification_v0.4.pdf)

The 26-page book specifies the AFX00005 terminal mapping, Opta 4.1.0 firmware, Supabase ingestion and Android 1.12.0 display for the 12 feed chains. It records the latest-value five-minute history behavior, command authorization and recovery evidence. ACC-FCH defines the physical input tests required for commissioning.

## Rebuild

Requires Python with `reportlab` and `pypdf`, the repository app icon, and Arial fonts from `C:/Windows/Fonts`.

```text
python docs/specification/build_specification_v04.py 0.5
```

The renderer writes the PDF to `output/pdf/` and regenerates the companion Markdown. After review, copy the PDF into this directory for repository distribution.

The PDF was rendered and reviewed across all 26 pages. Text checks confirmed the page numbering, headings, terminal mapping, MQTT example and acceptance references.

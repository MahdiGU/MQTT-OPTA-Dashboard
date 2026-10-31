# Phase 4 - Production and Packaging

Branch: `Phase_4_Production_Packaging`, based on Phase 3. Started 2026-10-31.

**Superseding rule in Android 1.9.1:** [Opening-reference refinement](../phase-5/02-version-1.9.1-refinements.md) replaces the original negative carton-balance policy below. Inventory now starts after the first carton-entry date and available stock is floored at zero; uncovered usage is tracked separately.

## Deployed implementation

- Production remains Stock + Sortie - latest earlier Stock; first entry produces zero. Missing calendar days use the latest earlier entry.
- Owner and manager can create, insert historical records and edit Stock/Sortie/mortality. Only owner can delete (the database's owner role represents admin).
- Corrections update affected flock snapshots, live flock, production rates and carton consumption in one transaction. Invalid dependent results roll back the entire operation with the affected date in the error.
- Editing keeps the original production date. Date changes require owner delete/recreation. All production mutations and flock changes retain before/after audit.
- Carton consumption is `ceil(eggs * 1.10 / 30)`. Initial carton receipts are zero. Configuration adds dated whole-carton receipts with actor, note and an idempotency key.
- Balance = receipts - calculated consumption. A negative balance is displayed as a shortage rather than blocking production entry; this permits recording production before historical packaging receipts have been entered.
- Server receipt defaults/date limits use fixed GMT+1 (`Etc/GMT-1`), without DST.

Existing production data was preserved (11 complete records inspected). Adding the generated carton column derives consumption for existing production, so the initial carton balance may be negative until receipts are recorded. No historical egg, mortality or rate value was rewritten by the migration.

## Evidence and tasks

`supabase/tests/phase4_production_packaging.sql` passes against the real RPCs inside its own rolled-back transaction. It covers first-entry zero, missing days, historical insertion, edits/deletes and dependent recalculation, mortality restoration, manager edit/delete permissions, carton rounding, receipt retry protection, atomic rollback, audit and cross-farm denial.

Task report: backend calculations, audited corrections, receipts and access enforcement implemented. Android input/display is Phase 5. Acceptance remains open for multi-phone field tests, real carton reconciliation and business-owner validation. Packaging shortages are advisory; confirm this pilot behavior before operational acceptance.

ClickUp's daily MCP limit blocks task updates. Repository reports preserve implementation evidence pending synchronization.

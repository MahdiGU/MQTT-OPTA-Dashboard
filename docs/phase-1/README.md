# Phase 1 - Opta Firmware and Field Validation

Branch: `Phase_1_Opta_Firmware`  
Started: 2026-10-31  
Base: `Phase_0_Baseline` commit `98c2066`

## Current result

The first Phase 1 firmware slice is implemented and compiles for the Arduino Opta. It introduces modular source files, scoped/versioned telemetry, UTC capture time, a replay-safe RAM buffer, and explicit pilot I/O semantics.

Field and cabinet work is not marked complete. The remaining acceptance work requires the physical controller, sensor stimulation, trusted temperature comparison and final cabinet terminal numbers.

## Documents

- [I/O and terminal schedule](01-io-terminal-schedule.md)
- [PT100 calibration and field validation](02-pt100-calibration-and-field-validation.md)
- [Firmware and field test plan](03-firmware-and-field-test-plan.md)
- [Phase 1 task reports](04-phase-1-task-reports.md)

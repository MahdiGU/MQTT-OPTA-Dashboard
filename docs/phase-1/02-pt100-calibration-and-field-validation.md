# PT100 Conversion and Field Validation

## Approved baseline

- Signal range: 0.00 to 10.00 V
- Engineering range: -50.0 to 100.0 C
- ADC resolution: 12 bit
- ADC reference: 3.3 V
- Opta input-divider factor: 0.3034
- Samples per reading: 16
- Required field-accuracy target: +/-0.5 C

Conversion:

`temperature = -50 + volts x 15`

Expected points:

| Input voltage | Expected temperature |
|---:|---:|
| 0.00 V | -50.0 C |
| 2.50 V | -12.5 C |
| 5.00 V | 25.0 C |
| 7.50 V | 62.5 C |
| 10.00 V | 100.0 C |

## Bench/field record

| Test point | Reference temperature | Reported volts | Reported temperature | Error | Pass +/-0.5 C | Date/operator |
|---|---:|---:|---:|---:|---|---|
| Ambient/stable point |  |  |  |  |  |  |
| Low representative point |  |  |  |  |  |  |
| High representative point |  |  |  |  |  |  |

## Fault checks

1. Disconnect or drive the signal outside the accepted range.
2. Confirm `i1.fault=1` and `i1.temp_c=null`.
3. Restore the valid signal.
4. Confirm the next valid reading returns `fault=0`.
5. Confirm the dashboard and alarm path distinguish a sensor fault from a real high temperature.

The conversion baseline is approved. Phase 1 field acceptance remains pending until the comparison table is completed on the installed hardware.

# Phase 1 I/O and Terminal Schedule

Status: Logical mapping approved; physical cabinet terminal numbers pending

| Opta channel | Electrical signal | Device/function | Logical meaning | Payload field | Cabinet terminal |
|---|---|---|---|---|---|
| I1 / A0 | Analog 0-10 V | PT100 transmitter | -50 to 100 C; fault outside configured margin | `i1.volts`, `i1.temp_c`, `i1.fault` | TBD |
| I2 / A1 | 24 V PNP, NO | Water cistern point sensor 1 | 1=full/detected, 0=empty | `inputs.I2` | TBD |
| I3 / A2 | 24 V PNP, NO | Water cistern point sensor 2 | 1=full/detected, 0=empty | `inputs.I3` | TBD |
| I4 / A3 | 24 V PNP, NO | Water cistern point sensor 3 | 1=full/detected, 0=empty | `inputs.I4` | TBD |
| I5 / A4 | 24 V PNP, NO | Feed/alveole silo point sensor 1 | 1=full/material detected, 0=empty | `inputs.I5` | TBD |
| I6 / A5 | 24 V PNP, NO | Feed/alveole silo point sensor 2 | 1=full/material detected, 0=empty | `inputs.I6` | TBD |
| I7 / A6 | 24 V NO auxiliary contact | Cooling pad operation feedback | 1=working, 0=not working | `inputs.I7` | TBD |
| I8 / A7 | Reserved | No approved pilot function | Reserved; do not assign without change request | `inputs.I8` | TBD |
| D0/O1 | Relay output | Pilot controlled output 1 | Command state only | `outputs.D0` | TBD |
| D1/O2 | Relay output | Pilot controlled output 2 | Command state only | `outputs.D1` | TBD |
| D2/O3 | Relay output | Pilot controlled output 3 | Command state only | `outputs.D2` | TBD |
| D3/O4 | Relay output | Pilot controlled output 4 | Command state only | `outputs.D3` | TBD |
| LED0-LED3 | Opta status LEDs | Output/diagnostic indication | Command or connection-stage indication | `leds.L0-L3` | Internal |

## Wiring information still required

- final terminal block numbers and cable identifiers;
- 24 V supply/protection and common reference;
- PNP sensor brown/blue/black conductor mapping;
- I1 transmitter supply, signal common and shield termination;
- cooling auxiliary contact source equipment and contact rating;
- relay load/interposing relay details;
- grounding, isolation and cabinet labeling approval.

Fan values remain control status until independent run feedback is wired to a future Opta extension.

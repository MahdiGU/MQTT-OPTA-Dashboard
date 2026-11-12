# Android FLOW — 1.16.0

12 November 2026 · branch `Android_FLOW_Design` · based on `Android_Three_Designs` at `d87612f` · no merge.

## Scope

Implements the owner-approved Pulse/Aura fusion with the Orbit architectural house presentation. It uses the existing Android application and its native Supabase connection, authentication, Realtime/fallback logic, Firebase notifications, cloud production history, authorization and command transport.

The interface uses a pale aqua background, navy text, blue actions, bundled Manrope/Space Grotesk fonts and a new FLOW logo. The Android adaptive launcher icon uses the same logo. Both fonts include their OFL license files; no external font or rendering service is required.

Five bottom tabs are Overview, Status, Live 3D, Production and Alarms. Configuration and Communication remain available through the two header buttons. Existing login, password recovery/change, saved session, flock adjustment, carton receipts/corrections, production preview/save/edit/delete, alarm acknowledgement/thresholds and command controls retain their original handlers and permissions.

## Live views

The default architectural view is the approved building illustration with interactive SVG status overlays. It is a fixed perspective. The separate **Free 3D view** retains the actual Three.js scene with rotation, zoom, camera presets and equipment selection. The WebGL engine loads only when Free 3D is opened and stops animation when hidden.

Both views share the existing validated telemetry adapter. They show eight fan command indicators in the 2 + (2 × 2) + 2 arrangement, twelve feed chains, three internal IBC cisterns, two external silos next to the egg depot, and two cooling pads sharing I7. Selection shows the original equipment details and sensor history links. Selecting equipment does not send a control command.

| Equipment | Source | Display |
| --- | --- | --- |
| Fans 1–8 | D0–D3 and L0–L3 | ON animates the rotor; confirmed OFF shows closed shutters. This is command status, not confirmed physical rotation or shutter feedback. |
| Feed chains | AFX00005 I1–I12 bitmask | Four rows × three levels; animated links when running feedback is high. |
| Cisterns | I2–I4 | Binary full/empty, not a continuous measured percentage. |
| Silos | I5–I6 | Grain visible when full; empty window when empty. |
| Cooling pads | Shared I7 | Both pads blue while working; gray while stopped. There is no independent pad-fault feedback. |
| Egg depot | Latest saved Stock and actual flock | Capacity = actual flock × 7 eggs; 30 eggs per tray. Stock illustration scales to capacity, with exact counts and overflow status in the details. |

Live signals expire after the existing 20-second freshness limit; lost cloud/device connectivity and invalid feedback also show gray/unavailable. Unknown fans are not displayed as confirmed OFF. A temperature fault or stale measurement clears the reading. Saved business inventory remains visible with its offline context until sign-out. Sign-out clears the previous account's displayed production charts and inventory.

No simulation controls are included in the installed Android UI. The existing browser-only `?preview` mode uses illustrative data and cannot be used as evidence of field connectivity.

## Charts

Equipment history displays the latest 12 hours of the existing cloud history, using latest-value five-minute samples. Its vertical scale follows the valid minimum/maximum with padding. Missing readings and long gaps break the plotted line. Binary inputs use steps. This change does not alter cloud sampling, retention, database queries or firmware.

Production performance remains in Overview and is also reachable from Production. Daily mode shows 14 calendar days; weekly mode shows eight Monday–Sunday weeks. Weekly production rate is the arithmetic mean of the recorded daily rates. Weekly eggs and mortality are totals. Partial weeks state that only recorded days are used. Missing dates remain gaps, and actual recorded zeros remain zero. Users can switch between rate and egg count, select values, and open a values table. Charts use the canonical loaded shared records, so browsing an older production-history page does not replace the latest dashboard values. The production day uses fixed GMT+1.

## Validation and acceptance

Automated checks cover production aggregation, calendar boundaries, missing/invalid/future values, fixed GMT+1, five bottom/two header routes, native data-driven SVG states, silo fill changes, closed OFF fans, shared blue pads, history selection and 12-hour filtering, expiry/offline/logout, local assets and layouts at 320/390/768 pixels. Existing phase-5 UI tests cover account flows, roles, production/carton actions, numeric validation and history paging. Existing 3D tests cover WebGL loading, picking, keyboard/camera controls, stock changes and fallback when WebGL is unavailable.

Visual screenshots were reviewed for login, Overview, Status, Live 3D, Production, Configuration, Communication and Alarms. CI also verifies the regenerated offline Three.js bundle, compiles debug and unsigned release variants, and checks the installable pilot APK signature. The delivered test APK is signed with the existing pilot key; it is not a production-signed store release.

Field acceptance remains necessary: install 1.16.0 over the current pilot app, verify a real cloud login, live input changes (especially full/empty silos, OFF fans and both shared pads), production entry and daily/weekly graphs, then test a pilot command on the authorized test setup. Confirm notifications and background reconnection on a physical phone. No backend, firmware or database migration is required for this interface release.

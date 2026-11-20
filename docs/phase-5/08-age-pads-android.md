# Android 1.18.0 — approved pads and flock-age charts

20 November 2026 · branch `Android_Flock_Age_Pads` · based on Android 1.17.0 (`ff7910f`) with the approved web presentation changes ported from `Web_Flock_Age_Charts` (`3345b97`). No branch merge.

## Changes

- The approved larger, framed cooling pads now appear near the entrance on both side walls in Overview and the front architectural view. The grille texture, bottom channels and short airflow strokes match the approved proposal. Both pads retain shared I7 feedback, blue active states, selection and history. The free WebGL model and top-view physical footprint are unchanged.
- Status and sensor-history labels use **Feed silos / Silos d’aliment**, distinct from carton/alvéole inventory.
- Overview displays the current flock age week and day, independent of the latest production entry. Confirmed pilot reference: **24 October 2026 was the last day of age week 29**; week 30 started on Sunday 25 October. On 20 November the current age is **week 33, day 6/7**.
- The age uses fixed GMT+1, refreshes at midnight and on page resumption, and is shown with its read-only reference in Configuration. It is calculated locally from the common bundled flock reference; no additional cloud requests are introduced. A replacement flock requires an updated reference.
- Daily/Weekly controls are available beside Mortality and stay synchronized with Production. Weekly x-axis labels use age weeks (Sunday–Saturday), with date spans in details/table. Production rates are averages of valid recorded daily rates; eggs and mortality are totals. Real zeroes remain zero, missing periods remain gaps and partial weeks use recorded days only.

## Integration and delivery

The existing shared-presentation sync now includes the age helper and performance renderer. Native Android authentication, saved sessions, foreground monitoring, Realtime/fallback, notifications, account management, production validation/permissions, CSV document saving and command transport retain the 1.17.0 implementation. No backend, database, retention or firmware changes are needed. The hosted web dashboard is not redeployed by this Android branch.

Android version **1.18.0 (35)** uses the same application ID, minimum Android 8/API 26, target SDK 35 and pilot signing certificate as 1.17.0. The named install package is **ElMajd-Automation-1.18.0.apk**; install it over the existing pilot app.

Automated validation includes the existing native-interface suites plus confirmed age boundaries, fixed-GMT+1 midnight/year continuity, actual-age display, automatic week rollover while open, synchronized weekly mortality/rate calculations, approved pad dimensions, feed-silo naming, offline presentation assets and small-screen layouts. The build workflow compiles debug and unsigned-release variants and verifies the installable pilot APK signature. Field acceptance on a phone remains: update installation, real cloud login/resume, live pad feedback, age display and chart switching, production/CSV operations and background notifications.

# Android 1.17.0 — orange identity and live workspace

19 November 2026 · `Android_Orange_Live_Design` · based on `Web_3D_Live_Workspace` at `942a35a` · no merge.

## Delivered interface

- Owner's original orange/white/charcoal ElMAJD logo on login and app header, matching readable forms, charts and navigation. A square emblem adaptation is used for the Android adaptive launcher icon.
- The same architectural building in **Overview** and **3D en direct**: eight fans in the 2 + (2 × 2) + 2 arrangement, twelve chains in four rows × three tiers, three interior IBC cisterns, two exterior silos beside the egg depot, and both blue cooling pads sharing I7.
- Selectable equipment with status, measurement/receipt times and inline twelve-hour history for temperature, cisterns, silos and pads. Front/top/free views, reset, label controls and a larger chain-feedback matrix. Free view retains the locally bundled rotatable WebGL model and its fallback.
- Silo/cistern indicators remain binary full/empty. Fan animation and shutters represent command state, not physical rotation feedback. Unknown telemetry is grey; unknown fans have no confirmed OFF shutter indication. The existing twenty-second freshness rule is retained.
- Saved egg stock and trays use latest Stock, 30 eggs per tray and current flock × 7 capacity. Production performance and mortality graphs remain in Overview with daily/weekly choices.
- Improved Production entry, checked stock calculation, latest summaries, date filters, history ledger, existing role-aware edit/delete actions, and CSV export through Android's system document picker. Stock/Sortie/mortality, first-record zero production, fixed GMT+1 and server validation remain authoritative.

## Native integration

`scripts/sync-android-design.cjs` copies only an explicit list of presentation assets from the shared web source into Android assets; `--check` fails on drift. It does not copy the browser Supabase SDK, browser auth/session storage or browser gateway. Android continues using the existing `ElMajdNative` Java bridge and foreground service for cloud login, telemetry, history, production, commands, push registration, Gmail tests and account management. Firebase configuration, database/retention, firmware, application ID and pilot signing identity are unchanged.

Production preview requests emit a local JavaScript event instead of replacing `phase5Action`: real Java bridge methods are read-only. Protocol option values are preserved before localization, so French labels cannot alter `D0 ON`/`OFF` and other command strings. Model selection sends no device command or extra cloud query.

CSV export uses `ACTION_CREATE_DOCUMENT` with a bounded CSV payload and a fixed filename pattern. The user selects the destination; only the resulting content URI is written in UTF-8. Cancellation/failure/success are reported in the app. No broad storage permission, browser blob download or arbitrary file path is used.

## Build and validation

Version **1.17.0**, Android version code **34**, minimum Android 8.0/API 26, SDK target 35. CI verifies synchronized presentation assets and the offline Three.js bundle, runs the native-interface browser tests, builds debug and unsigned-release variants, verifies the pilot APK signature and uploads one named install package: `ElMajd-Automation-1.17.0.apk`.

The existing phase-5 tests cover account flows, commands, roles, carton adjustments, history paging and stale/invalid production previews. The 3D tests cover the actual WebGL renderer, all eight selectable fans, I/O, depot changes/overflow, expiry and fallback. Presentation tests cover shared Overview/3D states, silo fill, closed OFF fans, blue pads, history, daily/weekly performance, offline assets, native CSV handoff, a read-only Java-method mock and phone/tablet layouts.

Install over the existing pilot app to retain its data/session. Physical-phone acceptance remains: real login/resume, live I/O, history selection, production create/edit/delete with authorized roles, CSV save/cancel, notifications/background reconnect and launcher icon. No firmware reflash or database migration is required.

## Artwork provenance

The UI wordmark is the original supplied PNG, unchanged. The architectural illustration and its generation brief are documented in [the shared asset notes](../../web/brand/house-architecture.md). The launcher adaptation is saved at `app/src/main/res/drawable-nodpi/elmajd_launcher.png` and was made with the built-in image generation tool from the owner's logo.

Launcher prompt: create one square launcher asset preserving the supplied white angular M, three orange circuit nodes and orange orbit; omit the lettering/divider; center the emblem within approximately 62% of a solid charcoal `#111316` canvas for adaptive masks; no phone mockup, frame, text or shadow. The full UI wordmark is kept separately and is not replaced by this adaptation.

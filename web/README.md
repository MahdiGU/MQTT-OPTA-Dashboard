# ElMAJD FLOW web dashboard

Browser conversion of Android FLOW 1.16.0, developed on `Web_FLOW_Dashboard` on 18 November 2026. No merge. The Android application and firmware remain unchanged.

The web dashboard reuses the APK's local UI assets, 3D engine, I/O adapter, charts, production forms, validation and role-aware controls. A browser adapter replaces the Java bridge with the pinned Supabase JS SDK 2.119.0. Desktop users get a sidebar and multi-column workspace; smaller screens retain the five bottom tabs and header access to Configuration/Communication. French/English and the new FLOW branding are retained.

## ElMAJD logo refresh — 19 November 2026

`Web_Orange_Logo_Design` applies the owner's new ElMAJD Automation wordmark to the browser dashboard. The source is the [owner-provided shared logo](https://chatgpt.com/s/m_6afefcbaadfc819195506464fbb80f8c). `web/brand/elmajd-logo.png` contains the original 2172 × 724 PNG, used without recoloring, redrawing or cropping. SHA-256: `6f36e0eee90b600e1cba1742ecf4f3c8d26d250aeecffef41018e773851d3da0`.

The identity uses signal orange `#ff8b00`, charcoal `#111316`, white panels and neutral steel-gray text. Desktop navigation is charcoal with orange selection; the main workspace stays light. The same logo appears on login, desktop/mobile navigation and favicon. Actions, charts, form focus, production calculations, data tables and account/communication panels share the palette. Running/stopped/alert/cooling colors retain their existing meanings; both cooling pads stay blue when active.

The refresh increases regular labels to 14px and input/body text to 16px, uses larger neutral cards, aligns Stock/Sortie fields on narrow displays and removes decorative step numbers/arrows. Smaller navigation labels and secondary metadata remain responsive. Login, actual Supabase data, production calculations, history paging/CSV, role-aware corrections/deletion, alarms, commands and 3D interactions remain integrated. The Android source, APK, firmware, database and retention configuration are unchanged.

`web/brand.js` and `web/brand.css` are web-only additions to the shared app assets. The build includes the exact original logo, and browser tests verify the branding, orange primary action, readable form labels, narrow login and all seven screen layouts at 320/390/768/1440 pixels alongside the existing functional checks. Screenshots use mocked test data and are design previews, not field measurements. No merge is performed.

## Live equipment workspace — 19 November 2026

`Web_3D_Live_Workspace` builds on `Web_Orange_Logo_Design`, without a merge. The browser's **3D en direct** page now has a larger architectural view, front/top/free camera choices, reset and label controls, four live summary cards, and a selected-equipment panel beside the scene (below it on phones). The original interactive WebGL renderer remains available under **Vue 3D libre**. Detailed equipment lists are retained in a collapsible section.

The front illustration uses a locally bundled architectural background with independent selectable SVG equipment. Eight fans follow the existing `D0–D3 / L0–L3` mapping and the 2 + (2 × 2) + 2 layout. OFF fans have closed shutters; animation represents control state, not installed rotation feedback. All twelve feeding-chain signals remain mapped to expansion I1–I12, in four rows and three levels. A labelled matrix provides larger touch targets. Both pads display the same I7 feedback in blue. Three IBC cisterns use I2–I4, and two exterior silos beside the egg depot use I5–I6. Silo grain and cistern water are full/empty illustrations, not measured percentages. The egg depot uses saved Stock, 30 eggs per tray, and current flock × 7 capacity.

Selecting temperature, a cistern, a silo or a pad shows the already-loaded latest-value five-minute samples from the past twelve hours. Temperature axes adjust to valid historical extrema; digital values use step plots. Unknown values and gaps greater than 7.5 minutes break the line. Hover or keyboard arrows inspect samples; the existing history dialog remains accessible. Fan/chain history is explicitly unavailable because those series are not returned by the current history API. The new panel introduces no network calls, polling, migrations or retention changes. Stale telemetry retains the existing 20-second validity rule and becomes grey/unavailable, never a fabricated OFF/empty reading. Motion pauses off-screen and honors reduced-motion preferences.

The browser regression suite covers all equipment counts, state mappings, blue shared pads, shutters, selection, camera/label controls, keyboard chart inspection, step plots, gaps, temperature scaling, stale data, French/English controls and 320/390/768/1440 layouts, alongside existing auth, production, permissions and commands. Screenshots are generated with mocked data. Android, firmware and database sources are unchanged. See [architectural asset provenance](brand/house-architecture.md) for the background creation notes.

Overview now reuses this exact front-scene renderer and live status/inventory updates, including shuttered fans, the twelve chains, blue shared pads, cisterns, exterior silos and egg depot. Its SVG resources are namespaced independently from the 3D tab. Selecting equipment in Overview opens that item in the detailed 3D workspace. Temperature, flock, production, cartons and performance charts remain in Overview. The temperature summary sits above the scene to keep equipment unobscured on desktop and phone. The original overview image/state overlay is retired in the web build. No additional cloud reads are introduced.

## Flock age and chart refinements — 19 November 2026

`Web_Flock_Age_Charts` is based on `Web_3D_Live_Workspace` and changes the web dashboard first. Android 1.17.0 and the firmware/database are unchanged; no merge is performed.

The confirmed pilot reference is **24 October 2026 = last day of age week 29**. Week 30 starts Sunday 25 October; age weeks run Sunday–Saturday. Overview displays the current age week and day 1–7 independently of the latest production record, using fixed GMT+1. On 19 November this is **age week 33, day 5/7**. It refreshes at the production-day midnight and when a tab resumes, without a database query. Configuration displays the reference read-only. The reference is bundled consistently for the current pilot flock; a replacement flock will require an updated reference.

Both charts now expose synchronized Daily/Weekly choices, including a control beside Mortality. Weekly buckets and x-axis labels follow the flock's age weeks rather than ISO/calendar weeks. The production rate is the mean of valid recorded daily rates; eggs and mortality are summed within the age week. Partial weeks include recorded days only; unknowns and missing periods stay gaps, and genuine zeroes remain zero. Date spans and record counts remain in the tooltip/values table so the age-week labels can be checked against entries. Stored production entries are not changed.

Cooling pads in the shared Overview/front/top illustration are compact framed side enclosures near the entrance, proportioned against the existing free model's 8.2 m × 2.85 m pads; both retain shared I7 feedback and blue active states. The free WebGL model is unchanged. Status and sensor-history labels use **Feed silos / Silos d’aliment**, while packaging inventory keeps its separate carton/alvéole terminology.

Validation covers the confirmed 24/25 October boundary, GMT+1 midnight, continuity over New Year, partial weeks, missing/future/zero records, actual age display, age-week chart labels and sums, synchronized mortality controls, feed-silo labels, compact pad geometry and responsive layouts alongside the existing browser regressions. Screenshots use test data.

### Approved cooling-pad proportions

The owner approved the medium-size pad preview on 19 November 2026. The shared Overview/front renderer now uses that exact geometry: larger framed panels on both side walls near the entrance, a fine grille texture, bottom channels and short airflow strokes. The model is indicative, not an installation drawing. Both panels retain shared I7 feedback and blue active states, selection and history. Top/free views retain their existing footprint/physical model. The earlier very small front-view panels are superseded. Browser checks verify the approved size, identical Overview/3D shapes, separate texture IDs, active blue color and selection of the I7 details. Android remains unchanged.

## Use

Sign in with the **same Supabase email and password as the Android app**. The pilot farm is `elmajd-poultry`. The browser reads/writes the existing shared data, rather than a separate database. Farm membership and permissions are enforced by RLS and the existing authenticated RPCs. Remembering login saves a refreshable session in this browser, never the raw password. Unchecked login uses session storage. Sign-out stops subscriptions and clears the session and displayed account data.

The default published Site is owner-private. Its access gate is separate from the Supabase farm login; sharing the Site with other visitors is a separate access decision.

## Features

- Live temperature, voltage and device diagnostics; three cisterns, two silos, eight fan command states, twelve feeding-chain feedback states and two pads sharing I7.
- Interactive architectural house and locally bundled rotatable WebGL scene; silo fill, OFF fan shutters, blue pads and egg-depot stock/capacity retain the app's mappings and freshness rules.
- Latest production, flock, carton stock, daily/weekly production and mortality, plus 12-hour latest-value five-minute equipment history.
- Server-validated Stock/Sortie/mortality entry and production calculation; history paging, authorized edits/deletion, flock adjustments, carton receipts and corrections.
- Shared alarms/acknowledgement, temperature thresholds, password change/recovery and authenticated pilot commands. A notification test sends to the user's already registered Android phone; email self-tests use the existing Gmail sender.

Realtime subscriptions are filtered by farm and cover current device state, production, alarms, carton receipts and flock adjustments. The dashboard reconciles business/history data every five minutes while visible. A bounded 15-second REST fallback checks current telemetry only when Realtime is unavailable or silent for over 25 seconds. Reads are deduplicated; hidden tabs suspend these periodic reads and reconcile when visible again. It does not fetch raw telemetry or run any historical aggregation.

Browser monitoring requires an open tab; a browser/OS may throttle or suspend a background tab. This web release does not register browser push or provide Android-style background monitoring. Existing server alarms, Gmail fallback and Android push continue independently.

## Backend adaptation

The new `web-dashboard-api` Edge Function provides browser CORS support for the existing command, account-recovery and notification-self-test endpoints. It accepts only three fixed operations and does not accept a target URL, MQTT credentials, worker secrets or arbitrary headers. Commands and tests forward the user's JWT to the existing authorization checks. Recovery retains the existing non-enumerating, rate-limited recovery service. The platform JWT precheck is disabled for this gateway to allow public recovery; protected operations require a bearer JWT and are independently authorized by their existing target functions. Existing Edge Functions, tables, policies and firmware are not modified.

Commands remain plain text (`D0 ON`, `LED2 OFF`, `ALL OFF`, etc.), with server-enforced **QoS 0 and retain off**. The JSON gateway envelope transports the string over HTTPS; it does not change the MQTT payload format. Browser configuration includes only the public URL, publishable key and farm slug. No service-role key, MQTT password or signing key is bundled.

## Build and test

```powershell
pnpm install --frozen-lockfile
pnpm build:web
pnpm test:web
pnpm preview:web
```

The preview runs at `http://127.0.0.1:4180/`. `web/dist` is the deployable static dashboard and is ignored by Git. The build copies an explicit allowlist from the Android assets and adds the browser adapter/layout; it includes fonts, building/model assets and third-party licenses. The `?preview` parameter does not bypass sign-in or create demo data in the web build.

Automated browser tests use mocked HTTP and WebSocket responses through the actual browser bridge/Supabase SDK. They verify login, password-free session storage/restore/logout, farm-scoped reads, live channel updates, numeric/RPC mapping, production save and plain-string command requests, 390/768/1440 layouts and gateway restrictions. No test publishes an actual OPTA command or sends a real email/notification. Live read-only checks verified the project is healthy, the pilot farm exists, CORS preflight succeeds, anonymous command submission receives 401 and anonymous farm data is denied. Physical device control and authenticated real-user field acceptance remain to be checked by the owner.

Static deployment source is staged separately for Sites, containing only the compiled dashboard, hosting manifest and this guide. It excludes Android Java/configuration, firmware, APKs, keystores, temporary files and backend sources.

## Production workspace update — 18 November 2026

The Production page now uses the full desktop workspace instead of squeezing the mobile layout into one column. Summary cards show the latest saved stock and its date, latest daily rate/eggs, and mortality over the last seven calendar days with the number of recorded days. These use the canonical loaded production data, independently of ledger filters and history paging.

Entry fields explain closing stock, egg dispatches and daily mortality. A separate calculation panel displays the selected Stock + Sortie − previous stock, the previous record date and the server-validated production/rate. The previous stock is derived from the matched validated preview; missing or stale previews show no reference value. Initial-stock entries explicitly show the zero-production rule instead of a misleading equation. On phones/tablets the calculation appears inside the form before Save. Flock remains a configuration setting, not a production input.

The ledger replaces the mobile history cards with an accessible table. Date-range filters and UTF-8 CSV export apply only to the displayed history page (up to 30 records); the existing cursor-based Newer/Older controls remain available. Filtering does not change dashboard summaries. Corrections and deletion delegate to the existing role-aware handlers and server RPCs: managers can edit, only owners can delete. Loading failures remain visible; missing data does not silently become zero. Incoming telemetry does not rebuild table rows or interrupt keyboard focus.

Browser tests additionally cover stock-reference previews, rejection of stale preview results, initial-stock display, editing/canceling, owner/manager/viewer actions, date filters/invalid ranges, CSV contents, stable ledger focus during live updates and the 320/390/768/1440 layouts. The update changes only the web presentation/build/test files; Android, firmware and the database are unchanged.

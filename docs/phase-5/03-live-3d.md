# Android 1.13.0 live 3D visualisation

The new **3D en direct** tab shows an open-roof poultry house based on the owner's exterior model and cage photograph. The schematic includes four cage rows with three levels, eight end-wall fans, two side cooling pads, and an entrance room. Building dimensions and exact equipment positions are indicative until a measured layout is supplied.

## Signal mapping

| Model equipment | Telemetry | Interpretation |
| --- | --- | --- |
| Fans V1–V4 | `outputs.D0`–`outputs.D3` | Relay control state |
| Fans V5–V8 | `leds.L0`–`leds.L3` | LED control state |
| R1, levels 1–3 | Expansion I1–I3, bits 0–2 of `feed_chains` | High confirms chain running |
| R2, levels 1–3 | Expansion I4–I6, bits 3–5 | High confirms chain running |
| R3, levels 1–3 | Expansion I7–I9, bits 6–8 | High confirms chain running |
| R4, levels 1–3 | Expansion I10–I12, bits 9–11 | High confirms chain running |
| Pads 1 and 2 | Base OPTA `inputs.I7` | Shared auxiliary running feedback, approved by the owner |

Green animates a running or commanded-on item. Red represents a stopped or commanded-off item. Grey means missing, invalid, disconnected or older-than-20-second feedback. The timestamp uses `captured_at`, with `received_at` fallback for the base signals and `feed_chains_received_at` fallback for the expansion. An expiry timer clears running states even when no further messages arrive. Fan rotation is a visualisation of control state until physical rotation feedback is installed. Both pads necessarily show the same signal and cannot expose independent faults.

The new view consumes the existing authenticated native telemetry events. It creates no additional cloud queries or subscriptions. The same equipment remains accessible in a text-based selector if the device cannot initialise WebGL 2.

## Interaction and phone resources

Users can rotate, pinch to zoom, pan with two fingers, select equipment directly in the model or through labelled buttons, and switch between general, overhead, fan-wall and cooling-pad views. Keyboard arrows rotate, plus/minus zoom and Home resets the camera. The status selectors and selected-equipment details remain available to accessibility tools.

The renderer loads on the first visit to the 3D tab. The model, library and license are included in the APK. Local classic scripts support the existing `file:///android_asset` WebView configuration with network loading disabled. Rendering pauses when another tab, the login screen or a hidden document is active. Pixel ratio is capped at 1.5, animation is capped at 24 frames per second, hens use instanced geometry, and reduced-motion settings suppress equipment animation. A WebGL failure exposes the text equipment list and a retry button.

## Build and verification

Editable scene source is in `app/src/main/scene/live3d-scene.js`. The checked-in `live3d-scene.bundle.js` is generated with pinned Three.js 0.180.0 and esbuild 0.25.12. Rebuild with `pnpm install --frozen-lockfile --ignore-scripts` and `pnpm build:3d`. The Three.js MIT license is packaged in `THREE-LICENSE.txt`.

Run `pnpm exec playwright install chromium` and `pnpm test:ui`. The 3D test covers exact signal mapping, both shared pads, zero and invalid masks, stale-frame handling, automatic expiry, cloud/device disconnection, direct model selection, camera controls, language changes, pausing outside the tab, local file loading, and graceful WebGL failure. The existing UI test covers the seven-tab navigation and existing account, production, carton, chart and role workflows. GitHub Actions also verifies reproducible bundling, APK debug/release compilation and the pilot signature.

Installation on a physical Android phone and matching all 22 model indicators against the actual installation remain field acceptance checks.

# Android 1.14.1 cisterns silos and egg depot

The live 3D model now includes 28 selectable objects. The three rectangular IBC water tanks have rounded plastic bodies, metal cages, fill caps, outlet valves and wooden pallets, following the owner's reference picture. They stand in the service area inside the front of the house. The two tall silos have corrugated metal cylinders, shallow roofs, conical discharge hoppers, concrete pads and cross-braced steel supports, following the second reference picture. Both stand on the same exterior side beside the egg-depot annex. Binary level feedback appears in inspection strips and status indicators. Positions and dimensions are schematic pending a measured plan.

## Level feedback

| Model item | Base OPTA signal | Display |
| --- | --- | --- |
| C1 C2 C3 | I2 I3 I4 | High shows a full cistern with water. Low shows an empty cistern. |
| S1 S2 | I5 I6 | High shows a full silo with grain. Low shows an empty silo. |

Each vessel can be selected in the scene or its labelled card. A close-up camera and the existing cloud level-history dialog are available. Level sensors are binary. Unavailable, invalid, offline or expired readings turn the vessel indicator grey and hide its contents. Static full vessels do not keep the animation loop rendering idle frames.

## Egg depot rules

The owner confirmed the following rule on 07 November 2026.

- Stored eggs equal **Stock in the latest saved production entry**, selected by production date.
- Depot capacity equals **actual flock multiplied by seven eggs**. This corresponds to seven days at one egg per hen per day.
- Each tray holds 30 eggs. Occupied trays equal `ceil(Stock / 30)` and capacity in trays equals `ceil(capacity / 30)`.
- Visual occupancy equals `Stock / capacity`, capped at 100 percent for the drawing. The card shows the exact saved egg count, occupied tray count, capacity and stock date. Excess stock has a visible capacity-exceeded state.
- A valid zero Stock empties the depot. Missing Stock or flock information remains unavailable. A zero flock gives zero capacity, with positive saved stock reported as excess capacity. No division by zero is performed.

The depot contains modelled egg trays with eggs. At large quantities, the room uses up to 96 representative trays with instanced eggs, so the number of rendered objects remains bounded on phones. Stack height and occupied positions represent the proportion of capacity filled. When the actual tray count fits in the model, the last tray shows its partial egg count. The interface explicitly identifies the stacks as a scaled illustration.

## Shared data and interaction

The model consumes the existing native `production_history` and `configuration` events. Saved edits, deletes and flock changes update the display when the refreshed shared records arrive. Reading an older production-history page cannot replace the latest Stock. During a connection failure, the card retains the dated last saved reading with offline context. Sign-out clears inventory, and late events while the app is hidden cannot repopulate it.

Selecting the depot highlights the room, opens its close-up view and shows saved-record details. An action opens the Production tab. Additional camera presets show all cisterns, both external silos or the depot. Close-up views retain relevant equipment labels and suppress unrelated labels.

## Verification

The browser tests cover all 28 selectable objects, exact I2-I6 mapping, level-history access, stock and flock calculations, edits/deletion, missing and zero data, excess capacity, historical-page isolation, offline context and sign-out. Existing fan positioning, shared blue pads, chain feedback, stale-data expiry, local WebView loading and WebGL fallback checks remain part of the test suite. Physical Android upgrade and field comparison are acceptance steps.

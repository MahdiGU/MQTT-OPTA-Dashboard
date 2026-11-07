# Android 1.15.0 three interface designs

Branch `Android_Three_Designs` starts from `b1a0bb0` on the Opta expansion branch. One APK includes three complete interface options so users can compare them on the same phone.

| Design | Presentation |
| --- | --- |
| Émeraude | Soft green, rounded cards, a large temperature feature, spacious metrics and a curved navigation bar. Farm-and-leaf branding. |
| Atelier | Cobalt blue, a subtle grid, compact panels, smaller corners, tabular numbers and a navigation accent line. Geometric farm branding. |
| Argile | Warm cream and terracotta, serif headings, a pale temperature feature, featured production and carton cards, and more generous spacing. Farm-and-sun branding. |

The appearance selector is available on login and in Configuration. A palette button in the header opens the configuration selector. Choices are saved on the device in the `elmajd-design` local preference. Changing design applies styling and branding immediately, preserving the current session, form values and selected data. Unknown saved values fall back to Émeraude.

All seven tabs, forms, account recovery, history dialogs, equipment cards and the 3D viewer use the selected design. Green running feedback, red stopped states and blue active cooling retain their existing meaning across all choices. The vector marks and interface icons are packaged locally in the APK. The installed launcher icon continues to identify ElMAJD Automation.

Editable interface assets are `designs.js`, `designs.css` and the three `brand-*.svg` files. They reuse the existing cloud and native event flows. Preview URLs support `?preview&design=emerald`, `?preview&design=atelier` or `?preview&design=clay`, with optional `#live3d` to open the model.

`tests/designs-ui.cjs` verifies saved selection, invalid preference recovery, preserved login and production input values, seven-tab navigation at 320 and 390 pixels, local branding, 28 interactive 3D objects and consistent equipment colors. Existing app and 3D tests remain in the CI workflow. Physical Android visual and accessibility acceptance remains pending.

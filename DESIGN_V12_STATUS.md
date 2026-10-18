# Kingdom Craft v12 — status after 100-point design audit

The previous 100-point audit was a design backlog, not a list of confirmed software bugs. v12 implements the central visual overhaul and retains the v11 game mechanics.

Implemented and locally verified:
- One standalone HTML bundle on GitHub Pages containing the original asset illustrations, styles and scripts. Modular sources and SVG originals are in the downloadable archive.
- Warm fantasy UI, color-coded terrain, original SVG iconography for four resources, all eight buildings and the capital.
- Two equal primary actions (Attack and Build), 44px+ essential hit targets, 320px resource grid, visible army/territory/time.
- Clearer building prices, benefits and research cards.
- Persistent incoming-attack warning without shifting the battlefield; map focus action.
- Responsive Chromium tests at 320×568, 390×844, 844×390, 1440×900, target preview and building menu.
- Existing v9 gameplay regression and mocked two-client PeerJS scenario pass.

Still requiring separate work:
- Full cleanup of legacy CSS rules preserved within the bundled stylesheet.
- Smooth vector coastlines, full animation/sound system, configurable UI zoom.
- Real-device Safari tests, real two-phone multiplayer tests, host transfer on disconnect.

This release uses original artwork and no Supercell proprietary game assets.

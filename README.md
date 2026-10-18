# Brothers Kingdoms — Play-First v9

A browser-based territory strategy for 1–4 human players plus bots. This is an independently developed game; it does not copy Territorial.io's source code.

## Why v9 exists

The v8 interface devoted too much space to promotional text while withholding information essential to actual gameplay. More importantly, clicking a particular neutral position in v8 could start conquest across the entire national frontier. This release addresses information architecture and that control/logic mismatch.

## What's changed

- **Start:** The entire marketing hero, feature steps and duplicate headings are gone. The menu now directly offers Create room, Join by code, Play with bots and (if a save is available) Resume solo game. Player name and solo opponent count are in optional settings.
- **Rooms:** Room parameters collapse into a settings section; members/ready status and room code remain visible. There is an explicit Leave room action. Host dependency is explained.
- **Map and conquest:** Selecting neutral/enemy land selects a **local section of its shared border**, not the nationwide front. Preview highlights the actual initial cells used by `waveFront`. Neutral waves still advance in connected layers, starting at the highlighted part of the border.
- **Attack controls:** Only one set of troop-percentage presets is shown when targeting; the non-target dock is hidden. One click selects a target, the explicit confirmation button sends the order. Repeated tapping does not auto-send; no secondary browser confirm popup.
- **Armies:** A visible `Походы` button opens an actionable list with strength, destination, find-on-map and immediate recall.
- **Buildings:** All eight buildings now have purpose, exact benefit (using current economy tech for basic production), terrain requirements, total built and resource price, including what's missing. Contextual upgrade cards show current and next-level effects.
- **Research:** Four technology cards show the existing effect, effect after next level and actual costs/shortfalls. Economy, war, logistics and fleet are described based on implemented rules.
- **Rules:** Logistics now really reduces capture cost by 8% per level. Higher Sailing levels increase naval travel speed and reduce troop losses; Port upgrades increase naval movement speed and reduce losses. These levels had weak or nonexistent marginal benefits in v8.
- **Mobile:** Reduced upper chrome and removed automatic tutorial overlays. The building panel no longer has the leaderboard overlaid on top of its contents.
- **Result:** Exporting match results is moved under an optional details control.

## Known limitations

- This is not the original Territorial.io engine and cannot be claimed to match its timing, balancing or animation precisely.
- Multiplayer remains **PeerJS peer-to-peer with one authoritative host**. The match cannot automatically migrate to a different host if the original host exits.
- No production Safari-on-two-iPhones multiplayer test has been completed. Browser QA was run using Chromium with inlined assets and a mock PeerJS transport.
- Persistent storage was exercised with a test storage shim because the test browser environment blocks storage on the local `about:blank` document. The actual Safari persistent-storage path has not been verified in this release.
- The terrain is still tile-based with sharp stepped borders; map graphics and deeper balancing could be improved independently.

## Run locally

Serve the directory with any static web server and open `index.html`. For multiplayer, the browser needs the PeerJS script from `unpkg.com` and an internet connection. A normal GitHub Pages deployment also works.

## QA

```bash
node --check engine.js
node --check game.js
node test-v9-gameplay.js
python browser_test.py
python interaction_v9.py
python network_v9.py
```

The browser scripts inline assets in Chromium to work around blocked local navigation in the evaluation environment. `interaction_v9.py` injects a test-only storage shim; `network_v9.py` provides a two-client mock peer transport. Neither is included in production scripts.

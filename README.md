# Brothers Kingdoms — Battlefield Awareness v11

Browser-based original territory strategy for 1–4 human players and optional bots. Designed for mobile Safari/Chromium and desktops.

## v11: critical information visible during the match

- Persistent compact resources ribbon: food, wood, stone, gold, live production/s; food rate factors in troop recruitment. Low or declining food has a visual warning.
- Always-visible troop reserve/cap, land %, victory target and match timer (retained from v10).
- Persistent **incoming attack** banner when a hostile army targets your country. Names the attacker, counts incoming fronts and shows enemy troops. Tap to zoom to the battle. It disappears when the attacks stop.
- Targeted incoming fronts receive a red marker on the world map and a red circle on the minimap. This is a focused warning for your kingdom rather than every world conflict.
- New resource rates also show a consistent forecast before the first economy tick.
- No game engine rule changes; attack, building, research, bots and P2P room protocols remain compatible with v10.

## How to run

Open `index.html` in a browser or serve the folder with a static web server. Multiplayer uses PeerJS via CDN and needs an internet connection. An active host tab is required. For deployment to GitHub Pages, keep the related stylesheets and scripts in the repository root.

## Regression tests

- `node test-v9-gameplay.js`
- `python test-visibility-v11.py` (Chromium + Playwright)
- `python test-hud-v10.py` (updated to load `hud-v11.css`)
- `python test-network-v11.py` (simulated PeerJS network and incoming attack to a guest)

The standalone release ZIP includes the Python tests used during verification. See `VISIBILITY_AUDIT_V11.md` for the full 60-point visibility audit, test scope, and outstanding work.
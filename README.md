# Brothers Kingdoms — Layered Conquest v8

Free browser-based territory strategy for 1–4 human players and optional bots. The game implementation and visuals are independently authored. It is **not a copy of Territorial.io**.

## v8 — fundamental conquest correction

The clicked neutral tile initiates conquest, but does NOT define a thin route. Neutral fronts expand across the exposed national border by *whole connected layers* until the committed troop budget runs out. Hostile attacks propagate only along borders shared with the selected enemy. Partially funded layers distribute captures across sixteen sectors, preventing narrow tendrils. Armies cannot attack a distant enemy without a shared land border (naval assaults remain separate). Bots were updated to select actual neighboring targets. The older focus-on-a-target-path implementation was removed.

The implementation is original code inspired by observable gameplay and public explanations of Territorial.io, not a copy of its proprietary source. Run `node test-frontline.js` to check that captures are broad, connected and do not form one-cell corridors.

## Play

- Solo: **Играть с ботами**. Choose 2, 4, 7, or 10 bots. The game is auto-saved in this browser.
- Friends: **Создать комнату** → share the code or link → everyone presses **Готов** → host starts the match. The host's tab must remain open.
- Mobile combat: tap foreign/neutral land to inspect your attack, adjust troop commitment, then press **АТАКОВАТЬ**. Alternatively, **press and hold your own land for ~0.32 s, drag to the target, release**, then confirm. Another tap on the selected target also confirms.
- Mouse and keyboard: click the target, press the attack button, drag to pan, scroll to zoom; keyboard arrows and Enter also operate map selection. Use two fingers to pan/zoom on phones.
- Development is optional during early expansion: **Развитие** opens construction, technology, diplomacy, and statistics; it does not consume permanent map space.
- Tap your own army to redirect or recall it. A recall immediately ends the campaign and returns surviving troops minus 4% withdrawal cost.

## Historical v7 changes

**Actual gameplay changes:** v7 directed single-pixel capture toward the clicked destination and stopped at that target (this created thin corridors; fixed in v8). Host simulation now updates advancing fronts at approximately 4 Hz while economy and match time remain 1 Hz. Troop commitment and remaining reserves are visible at confirmation. No more free land added after each simulation tick. Capturing a capital penalizes the defender but does not magically transfer all distant provinces; elimination requires losing all land. Capital upgrades improve capital defense.

**Interaction and design:** new dark tactical-map presentation, clean country boundaries and labels, subdued land biomes, visible attack direction, one compact attack composer instead of two stacked panels, context-sensitive percent selection, dedicated development drawer, large phone hit areas, and long-press-and-drag targeting.

**Engineering and testing:** `test-engine.js` and `test-frontline.js` verify deterministic simulation, broad multi-direction neutral expansion, hostile border capture, and immediate retreat. Playwright scripts `interaction_v7.py`, `touch_v7.py`, `network_smoke.py`, `screenshot_one.py` cover viewport layouts, attack confirmation, the mobile drag gesture, and two-client mock-room commands/reconnect.

## Run locally

Serve the directory with a static web server, e.g. `python -m http.server 8000`, then visit `http://localhost:8000`. Internet access is required for the PeerJS signaling library and external multiplayer signaling; solo mode can run after game scripts load.

## Architecture & known limitations

`engine.js` owns game rules; `game.js` owns rendering, controls and room synchronization; `style.css` plus `frontline-v7.css` own layout. The published entry point is `index.html`, compatible with GitHub Pages.

**Important:** This is an improved prototype, not a certified production game. Peer-to-peer multiplayer still depends on PeerJS Cloud and a running host tab. Host migration, hostile-client protection, anti-cheat, full recovery from lost host, and real-device Safari performance have not been proven. The combat system, borders, bot intelligence, and economic balance still differ substantially from commercial/reference territory games. Automated tests and simulated PeerJS connections do not establish reliability between real phones on the Internet.

Copyright © 2026 Brothers Kingdoms contributors. Original implementation; no proprietary third-party game source bundled.

# Brothers Kingdoms — Frontline v5

Free browser-based territory strategy for 1–4 human players plus AI opponents. Original code and art; inspired by territory strategy games, including Territorial.io, without copying their assets or proprietary source.

**Live (GitHub Pages):** https://amirmurat.github.io/brothers-kingdoms/

## Controls

- **Tap a neutral or enemy area** to launch an attack from the nearest land-connected border.
- **Set 5–95%** of available troops to commit using the slider/presets.
- **Drag** to pan; pinch or +/- to zoom; use the overview/minimap to navigate.
- **Development:** build on your own land, upgrade existing buildings, research technology, negotiate alliances.
- **Multiplayer:** create a room, share the invite link, wait for others, then start the match. The host must remain connected.
- **Solo:** click “Играть с ботами” to begin immediately.

## Changes in v5

- Frontier-based territory expansion replaces thin one-unit trails. Each attack expands an adjacent wave; captured land remains connected to the territory from which the attack originated.
- A terrain-aware land search picks the closest valid starting border instead of any arbitrary coast tile.
- Small unclaimed pockets surrounded by one kingdom are resolved without visually disguising ownership.
- Troop income includes a modest balance-based growth component. Surviving unused troops return home after attacks.
- New minimalist, accessible layout and cohesive SVG icon set; a much clearer mobile map and battle panel.
- Cached rasterized map rendering, on-demand world updates, and run-length encoding of owner grids for room snapshots.
- Coastal landings are supported if Fleet tech and a port have been acquired. Naval transport is intentionally simplified.

## Mechanics and limits

Map: 160 × 104 logical tiles. Up to 4 humans, 10 bots. A match ends after 12 minutes, when one kingdom survives, or when one kingdom holds more than 70% of land.

Eight buildable structures, four resource types, four technology branches, alliances, and resource donations. Simulation ticks once per second. The current version is a casual **alpha**, not a full reimplementation of Territorial.io. The AI, naval combat, and strategic balance are deliberately simpler.

### Technical stack

- `index.html` — application markup
- `style.css` — responsive design
- `engine.js` — deterministic host-authoritative strategy simulation, CommonJS + browser global
- `game.js` — Canvas interface, touch/keyboard controls, PeerJS network synchronization
- `test-engine.js`, `test-frontline.js` — local simulation regression tests

Static website hosted on GitHub Pages. Live room connections use PeerJS and its publicly hosted signaling service. No paid hosting is required for small personal games under current service terms. Service availability, relay routing and performance are not guaranteed. There are no persistent accounts or saves. No dedicated authoritative game server: the hosting player's browser is the authority. Host disconnection stops the match. Cross-device testing is still necessary before treating multiplayer as production-grade.

## Development

Open `index.html` through a local HTTP server or GitHub Pages to play. Node.js regression tests:

```bash
node test-engine.js
node test-frontline.js
```

## Originality

This project is independently implemented and doesn't distribute Territorial.io game binaries, images, source code or proprietary audiovisual materials. The interface and gameplay combine ideas common to real-time territory-control games.

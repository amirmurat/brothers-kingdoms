# Brothers Kingdoms — Gameplay HUD v10

A private-room and solo browser territory strategy. This release specifically targets **information visibility during an active match**. It builds on v9's buildings and locally controlled frontline conquest.

## What changed

- **Always-on, device-independent core stats:** reserve troops, capacity, actual recruitment rate, territorial percentage, 70% victory goal, remaining match time. Territory no longer disappears on 320px-wide phones. A small goal-progress line shows advancement.
- **Context-aware recruitment status:** `НЕТ ЕДЫ`, `ЛИМИТ`, or `НАБОР 0` rather than an unexplained `+0/с`. Before the first economic tick, displayed troop income is explicitly approximate and cap is derived from current territory/buildings.
- **Map-first attack controls:** initial attack control is one compact button; presets expand on demand. The selected-target sheet replaces, rather than stacks on, the dock. Its reserve warning uses the actual reserve left, not a hard-coded attack-percent cutoff.
- **Strategic context:** minimap is expanded at start on phones. Important notifications include territorial losses with a map focus action, threats to the capital, completed campaigns, stalled food-related recruitment, weakened expeditions and connection degradation.
- **Network safety:** stale guest state (over 4.5 s old) blocks new orders, showing the number of seconds since the last update. It does *not* pretend that the match is up to date.
- **Live fronts:** new expeditions track their initial troop allocation and how many tiles they capture. The expedition list shows remaining vs initial troops, estimated losses, captured cells, and high-risk depleted units. The map highlights severely weakened army markers.
- **Decision support:** for enemy attack previews, show both target-tile defense and mean defense on the selected frontage, with uncertainty. Shift the map enough to keep a selected target visible above the confirmation sheet.
- **Quick feedback:** local orders now acknowledge the start of a campaign. Resource details include recruitment and estimated food consumption.

## Files

`index.html`, `style.css`, `frontline-v7.css`, `refined-v9.css`, `hud-v10.css`, `game.js`, `engine.js`.

## Tests (run from project root)

```bash
node --check game.js
node --check engine.js
node test-v9-gameplay.js
python test-hud-v10.py
python interaction_v9.py
python network_v9.py
```

Browser tests use Python Playwright + Chromium. The scripts open the standalone app via `set_content` to avoid sandbox navigation restrictions; the PeerJS two-client test uses a simulated transport. Live Safari and internet-connected peer-to-peer matches remain to be checked on real devices.

## Not included / known gaps

- Does **not** reconstruct a complete battle odds/probability model. The displayed defender information is factual and the suggested risk remains qualitative.
- There is no reliable ETA or predicted conquered land area (these would be dishonest without a deeper combat simulation).
- No authoritative hosting or automatic host migration; rooms still require the host to stay online.
- UI remains pixel/grid-based on canvas; a more polished map renderer and stronger front highlight are independent work.
- Historical end-of-expedition returned troop counts are not stored as per-campaign statistics; the active view reports current strength, troops expended and captured cells.
- v9 save games may include older armies without the new `initialStrength` / `captured` fields; the list safely uses fallback values.

See `HUD_V10_STATUS.md` for individual status against the preceding 56-point visibility audit.
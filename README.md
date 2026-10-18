# Brothers Kingdoms — Frontline v6

A free, original browser territory strategy for 1–4 people, with bots. Inspired by broad game design ideas from territorial strategy games. All source and UI are independently implemented.

**Live site:** https://amirmurat.github.io/brothers-kingdoms/

## What's improved in v6

- **Safe attacks:** tap to inspect a target, see troop commitment and an estimated local defense, then confirm. Sending ≥75% requires an additional warning. No automatic one-tap orders.
- **Usable mobile UI:** 44px controls, landscape-specific layout, minimized/expandable minimap and attack dock, bottom-sheet development panel, visible land/troops/status and an economy drawer.
- **Construction feedback:** valid placement overlays, disabled unaffordable buildings with missing resources, and no cancellation on failed placement. Tap a building to upgrade; tap an army to change destination or retreat.
- **Accessibility:** keyboard cursor, target selection with Enter, landmark labels, semantic tabs, better focus behavior, reduced-motion support, status announcements.
- **Lobby and network:** 6/12/20 minute matches, 0/3/7/10 bots, ready checks, start-area choices, room link and room code, reconnect to the same player slot using session token, action acknowledgments, reconnection notices, incremental territory deltas with revision checks. Only the host can change room settings.
- **Continuity:** solo pause / local auto-save / resume, next-army navigation, match statistics and downloadable results, host-controlled rematches in the same room.
- **Map rendering:** higher-contrast player territories, closed borders at map edges, visible army counts at lower zoom and interpolated network army positions.

## Playing

On mobile, choose a target by tapping the map, adjust the attack percentage in the dock, then confirm in the target card. Pinch to zoom and drag to pan. Open **Развитие** to build, research or negotiate. The **◎** button opens economy, leaderboards, solo pause, and army navigation. The **?** button opens a short tutorial.

## Local tests

```bash
node test-engine.js
node test-frontline.js
python3 browser_smoke.py
python3 interaction_test.py
python3 network_smoke.py
```

The three browser scripts require Python Playwright and a Chromium executable at `/usr/bin/chromium`. The network test uses two simulated PeerJS clients within Chromium, not a live Internet connection.

## Architecture and limitations

- `index.html`, `style.css`: responsive web interface, canvas world, UI states.
- `engine.js`: 160×104-cell deterministic host-authoritative territory simulation.
- `game.js`: controls, scene rendering, PeerJS room client and state synchronization.
- Browser hosting is GitHub Pages, real-time signaling is PeerJS Cloud. No monetary charge is required for the small private use case, subject to providers' terms and availability.

**The host must keep their browser open.** There is no host migration or dedicated game server. Automatic reconnection only works while the original host remains online. PeerJS connectivity, actual iPhone Safari rendering, and real two-device multiplayer must be verified in production. Some UX audit items are still partly addressed or open; see `UX_AUDIT_STATUS.md` for an explicit 100-item reconciliation. Do not consider the game production-grade merely because local tests pass.

Copyright (c) 2026 Brothers Kingdoms contributors. Original implementation; does not redistribute third-party game source or proprietary assets.
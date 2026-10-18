# UX / information architecture audit — implementation status in v9

Reference: `brothers-kingdoms-v8-information-architecture-audit.md` (120 items). The distinction below is intentional: **not all 120 items are completed**. The v9 priority was actual gameplay comprehension rather than visual decoration.

## Completed in v9

- Removed promotional hero, overline, explainer, triple feature grid, release version badge, repeated start labels and footer sales copy.
- The first screen has direct Create / Join / Solo choices and a conditional Resume choice; name and bot count are secondary.
- Room participant list, invite code, ready states and host dependency retained; advanced room choices collapsed; Leave room added.
- Resource balances and income are readable in development tabs and on demand, without occupying map HUD permanently.
- Map HUD retains army count, growth, time, area; armies now have a quick actionable front list.
- Target selection highlights the exact initial border cells used by the simulation. Neutral attacks are localized to the selected border, not the country's entire neutral perimeter.
- Attack confirmation has a single set of percentages, exact sent/reserve values, no repeat-tap automatic dispatch and no second browser confirmation.
- All eight building cards have descriptive purpose, numeric benefits, building conditions, current count and price/shortfall. Context card describes next-level effect.
- Technologies present current and next-level effects. Nonfunctional Logistics benefits, level-2/3 Sailing benefits and Port-level benefits now have implemented gameplay effects.
- Tutorial no longer blocks the start of a match; full help remains accessible.
- Eliminated the mobile leaderboard overlay over building content; leader information remains available on demand.
- Optional detailed result export hidden under an expandable control.

## Partly improved

- Preview highlights the **initial** engaged frontline, not a full forecast of the ultimate area or casualty range; costs depend on subsequent defense and remaining troops.
- Building cards display a total current-level and next-level effect rather than a fully simulated economic return-on-investment recommendation.
- Battle event feedback still uses a condensed log/toasts and cannot substitute for full battle reports.
- The map is prioritized, but border antialiasing and some zoom-level readability need further work.
- Room connection and restart UX improved, but host departure still terminates authoritative simulation.

## Not claimed as resolved

- True authoritative server or automatic host migration; production multiplayer stress testing.
- Full rebalance of spawning, terrain, all building cost ratios, diplomacy and AI strategy.
- Full screen-reader control of individual canvas territory cells.
- Native Safari and cross-device iPhone compatibility testing.
- Complete animation/feel parity with Territorial.io.

## Verification

- `test-v9-gameplay.js`: 5 seeds of directional neutral capture and retreat, separate eastern/western preview, logistics economic effect, building upgrade and production research.
- `browser_test.py`: 390×844, 320×568, 844×390 and 1440×900, opening, game state, 8 building cards, 4 tech cards and armies panel, with no JavaScript errors.
- `interaction_v9.py`: select real map cell → local preview → send army → list → recall; autosave through test storage.
- `network_v9.py`: two mock clients create/join/ready/start.

These tests do not imply a real two-iPhone production test or full completion of all 120 requested improvements.

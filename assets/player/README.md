# Original player and project-created pixel art

## Active Fort artwork — v111

The active Fort sprites are three **32 × 32 RGBA top-down tower variants** in `fort-levels/`:

- `level-1.png` — simple square watchtower, red accents and stone corners.
- `level-2.png` — reinforced tower with additional parapet details.
- `level-3.png` — strongest visual tier, with gold highlights.

All three are drawn on a strict pixel grid, perfectly mirrored horizontally and vertically, with transparent edges and **one sprite per world terrain cell**. Country ownership changes only three red accent pigments (RGB 127/48/70, 185/66/84, 230/104/103); stone, gold and alpha remain intact.

**No joining:** neighboring Forts never merge into walls. There are no adjacency masks, rotations, automatically hidden inner tiles, or animated size changes. Three independent towers on adjacent cells remain three independent visible towers. This is a visual rule, not a new engine mechanic. The gameplay still permits level 4 because the owner asked to remove it **later**; levels 4+ temporarily display the third tower artwork while retaining actual numeric level and stats.

These three PNGs are bespoke pixel-grid drawings from the preceding ChatGPT iteration, reviewed and selected by the project owner. They are **not** Tiny Swords assets and should not be described as third-party CC0.

## Archived earlier Fort explorations

The old `fort.png` and `fort-tiles/{single,cap,straight,corner,tee,corner-1-line}.png` are kept for provenance and potential reuse, but **are not loaded** by current game code. They are earlier player-supplied PNGs; their separate original authorship must not be conflated with the three new tower drawings. See the archived v108–v110 handoff notes for their historical connector mappings.


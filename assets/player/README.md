# Original player-created pixel art

`fort.png` is the owner's **revised 32×32 PNG** (uploaded as `Fort(3).png` on 22 Oct 2026). This is **not** part of Tiny Swords and must not be described as CC0 or bundled with third-party asset licenses. Copyright/licensing remains with its creator unless they explicitly choose another license.

- Original dimensions: 32 × 32; native RGBA, transparent background; 7 palette entries including transparency.
- Lime team-color key: `#CFFF70` (RGB 207,255,112), 132 opaque pixels. Change **only** this exact key at runtime, keeping metal/red and transparency unchanged.
- Game role: Fort (`fort` building type).
- One sprite equals **one world terrain cell**, regardless of camera zoom. Do not export a 512×512 baked enlarged copy, upscale it with smoothing, apply reciprocal zoom, or render it on a screen-sized card.
- Future connected tiles: prepare artwork in the same 32×32 local grid. Each cardinal boundary (top/right/bottom/left) must line up in the neighboring tile. The renderer's neighbor mask uses N=1, E=2, S=4, W=8, and connects only identical type+owner. Renderers must preserve world-tile dimensions at every zoom.
- PNG is intentionally unmodified; ownership colors are applied in the Canvas image cache.

The historical `assets/tiny-swords-cc0` directory is separate and its CC0 provenance is not guaranteed. Do not classify this original Fort sprite under that directory.

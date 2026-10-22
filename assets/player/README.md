# Original player-created pixel art

`fort.png` is the **archived previous** authored Fort (uploaded as `Fort(3).png` on 22 Oct 2026). It is no longer the active map/UI Fort sprite. The five active new `fort-tiles/*.png` are the current original pixel art supplied by the same owner. This is **not** part of Tiny Swords and must not be described as CC0 or bundled with third-party asset licenses. Copyright/licensing remains with its creator unless they explicitly choose another license.

- Five active PNGs in `assets/player/fort-tiles/` are native **32×32 RGBA**, byte-identical to the author's latest uploads (new double-line corner replaces the original). They form a 4-neighbor **fortress-perimeter autotile**.
- `single.png`: isolated square Fort (neighbor mask `0`).
- `cap.png`: U-shaped wall, open to the east; base mask `E=2` (the original source `Fort 1xn left right top bottom`).
- `straight.png`: horizontal twin side walls, open east/west; base mask `E|W=10` (source `Fort middle 2 lines`).
- `corner.png`: **NEW two-line corner** (source `Fort Corner 2 lines.png`, 32×32); southwest outer L and northeast inner L, opening north/east, mask `N|E=3`. All four orientations rotate this PNG pixel-for-pixel.
- `corner-1-line.png`: archived previous `Fort corner 1 line` (not used by the active autotile), retained for future special-case art.
- `tee.png`: southern single wall, open N/E/W; base mask `N|E|W=11` (source `Fort middle 1 line`).
- `E|W|N|S=15`: fully surrounded interior; no outer wall is drawn.
- All other masks are one of those sprites rotated in **90° exact pixel permutations** (no interpolation or new image files). N=1, E=2, S=4, W=8. Neighbor must match both **Fort kind and owner**.
- The new art has **no lime accents**. It contains two author-defined red masonry palette entries `#964253` and `#E36956`. The game recolors **only these two brick colors** according to nation and building level; neutral gray metal, transparent pixels and shading layout remain unchanged.
- Every Fort remains one world terrain cell at every zoom; no zoom-based resize or cluster simplification. Neighbor removal, capture, and construction update the shape automatically at the next draw.
- Do not convert the original PNGs to an upscaled 512px copy; the browser applies nearest-neighbor sampling to a 32px source.

The historical `assets/tiny-swords-cc0` directory is separate and its CC0 provenance is not guaranteed. Do not classify this original Fort sprite under that directory.

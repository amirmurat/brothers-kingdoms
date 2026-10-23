# User-drawn simplified building sprites · v120

All nine images were supplied by the owner on 23 October 2026. They are original, unmodified 32×32 transparent RGBA PNG assets. Each Git blob SHA was checked against the raw uploaded file bytes; no editor/export/recolour was performed during archival. Files with decomposed Unicode filename characters were normalised only in this written provenance list, never in their contents.

This directory is **additional LOD art** for the portrait strategy map. The detailed artwork at `assets/player/owned/` and `assets/player/owned-v116/` remains authoritative at close zoom and in the building menu. New artwork is used at medium zoom only in the v120 **test branch**, not automatically in Cloudflare production.

| Git file | Original uploaded name (human-readable) | Verified Git blob SHA |
| --- | --- | --- |
| `city/level-1.png` | Город 1 ур меньше деталей.png | `5190c460be83b3fa748107e5a6a991369722aaff` |
| `city/level-2.png` | Город 2 ур меньше деталей.png | `f88c378b6235b390a0dba4d3cb1093e8bfd6ab3d` |
| `city/level-3.png` | Город 3 ур меньше деталей.png | `89cfc0d121f24a79a91620b2f6bb6b8979e29473` |
| `barracks/level-1.png` | Казарма 1 ур меньше деталей.png | `6bba3c6a5f0f02a1a00cc80ef01a39e8f2a48e90` |
| `barracks/level-2.png` | Казарма 2 ур меньше деталей.png | `c790369ed5ac853cbea27c2008ac85e2546f38c6` |
| `barracks/level-3.png` | Казарма 3 ур меньше деталей.png | `b40970c51025ccfb4d9d7b81ec71f357f33ffd4b` |
| `fort/level-1.png` | Форт 1 ур меньше деталей.png | `6107880219e6a5fe260541beea1fed7f4681eaa5` |
| `fort/level-2.png` | Форт 2 ур меньше деталей.png | `057f9476b5d8eb49c3480b299023025cc2cb6a56` |
| `fort/level-3.png` | Форт 3 ур меньше деталей.png | `4bc31dc85e1e2d73868b198e5975bbb0b2e7fa53` |

Compare original/new at real cell sizes in [preview.html](preview.html). Integration: `game.js`, `11 <= TILE*zoom < 24` for simplified images, clusters at <11, detailed original at ≥24 CSS pixels per world cell. No gameplay/placement changes. Requires iPhone visual review before production.

# Fred Studio V2 — Shadow and Island Detail Final Report

Date: 2026-08-05  
Route: `/studio-v2-import-test`  
Debug route: `/studio-v2-import-test?debug=1`

## Result

The final correction is limited to the primary directional shadow and the painted kitchen-island front. The accepted exposure, environment, window fill, ceiling bounce, camera system, exterior, countertop, stools, rug, sofas, kitchen metals, pruning, and official/debug route separation were preserved.

The stool comparison uses the same `FLOOR_RUG_DETAIL` camera. The previous long, dark, intersecting lattice is removed. The final stools retain light contact at their legs without razor-sharp or duplicate shadows. The living-room view shows the sofa bases, coffee tables, rug edge, and cabinetry without detached shadows, acne, or visible light leaks.

The island front remains black and below the timber countertop in brightness, with a small charcoal lift for edge and surface separation.

## Directional light and shadow values

| Setting | Previous | Final |
| --- | ---: | ---: |
| Directional position | `[5.8, 8, 4.1]` | `[4.8, 9.4, 3.2]` |
| Directional intensity | `1.04` | `1.04` |
| Shadow contribution | `0.62` | `0.50` |
| Shadow type | `PCFSoftShadowMap` | `PCFSoftShadowMap` |
| Shadow radius | `1` | `4` |
| Shadow-map size | `2048²` | `2048²` |
| Bias | `-0.00035` | `-0.00035` |
| normalBias | `0.025` | `0.025` |
| Lights casting real-time shadows | `1` | `1` — primary directional light only |

The directional light is higher and more vertical, and its shadow contribution is reduced by 19.4%. The RectArea/window-fill and ceiling-bounce lights do not cast shadows.

The installed Three.js version logs a deprecation warning for `PCFSoftShadowMap` and internally falls back to `PCFShadowMap`. The required configured shadow type remains `PCFSoftShadowMap`; this is a warning, not a console error.

## Island-front material

| Setting | Previous | Final |
| --- | ---: | ---: |
| Base colour | `#181a19` | `#252826` |
| Metalness | `0.03` | `0.02` |
| Roughness | `0.62` | `0.64` |
| envMapIntensity | `0.76` | `0.72` |

The override is scoped only to `StudioV2IslandPainted`; it does not affect the countertop, stools, rear cabinets, oven glass, handles, or coffee tables.

## Runtime verification

| Check | Result |
| --- | --- |
| FPS | `60` |
| Draw calls | `24` |
| Triangles | `79,922` |
| Geometries | `33` |
| Textures | `24` |
| Camera interior-safe | `YES` |
| Boundary corrections | `0` |
| Stabilizations | `0` |
| Official route main presentation | Present |
| Official route drag/orbit | Verified; rendered frame changed after drag |
| Debug panel on official route | Absent |
| Console errors | `0` |
| Production build | Passed — Vite, 501 modules transformed |

The build retains the existing non-blocking Vite large-chunk advisory.

## Evidence

- `01-final-opening-shadow-check.png`
- `02-stool-shadows-before.png`
- `03-stool-shadows-after.png`
- `04-island-front-final.png`
- `05-living-room-shadow-check.png`
- `06-debug-final-shadow-values.png`

## Files changed for this correction

- `src/studio-v2/studioV2Config.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `docs/reviews/fred-studio-v2-shadow-island-final/REPORT.md`
- Six PNG evidence files in `docs/reviews/fred-studio-v2-shadow-island-final/`

No commit, push, merge, or deployment was performed.

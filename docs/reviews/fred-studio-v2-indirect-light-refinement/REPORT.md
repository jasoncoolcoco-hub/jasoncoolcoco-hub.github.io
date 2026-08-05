# Fred Studio V2 — Indirect Light and Selective Material Refinement

Date: 2026-08-05  
Branch: `feat/fred-studio-hard-shell-v1`  
Scope: visual refinement only

## Final lighting

- Exposure: `0.95` (frozen; unchanged from the previous pass).
- Global environment intensity: `0.98` (`1.00 → 0.98`).
- Hemisphere: sky `#fffaf2`, ground `#39322c`, intensity `0.14`.
- Main directional light: `#fff0d9`, intensity `1.04` (`1.16 → 1.04`), position `[5.8, 8, 4.1]`.
- Weak directional fill: `#d5dfed`, intensity `0.10` (`0.17 → 0.10`), position `[-4, 3, -3]`.
- Window RectAreaLight: `#fff5e6`, intensity `0.72`, position `[-0.6, 1.95, -5.05]`, target `[-2.5, 1.05, 0.1]`, size `9.5 × 3.2`, no shadows.
- Ceiling-bounce RectAreaLight: `#fff1dd`, intensity `0.14`, position `[-2, 4.08, -1.1]`, target `[-2, 0.8, -1.1]`, size `8 × 4.5`, no shadows.
- RectAreaLight shader uniforms are initialized through `RectAreaLightUniformsLib`.
- AO: off. The project has no compatible post-processing chain, so no AO system was added.
- Bloom: off.

The exterior sphere is not illuminated by the new indirect lights. Exposure was not raised, and leaf, rock, and trunk detail remains visible.

## Shadows

- `PCFSoftShadowMap` retained.
- Main shadow intensity: `0.62` (`0.74 → 0.62`).
- Shadow map: `2048 × 2048`.
- Shadow camera: left `-9`, right `9`, top `8`, bottom `-5`, near `0.5`, far `28`.
- Bias `-0.00035`; normal bias `0.025`.
- Selective casting and receiving retained. The new area lights do not cast secondary shadows.

## Materials

M / R / Env means metalness / roughness / environment-map intensity. Values listed as retained are still part of the final tuned material set.

| Meshes | Final material | Previous M / R / Env | Final M / R / Env | Maps retained |
| --- | --- | --- | --- | --- |
| `node_0_Material.005_0` | `Material.005` north sofa | `0 / 0.56 / 0.88` | `0 / 0.64 / 0.72` | base colour, normal |
| `node_0.002_Material.007_0` | `Material.007` south sofa | `0 / 0.56 / 0.88` | `0 / 0.64 / 0.72` | base colour, normal |
| `Plane_Material.002_0` | `Material.002` floor | `0 / 0.27 / 1.12` | `0 / 0.34 / 0.92` | base colour, normal; source contains no roughness map |
| `Plane.002_Material.012_0` | `Material.012` rug | `0 / 0.94 / 0.32` | `0 / 0.96 / 0.24` | base colour, normal; normal scale `0.62 → 0.56` |
| `Cube_Material.003_0` | `StudioV2LightTimber` | `0 / 0.52 / 0.78` | retained | base colour |
| same mesh, kitchen-wall components | `StudioV2KitchenTimber` | `0 / 0.52 / 0.78` | `0 / 0.55 / 0.72` | base colour |
| same mesh, ceiling components | `StudioV2DarkCeilingTimber` | `0 / 0.50 / 0.70` | retained | base colour |
| `Cube.004_Material.003_0` | `StudioV2IslandTimber` | `0 / 0.38 / 0.86` | retained | base colour |
| `Cylinder_Material.003_0` | `StudioV2StoolTimber` | `0 / 0.40 / 0.84` | `0 / 0.42 / 0.82` | base colour |
| `Cylinder_…_0` | `StudioV2StoolLegMetal` | `0.04 / 0.56 / 0.72` | `0.78 / 0.43 / 0.92` | normal |
| `Cube.002_Material.004_0`, `Cube.007_Material.004_0` top components | `StudioV2CoffeeTableTop` | `0 / 0.40 / 0.82` | `0.04 / 0.52 / 0.68` | normal |
| same meshes, frame components | `StudioV2CoffeeTableFrame` | `0 / 0.40 / 0.82` | `0.78 / 0.42 / 0.90` | normal |
| `Cube.003_Material.008_0` | `StudioV2IslandPainted` | source `0 / 0.988 / 1.00` | `0.03 / 0.58 / 0.72` | normal |
| `Plane.001__0` | secondary ceiling | `0 / 0.54 / 0.68` | `0 / 0.58 / 0.60` | none in source |
| `Cube.001_…_0`, `Plane.003_…_0`, `Plane.005_…_0` | painted dark room surfaces | `0.04 / 0.56 / 0.72` | `0.04 / 0.58 / 0.70` | normal |
| `node_0.001_Material.006_0`, large cabinet components | `StudioV2KitchenPainted` | `0.04 / 0.56 / 0.72` | retained | base colour, normal |
| same mesh, sink and faucet components | `StudioV2KitchenMetal` | `0.92 / 0.25 / 1.28` | `0.94 / 0.25 / 1.28` | base colour, normal |
| same mesh, handle components | `StudioV2KitchenHandle` | `0.92 / 0.25 / 1.28` | `0.88 / 0.30 / 1.16` | base colour, normal |
| same mesh, oven and stove metal | `StudioV2KitchenAppliance` | `0.78 / 0.32 / 1.14` | retained | base colour, normal |
| same mesh, oven front glass component | `StudioV2KitchenGlass` | `0.78 / 0.32 / 1.14` | `0 / 0.22 / 1.00` | base colour, normal |
| `node_0.003_Material.009_0` | refrigerator / coated appliance | `0.08 / 0.50 / 0.82` | retained | base colour, normal |
| `node_0.006_Material.011_0` | furniture metal detail | `0.90 / 0.26 / 1.30` | retained | base colour, normal |

Sofa colour multiplier changed from `#989a99` to `#878988`. The island front has no base-colour texture, so it uses a near-black charcoal `#161817`. Textured cabinet colour was not replaced.

## Shading normals

Recomputed smooth normals were tested only on the two sofa meshes. They did not clearly reduce the chaise faceting because the visible planes come from the exported vertex structure. The test was reverted. Final shading normals and geometry topology remain the imported originals.

## Preserved behaviour and assets

- Opening camera position `[-6.42, 1.92, 0.3]`, target `[-2.35, 1.62, 0.16]`, and FOV `50` are unchanged.
- Camera cage, target bounds, zoom range, keep-out zones, damping, and no-jitter correction are unchanged.
- Official route direct orbit was verified by a controlled drag; the view changed immediately.
- Official route contains one canvas and zero headers, hints, loading UI, debug panels, or selection helpers.
- Debug controls remain restricted to `?debug=1`.
- Dining furniture and hanging window banners remain removed.
- No furniture transforms or room geometry changed.
- Source GLB SHA-256 remains `5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19`.

## Performance and validation

- Viewport: `1280 × 720`.
- FPS: `60`.
- Calls: `23`.
- Triangles: `78,782`.
- Geometries: `33`.
- Textures: `24` (two additional RectAreaLight LTC lookup textures).
- Anisotropy: `8`.
- Opening camera: safe; corrections `0`; stabilizations `0`.
- Console errors: `0` on the official route and `0` on the debug route.
- Production build: passed with Vite 7.3.6. The existing large-chunk advisory remains non-blocking.

## Deliverables

Final screenshots:

1. `01-final-opening.png`
2. `02-final-sofa.png`
3. `03-final-stools-and-floor.png`
4. `04-final-kitchen.png`
5. `05-final-living-room-opposite.png`
6. `06-debug-lighting-controls.png`

Controlled opening-camera comparisons are stored in `comparisons/`:

1. current baseline;
2. lighting-only improvement;
3. sofa refinement;
4. wood and floor refinement;
5. kitchen and metal refinement;
6. final combined result.

Modified implementation files:

- `src/studio-v2/studioV2Config.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/studioV2MaterialTuning.js`
- `src/studio-v2/StudioV2DebugPanel.jsx`

No commit, push, merge, or deployment was performed.

# Fred Studio V2 — Lighting and Material Refinement

Date: 2026-08-05  
Branch: `feat/fred-studio-hard-shell-v1`  
Selected baseline: `LIGHTING_B`

## Lighting comparison

| Candidate | Exposure | Environment | Hemisphere | Key intensity / position | Shadow intensity | Fill intensity / position |
| --- | ---: | ---: | ---: | --- | ---: | --- |
| LIGHTING_A | 0.86 | 0.85 | 0.11 | 0.96 / `[5.8, 8, 4.6]` | 0.82 | 0.10 / `[-4, 3, -3]` |
| LIGHTING_B | 0.91 | 0.95 | 0.14 | 1.10 / `[5.8, 8, 4.1]` | 0.74 | 0.17 / `[-4, 3, -3]` |
| LIGHTING_C | 0.98 | 1.08 | 0.18 | 1.22 / `[5.5, 8, 3.7]` | 0.66 | 0.24 / `[-4, 3, -3]` |

All candidates use key colour `#fff0d9`, fill colour `#d5dfed`, hemisphere sky `#fffaf2`, and the candidate-specific hemisphere ground colours stored in `studioV2Config.js`.

`LIGHTING_B` was selected because it retained the reference image's darker living-room foreground while keeping the kitchen and sofa readable. After materials were frozen, one permitted correction was applied:

- exposure `0.91 → 0.95` (`+0.04`);
- environment intensity `0.95 → 1.00` (`+0.05`);
- key intensity `1.10 → 1.16` (`+0.06`);
- key position, fill light, hemisphere light, and shadow intensity remained unchanged.

Final output keeps sRGB, ACES Filmic tone mapping, PMREM environment lighting, the visible forest sphere, a DPR cap of 2, and anisotropy 8. AO and bloom remain off.

## Shadow configuration

- PCF soft shadows;
- 2048 × 2048 directional shadow map;
- shadow camera: left `-9`, right `9`, top `8`, bottom `-5`, near `0.5`, far `28`;
- bias `-0.00035`, normal bias `0.025`, shadow intensity `0.74`;
- selective casters and receivers only.

## Material changes

“Previous” is the tuning immediately before this refinement. “Source” is used where no prior runtime override existed. All listed maps and original UVs remain attached.

| Mesh / final material | Category | Previous M / R / Env | Final M / R / Env | Preserved maps |
| --- | --- | --- | --- | --- |
| `node_0_Material.005_0` / `Material.005` | north sofa, exported body + cushions | `0 / 0.58 / 0.94` | `0 / 0.56 / 0.88` | base colour, normal |
| `node_0.002_Material.007_0` / `Material.007` | south sofa, exported body + cushions | `0 / 0.58 / 0.94` | `0 / 0.56 / 0.88` | base colour, normal |
| `Plane_Material.002_0` / `Material.002` | floor | `0 / 0.28 / 1.16` | `0 / 0.27 / 1.12` | base colour, normal; source has no roughness map |
| `Plane.002_Material.012_0` / `Material.012` | rug | `0 / 0.92 / 0.42` | `0 / 0.94 / 0.32` | base colour, normal |
| `Cube_Material.003_0` / `StudioV2LightTimber` | light wall and kitchen timber | `0 / 0.42 / 0.72` | `0 / 0.52 / 0.78` | base colour |
| `Cube_Material.003_0` / `StudioV2DarkCeilingTimber` | dark timber ceiling | `0 / 0.42 / 0.72` | `0 / 0.50 / 0.70` | base colour |
| `Cube.004_Material.003_0` / `StudioV2IslandTimber` | island / counter timber | `0 / 0.42 / 0.72` | `0 / 0.38 / 0.86` | base colour |
| `Cylinder_Material.003_0` / `StudioV2StoolTimber` | stool seats | `0 / 0.42 / 0.72` | `0 / 0.40 / 0.84` | base colour |
| `Cube.002_Material.004_0`, `Cube.007_Material.004_0` / `Material.004` | coffee tables | source `0 / 0.993 / 1.00` | `0 / 0.40 / 0.82` | normal |
| `Plane.001__0` | secondary ceiling | `0 / 0.54 / 0.68` | unchanged | none in source |
| meshes using `material` | painted dark room surfaces | `0.08 / 0.50 / 0.78` | `0.04 / 0.56 / 0.72` | normal |
| `node_0.001_Material.006_0` / `StudioV2KitchenPainted` | painted kitchen cabinets | combined `0.45 / 0.34 / 1.22` | `0.04 / 0.56 / 0.72` | base colour, normal |
| same mesh / `StudioV2KitchenMetal` | sink, faucet, handles | combined `0.45 / 0.34 / 1.22` | `0.92 / 0.25 / 1.28` | base colour, normal |
| same mesh / `StudioV2KitchenAppliance` | oven and stove metal | combined `0.45 / 0.34 / 1.22` | `0.78 / 0.32 / 1.14` | base colour, normal |
| `node_0.003_Material.009_0` / `Material.009` | refrigerator / coated appliance | source `0 / 1.00 / 1.00` | `0.08 / 0.50 / 0.82` | base colour, normal |
| `Material.011` mesh | furniture metal detail | `0.90 / 0.24 / 1.35` | `0.90 / 0.26 / 1.30` | base colour, normal |

Sofa body, seat cushions, back cushions, and loose pillows are combined into one fragmented exported mesh per sofa. They cannot be cleanly assigned independent materials without destructive geometry surgery, so each sofa was tuned as one upholstery material.

Runtime connected-component grouping preserves geometry positions, UVs, textures, and the source GLB:

- architectural timber: 25 light-timber components and 3 dark-ceiling components, rendered as two material groups;
- kitchen: 91 large painted components, 656 compact exposed-metal components, and 256 oven/stove components, rendered as three material groups.

## Verification

- viewport: 1280 × 720;
- FPS: 60;
- render calls: 23;
- triangles: 78,782;
- geometries: 33;
- textures: 22;
- model load: 234.4 ms;
- official route UI audit: one canvas; zero debug panels, headers, hints, loading UI, or selection helpers;
- opening camera: safe, zero corrections, zero stabilizations;
- console errors: 0 on official route, 0 on debug route;
- production build: passed with Vite 7.3.6; only the existing large-chunk advisory remained;
- source GLB SHA-256: `5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19` (unchanged);
- dining set and hanging window banners remain removed at runtime;
- camera presets, FOV, safety cages, keep-out zones, orbit rules, and furniture transforms were not changed.

## Screenshots

1. `01-lighting-A.png`
2. `02-lighting-B.png`
3. `03-lighting-C.png`
4. `04-final-opening-view.png`
5. `05-final-sofa.png`
6. `06-final-wood-floor-rug.png`
7. `07-final-kitchen-metal.png`
8. `08-final-opposite-view.png`

No commit, push, merge, or deployment was performed.

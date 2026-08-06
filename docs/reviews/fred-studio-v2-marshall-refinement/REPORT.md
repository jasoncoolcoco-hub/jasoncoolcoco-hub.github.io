# Fred Studio V2 official delivery + Marshall refinement

Date: 2026-08-06  
Branch: `feat/fred-studio-v2-interactions`  
Scope: promote the approved delivery configuration and refine only the Marshall cabinet/tolex/grille material role.

## Official delivery

The official `/studio-v2-import-test` route now ignores delivery query parameters and resolves:

- Room: `/models/fred-studio-v2/optimised/meshopt/room_meshopt.glb`
- MacBook: `/models/fred-studio-v2/optimised/meshopt/macbook_pro_2021_meshopt.glb`
- Marshall: `/models/fred-studio-v2/optimised/meshopt/marshall_amp_conservative_meshopt.glb`
- Guitar: `/models/fred-studio-v2/optimised/meshopt/gibson_guitar_conservative_meshopt.glb`
- Textures: source embedded PNG/JPEG
- Loading: room-first lazy
- KTX2: off
- Selective micro shadows: off

The original source GLBs and all debug comparison modes remain available. Debug query state was switched through the full source rollback and KTX2 modes, then removed; the official screenshot remained byte-identical before and after those switches.

## Marshall material

Material role: `marshall-cabinet-tolex-grille-atlas` (`Marshall_Amp_Body`). The role mapping is used; no blind mesh-name-specific override was added.

| Parameter | Before | After |
|---|---:|---:|
| Metalness | 0 | 0 |
| Roughness | 0.74 | 0.64 |
| Environment intensity | 0.56 | 0.78 |
| Normal scale | 0.52 | 0.68 |
| Emissive colour | source/default black | `#181818` |
| Emissive intensity | not overridden | 0.55 |

The subtle deep-charcoal emissive floor lifts only the darkest cabinet atlas response. The source map still carries the grille/tolex separation; lower roughness, stronger normal response, and higher environment contribution make that separation readable without turning it into bright metal or grey plastic.

Unchanged: Marshall control-panel role, hardware role, label role, guitar and MacBook materials, room lighting, exposure, tone mapping, window fill, directional lights, camera, anchors, transforms, and shadow policy.

Local Marshall-specific fill light: not added. Shadow-casting lights remain unchanged.

## Visual result

- Opening: Marshall remains black and integrated with the room; no added hotspot.
- Close: grille weave, cabinet edges, upper/lower stack separation and corner hardware read more clearly.
- Control panel: knobs and panel remain readable with the existing metal response.
- Guitar: lacquer and brightness are unchanged.
- Room: lighting and ambience are unchanged.

Evidence:

- `marshall-before-opening.png` / `marshall-after-opening.png`
- `marshall-before-close.png` / `marshall-after-close.png`
- `marshall-before-control-panel.png` / `marshall-after-control-panel.png`
- `official-default-opening.png`
- `debug-delivery-selector.png`

## Quick runtime verification

Debug route with the official default, 1280×720, DPR 1:

- FPS samples: 60 / 60 / 60
- Draw calls: 94
- Rendered triangles: 780,030
- Geometries: 68
- Runtime textures: 64
- Room first frame: 233.6 ms
- Complete ready: 504.9 ms
- Runtime texture format: `RGBAFormat`
- KTX2: not loaded by the default
- Additional Marshall light: none; no draw-call change

The official DOM contains only the accessible canvas image. Debug source, conservative/light/moderate, Meshopt/KTX2, and eager/lazy selectors remain functional and route-local.

No commit, push, merge, or deployment was performed.

## Marshall readability pass V2

Scope: refine only the official Conservative Marshall cabinet/tolex/grille response. Asset delivery, geometry, transforms, camera, room lighting, shadows, guitar and control-panel/hardware/label materials remain unchanged.

### Mesh and atlas finding

The Conservative Marshall contains two body meshes using the same `Marshall_Amp_Body` atlas material:

- `Cube.024_Marshall Amp Body_0`
- `Cube.027_Marshall Amp Body_0`

The grille and tolex zones are separated inside the shared atlas/UV layout, not as independently identifiable grille and cabinet meshes. The material was therefore not split by guessed mesh semantics.

### Final cabinet material

| Parameter | Pass V1 | Pass V2 |
|---|---:|---:|
| Metalness | 0 | 0 |
| Roughness | 0.64 | 0.64 |
| Environment intensity | 0.78 | 0.78 |
| Normal scale | 0.68 | 0.68 |
| Uniform emissive colour | `#181818` | removed |
| Emissive intensity | 0.55 | 0.30 |
| Emissive map | none | original colour atlas (`map`) |

The V2 material uses white emissive colour only as the neutral multiplier for the original colour atlas. At intensity `0.30`, the atlas controls the lift: grille, piping and tolex pixels retain their relative separation instead of receiving one uniform charcoal floor. The amp remains black and does not read as self-illuminated.

- Material instances split: no.
- New or modified textures/UVs: no.
- Local Marshall light: no.
- Shadow-casting light added: no.

### Opening-view result

The official opening composition now retains more of the source atlas contrast on the front faces. The upper head and lower cabinet read as separate volumes; the grille is distinguishable from the cabinet border and tolex without turning grey or metallic. The close view keeps the grille weave and cabinet-edge response, and the control-panel view remains unchanged outside the shared body atlas. Guitar and room exposure remain unchanged because the adjustment is isolated to `StudioV2MarshallCabinet`.

V2 evidence:

- `marshall-v2-before-opening.png`
- `marshall-v2-after-opening.png`
- `marshall-v2-before-close.png`
- `marshall-v2-after-close.png`
- `marshall-v2-after-control-panel.png`
- `official-default-opening-v2.png`

### V2 runtime and build

Debug route, approved official delivery, 1280×720 forced render viewport and DPR 1:

- FPS samples: 50 / 56 / 59
- Draw calls: 94
- Rendered triangles: 780,030
- Geometries: 68
- Runtime textures: 64
- Additional light: none
- Additional texture allocation: none; `emissiveMap` reuses the existing colour atlas

Production build: passed with Vite 7.3.6 (`511` modules, `9.35 s`). The existing `createEarthRenderer` chunk remains above the 500 kB warning threshold; this Marshall material-only change did not introduce a new large chunk.

The Three.js `PCFSoftShadowMap` deprecation warning remains pre-existing. No new page errors or material/GLTF warnings were observed.

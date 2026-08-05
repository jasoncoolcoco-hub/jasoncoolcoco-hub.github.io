# Fred Studio V2 — Final Material and Lighting Correction

Date: 2026-08-05  
Branch: `feat/fred-studio-hard-shell-v1`  
Route: `/studio-v2-import-test`  
Scope: targeted final correction only

## Outcome

- The concentrated ceiling hotspot is removed. The ceiling now keeps a broad, soft timber gradient and visible grain.
- The island countertop no longer contains the clipped white strip. Its complete surface stays warm timber with a controlled highlight.
- The sofa is darker and more diffuse. The remaining chaise facets are exported low-poly geometry, not a metallic or clearcoat response.
- Stool timber is warmer and less bright; the legs remain dark and readable.
- The approved kitchen appearance was retained after a component-splitting experiment introduced triangular cabinet artefacts and was reverted.
- Exterior forest detail, the camera system, furniture positions, room geometry, and source GLB are unchanged.

## Proven causes and corrections

### Ceiling hotspot

The hotspot was the concentrated response of the high, downward-aimed window `RectAreaLight` on the shared timber ceiling. It was not a helper, selection outline, shadow helper, or bloom artefact.

Correction:

- lowered and moved the window light toward the glazing;
- changed its aim to a shallow room-facing angle;
- widened the emitter from `9.5 × 3.2` to `11 × 3.2`;
- reduced intensity from `0.72` to `0.66` (an 8.3% reduction);
- kept global exposure, environment intensity, key intensity, and ceiling bounce unchanged.

### Countertop white strip

The primary implementation cause was a stale mesh-name match. `GLTFLoader` exposes the island as `Cube004_Material003_0`, while the splitter still expected `Cube.004_Material.003_0`. The island therefore continued to use the shared bright timber material, so window, key, and IBL contributions all amplified the same exported surface segment. Controlled tests showed that disabling any single light did not remove the strip; only removing all three contributions did.

Correction:

- corrected the runtime island and stool mesh-name matches;
- applied an island-only warm colour multiplier `#b89561`;
- set the island material to metalness `0`, roughness `0.58`, env-map intensity `0.58`;
- used the shallower window-fill incidence described above.

No global exposure reduction, PMREM removal, geometry edit, or source-asset edit was used.

## Final lighting values

- Exposure: `0.95`.
- Environment intensity: `0.98`.
- Key light: intensity `1.04`, position `[5.8, 8, 4.1]`, shadow intensity `0.62`.
- Weak directional fill: intensity `0.10`, position `[-4, 3, -3]`.
- Window fill:
  - intensity `0.66`;
  - size `11 × 3.2`;
  - position `[-0.4, 1.25, -5.25]`;
  - look-at target `[-3.6, 1.15, 0.8]`;
  - derived XYZ Euler rotation `[0.016527, -0.486463, 0.007727]` radians;
  - no shadows.
- Ceiling bounce: intensity `0.14`, position `[-2, 4.08, -1.1]`, target `[-2, 0.8, -1.1]`, size `8 × 4.5`.
- AO: off. Bloom: off.

## Final material values

M / R / Env means metalness / roughness / environment-map intensity.

| Surface | Final values | Notes |
| --- | --- | --- |
| Sofas `Material.005`, `Material.007` | `0 / 0.74 / 0.52`, colour `#878988` | No clearcoat; imported normals retained |
| Island countertop | `0 / 0.58 / 0.58`, colour `#b89561` | Corrected independent runtime material |
| Stool seats | `0 / 0.56 / 0.62`, colour `#c6a875` | Independent from countertop |
| Stool legs | `0.78 / 0.46 / 0.86` | Dark metal, not chrome-like |
| Island painted front | `0.03 / 0.62 / 0.76`, colour `#181a19` | Near-black |
| Floor | `0 / 0.34 / 0.92` | Directional grain retained |
| Rug | `0 / 0.96 / 0.24` | Normal scale `0.56` |
| Refrigerator | `0.08 / 0.50 / 0.82` | Retained |
| Furniture metal detail | `0.90 / 0.26 / 1.30` | Retained |

The kitchen cabinet/sink/handle/oven mesh remains the approved textured source `Material.006`: colour `#ffffff`, metalness `0.449`, roughness `0.133`, env-map intensity `1.00`, with its 1024² base-colour and normal maps. A connected-component split was tested so painted panels, handles, sink, oven trim, and glass could receive separate numeric values. The exported mesh contains triangle-level disconnected regions; the split produced black triangular facets on cabinet fronts and was therefore reverted. In the final image, texture-driven cabinet panels remain black and readable, the sink and handles remain visibly metallic, and oven glass remains visually distinct.

## Sofa normals

Sofa-only `computeVertexNormals()` had already been compared in the preceding pass and did not improve the chaise without weakening intended seams. Normals were not changed in this pass. The softer material reduces hard grey reflections, but the broad planes on the chaise remain an honest limitation of the imported low-poly topology. No geometry was subdivided or otherwise changed.

## Behaviour and asset verification

- Official route DOM contains only the interactive scene container; no header, hint, button, debug panel, selection UI, attribution, or helper is present.
- A controlled canvas drag changed the rendered frame immediately, confirming direct orbit on the official route.
- Debug route remains restricted to `?debug=1`.
- Camera reports `INTERIOR SAFE: YES`, corrections `0`, stabilizations `0`.
- Camera position, target, FOV, cage, keep-out zones, and zoom range are unchanged.
- Dining furniture and hanging banners remain removed.
- Source GLB SHA-256 remains `5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19`.

## Performance and validation

- Viewport: `1280 × 720`.
- Stable sampled FPS: `60`.
- Draw calls: `24`.
- Triangles: `79,922`.
- Geometries: `33`.
- Textures: `24`.
- Anisotropy: `8`.
- Console errors: `0` on official and debug routes.
- Known non-blocking warning: Three.js reports that `PCFSoftShadowMap` is deprecated and falls back to `PCFShadowMap`.
- Production build: passed with Vite `7.3.6`; the existing large-chunk advisory remains non-blocking.

## Deliverables

1. `01-opening-before-final-pass.png`
2. `02-opening-after-final-pass.png`
3. `03-ceiling-hotspot-fixed.png`
4. `04-countertop-highlight-fixed.png`
5. `05-sofa-final.png`
6. `06-kitchen-final.png`
7. `07-stools-floor-rug-final.png`
8. `08-opposite-view-final.png`
9. `09-debug-final-values.png`

Implementation files changed in this pass:

- `src/studio-v2/studioV2Config.js`
- `src/studio-v2/studioV2MaterialTuning.js`

No commit, push, merge, deployment, or source-GLB modification was performed.

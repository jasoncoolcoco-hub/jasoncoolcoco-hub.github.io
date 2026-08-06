# Fred Studio V2 visual-first optimisation spike

Date: 2026-08-06  
Working directory: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`  
Branch: `feat/fred-studio-v2-interactions`  
Status: reversible spike only; not committed, pushed, merged, or deployed.

## 1. Executive summary

The source assets remain immutable and the official route still resolves the approved combined source assets by default. A debug/capture-only delivery matrix now supports split source objects, conservative/light/moderate geometry, KTX2, Meshopt, eager/lazy scheduling, and an experimental micro-shadow policy without altering the accepted anchors, camera, lighting, material overrides, room geometry, or official UI-free presentation.

The visually strongest meaningful result is conservative guitar + conservative Marshall, source PNG/JPEG textures, Meshopt delivery, and room-first lazy loading. It retains 427,464 source triangles and 780,030 rendered triangles, reduces total GLB delivery from 76,709,284 to 48,180,252 bytes (37.2%), and held 59–60 FPS at 1728×1117 and 60 FPS at 1440×900, DPR 1. Source and derivative world bounds and placement are aligned.

KTX2 renders without visible colour/material regression and selected `RGBA_ASTC_4x4_Format` locally, but the full asset set became 7.2% larger and the sampled room/load timings were slower. Room and MacBook KTX2 are therefore rejected for low benefit. The source-texture path is recommended.

## 2. Recovery after disconnect

The interrupted state was inspected rather than regenerated. Completed geometry, KTX2, Meshopt, evidence PNGs, generator scripts, and authoritative manifests were retained. Missing review JSON/Markdown files were completed in place. All existing JSON manifests pass `jq empty`; all generator/audit `.mjs` files pass `node --check`. No generated GLB was regenerated during recovery.

The old browser port stopped accepting automation. The existing Vite scripts were inspected and the test server was restarted on `http://127.0.0.1:5178/`, after which the missing dual-viewport performance and close-view comparisons were completed.

## 3. Source checksum verification

| Source | Bytes | SHA-256 | Result |
|---|---:|---|---|
| Room | 24,059,568 | `5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19` | UNCHANGED |
| MacBook Pro | 2,548,260 | `1a38db1f63a4699573a0393c888b2191030c99cf81c2d3325712a69cb2b7af5f` | UNCHANGED |
| Combined Marshall + guitar | 50,101,456 | `3b65fe43920c4d1fdfc593ad76e157a080aae435274bf5f244e54149bbebe8df` | UNCHANGED |

The values match the optimisation source audit. No source GLB was overwritten.

## 4. Tools and generated structure

- Blender: unavailable and not installed.
- glTF-Transform: 4.4.2, installed only in `/private/tmp/fred-studio-v2-opt-tools`.
- meshoptimizer: 0.23.0.
- toktx: Khronos KTX-Software 4.4.2, extracted only under `/private/tmp`.
- basisu standalone: unavailable; toktx supplied the Basis/UASTC encoding path.
- Three.js: project version 0.185.0 with `KTX2Loader` and `MeshoptDecoder` loaded dynamically when requested.
- Browser: in-app browser on the recovered Vite port, DPR 1.

Permanent derivative outputs are organised under `public/models/fred-studio-v2/optimised/`. Generator records and working data are under `generated/fred-studio-v2-optimisation/`. The four `generated/.../textures-ktx2/*-data.glb` files are staged encoder intermediates and are classified as temporary/unused in runtime; they remain outside source folders and are not part of the recommended delivery.

## 5. Geometry inventory and visual decisions

All split/derivative bounds equal their corresponding split-source bounds. The recombined placed group matches the approved source world bounds: size `1.0664 × 1.0227 × 1.091`, centre `[-2.0212, 0.5324, 1.392]`.

| Derivative | Triangles | Rendered contribution | Bytes | Visual evidence | Decision |
|---|---:|---:|---:|---|---|
| Marshall source split | 114,167 | 228,334 | 19,443,612 | rollback/reference | KEEP SOURCE |
| Marshall conservative | 108,875 | 217,750 | 17,438,172 | front, grille, logo, controls | ACCEPT |
| Marshall light | 102,707 | 205,414 | 17,211,816 | front and controls remain close | REJECT — LOW BENEFIT |
| Guitar source split | 309,867 | 619,734 | 32,015,596 | rollback/reference | KEEP SOURCE |
| Guitar conservative | 239,989 | 479,978 | 27,072,900 | opening, body, headstock, strings, pickups, side | ACCEPT |
| Guitar light | 202,191 | 404,382 | 25,476,576 | no obvious captured loss; less close-detail reserve | ACCEPT WITH LIMITATION |
| Guitar moderate | 169,335 | 338,670 | 24,072,524 | no obvious captured loss; least future close-view reserve | REJECT — LOW BENEFIT |

The guitar pass is component-weighted: silhouette-critical body meshes are retained, while body detail, neck, strings, underside, and fretboard use distinct ratios. The Marshall pass is similarly weighted, preserving logos and small hardware while mildly simplifying cabinet/panel/accessory geometry. No uniform blanket ratio and no non-uniform object scale were used.

The full visual rationale and evidence index are in `VISUAL_COMPARISON.md`.

## 6. Required decision table

The load/FPS numbers for individual geometry versions use the full-scene configuration, because Marshall and guitar are judged in composition. A dash means that exact combination was not re-measured after recovery.

| Candidate | Source / rendered triangles | Download | Textures | Load at 1728 / 1440 | FPS min–avg | Visible difference | Visual acceptance | Performance benefit | Recommendation |
|---|---:|---:|---|---:|---:|---|---|---|---|
| Guitar conservative | 239,989 / 479,978 asset | 27.07 MB; 17.33 MB Meshopt | Source | 581.1 / 523.8 ms with conservative Marshall | 59–59.67 / 60–60 | None discernible | ACCEPT | Meaningful | SELECT |
| Guitar light | 202,191 / 404,382 asset | 25.48 MB; 17.10 MB Meshopt | Source | 519.4 / 536.8 ms with light Marshall | 60 / 60 | None at captured views, lower reserve | ACCEPT WITH LIMITATION | Runtime triangle benefit; small Meshopt byte gain | Do not select |
| Guitar moderate | 169,335 / 338,670 asset | 24.07 MB; 16.89 MB Meshopt | Source | — | — | None at captured raster; lowest reserve | ACCEPT WITH LIMITATION visually | Small additional Meshopt gain | REJECT — LOW BENEFIT |
| Marshall conservative | 108,875 / 217,750 asset | 17.44 MB; 9.98 MB Meshopt | Source | 581.1 / 523.8 ms with conservative guitar | 59–59.67 / 60–60 | None discernible | ACCEPT | Meaningful with Meshopt | SELECT |
| Marshall light | 102,707 / 205,414 asset | 17.21 MB; 9.94 MB Meshopt | Source | 519.4 / 536.8 ms with light guitar | 60 / 60 | None discernible | ACCEPT WITH LIMITATION | Only 32,880 bytes beyond conservative Meshopt | REJECT — LOW BENEFIT |
| MacBook KTX2 | 1,190 / 2,380 asset | 3.37 MB vs 2.55 MB | KTX2 UASTC | included in 592.8 / 611.4 ms full KTX2 | 60 / 60 | None discernible | ACCEPT visually | File grows 32.1% | REJECT — LOW BENEFIT |
| Room KTX2 | 77,410 / 79,922 asset | 29.36 MB vs 24.06 MB | KTX2 UASTC | first room 373.4 / 344.4 ms vs source 297.8 / 256.0 | 60 / 60 | None discernible | ACCEPT visually | File grows 22.0%; slower sample | REJECT — LOW BENEFIT |
| Source + lazy | 502,634 / 930,370 | 78.07 MB split | Source | not separately timed in final matrix | — | Final composition unchanged | ACCEPT | Earlier room/controls path | ACCEPT WITH LIMITATION |
| Source + Meshopt | 502,634 / 930,370 | 49.0 MB class | Source | not separately timed | — | Decoded appearance invariant by design; selected Meshopt visually checked | ACCEPT | Strong transfer saving | ACCEPT |
| Final selected combined | 427,464 / 780,030 | 48,180,252 bytes | Source + Meshopt | eager 601.9 / 714.6; lazy 720.0 / 518.5 ms | 60 / 60 | None discernible | ACCEPT | -37.2% bytes, -15.0% source tris, -16.2% rendered tris | RECOMMEND FOR EXPLICIT APPROVAL |

## 7. KTX2 results

| Asset group | Source bytes | KTX2 bytes | Change | Result |
|---|---:|---:|---:|---|
| Room | 24,059,568 | 29,360,656 | +5,301,088 / +22.0% | REJECT — LOW BENEFIT |
| MacBook | 2,548,260 | 3,367,380 | +819,120 / +32.1% | REJECT — LOW BENEFIT |
| Marshall split source | 19,443,612 | 17,551,760 | -1,891,852 / -9.7% | ACCEPT WITH LIMITATION |
| Guitar split source | 32,015,596 | 31,928,096 | -87,500 / -0.3% | REJECT — LOW BENEFIT |

Colour maps use UASTC level 2 + Zstd 20 and sRGB. Linear normal/metallic-roughness/occlusion data use UASTC level 3 minimum + Zstd 18; the already-completed room and MacBook data pass uses level 4. Resolution, alpha, channel packing, UVs, transforms, and material scalar overrides are unchanged. Source/KTX2 captures show no colour shift, normal flattening, metallic-roughness corruption, halo, or obvious block artifact.

The recovered runtime measured `RGBA_ASTC_4x4_Format` at both target viewports. This moves texture memory from the prior 399.83 MiB RGBA8-mip estimate toward roughly one quarter for compatible ASTC textures, but it is a direction, not a driver allocation measurement. The full KTX2 split set grows from 76,709,284 to 82,207,892 bytes, first room frame regressed by 75.6–88.4 ms in the samples, and complete load regressed by 40.2–92.8 ms. It is not selected globally.

## 8. Meshopt results

Meshopt uses high compression, per-mesh quantisation volume, 14-bit position, 10-bit normal, and 12-bit UV quantisation. It changes delivery encoding but not triangle count.

| Selected asset | Uncompressed bytes | Meshopt bytes | Saving |
|---|---:|---:|---:|
| Room source | 24,059,568 | 18,419,836 | 23.4% |
| MacBook source | 2,548,260 | 2,450,836 | 3.8% |
| Marshall conservative | 17,438,172 | 9,977,004 | 42.8% |
| Guitar conservative | 27,072,900 | 17,332,576 | 36.0% |
| Total | 71,118,900 | 48,180,252 | 32.3% |

Opening, guitar side, and opposite-room checks match the uncompressed derivative. Exact world bounds remain unchanged. Decode/load is workload- and cache-dependent: at 1728×1117 the Meshopt conservative sample was 601.9 ms versus 581.1 ms uncompressed; at 1440×900 it was 714.6 ms versus 523.8 ms. This local variance does not negate the 22.94 MB network-byte saving, but no decode-speed claim is made.

## 9. Lazy loading

The lazy path loads and presents the room first, enables controls at the room-ready callback, then loads MacBook, Marshall, and guitar in sequence. The final runtime metrics and world bounds match eager loading. No camera reset, white flash, broken placeholder, temporary scale, object shift, or final material mismatch was observed.

For conservative + Meshopt, room/controls readiness improved from 304.3 to 252.0 ms at 1728×1117 and from 273.0 to 236.7 ms at 1440×900. Complete readiness was 720.0 and 518.5 ms respectively; local cache/decode variance makes the complete-time comparison directional only. Lazy loading is accepted because it improves meaningful room readiness without changing the final composition.

## 10. Debug code splitting and route safety

`StudioV2DebugPanel` is loaded with `React.lazy` only when `debug=1`. Spatial debug is dynamically imported only after the debug scene is ready. `KTX2Loader` and Meshopt decoder are dynamically imported only when their delivery modes require them.

Latest production bundle evidence:

- `StudioV2DebugPanel`: 21.73 kB (5.93 kB gzip), separate chunk.
- `studioV2SpatialDebug`: 7.99 kB (3.34 kB gzip), separate chunk.
- `MeshoptDecoder`: 26.49 kB (7.26 kB gzip), separate chunk.
- `KTX2Loader`: 59.84 kB (24.39 kB gzip), separate chunk.

The official route DOM contained only the accessible canvas image, with no header, attribution, selector, debug panel, axes, grid, bounds, picker, placeholder, or performance UI. Static configuration forces `allowDerivatives=false` on the official route; delivery query parameters cannot change its source URLs. The official route therefore remains source-based and visually unchanged until explicit user approval.

## 11. Performance measurements

All new samples used the same opening camera and accepted lighting, DPR 1, helpers off, three stabilised one-second FPS readings. Full rows are in `metrics.json`.

| Configuration | Viewport | Rendered tris | Calls | Geom / textures | First room | Complete | FPS samples |
|---|---|---:|---:|---:|---:|---:|---|
| Source | 1728×1117 | 930,370 | 94 | 68 / 64 | 297.8 ms | 552.6 ms | 59, 60, 60 |
| Source | 1440×900 | 930,370 | 94 | 68 / 64 | 256.0 ms | 518.6 ms | 60, 60, 60 |
| Source geometry + KTX2 | 1728×1117 | 930,370 | 94 | 68 / 64 | 373.4 ms | 592.8 ms | 60, 60, 60 |
| Source geometry + KTX2 | 1440×900 | 930,370 | 94 | 68 / 64 | 344.4 ms | 611.4 ms | 60, 60, 60 |
| Conservative | 1728×1117 | 780,030 | 94 | 68 / 64 | 290.2 ms | 581.1 ms | 59, 60, 60 |
| Conservative | 1440×900 | 780,030 | 94 | 68 / 64 | 270.7 ms | 523.8 ms | 60, 60, 60 |
| Light | 1728×1117 | 692,098 | 94 | 68 / 64 | 248.7 ms | 519.4 ms | 60, 60, 60 |
| Light | 1440×900 | 692,098 | 94 | 68 / 64 | 266.1 ms | 536.8 ms | 60, 60, 60 |
| Conservative + Meshopt | 1728×1117 | 780,030 | 94 | 68 / 64 | 304.3 ms | 601.9 ms | 60, 60, 60 |
| Conservative + Meshopt | 1440×900 | 780,030 | 94 | 68 / 64 | 273.0 ms | 714.6 ms | 60, 60, 60 |
| Conservative + Meshopt + lazy | 1728×1117 | 780,030 | 94 | 68 / 64 | 252.0 ms | 720.0 ms | 60, 60, 60 |
| Conservative + Meshopt + lazy | 1440×900 | 780,030 | 94 | 68 / 64 | 236.7 ms | 518.5 ms | 60, 60, 60 |

Minimum observed FPS was 59. Average FPS was 59.67–60. Approximate frame-time range from these one-second diagnostics was 16.67–16.95 ms. Controls become interactive at complete readiness in eager mode and at first-room readiness in lazy mode. No error UI, console error surfaced by the page, or dev-server error appeared. The existing Vite large-chunk advisory remains a build warning.

The historical accepted source baseline (60 FPS, 930,370 triangles, 94 calls at both target viewports) is retained separately in `metrics.json`; it is not presented as a new measurement.

## 12. Shadow policy

A debug-only selective policy can disable casting for guitar string/Bezier micro-detail and very small repeated Marshall hardware meshes while leaving those meshes visible and receiving shadows. It was not promoted because the conservative configuration already meets the rendered-triangle advisory range and the exact selective result was not required to achieve the recommendation. Official shadows remain unchanged.

## 13. Rollback

Rollback is one central decision: call `createStudioV2DeliveryConfig` with derivatives disallowed, or remove debug/capture delivery parameters. The source room, MacBook, and combined Marshall/guitar URLs are restored immediately. Stable parents, IDs, anchors, material roles, and the split normalisation are recorded in `manifest.json`; no placement re-authoring is required. No source asset was deleted.

## 14. Remaining risks

- The KTX2 memory direction is based on the measured ASTC format and texture dimensions, not a driver-reported allocation.
- Browser samples are local and warm; they are not public-network or ordinary integrated-GPU laptop benchmarks.
- Light/moderate geometry remains valid comparison evidence, but conservative retains more reserve for any future camera that moves closer than the currently accepted close views.
- The four encoder intermediate `generated/.../*-data.glb` files should stay excluded from any future production commit unless reproducibility policy explicitly requires them.
- User approval is still required before the official route may use any derivative.

## 15. Files

Created:

- `generated/fred-studio-v2-optimisation/` manifests and encoder workspace.
- `public/models/fred-studio-v2/optimised/` split, geometry, KTX2, Meshopt, and combined KTX2+Meshopt derivatives.
- `public/basis/` Three.js KTX2 transcoder runtime.
- `scripts/generate-fred-studio-v2-derivatives.mjs`.
- `scripts/generate-fred-studio-v2-ktx2.mjs`.
- `scripts/generate-fred-studio-v2-ktx2-geometry.mjs`.
- `scripts/generate-fred-studio-v2-meshopt.mjs`.
- `src/studio-v2/studioV2DerivativeConfig.js`.
- `src/studio-v2/studioV2GltfLoader.js`.
- This review folder and evidence.

Modified for reversible/debug-only delivery support:

- `src/studio-v2/StudioV2ImportPage.jsx`.
- `src/studio-v2/StudioV2DebugPanel.jsx`.
- `src/studio-v2/createStudioV2Scene.js`.
- `src/studio-v2/studioV2ModelResource.js`.
- `src/studio-v2/studioV2PlacedObjects.js`.
- `src/studio-v2/studioV2Config.js` (debug/capture comparison cameras only).
- `src/studio-v2/studio-v2.css`.
- `docs/THIRD_PARTY_ASSETS.md`.

Files removed: none.

RECOMMENDED OFFICIAL ASSET CONFIGURATION:
conservative guitar derivative + conservative Marshall derivative + source room geometry + source MacBook geometry + source PNG/JPEG textures + Meshopt delivery + room-first lazy loading; keep the official route on its current source default until explicit user approval

VISUAL QUALITY VERDICT:
source-equivalent

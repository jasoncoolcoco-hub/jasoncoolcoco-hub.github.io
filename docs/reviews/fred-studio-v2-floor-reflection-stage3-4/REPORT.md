# Fred Studio V2 — Stage 3.4 Final Floor Calibration and Production Hardening

## 1. Status

ACCEPTED — FLOOR REFLECTION CHECKPOINT

## 2. Stage 3.3 Preserved

The accepted integrated opaque-floor architecture remains in place: one `512 × 320` HalfFloat linear reflection source, two `256 × 160` HalfFloat blur targets, two separable nine-tap Gaussian passes, paired source/blur updates, the real opaque `MeshPhysicalMaterial` floor, source colour/normal maps and UVs, and real shadow receiving. There is no SSR, EffectComposer, secondary reflection camera, transparent production overlay, or additional production target.

## 3. Source Coverage Audit

- Visible-floor projected UV range at the fixed opening camera: `U 0.082814–0.998436`, `V 0.002497–0.407507`.
- Projected UV rectangle: `37.08%` of the source target. Unique sampled source bins in the audit raster: `6.38%`.
- Useful reflected-source content bounds: `U 0–1`, `V 0–0.465625`.
- The vertical nine-tap blur footprint crosses the source-content edge near the reflection horizon.
- Both reflection axes use clamp-to-edge.
- Fix: the reflection source clears unused pixels with alpha `0`; the two Gaussian passes weight and normalise only valid-alpha samples. This rejects invalid internal black without an extra render target, resolution increase, crop distortion, or incorrect physical stretch.
- Final black-region impact: `NO`. The invalid region remains visible in RAW diagnostics but no longer reduces final reflected energy.

## 4. Weight Mask

The Stage 3.3 C2 baseline remains available in Debug with its single broad luminance response. The selected production mask combines:

- base polish lobe: `0.022`, Fresnel- and roughness-restrained;
- reflected-highlight lobe: blurred-reflection luminance through smooth thresholds `0.20–0.62`, contribution `0.30–1.24`;
- real floor normal distortion: `1.20` blur texels;
- final bounded weight clamp: `0.27`.

The final mask has a low dark-floor baseline plus broad window, stool/island, and music-zone response. It does not form a uniform grey field, hard rectangular mask, or sharp duplicate.

## 5. Candidate Matrix

| Candidate | Strength | Weight model | Base | Thresholds | Luminance | Normal | Clamp |
| --- | ---: | --- | ---: | --- | --- | ---: | ---: |
| Current C2 | 0.13 | Stage 3.3 single lobe | 0 | 0.16–0.72 | 0.52–1.08 | 1.50 | 0.28 |
| Final C2.5 | 0.16 | Two lobe | 0.022 | 0.20–0.62 | 0.30–1.24 | 1.20 | 0.27 |
| Final C3 | 0.18 | Two lobe | 0.025 | 0.18–0.60 | 0.32–1.24 | 1.25 | 0.28 |

All candidates use dielectric F0 `0.04`.

## 6. Selected Candidate

`FINAL_C2_5 / INTEGRATED_OPAQUE` is selected. It is the lowest candidate that makes the broad window response and object-base depth readable in the fixed opening and floor-detail views. C3 adds little useful normal-size readability and is retained only as the Debug rejection boundary.

## 7. Floor Material

- roughness: `0.32`
- clearcoat: `0.14`
- clearcoatRoughness: `0.34`
- envMapIntensity: `1.00`
- metalness: `0.00`
- normal distortion: `1.20` blur-target texels

No additional material compensation pass was needed. Source floor texture and real shadows remain dominant.

## 8. Reference Comparison

The existing furnished-loft reference was used only for broad direction. The selected result follows its window-side brightness, softened furniture-base response, and polished-but-not-mirrored character while preserving the current approved room, object layout, lighting, and source floor texture.

## 9. Material-Only Fallback Check

The selected integrated floor beats Candidate A in the fixed OFF/ON sheet and close floor view: it adds broad window-side variation plus restrained stool, island, and Marshall-base response without changing the source floor into a wet, glass, epoxy, or mirror surface. Candidate A remains available only in Debug as the fallback comparison.

## 10. Production Performance

All measurements used `requestAnimationFrame`, a fully warmed normal scene, fullscreen diagnostics disabled, and no screenshots/contact-sheet work during sampling. Static and motion samples ran for at least 10 seconds; continuous slow drift ran for 30 seconds. Source and blur update rates are identical in every integrated sample.

| Viewport / DPR | Sample | Median FPS | Average FPS | 1% low FPS | Avg frame ms | P95 ms | Source / blur Hz | Calls | Triangles |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1280×720 / 1 | A material static | 59.88 | 60.00 | 53.76 | 16.667 | 18.40 | 0 / 0 | 99.0 | 780,688 |
| 1280×720 / 1 | B integrated static | 59.88 | 60.00 | 53.76 | 16.667 | 18.30 | 0 / 0 | 99.0 | 780,688 |
| 1280×720 / 1 | C material slow | 59.88 | 60.00 | 53.76 | 16.667 | 18.20 | 0 / 0 | 99.0 | 780,688 |
| 1280×720 / 1 | D integrated slow | 59.88 | 60.01 | 53.76 | 16.664 | 18.20 | 5.39 / 5.39 | 101.2 | 794,747 |
| 1280×720 / 1 | E integrated faster orbit | 59.88 | 60.00 | 54.05 | 16.668 | 18.11 | 16.00 / 16.00 | 105.5 | 824,651 |
| 1280×720 / 1 | F integrated 30 s drift | 59.88 | 60.00 | 53.76 | 16.666 | 18.20 | 2.40 / 2.40 | 100.0 | 786,943 |
| 1280×720 / 2 | A material static | 59.88 | 60.00 | 53.76 | 16.666 | 18.00 | 0 / 0 | 99.0 | 780,688 |
| 1280×720 / 2 | B integrated static | 59.88 | 60.00 | 54.05 | 16.666 | 18.00 | 0 / 0 | 99.0 | 780,688 |
| 1280×720 / 2 | C material slow | 59.88 | 60.00 | 53.76 | 16.667 | 18.20 | 0 / 0 | 99.0 | 780,688 |
| 1280×720 / 2 | D integrated slow | 59.88 | 60.00 | 53.76 | 16.667 | 18.20 | 5.39 / 5.39 | 101.2 | 794,747 |
| 1280×720 / 2 | E integrated faster orbit | 59.88 | 60.00 | 54.05 | 16.666 | 18.00 | 16.07 / 16.07 | 105.5 | 824,855 |
| 1280×720 / 2 | F integrated 30 s drift | 59.88 | 60.00 | 53.76 | 16.667 | 18.30 | 2.40 / 2.40 | 100.0 | 786,943 |
| 1600×1000 / 1 | A material static | 59.88 | 60.00 | 54.05 | 16.667 | 18.50 | 0 / 0 | 99.0 | 780,688 |
| 1600×1000 / 1 | B integrated static | 59.88 | 60.00 | 54.05 | 16.666 | 18.40 | 0 / 0 | 99.0 | 780,688 |
| 1600×1000 / 1 | C material slow | 59.88 | 60.00 | 54.05 | 16.667 | 18.30 | 0 / 0 | 99.0 | 780,688 |
| 1600×1000 / 1 | D integrated slow | 59.88 | 60.01 | 54.35 | 16.664 | 18.20 | 5.39 / 5.39 | 101.2 | 794,747 |
| 1600×1000 / 1 | E integrated faster orbit | 59.88 | 60.00 | 53.76 | 16.666 | 18.11 | 16.17 / 16.17 | 105.5 | 825,177 |
| 1600×1000 / 1 | F integrated 30 s drift | 59.88 | 60.00 | 54.05 | 16.667 | 18.00 | 2.40 / 2.40 | 100.0 | 786,943 |

At 1280×720 DPR 1, integrated static overhead is `0%` by measured median/average FPS and slow-motion overhead is below measurement resolution. The 20% optimisation threshold was not approached, so target sizes were preserved.

## 11. Final Update Policy

- source target: `512 × 320`, HalfFloat, LinearSRGB, MSAA 0
- blur targets: `2 × 256 × 160`, HalfFloat
- static: `0 Hz`
- slow movement ceiling: `12 Hz`; the measured gentle sweep updates at `5.39 Hz`
- continuous very slow drift: measured `2.40 Hz`
- active user orbit ceiling: `20 Hz`; measured faster-orbit simulation `16.00–16.17 Hz`
- fast transition ceiling: `22 Hz`
- source and both blur passes always update in one transaction

## 12. Production Cleanup

The production transparent overlay, Candidate B path, Stage 3 overlay mode switching, production diagnostic quad, diagnostic materials, material-only candidate material, and reflection-only test material were removed from official allocation/routing. Official code always selects `FINAL_C2_5`; query candidate overrides are honoured only on Debug/Capture routes. Debug retains OFF, material-only/integrated candidates, RAW, source validity, blur, weight mask, shadow-only, reflection-only, coverage, and performance state. Debug-only paths allocate no persistent targets beyond the three integrated targets.

## 13. Scene Ready

The floor shader compiles during the existing hidden compile phase. Source, both blur passes, selected uniforms, and the first integrated frame complete before `Scene Ready`; the final official check reported `sceneReady=true` and `floorReflectionReady=true` with no visible pop-in or late material replacement.

## 14. Regression

- `/studio-v1`: main route and WebGL canvas loaded.
- official `/studio-v2-import-test`: loaded with no visible debug header/panel and audio remained `idle` (no autoplay).
- Debug/Capture route: candidates, source validity, RAW/blur/mask routing, fixed camera presets, DPR 1/2, and forced resize paths loaded.
- Radio: world-panel open, close button, outside click, and Escape passed; playing state survived close transitions.
- Marshall: play, pause, and resume passed.
- Camera: fixed presets and separate motion-evidence frames passed; performance drift did not alter the production camera controller.
- Route exit/re-entry and repeated scene creation/disposal passed during the capture/performance matrix.
- No title jump or background brightness snap was observed during Radio open/close checks.

## 15. Files Changed

Stage 3.4 implementation:

- `src/studio-v2/studioV2FloorReflection.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/REPORT.md`
- the 12 curated PNG evidence files and three JSON performance records listed below

`src/studio-v2/studioV2Config.js` carries the accepted Stage 3 floor/shadow profile integration into this checkpoint; Stage 3.4 did not reopen the accepted lighting values. Earlier Stage 3/3.2/3.3 review folders and redundant intermediate Stage 3.4 candidate captures remain untracked and outside the curated checkpoint. Unrelated `docs/reviews/fred-studio-v2-placed-objects/` and `public/models/fred-studio-v2/objects/imac_2021.glb` remain untouched.

## 16. Evidence

- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/02-source-validity-debug.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/04-new-two-lobe-weight-mask.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/06-final-c2_5-opening.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/08-final-candidate-comparison.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/09-selected-off-on-1280.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/10-selected-window-floor.png` — fixed `OPPOSITE` view showing the glass/window boundary and the adjacent floor response.
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/11-selected-island-stools.png` — fixed `FLOOR_RUG_DETAIL` view showing the complete island/stool row and its floor response.
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/12-selected-marshall.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/14-reference-vs-selected.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/15-selected-difference-heatmap.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/16-motion-frame-contact-sheet.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/17-final-official-route.png`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/performance-1280x720-dpr1.json`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/performance-1280x720-dpr2.json`
- `docs/reviews/fred-studio-v2-floor-reflection-stage3-4/performance-1600x1000-dpr1.json`

## 17. Build

- `npm run build`: PASS
- `git diff --check`: PASS
- official route: PASS; no visible error UI or new runtime failure during the final browser check
- Debug/Capture route: PASS; no visible error UI or new runtime failure across coverage, candidates, diagnostics, and the 18-sample performance matrix
- existing generic Vite chunk-size warning: unchanged and non-blocking

## 18. Git

- branch: `feat/fred-studio-v2-floor-reflection`
- worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`
- accepted lighting checkpoint: `267a64c2fbad8a53920e0ba6924e9d9c76f01d71` unchanged
- checkpoint scope: staged cleanly before commit
- checkpoint commit message: `feat: complete Fred Studio soft floor reflection`
- push target: `origin/feat/fred-studio-v2-floor-reflection`
- final checkpoint SHA is recorded in the following Camera Director Stage 4A report

NO MERGE
NO DEPLOY
LIGHTING CHECKPOINT UNCHANGED

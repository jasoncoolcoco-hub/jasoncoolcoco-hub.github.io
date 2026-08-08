# Fred Studio V2 — Stage 2.5 Natural Contrast Balance

## 1. Status

NEEDS USER REVIEW

Stage 2.5 is implemented and technically verified. Final visual acceptance remains with the user.

## 2. Purpose

Stage 2 successfully restored a coherent window-side daylight direction, visible cast shadows, and grounded furniture. Its `1.80` key against deliberately low indirect contributions was effective but slightly too contrast-heavy: the transition between the window zone and the deep kitchen/lounge felt abrupt and more like a strong game-light rig than natural interior photography.

Stage 2.5 keeps that hierarchy and makes a restrained balance adjustment. It adds a small amount of indirect energy, reduces the key and shadow weight, and uses a modest final exposure correction only after the light contributions were balanced.

## 3. Preserved Structure

- `StudioV2KitchenPainted` remains `#ffffff` over the source cabinet atlas.
- `StudioV2IslandPainted` remains the source-supported `#3b3b3b`.
- The visible forest and independent RoomEnvironment PMREM IBL remain separated.
- The key position `[-2.2, 4.6, -5.6]`, target `[-2.2, 0.5, -0.3]`, and window-side shadow direction are unchanged.
- The Stage 2 selective island/stool caster policy and floor receiver remain unchanged.
- Marshall/Guitar grounding and material treatment remain unchanged.
- Scene Ready, Radio Panel, radio backdrop timing, Marshall audio, transforms, cameras, routes, and official/debug separation remain unchanged.
- No floor reflection, SSR, reflection target, or reflection post-process was added.

## 4. Parameter Changes

| Control | Stage 2 | Stage 2.5 |
| --- | ---: | ---: |
| RoomEnvironment IBL intensity | 0.45 | 0.55 |
| Directional daylight key | 1.80 | 1.60 |
| Window RectAreaLight | 0.25 | 0.32 |
| Ceiling bounce RectAreaLight | 0.05 | 0.08 |
| Non-shadowing directional fill | 0.00 | 0.00 |
| Shadow contribution | 0.65 | 0.56 |
| Shadow radius | 3 | 3 |
| Exposure | 0.72 | 0.76 |

The rebalance followed the requested order: IBL first, then key, window area contribution, ceiling bounce, shadow contribution, and exposure last. No light was added or removed. The shadow map, bias, normal bias, key direction, and camera bounds are unchanged.

## 5. Tone Mapping Check

A short final comparison used the identical opening camera, final Stage 2.5 rig, `1600 × 1000` viewport, and exposure `0.76`:

- Neutral: selected. It preserves the black island/cabinet identity, timber warmth, and visible directional separation.
- ACES: slightly lighter and softer in the mid-tones, but it weakens black identity and the shadow hierarchy that this pass is intended to retain.

Neutral therefore remains the official default. AgX was not reopened because the Stage 2 comparison already showed a stronger grey veil and the Stage 2.5 brief requested only Neutral versus ACES.

## 6. Visual Result

- Opening: the window remains the brightest zone and the interior remains darker, but the transition into the kitchen is less abrupt. Island/stool grounding remains visible.
- Kitchen: cabinet planes and metal details remain readable; the small IBL/bounce lift makes the deep cabinetry less heavy without returning to flat inspection lighting.
- Island/stool shadow: leg shadows remain clearly directional and soft. Reducing shadow contribution to `0.56` calms their weight without removing them.
- Lounge: the sofa remains black, with cushion volume and contact areas preserved; the shadow-side transition is slightly less severe.
- Marshall: the cabinet remains black, grille/edge response stays readable, Guitar separation remains intact, and no local light or hotspot was introduced.

## 7. Materials

No base-colour, texture, UV, roughness, metallic, normal, emissive, sofa, wood, Marshall, Guitar, Radio, or MacBook material changes were made in Stage 2.5.

## 8. Floor

Reflection remains deferred. The floor is still material-only with the existing shadow receiver. There is no planar reflection, SSR, reflection render target, or reflection post-processing.

## 9. Performance

- Official route at the standard `1280 × 720` viewport: 60 FPS after Scene Ready.
- Fixed `1600 × 1000` review audit: 47–54 FPS in the current in-app browser audit environment.
- Draw calls: 99.
- Rendered triangles: 780,688.
- Geometries: 69.
- Textures: 65.
- Scene lights: 4.
- Shadow-casting lights: 1.
- Shadow maps: one `2048²` map.
- Environment target: the existing RoomEnvironment PMREM target.
- Reflection render targets: 0.

The geometry, draw-call, texture, light, shadow-map, and render-target counts are unchanged from Stage 2. No dependency, pass, or runtime lighting feature was added.

## 10. Regression

- Scene Ready: READY with all entry-critical conditions, shader compile, and warm-up complete.
- Official route: READY; no visible debug UI and no console warnings/errors.
- Debug route: READY; final values correctly reported and no console warnings/errors.
- Radio Panel: opening and close-button flow verified; backdrop reaches `DIMMED` and returns closed normally.
- Marshall audio: direct world click verified playing → paused → playing, with current time preserved on resume.
- Camera: official orbit remained interactive and inside the accepted scene; no exterior leak was observed.
- Resize: viewport and canvas both updated to `1024 × 768` while Scene Ready remained active.
- Route exit/re-entry: `/studio-v2-import-test` → `/` → `/studio-v2-import-test` returned to READY.

## 11. Build

- `npm run build`: PASS with Vite 7.3.6; 519 modules transformed. The existing generic chunk-size warning remains.
- `git diff --check`: PASS.
- Official route console: no warnings or errors.
- Debug route console: no warnings or errors.

## 12. Git

- Branch: `feat/fred-studio-v2-lighting-rebuild`
- Worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`
- Base HEAD: `9233bf8e58b4ecf6fdb8d62261c98261619ba4cf`
- Stage 1, Stage 2, and Stage 2.5 changes remain intentionally uncommitted.
- No files are staged.
- Unrelated pre-existing untracked files remain untouched: `docs/reviews/fred-studio-v2-placed-objects/` and `public/models/fred-studio-v2/objects/imac_2021.glb`.

NO COMMIT
NO PUSH
NO MERGE
NO DEPLOY
ORIGINAL REJECTED WORKTREE UNCHANGED

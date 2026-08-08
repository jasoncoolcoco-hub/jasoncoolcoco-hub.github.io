# Fred Studio V2 — Lighting Architecture Rebuild Stage 1

## 1. Status

**NEEDS USER REVIEW**

This is a neutral, physically readable baseline, not the final cinematic daylight or material grade. The screenshots show the measured result; user visual review remains the acceptance gate.

## 2. Git Safety

- Rejected experiment backup branch: `backup/fred-studio-v2-lighting-rejected-20260808`
- Local-only backup commit: `f175ec5 wip: preserve rejected Fred Studio lighting experiment`
- Backup push: **not performed**
- Rebuild branch: `feat/fred-studio-v2-lighting-rebuild`
- Rebuild base: `9233bf8e58b4ecf6fdb8d62261c98261619ba4cf` (`feat: complete Fred Studio radio panel v2`)
- Rebuild result: intentionally uncommitted for visual review

The rejected floor-reflection prototype remains recoverable on the local backup branch. Unrelated pre-existing untracked placed-object evidence and `imac_2021.glb` were neither staged nor changed.

## 3. Rejected Architecture

The rejected passes mostly raised environment, hemisphere, directional fill, exposure and a local kitchen RectAreaLight while retaining the underlying dark multiplier and LDR-derived IBL. That approach lifted edges but could not restore cabinet albedo information that had already been numerically crushed. More fill therefore risked a flat room and a clipped window without fixing the material truth.

Stage 1 replaces that patch stack with a separated background/IBL architecture, a source-supported dark-material correction and a four-light neutral rig with one shadow caster.

## 4. Renderer Audit

- Three.js: `0.185.0`
- Renderer: `WebGLRenderer({ alpha: false, antialias: true, powerPreference: 'high-performance' })`
- Pixel ratio: device DPR capped at `2` (`1.35` on narrow layouts)
- Output colour space: `SRGBColorSpace`
- Supported/verified tone mapping: `ACESFilmicToneMapping`, `AgXToneMapping`, `NeutralToneMapping`
- Selected tone mapping: `NeutralToneMapping`
- Exposure: `0.90`
- Lighting model: current Three.js physically based light behaviour; no legacy-light switch is used in r185
- Shadow map: `PCFShadowMap`, one `2048²` map, radius `5`, bias `-0.00035`, normal bias `0.025`, shadow intensity `0.38`
- Scene background fallback: solid `#151817`; the accepted forest remains visible through its original room mesh
- Postprocessing: none
- CSS canvas filters: none
- Debug-only readout now exposes tone mapping, environment mode, light count and shadow configuration
- Scene Ready compile/warm-up remains `compileAsync` followed by hidden warm-up frames before atomic reveal

`PCFSoftShadowMap` was changed to `PCFShadowMap` because r185 already aliases the deprecated mode to PCF and emitted a warning. This removes the warning without adding a shadow pass.

## 5. Environment Audit

- Official room delivery asset: `public/models/fred-studio-v2/optimised/meshopt/room_meshopt.glb`
- Existing visible environment mesh: `Sphere_Material.017_0`
- Existing visible environment material: `Material.017`
- Existing image: embedded image index `9`, JPEG, `4096 × 2048`, LDR `UnsignedByteType`, base/emissive colour data in sRGB
- Repository HDR/EXR search: no `.hdr` or `.exr` asset exists
- Previous coupling: the same embedded JPEG was cloned, marked equirectangular sRGB, PMREM-filtered and used as `scene.environment` while also remaining the visible forest
- Final visible background: unchanged accepted forest on `Sphere_Material.017_0`
- Final lighting environment: dependency-free Three.js `RoomEnvironment`, converted once through PMREM before Scene Ready
- Final global environment intensity: `0.78`

The visible background and material-lighting environment are now independent. No studio environment becomes visible through the windows, and no late environment swap occurs after reveal.

## 6. Material Truth Audit

All audited base-colour maps are sRGB. Normal, roughness and metalness data maps remain `NoColorSpace`. Audited materials use `MeshStandardMaterial`/the existing placed-object physical variants, `vertexColors: false`, `toneMapped: true`, opacity `1`, and no AO map unless otherwise stated. Embedded-image references below are inside the listed GLB, not new files.

| Area | Runtime / source | Colour map | Source colour | Accepted runtime colour | Final runtime colour | Final PBR / env | Runtime action and reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Kitchen cabinets | `StudioV2KitchenPainted` / `Material.006` | PNG atlas index 12, sRGB; normal index 13, data | `#ffffff` | `#181a19` | `#ffffff` | rough `0.60`, metal `0.04`, env `0.86` | Removed the near-black multiplier because the atlas already supplies cabinet colour. Maps/UV/model remain unchanged. |
| Island front | `StudioV2IslandPainted` / `Material.008` | No colour map; normal index 2, data | GLB linear `0.0444461` = `#3b3b3b` sRGB | `#252826` | `#3b3b3b` | rough `0.64`, metal `0.02`, env `0.82` | Restored the source near-black reflectance; this is not a grey visibility cheat. |
| Stool frames | `StudioV2StoolLegMetal` / `material` | No colour map; normal index 1, data | GLB linear `0.0643666` = `#484848` | unchanged | unchanged | rough `0.46`, metal `0.78`, env `0.86` | No base-colour change; the neutral IBL restores edge response. |
| Sofa | `Material.005`, `Material.007` | PNG base + normal, sRGB/data | white multiplier over source atlas | `#878988` | `#878988` | rough `0.74`, metal `0`, env `0.52` | Retained the accepted dark character after multi-view review; no Stage 1 sofa redesign. |
| Marshall cabinet/grille | `StudioV2MarshallCabinet` / `Marshall_Amp_Body` | Preserved PNG colour/PBR/normal maps, sRGB/data | white multiplier over atlas | unchanged | unchanged | rough `0.64`, metal `0`, env `0.78`; existing atlas emissiveMap `0.30` | No Marshall-specific Stage 1 material change. Existing approved grille/tolex separation remains intact. |
| Floor | `Material.002` | JPEG base index 3, sRGB; normal index 1, data | white multiplier | `#a3a3a0` | `#a3a3a0` | rough `0.34`, metal `0`, env `0.92`, normal `0.50` | Accepted checkpoint floor retained; no reflection or new override. |
| Primary timber | `StudioV2LightTimber`, `StudioV2KitchenTimber` / `Material.003` | JPEG base index 0, sRGB | white multiplier | unchanged | unchanged | rough `0.52/0.55`, metal `0`, env `0.78/0.72` | No colour change. |
| Dark ceiling timber | `StudioV2DarkCeilingTimber` / `Material.003` | JPEG base index 0, sRGB | white multiplier | unchanged | unchanged | rough `0.60`, metal `0`, env `0.58` | No colour change. |

No audited material gained transparency, AO, vertex colours or a new emissive treatment. Marshall hardware, label, control panel and guitar materials are unchanged.

## 7. Double-Darkening Finding

**Confirmed root cause for the kitchen cabinets.** The original `Material.006` contains a colour atlas and has no dark GLB base-colour factor, which means the source multiplier is white. Runtime segmentation cloned that material and then applied `#181a19`. Three.js therefore evaluated an already-dark atlas through another near-black multiplier before lighting and tone mapping. Restoring the multiplier to white recovers the atlas' cabinet planes and gaps without replacing its black appearance.

The island is a different case: `Material.008` has no base-colour texture. Its accepted override was darker than the GLB's own near-black value, so Stage 1 restores the exact source-equivalent `#3b3b3b` rather than setting white or an arbitrary grey.

## 8. Tone-Mapping Comparison

- ACES Filmic at exposure `0.90`: controlled highlights, but slightly denser low-mid cabinet response.
- AgX at exposure `0.90`: preserves shadow data but makes the room visibly flatter, greyer and less directional.
- Neutral at exposure `0.90`: retains cabinet and island separation, keeps timber colour, and controls the window without the AgX grey veil.
- Selected: `NeutralToneMapping`.

All three frames use the `REFERENCE` camera, identical `1600 × 1000` renderer viewport, material state, light rig, environment and exposure. See `02-tone-mapping-comparison.png`.

## 9. Final Neutral Light Rig

1. **IBL** — Three.js `RoomEnvironment` → PMREM; global intensity `0.78`; invisible as background.
2. **Daylight shadow key** — DirectionalLight `#fff8ef`, intensity `0.52`, position `[-0.4, 7.6, -5.2]`, target `[-2, 1, -0.4]`; only shadow caster; shadow intensity `0.38`.
3. **Broad window contribution** — RectAreaLight `#fff8ef`, intensity `0.72`, position `[-0.4, 1.25, -5.25]`, target `[-3.6, 1.15, 0.8]`, size `11 × 3.2`; no shadow.
4. **Broad ceiling bounce** — RectAreaLight `#f4eadc`, intensity `0.20`, position `[-2, 4.08, -1.1]`, target `[-2, 0.8, -1.1]`, size `8 × 4.5`; no shadow.
5. **Very weak broad fill** — DirectionalLight `#e6edf4`, intensity `0.04`, position `[-5.5, 3.2, 2.8]`; no shadow.

The daylight key uses a restrained directional/area combination with distinct responsibilities: the RectAreaLight supplies broad window softness, while the low-intensity directional component supplies a single coherent shadow direction. The previous HemisphereLight is removed. There are no per-object or kitchen patch lights.

## 10. Visual Result

- Kitchen: upper and lower cabinet planes, handles, drawer gaps, worktop and appliance edges are distinguishable in opening and close views.
- Island: timber top, near-black front and side boundary remain separate; the front is no longer a featureless rectangle.
- Stools: dark legs remain visible against both island and floor; seats remain timber.
- Marshall: remains black; cabinet/grille boundaries and guitar separation survive the neutral global rig without a Marshall-specific change.
- Lounge: sofa remains dark rather than grey, while cushions and seat planes retain volume.
- Window hierarchy: the forest/window remains the brightest region; the interior stays darker without a flat ambient flood.
- Side view: the same global rig remains coherent from the opposite/window-facing pose; no local-light hotspot appears.

This result is **NEEDS USER REVIEW**, not a visual PASS declaration.

## 11. Floor

The planar reflection prototype was **not** reintroduced. `studioV2FloorReflection.js` is absent from the rebuild branch. No SSR, postprocessing reflection, extra scene render or floor render target was added.

## 12. Scene Ready

`STUDIO_V2_ENTRY_ROOT`, the entry manifest and Scene Ready Gate architecture are unchanged. `RoomEnvironment` PMREM generation occurs during room preparation, before shader compile, warm-up and the atomic visible frame. Route re-entry returned to `phase=ready`, and no object or environment pop-in was observed. Audio remains non-critical.

## 13. Performance

Official route after warm-up:

- FPS: `60`
- Draw calls: `96`
- Rendered triangles: `780,044`
- GPU textures: `65`
- Scene lights: `4`
- Shadow maps: `1` at `2048²`
- Explicit persistent environment render targets: `1` PMREM target
- Reflection/postprocessing render targets: `0`
- Extra scene render passes: `0`

The approximate accepted performance baseline is preserved.

## 14. Files Changed

- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/studioV2Config.js`
- `src/studio-v2/studioV2MaterialTuning.js`
- `docs/reviews/fred-studio-v2-lighting-rebuild/REPORT.md`
- Six PNG evidence files listed below

No room geometry, object transform, camera, Radio Panel CSS/DOM, audio catalogue, route structure or model asset was changed.

## 15. Evidence

All captures use a `1600 × 1000` fixed renderer viewport. Final review images use the named fixed camera preset shown below.

- `docs/reviews/fred-studio-v2-lighting-rebuild/01-clean-checkpoint-opening.png` — accepted checkpoint `9233bf8`, `REFERENCE`
- `docs/reviews/fred-studio-v2-lighting-rebuild/02-tone-mapping-comparison.png` — `REFERENCE`, identical three-mode comparison
- `docs/reviews/fred-studio-v2-lighting-rebuild/03-neutral-opening.png` — `REFERENCE`
- `docs/reviews/fred-studio-v2-lighting-rebuild/04-neutral-kitchen.png` — `KITCHEN_DETAIL`
- `docs/reviews/fred-studio-v2-lighting-rebuild/05-neutral-marshall.png` — `MARSHALL_FRONT`
- `docs/reviews/fred-studio-v2-lighting-rebuild/06-neutral-lounge.png` — `SOFA_DETAIL`

The additional `OPPOSITE` side view was inspected live but intentionally not added, preserving the six-image evidence limit.

## 16. Build

- Production build: **PASS** (`npm run build -- --outDir /private/tmp/fred-studio-v2-build-20260808-stage1`); only the existing generic chunk-size warning remains.
- `git diff --check`: **PASS**
- Official route console in a fresh tab: **clean** (no warnings or errors)
- Debug route console after a fresh reload: **clean** (no warnings or errors)
- Official route: Scene Ready, 60 FPS, Radio open/Escape-close and Marshall play/pause verified
- Route exit/re-entry: Scene Ready returned with 96 calls / 780,044 triangles
- Debug route: resource controls and readiness panel remain debug-only; Scene Ready reports READY

## 17. Git

- Current branch: `feat/fred-studio-v2-lighting-rebuild`
- Current base commit: `9233bf8e58b4ecf6fdb8d62261c98261619ba4cf`
- Rebuild work: intentionally uncommitted
- Remaining unrelated untracked paths:
  - `docs/reviews/fred-studio-v2-placed-objects/`
  - `public/models/fred-studio-v2/objects/imac_2021.glb`

**BACKUP LOCAL COMMIT ONLY**
**NO PUSH**
**NO MERGE**
**NO DEPLOY**
**NO COMMIT ON REBUILD BRANCH**

# Fred Studio V2 — World-Space Marshall Radio Glass Panel

## A. Repository state

- Worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`
- Branch: `feat/fred-studio-v2-interactions`
- Starting HEAD: `2df69a192f3d17a8be87525cdc83e8b0b17608b3` (`feat: add licensed Marshall audio playback`)
- The pre-existing untracked placed-object review images and iMac GLB were preserved and excluded from this task.
- No staging, commit, push, merge, or deployment was performed.

## B. Radio Panel architecture

- World-space implementation: `createStudioV2RadioPanel.js`.
- Stable config: `studioV2RadioPanelConfig.js`.
- Rendering: one fixed Three.js group containing a thin `BoxGeometry` smoked-glass shell, one compact `PlaneGeometry`, and one playlist `PlaneGeometry`.
- Text: high-resolution CanvasTextures (`2048 × 788` compact and `2048 × 630` playlist), sRGB, mipmaps, linear filtering, and anisotropy up to 8.
- Semantic ID: `MARSHALL_RADIO_PANEL_01`.
- Hierarchy: `STUDIO_V2_ENTRY_ROOT → MARSHALL_RADIO_PANEL_01`.
- The panel subscribes to the existing catalogue/audio controller. It does not create a second audio state source or audio element.

## C. Fixed world transform

- Position: `[-2.340, 1.340, 0.640]`.
- Rotation: `[0, -0.959931, 0]` radians.
- Yaw: `-0.959931` radians / `-55°`.
- Scale: `1`.
- Compact dimensions: `0.52 × 0.20 × 0.01 m`.
- Expanded dimensions: `0.52 × 0.36 × 0.01 m`.
- The top anchor remains fixed; expansion only extends the lower edge downward in the same plane.
- The panel sits above and to the opening-view left of the Marshall stack without intersecting the amplifier, Guitar, floor, wall, or furniture.

## D. Visual material

- Material: dark `MeshPhysicalMaterial` smoked glass.
- Colour: `#101619`.
- Roughness: `0.20`.
- Metalness: `0`.
- Clearcoat / clearcoat roughness: `0.34 / 0.22`.
- Opacity: `0.68`.
- Transmission: `0` to avoid Three.js's full-scene transmission pre-pass.
- IOR: `1.45`; real-time refraction is not used.
- A restrained 4-pixel translucent border is rendered into each high-resolution UI texture.
- Text uses quiet off-white and grey tones with no neon, glow, or large highlight block.
- The double-sided glass uses `forceSinglePass`; compact is +2 draw calls / +14 rendered triangles, expanded is +3 / +16.

## E. Scene Ready integration

- Panel entry-critical: **YES**.
- `MARSHALL_RADIO_PANEL_01` is registered in the entry manifest as opening-visible world UI.
- Catalogue metadata is fetched before the panel is marked ready, with a 3,000 ms bounded timeout.
- Audio binary entry-critical: **NO**. The audio element remains `preload="none"`; entry only requests the small catalogue.
- Delayed-panel test (`entryDelayRadioPanel=1300`) kept the cover active at 520 ms in `loading-entry-assets`; the first visible ready frame at 1,341.1 ms already contained the panel and final text.
- Catalogue failure resolves to a ready fallback panel rather than blocking Scene Ready.

## F. Compact state

- Displays `FRED STUDIO RADIO`, current title, artist, a small play/pause icon, and quiet playback state.
- Default state is `COMPACT_IDLE`.
- The opening route displays `Cmon` / `Fred again..` before reveal, with no panel or text pop-in.
- The physical room remains the dominant subject.

## G. Expanded playlist

- Fixed dimensions: `0.52 × 0.36 × 0.01 m`.
- Five visible rows; the list region scrolls without increasing panel height.
- Current track receives restrained brightness and a small `CURRENT` marker; hover treatment remains subtle.
- Six-track fixture: six enabled rows rendered; a seventh disabled track was excluded.
- Twenty-track fixture: all 20 enabled tracks were available, the visible region remained fixed, and wheel scrolling reached later catalogue rows.
- The compact layout remained unchanged in both simulations.
- No fake track was written to `catalog.published.json` or `catalog.local.json`.

## H. Interaction

- Marshall Play/Pause: preserved and verified (`idle → playing → paused`).
- Compact panel click: expands.
- Expanded header click: collapses.
- Different-track selection: uses `setTrack(trackId)` followed by playback on the existing audio element.
- Current-track click: no restart; verified to remain idle with empty `trackId` before first playback.
- Marshall drag: camera drag only; audio remained idle.
- Guitar click: audio remained idle.
- Panel pointer capture blocks OrbitControls only for a genuine panel interaction. Outside-panel orbit and wheel behaviour remain available.
- Wheel events are consumed only over the expanded list region.

## I. Camera/world-space verification

- Position remained `[-2.34, 1.34, 0.64]` across opening, close, side, and opposite views.
- Rotation remained `[0, -0.959931, 0]`; no `lookAt`, Sprite, billboard, camera parent, or viewport-following code exists.
- Side-angle evidence shows natural perspective narrowing rather than camera-facing rotation.
- Opposite view shows the inactive glass back and no mirrored text.
- The meshes use normal depth testing and are occluded as room geometry.

## J. Performance

- Fixed performance capture: 1280 × 720, DPR 1.
- Compact: `60 FPS`, `96 draw calls`, `780,044 rendered triangles`.
- Expanded: `60 FPS`, `97 draw calls`, `780,046 rendered triangles`.
- Approved baseline: `60 FPS`, `94 draw calls`, `780,030 rendered triangles`.
- Net panel cost: compact `+2 calls / +14 triangles`; expanded `+3 / +16`.
- Ordinary official ready sample: `925.0 ms`; fixed-DPR performance sample: `1,029.7 ms`.
- Catalogue metadata/UI-ready debug samples: approximately `49–74 ms` / `50–75 ms` on warm local loads.
- Textures redraw only on metadata, playback, hover, selection, or scroll changes—not each animation frame.

## K. Error behaviour

- Missing catalogue: Scene Ready remained `true`, phase remained `ready`, and no official error panel appeared.
- Fallback UI: `FRED STUDIO RADIO / Audio unavailable` was present on reveal.
- Marshall/audio failure remains isolated from the 3D scene.
- Route exit removed the Studio canvas and paused/destroyed the route audio state.
- Re-entry and refresh both returned to `idle` with no autoplay.
- A fresh final browser session produced no console errors. The existing Three.js `PCFSoftShadowMap` deprecation warning remains unrelated.

## L. Build

- Command: `npm run build`.
- Result: **PASS**.
- Vite: `7.3.6`.
- Modules transformed: `517`.
- New Studio V2 page chunk: `395.29 kB` / `149.97 kB gzip`.
- Warnings: existing generic >500 kB chunk advisory only.
- Errors: none.
- New dependencies: none.
- Audio-controller test: **PASS**, including bounded catalogue-timeout coverage.
- Production resolver still points to `catalog.published.json`; development points to `catalog.local.json`.
- Entry asset inventory contained the catalogue only and no `.m4a`; audio remains user-triggered.

## M. Changed files

- `src/studio-v2/createStudioV2RadioPanel.js`
- `src/studio-v2/studioV2RadioPanelConfig.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/createStudioV2MarshallInteraction.js`
- `src/studio-v2/studioV2AudioController.js`
- `src/studio-v2/studioV2AudioController.test.mjs`
- `src/studio-v2/studioV2EntryGate.js`
- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/studio-v2.css`
- `docs/reviews/fred-studio-v2-radio-panel/01-opening-compact.png`
- `docs/reviews/fred-studio-v2-radio-panel/02-opening-playing.png`
- `docs/reviews/fred-studio-v2-radio-panel/03-expanded-playlist.png`
- `docs/reviews/fred-studio-v2-radio-panel/04-marshall-close-compact.png`
- `docs/reviews/fred-studio-v2-radio-panel/05-marshall-close-expanded.png`
- `docs/reviews/fred-studio-v2-radio-panel/06-side-view-fixed-orientation.png`
- `docs/reviews/fred-studio-v2-radio-panel/07-opposite-angle.png`
- `docs/reviews/fred-studio-v2-radio-panel/08-debug-panel-transform.png`
- `docs/reviews/fred-studio-v2-radio-panel/09-first-visible-frame.png`
- `docs/reviews/fred-studio-v2-radio-panel/10-catalogue-error-fallback.png`
- `docs/reviews/fred-studio-v2-radio-panel/11-multitrack-scroll-test.png`
- `docs/reviews/fred-studio-v2-radio-panel/REPORT.md`

No model, derivative, source GLB, lighting, camera, exposure, Room material, MacBook material, Marshall material, Guitar material, approved placement, catalogue, or audio binary was changed.

## N. Visual verdict

**PASS WITH LIMITATION — usable and ready for user visual review.**

Desktop pointer, wheel, keyboard-accessible expand/collapse, and accessible select workflows are complete. Touch can tap to expand/select, but direct touch-drag scrolling inside the world-space list is not implemented in this first pass; the single coherent hidden accessible select remains available to assistive technology.

## O. Git safety

No commit, push, merge, or deployment was performed.

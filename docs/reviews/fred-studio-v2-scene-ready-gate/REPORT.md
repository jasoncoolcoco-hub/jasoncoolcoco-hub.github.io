# Fred Studio V2 Scene Ready Gate

## A. Git state

- Worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`
- Branch: `feat/fred-studio-v2-interactions`
- Starting HEAD: `757f747 feat: complete Fred Studio V2 imported loft baseline`
- The worktree already contained approved, uncommitted Fred Studio V2 work before this task. It was preserved.
- No reset, clean, restore, stash, commit, push, merge, or deployment was performed.

## B. Root cause

The previous room-first lazy presentation treated `onRoomReady` as presentation-ready. The room could become visible and camera controls could become active before the separately loaded MacBook, Marshall, and Guitar had finished loading, placement, material setup, matrix updates, shadow setup, and shader warm-up. The placed-object loader then added those groups to an already visible scene, which caused the visible pop-in.

## C. New Scene Ready Gate architecture

- `STUDIO_V2_ENTRY_ROOT` now owns the room and every opening-visible placed object.
- The official route starts all unique entry-critical network requests in parallel.
- Download completion alone cannot open the gate. The gate also requires textures, material overrides, anchors/transforms, world matrices, shadow flags, opening-visible groups, shader compilation, and a hidden warm-up render.
- `renderer.compileAsync(scene, camera)` is used on Three.js r185, with `renderer.compile` as the fallback.
- The hidden scene is rendered once, followed by two `requestAnimationFrame` waits, before `sceneReady=true`.
- The full-viewport cover and disabled interactions remain in place before `sceneReady`.
- The single `studio-v2-ready` event, `onStudioV2Ready` callback, and `sceneReadyPromise` runtime alias provide the future entry-animation integration point.
- A critical error keeps the scene covered, disables interactions, and exposes Retry.

## D. Entry-critical asset manifest

The centralized manifest uses stable semantic IDs rather than internal GLB mesh names:

- `ROOM_ENVIRONMENT`
- `MACBOOK_ISLAND_01`
- `MARSHALL_GUITAR_FLOOR_01`
- `MARSHALL_AMP`
- `GIBSON_GUITAR`

The manifest resolves to four unique official network requests because the placement group is a readiness dependency rather than another GLB. The schema also records future opening-visible kinds: photos, map, project tray, desktop pet, and other opening-visible props.

## E. Loading and reveal timeline

1. Create the entry gate and keep controls/interactions disabled.
2. Start the room, MacBook, Marshall, and Guitar requests in parallel on the official route.
3. Join the loaded resources beneath the hidden entry root.
4. Apply the existing material, anchor, transform, shadow, and semantic-ID setup.
5. Update entry-root, scene, and camera world matrices.
6. Verify all opening-visible semantic groups are present.
7. Compile shaders/materials.
8. Render a hidden warm-up frame and wait two animation frames.
9. Mark `sceneReady=true`, enable the currently permitted controls, and reveal the complete scene atomically.

Normal local official timing at the 1280 × 720 audit viewport:

- room first prepared frame: 219.2 ms in the debug audit
- complete ready / first reveal-eligible frame: 719.2 ms
- official-query guard re-entry: 675.4 ms

## F. Official-route verification

- `/studio-v2-import-test` reaches Scene Ready with no visible official UI.
- Room, MacBook, Marshall, and Guitar are present in the first visible frame.
- The accepted opening camera, camera limits, placements, scales, materials, lighting, exposure, and tone mapping were not changed.
- The accepted Marshall visual treatment was not changed.
- Controls remain disabled before the gate and become enabled only after Scene Ready; no camera reset or placement reapplication occurs at reveal.
- Refresh, home → Studio V2, Studio V2 → Studio V1 → Studio V2, and re-entry all succeeded.
- Official query attempts to select eager loading, KTX2, or a test delay were ignored; the approved official configuration remained active.
- Official critical asset paths:
  - room: `/models/fred-studio-v2/optimised/meshopt/room_meshopt.glb`
  - MacBook: `/models/fred-studio-v2/optimised/meshopt/macbook_pro_2021_meshopt.glb`
  - Marshall: `/models/fred-studio-v2/optimised/meshopt/marshall_amp_conservative_meshopt.glb`
  - Guitar: `/models/fred-studio-v2/optimised/meshopt/gibson_guitar_conservative_meshopt.glb`
- Unique critical requests: 4. The gate deduplicates URLs; no source/derivative pair is requested together.
- Textures remain source PNG/JPEG (`RGBAFormat` in the runtime audit); KTX2 was not selected or requested by the official gate.

## G. Slow-network and delayed-asset tests

- Normal local load: passed.
- Cold-cache/fresh-profile headless check: the route remained fully covered with `sceneReady=false` and `interactions=false` while shader warm-up was still pending; no partial room or prop presentation was exposed.
- Fast-3G-equivalent deterministic test: room +2.5 s, MacBook +4 s, Marshall/Guitar +5 s. At 0.5 s the cover remained present, interactions were disabled, and Scene Ready was false. At 5254.3 ms all four resources were ready and the complete scene was revealed.
- MacBook +5 s: the cover stayed in place until the MacBook and every other gate condition were ready; the first visible frame contained all three placed objects.
- Marshall/Guitar +5 s: complete ready occurred at 5254.7 ms; the first visible frame contained both music objects and the MacBook.
- No independent object fade, scale-in, placeholder swap, late shadow, material swap, placement jump, or opening-camera reset was observed.

## H. Error/retry behaviour

- Injected `MARSHALL_AMP` critical failure: the gate entered `error`, the full cover remained, controls stayed disabled, and a concise Retry action appeared.
- Retry starts a clean new scene attempt; the deterministic fault applies only to the first attempt.
- Retry reached Scene Ready with all asset and condition statuses `READY`, error `NONE`, and the complete scene visible.

## I. Performance and build

- Runtime audit at 1280 × 720: 60 FPS, 94 draw calls, 780,030 rendered triangles, 68 geometries, 64 textures.
- These values remain at the approved baseline; the gate changes orchestration and visibility timing, not scene contents.
- Build command: `npm run build`
- Result: success; Vite 7.3.6 transformed 512 modules and completed in 1.79 s.
- Warning: the existing Rollup chunk-size advisory remains for chunks above 500 kB after minification.
- Build errors: none.
- The project exposes no separate lint, type-check, or test scripts.

## J. Changed files

Task-specific implementation and evidence:

- `src/studio-v2/studioV2EntryGate.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/studioV2PlacedObjects.js`
- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/StudioV2Loading.jsx`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/studio-v2.css`
- `docs/reviews/fred-studio-v2-scene-ready-gate/REPORT.md`
- `docs/reviews/fred-studio-v2-scene-ready-gate/loading-cover.png`
- `docs/reviews/fred-studio-v2-scene-ready-gate/first-visible-frame.png`
- `docs/reviews/fred-studio-v2-scene-ready-gate/scene-ready-debug.png`
- `docs/reviews/fred-studio-v2-scene-ready-gate/delayed-macbook-first-visible-frame.png`
- `docs/reviews/fred-studio-v2-scene-ready-gate/delayed-marshall-guitar-first-visible-frame.png`
- `docs/reviews/fred-studio-v2-scene-ready-gate/load-error-state.png`
- `docs/reviews/fred-studio-v2-scene-ready-gate/retry-success-frame.png`

No resource derivative, approved model, anchor, placement, scale, material, camera, room light, tone-mapping, or exposure file was changed for this task.

## K. Git confirmation

The task remains uncommitted in the existing feature worktree, exactly as requested. No branch history or remote state was changed.

No commit, push, merge, or deployment was performed.

# Fred Studio V2 — Camera Director Stage 4A

## 1. Status

NEEDS USER REVIEW

The Stage 4A foundation is implemented locally. The accepted official camera remains static on entry and only `ROOM_ORBIT` is active there. No Ambient Drift, object focus, entrance motion, or new official UI was enabled.

## 2. Floor Reflection Checkpoint

- commit SHA: `5cd163d0b3521d515eba384e977e9092dbf24a0a`
- remote branch: `origin/feat/fred-studio-v2-floor-reflection`
- local/remote result: exact SHA match after push
- evidence correction: the mislabeled Stage 3.4 window-floor and island/stools frames were replaced with the approved fixed views before commit
- checkpoint message: `feat: complete Fred Studio soft floor reflection`

FLOOR REFLECTION CHECKPOINT:
COMMITTED AND PUSHED

## 3. Existing Camera Audit

Camera ownership before consolidation was spread across:

- `createStudioV2Scene.js`: camera creation, initial pose, resize/FOV, reset/preset/config tweens, OrbitControls limits and updates, the performance harness, rear protection, render-cycle acceptance, and route disposal.
- `studioV2CameraSafety.js`: accepted/last-valid camera and target, floor/architecture/furniture collision resolution, damping clearing, target/radius/polar constraints, and debug records.
- `StudioV2ImportPage.jsx`: user-requested reset entry point.
- `StudioV2DebugPanel.jsx`: runtime preset/reset entry points.
- `createStudioV2RadioPanel.js`: temporary OrbitControls enable/disable during panel pointer ownership.
- `createStudioV2MarshallInteraction.js`: read-only control state for pointer cursor feedback.
- `studioV2FloorReflection.js`: read-only camera matrix tracking for adaptive reflection refresh.

After Stage 4A, the Camera Director owns normal pose application, transitions, final per-frame control/safety resolution, resize FOV, input ownership, reset/presets, performance-harness movement, and disposal. The scene keeps a documented initialization/limit adapter for OrbitControls and the previously accepted legacy collision solver. Radio uses the Director adapter in Studio V2; its direct `controls.enabled` path remains only as a standalone fallback.

## 4. Camera Director Architecture

- `studioV2CameraDirector.js`: single runtime authority for state, transitions, input ownership, pose application, update cycle, cancellation, resize, debug snapshots, and disposal.
- `studioV2CameraPoses.js`: exact accepted pose, baseline control configuration, required future state registry, and debug-only candidate poses.
- `studioV2CameraSafetyVolume.js`: reusable half-space/obstacle solver, last-valid fallback, hysteresis, safe target box, and debug helpers.
- `createStudioV2Scene.js`: constructs the Director before visible Scene Ready, then delegates all normal camera mutations.
- `createStudioV2RadioPanel.js`: requests/releases orbit ownership through the Director adapter.
- `StudioV2DebugPanel.jsx`: debug-only Director diagnostics, transition controls, helper toggles, accepted reset, and pose capture.

No new dependency, physics engine, BVH, per-frame visible-mesh raycast, or per-frame helper allocation was added.

## 5. State Model

Registered states:

- `ROOM_ORBIT`
- `ROOM_WIDE_START`
- `AMBIENT_DRIFT`
- `AMBIENT_USER_OVERRIDE`
- `TABLE_OVERVIEW`
- `TABLE_FREE_ORBIT`
- `MACBOOK_FOCUS`
- `FOLDER_FOCUS`
- `POLAROID_FOCUS`
- `OTHER_OBJECT_FOCUS`

Official active state: `ROOM_ORBIT` only.

`ROOM_WIDE_START_CANDIDATE` and `TABLE_OVERVIEW_CANDIDATE` are Debug-only transition targets. No Ambient Drift or focus state runs automatically.

## 6. Accepted Opening Pose

- position: `[-6.42, 1.92, 0.3]`
- target: `[-6.001382586904363, 1.8891436796244, 0.2856003838247201]`
- quaternion: `[-0.026435226271736598, -0.694376539496616, -0.025541541232891537, 0.7186724079023176]`
- look direction: `[0.9967081264181825, -0.0734674294657138, -0.034284800417333075]`
- orbit radius: `0.42 m`
- FOV: `50°`
- near/far: `0.05 / 160`
- distance: `0.40–0.44 m`
- polar: `1.30–1.70 rad`
- azimuth: `-140° to -64°`
- damping: enabled, factor `0.14`
- pan: disabled
- zoom: enabled
- rotate/zoom/pan speed: `0.42 / 0.62 / 0.42`

At 1280×720, the before/after screenshots have mean absolute RGB difference `1.72 / 1.70 / 1.75`, attributable to live renderer/frame compression variation. Composition, target, FOV, and visible object placement are unchanged.

## 7. Safe Interior Camera Volume

Representation: convex half-spaces plus a sloped-ceiling plane, combined with a safe target AABB and a small set of explicit obstacle boxes.

Boundaries:

- floor
- ceiling
- left wall
- rear virtual protection
- side wall
- glass wall
- sloped ceiling/roof

Camera radius: `0.12 m`. This is calibrated from the accepted opening camera, whose X position is `-6.42` against the previously audited left cage minimum of `-6.55`, leaving approximately `0.13 m`. A larger `0.18 m` trial incorrectly shifted the accepted opening pose and was rejected during browser comparison.

Target margin: `0.12 m`. Hysteresis: `0.004 m`.

The safe target box is `[-6.2, 0.5505425931, -4.33]` to `[4.73, 2.74, 3.03]`. Existing official fixed-target, radius, polar, azimuth, and disabled-pan policy remains intact.

## 8. Major Obstacles

Simplified exclusion boxes are retained only for genuinely large, reachable geometry:

- south sofa main body and chaise
- north sofa body
- two low coffee tables
- kitchen island body
- kitchen stool row

Each box receives a small `0.06 m` solver expansion. Marshall/Guitar is not added because the accepted official orbit capsule cannot enter it. No cups, books, small decorations, Radio Panel, or accessories receive collision.

## 9. Boundary Solver

Every update resolves in one controlled cycle:

1. existing accepted OrbitControls limits are prepared;
2. OrbitControls produces its candidate;
3. the accepted legacy safety adapter resolves floor/architecture/furniture constraints;
4. the half-space solver projects only violated normal components, preserving tangent motion;
5. obstacle interiors project to the nearest X/Z face;
6. the target is clamped independently;
7. unresolved compound cases use the last valid pose;
8. corrected frames clear OrbitControls momentum once before rendering.

The `0.004 m` hysteresis avoids boundary sign-flapping. A 120-sample repeated left-wall test resolved to X `-6.426` with a measured span of `0`, so there was no bounce, reset loop, or jitter.

## 10. Input Ownership

Input owners are `NONE`, `USER`, `CAMERA_DIRECTOR`, `RADIO_PANEL`, or the scene adapter.

Pointer/touch pointer-down, pointer-up/cancel, wheel, and supported keyboard orbit input are registered centrally. User input cancels a debug transition immediately. A live interruption test ended with:

- transition: `NONE`
- input owner: `NONE`
- orbit controls: enabled
- safety: clear
- valid `0.40 m` orbit radius

Radio pointer ownership suspends orbit through the same authority and restores the previous state on release/cancel/dispose.

## 11. Transition Engine

Debug-only smooth cubic transitions interpolate position, target, and FOV without spring, bounce, overshoot, or elastic motion. The engine supports cancellation, replacement, user interruption, resize, route disposal, and restoration of OrbitControls ownership.

Official entry activates no transition. The existing user-triggered reset continues to use a smooth transition when reduced motion is not requested; it is not automatic.

## 12. Reflection Integration

The Director does not create a second reflection loop. The accepted matrix-delta system remains the only refresh authority.

Observed at 1280×720:

- static opening: `STATIC / 0 Hz`
- debug transition mid-flight: `FAST / 22 Hz` policy, measured `18.5 Hz`
- user-interrupted movement: measured `19 Hz`
- settled after transition/interruption: `STATIC / 0 Hz`

Source and blur update together, and the reflection follows the camera without stale frames.

## 13. Scene Ready

The Director is constructed and applies the accepted opening pose before the model is revealed. Camera matrices, first reflection frame, hidden shader compile/warm-up, and Scene Ready remain in the accepted order. Browser checks found no late FOV/target reset or first-frame composition jump.

Route disposal cancels transitions, removes Director input listeners, removes debug helpers, restores any active Radio pointer ownership, and then disposes OrbitControls. Re-entry starts at the accepted opening pose with clean `ROOM_ORBIT` state.

## 14. Visual Result

Official `/studio-v2-import-test` remains visually unchanged:

- no automatic movement
- no entrance animation
- no Ambient Drift
- no object focus
- no new visible UI
- no camera/FOV composition change
- floor parameters, room lighting, materials, objects, Radio Panel, and audio behavior unchanged

## 15. Boundary Tests

- Opening comparison: PASS.
- Normal orbit: PASS; accepted sensitivity and limits feel unchanged.
- Glass boundary: PASS; repeated extreme rotation/zoom showed no camera crossing or one-frame rough exterior leak.
- Rear boundary: PASS; official azimuth protection stopped the furthest rear view without a reset.
- Floor/ceiling: PASS; extreme polar input remained within `1.30–1.70 rad` and no plane penetration occurred.
- Left/right walls: PASS; both extremes settled cleanly.
- Major objects: PASS; the direct sofa-center probe projected to the nearest legal face, and official orbit did not become trapped.
- Repeated boundary input: PASS; 120 identical outside-wall samples produced zero positional span.
- Debug transition: PASS.
- User interruption: PASS.
- Route exit/re-entry: PASS.
- Resize/DPR: PASS at 1024×640 DPR 1 and 1440×900 DPR 2.

Direct projection probes and resolved positions are recorded in `camera-boundaries.json`.

## 16. Regression

- Radio open/close button: PASS.
- Radio outside click: PASS.
- Radio Escape close: PASS.
- Published/local track selection: unchanged.
- Play, pause, and retained paused state: PASS.
- No autoplay on route entry or re-entry: PASS.
- `/studio-v1`: PASS; canvas loaded and no Studio V2 code was exposed.
- Studio V2 route re-entry: PASS; accepted opening and idle audio restored.
- resize/DPR projection: PASS.
- floor reflection: PASS; adaptive during movement, static at rest.
- console errors: none. The existing Three.js `PCFSoftShadowMap` deprecation warning remains unchanged.

## 17. Performance

| Sample | FPS | Calls | Triangles | Reflection |
| --- | ---: | ---: | ---: | --- |
| Stage 3.4 accepted static baseline | 59.88 median / 60.00 average | 99 | 780,688 | 0 Hz |
| Stage 4A static runtime display | 59 | 99 | 780,688 | 0 Hz |
| Stage 4A normal orbit runtime display | 59 | 99 base | 780,688 base | adaptive |
| Stage 4A debug transition | 59 | 99 base | 780,688 base | 18.5 Hz measured |
| Stage 4A post-transition settled | 59 | 99 | 780,688 | 0 Hz |

The Debug route adds nine helper geometries only while Debug is constructed; the official route remains at 70 geometries. Persistent official render calls and triangles are unchanged.

## 18. Files Changed

Implementation:

- `src/studio-v2/studioV2CameraDirector.js`
- `src/studio-v2/studioV2CameraPoses.js`
- `src/studio-v2/studioV2CameraSafetyVolume.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/createStudioV2RadioPanel.js`
- `src/studio-v2/StudioV2DebugPanel.jsx`

Review artifacts:

- this report
- twelve required PNG files
- `camera-baseline.json`
- `camera-boundaries.json`

Unrelated legacy/untracked Stage 3.2/3.3 folders, redundant Stage 3.4 evidence/ZIP, placed-object review files, and `imac_2021.glb` were not changed or staged.

## 19. Evidence

- `docs/reviews/fred-studio-v2-camera-director-stage4a/01-before-opening.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/02-after-opening.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/03-opening-before-after.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/04-safe-volume-debug.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/05-glass-boundary.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/06-rear-boundary.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/07-floor-ceiling-boundary.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/08-left-right-wall-boundary.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/09-major-obstacle-boundary.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/10-debug-transition-contact-sheet.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/11-transition-interruption.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/12-final-official-route.png`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/camera-baseline.json`
- `docs/reviews/fred-studio-v2-camera-director-stage4a/camera-boundaries.json`

## 20. Build

- `npm run build`: PASS
- `git diff --check`: PASS
- browser console: no new errors
- production route UI: clean
- Debug camera tools: Debug-only

## 21. Git

- current branch: `feat/fred-studio-v2-camera-director`
- branch base: floor reflection checkpoint `5cd163d0b3521d515eba384e977e9092dbf24a0a`
- Stage 4A staged files: none
- Stage 4A working state: intentionally uncommitted
- Stage 4A remote branch: not created/pushed
- main: not modified or merged
- deployment: none

CAMERA DIRECTOR STAGE 4A:
NO COMMIT
NO PUSH
NO MERGE
NO DEPLOY

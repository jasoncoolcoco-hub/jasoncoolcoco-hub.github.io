# Fred Studio V2 — Camera Director Stage 4B.2 Entry Experience Revision

## 1. Status

NEEDS USER REVIEW

## 2. Stage 4B.1 Baseline

Stage 4B.1 already provided the 96-second Room Wide → Table Overview director, canonical end handoff, pause/resume integration, safe-volume validation, Table Free orbit, reduced-motion branch, camera-state-aware reflection cadence, and debug-only audit controls. Those systems remain the technical base of this revision.

## 3. User-Approved Design Changes

This revision implements all five requested changes: best-effort soft entry audio, camera movement from the first visible complete frame, a fully locked official drift, a higher rail, and a canonical endpoint 0.42 m past the stool-seat centre plane toward the island.

## 4. Entry Audio Architecture

- The existing single `HTMLAudioElement` is retained; no second element or autoplay attribute was introduced.
- `preload` is now `auto`, and catalogue/default-track preparation starts without blocking Scene Ready.
- Scene Ready launches a best-effort `play()` attempt at volume 0 from the same Entry timestamp used by the camera.
- No existing internal-navigation link to this route was found, so there is no safe prior gesture bridge to consume.
- `NotAllowedError` is classified as policy blocking, leaves the room usable, and arms one pointer/touch/keyboard fallback.
- The fallback has a 300 ms double-toggle guard so a Marshall gesture that unlocks playback cannot immediately pause it again.
- Media/catalogue failures remain distinct from policy rejection and never create a large official-route error panel.

## 5. Entry Audio Fade

- Target volume: 0.08 (also capped by the track's configured volume).
- Fade duration: 4500 ms.
- Curve: cubic ease-out, `1 - (1 - p)^3`.
- First audible level: begins at 0 and rises continuously after a successful play promise.
- Manual pause, Radio state and Marshall intent remain authoritative; the fade stops when paused.

## 6. Browser Policy Result

- Direct local load in the in-app Chromium environment: audible autoplay was blocked and correctly classified as `AUTOPLAY_POLICY_BLOCKED`.
- Internal route navigation: no existing Studio V2 internal navigation gesture bridge exists in current route wiring; no artificial bridge was added.
- Forced blocked debug case: entered `waiting-for-gesture`, kept one audio element, volume 0, and left the 3D room fully usable.
- First-interaction fallback: the listener armed and consumed exactly one gesture. This browser automation environment still rejected audio output and returned `AUDIO_PLAYBACK_FAILED`; no false claim of audible playback is made. The controller's allowed and blocked branches pass deterministic tests, including successful volume 0.08 fade completion.

## 7. Shared Entry Start

Scene Ready and the first complete visible-frame handoff create one `entryStartedAt` value. Both `cameraDirector.startAmbientExperience()` and `audioController.startEntryExperience()` receive that exact value in the same synchronous task, so the requested timestamp difference is 0 ms at dispatch. The recorded local sample used 1116.8 ms for both.

## 8. Locked Drift

On the clean official route, the director enters `AMBIENT_DRIFT` immediately with input type `LOCKED_RAIL`; orbit is disabled. Pointer drag, pointer move, wheel and camera keyboard listeners are not registered in production. Object interactions and the Radio panel remain available. Free orbit is enabled only after the canonical arrival handoff.

## 9. Removed Head-Look Behavior

Official head-look override and idle-return behavior are retired: production no longer registers their pointer/wheel/keyboard listeners and cannot enter `AMBIENT_USER_OVERRIDE`. The existing debug-only head-look/return diagnostics remain available only under the debug route for historical comparison.

## 10. Elevated Path

- Candidate A: +0.18–0.22 m.
- Candidate B: +0.25–0.32 m, selected.
- Candidate C: +0.34–0.42 m.
- Selected camera Y control points: 2.18, 2.22, 2.27, 2.28, 2.24, 2.18, 2.12 m.
- Minimum measured boundary clearance over the complete safe-volume system: 0.05 m.
- B is the highest candidate that remains natural and room-scale; C begins to read like an overhead surveillance angle.

## 11. Stool Geometry

- Stool-seat centre plane: X = 0, normal +X toward the island.
- Stage 4B.1 endpoint: X = -1.15 m (1.15 m before the plane).
- Stage 4B.2 endpoint: X = 0.42 m.
- Signed distance past the stool plane: +0.42 m, inside the requested 0.30–0.50 m band.
- Expanded stool collider top: Y = 1.21 m; endpoint camera Y = 2.12 m, giving 0.91 m vertical clearance.

## 12. Stool Crossing

The selected centripetal Catmull-Rom rail crosses the stool plane continuously at elevated eye height. Position, target and FOV are sampled by arc length. The camera sphere and near plane remain above the stool-row collider; no furniture correction, target correction or emergency clamp is applied. The stool row remains a major obstacle in the safety audit rather than being disabled.

## 13. Revised TABLE_OVERVIEW

- Position: `[0.42, 2.12, 0.20]`.
- Target: `[0.96, 1.50, -0.05]`.
- Quaternion: `[-0.330439, -0.495331, -0.211153, 0.775159]`.
- FOV: 49°; near 0.05; far 160.
- Stool relationship: 0.42 m past the seat-centre plane, with no stool dominating the foreground.
- MacBook relationship: target remains centred near the verified MacBook/island anchor and presents a clear working-table overview.

## 14. Revised Ambient Rail

- Curve: centripetal Catmull-Rom with arc-length lookup (1024 divisions).
- Seven position points and seven target points are recorded in `revised-ambient-camera-path.json`.
- Length: 6.80857 m.
- Duration: 96,000 ms.
- Immediate-start profile: no hold, 0.35 initial speed factor, 900 ms ramp to cruise, then a 4000 ms gentle final settle.
- FOV progresses smoothly from 56° to 49°.

## 15. Path Safety

- Samples: 521.
- Invalid samples: 0.
- Corrections: 0.
- Minimum boundary clearance: 0.05 m.
- Minimum obstacle clearance: 0.61392 m.
- Minimum target clearance: 0.94946 m.
- Look radius range: 0.85936–4.62035 m.

## 16. End Handoff

The accelerated complete-run audit reached `TABLE_FREE_ORBIT`. FINAL_AMBIENT_DRIFT → TABLE_OVERVIEW and TABLE_OVERVIEW → TABLE_FREE_ORBIT both measured position 0, target 0, FOV 0, radius 0 and projection-matrix 0 maximum difference. Quaternion angular difference was only `2.9802322387695312e-8` radians (floating-point noise). No canonical endpoint rewrite occurs after arrival.

## 17. TABLE_FREE_ORBIT

- Radius: 0.82–1.28 m.
- Polar range: 0.88–1.18 rad.
- Pan disabled; zoom and rotate enabled only after arrival.
- 720 azimuth samples × 3 radii × 3 polar samples = 6480 checks.
- Result: 6480/6480 safe, 0 invalid; minimum obstacle clearance 0.29236 m and minimum boundary clearance 1.18445 m.

## 18. Reflection

The accepted Stage 3.4 material/reflection appearance is unchanged. During drift, the reflection source and blur use the existing camera-state-aware slow cadence (12 Hz target). After arrival with a stationary camera the cadence returns to static/zero; manual table orbit switches to the orbit cadence. No lighting, floor BRDF, texture or reflection-strength value was changed.

## 19. Reduced Motion

When `prefers-reduced-motion` is active (or debug override is REDUCE), automatic drift does not start. The Room Wide start remains available as a constrained manual view. No audio autoplay behavior is used to force camera motion, and debug ALLOW can explicitly test the rail without altering production preference handling.

## 20. Performance

At 1280×720 on the local test browser during entry drift: 60 FPS, 99 draw calls and 780,688 rendered triangles. The 20× complete-run test finished the 96-second logical path in 4810.4 ms with zero paused-frame time and a clean handoff. DPR 2 capture remained Scene Ready (43 FPS observed in the capture case). No asset, material, lighting or geometry performance configuration changed.

## 21. Regression

- Radio: world/screen panel architecture and pause reason integration preserved.
- Audio controls: Play/Pause/Stop/track selection paths preserved; entry orchestration uses the same controller.
- Route exit: `/studio-v1` loaded successfully, and returning to Studio V2 succeeded.
- Visibility: existing hidden/blur pause reasons remain wired.
- Floor reflection: accepted Stage 3.4 configuration and state-aware cadence preserved.
- Scene Ready: all critical conditions reached READY; audio remains non-blocking.
- Resize: 900×700 responsive start and endpoint were visually verified; viewport override was reset.
- DPR: DPR 2 capture reached Scene Ready.

## 22. Files Changed

Current uncommitted camera-director working set:

- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/studioV2AudioController.js`
- `src/studio-v2/studioV2AmbientCamera.js`
- `src/studio-v2/studioV2CameraDirector.js`
- `src/studio-v2/studioV2CameraPoses.js`
- `src/studio-v2/studioV2CameraSafetyVolume.js`
- `src/studio-v2/studioV2FloorReflection.js`
- `docs/reviews/fred-studio-v2-camera-director-stage4b-2/` (this report, 20 required PNG files and 8 JSON audits)

The safety-volume and floor-reflection files contain preserved Stage 4B/4B.1 work; this task did not overwrite that baseline.

## 23. Evidence

All evidence is in `docs/reviews/fred-studio-v2-camera-director-stage4b-2/`: `01-stage4b1-current-path.png` through `20-final-official-route.png`, plus `entry-audio-audit.json`, `entry-camera-timing.json`, `ambient-camera-elevation-audit.json`, `stool-row-audit.json`, `revised-ambient-camera-path.json`, `revised-path-safety.json`, `revised-table-orbit-safety.json`, and `stage4b2-performance.json`.

## 24. Build

- `npm run build`: PASS. Existing generic chunk-size warning only.
- `git diff --check`: PASS.
- Official console: no new errors; only the existing Three.js `PCFSoftShadowMap` deprecation warning was observed.
- Debug console: no new scene/camera errors; same existing shadow-map deprecation warning.
- Deterministic audio-controller allowed/blocked-path test: PASS.

## 25. Git

- Branch: `feat/fred-studio-v2-ambient-camera-drift`.
- Worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`.
- Staged status: no staged files.
- Stage 4A checkpoint history remains unchanged.

NO COMMIT
NO PUSH
NO MERGE
NO DEPLOY
STAGE 4A CHECKPOINT UNCHANGED

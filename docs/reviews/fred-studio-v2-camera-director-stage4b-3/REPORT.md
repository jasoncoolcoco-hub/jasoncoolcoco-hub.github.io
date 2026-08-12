# Fred Studio V2 — Camera Director Stage 4B.3 Final Production Acceptance

## 1. Status

**NEEDS USER REVIEW**

The visual endpoint, revised rail, real 1× duration, locked drift, exact handoff and TABLE_FREE_ORBIT safety are ready for review. Human audio listening and target-specific Marshall/Radio first-click listening remain intentionally open.

## 2. Stage 4B.2 Preserved

All five approved changes remain: best-effort soft entry audio; camera motion on the first complete visible frame; fully locked Ambient Drift; elevated rail; and an endpoint physically beyond the stool plane. The `0.35` initial speed, `900 ms` ramp, `96,000 ms` logical duration, no-head-look contract, Scene Ready gate and SLOW reflection cadence are unchanged.

## 3. Current Endpoint Problem

The reference endpoint was position `[0.42, 2.12, 0.20]`, target `[0.96, 1.50, -0.05]`, FOV `49°`, look radius `0.85936 m`, downward angle `46.1757°`, and MacBook width `35.685%`. It read as an early MacBook Focus because the table filled the frame and room context collapsed.

## 4. TABLE_OVERVIEW Candidates

| Candidate | Position | Target | FOV | Radius | Down angle | Past stools | Mac width | Mac height | Visible stools | Visible island | Visible kitchen proxy |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CURRENT_CLOSE | `[0.42,2.12,0.20]` | `[0.96,1.50,-0.05]` | 49° | 0.859360 m | 46.1757° | +0.42 m | 35.685% | 58.470% | 49.990% | 100.000% | 67.488% |
| OVERVIEW_A | `[0.42,2.14,0.95]` | `[0.96,1.40,-0.08]` | 49° | 1.378441 m | 32.4687° | +0.42 m | 19.851% | 36.580% | 25.710% | 82.459% | 68.089% |
| OVERVIEW_B | `[0.48,2.16,1.12]` | `[1.30,1.43,-0.12]` | 50° | 1.656170 m | 26.1534° | +0.48 m | 17.351% | 32.629% | 13.021% | 67.971% | 75.468% |
| OVERVIEW_C | `[0.42,2.22,1.65]` | `[0.96,1.42,-0.20]` | 52° | 2.086648 m | 22.5438° | +0.42 m | 10.760% | 20.551% | 21.299% | 44.180% | 53.462% |

All candidates were runtime-safe. Percentages for stools/island/kitchen are viewport-clipped projected proxy rectangles, not pixel segmentation; exact Box3 and safety details are in `table-overview-composition-audit.json`.

## 5. Selected TABLE_OVERVIEW

Selected `OVERVIEW_B`:

- position `[0.48, 2.16, 1.12]`;
- target `[1.30, 1.43, -0.12]`;
- quaternion `[-0.2166689962, -0.2805296861, -0.0651610537, 0.9327977693]`;
- FOV `50°`;
- look radius `1.656170 m`;
- downward angle `26.1534°`;
- stool-plane distance `+0.48 m`;
- MacBook projected rectangle `222.095 × 234.928 px`, or `17.351% × 32.629%` of the 1280×720 viewport.

The island remains the primary foreground anchor, the kitchen and window-side room context remain visible, and the MacBook is legible without approaching the future 75–82% Focus target.

## 6. Revised Final Rail

Only control points 5 and 6 of seven position and target points changed; indexes 0–4, approximately the first 71.4%, remain untouched. The selected centripetal Catmull–Rom arc is `7.09862 m`, duration `96,000 ms`, with smoothstep FOV progression from `56°` to `50°`. The last 10 seconds settle laterally/depth-wise with no sudden vertical drop, pitch dive, FOV jump or rapid MacBook enlargement.

## 7. Path Safety

The rail used `641` samples: `0` invalid, `0` corrections, no exterior leak. Minimums:

- wall/volume: `0.05 m` at progress `0`, position `[-6.38,2.18,0.36]`, the accepted ROOM_WIDE_START left-wall boundary only;
- ceiling: `1.21796 m`;
- floor: `2.01946 m`;
- glass: `2.14 m`;
- sloped ceiling: `2.06888 m`;
- stools: `1.00575 m`;
- island and minimum obstacle: `0.76108 m`;
- target: `0.87946 m`;
- near-plane clearance: `1.43325 m`.

The previous `0.05 m` minimum does not occur on the elevated route or near the ceiling.

## 8. End Handoff

Final Ambient → TABLE_OVERVIEW and TABLE_OVERVIEW → TABLE_FREE_ORBIT both recorded `0` position, target, FOV, quaternion-angle and projection-matrix differences. No safety correction occurred after arrival.

## 9. TABLE_FREE_ORBIT

Mathematical sweep: `6480` samples, radii `[1.45, 1.775, 2.10] m`, polar angles `[0.9, 1.075, 1.25] rad`, `720°` primary sampled coverage, `0` invalid, minimum boundary `0.76462 m`, minimum obstacle `0.36722 m`. Pan remains disabled. A real horizontal drag changed camera position from `[0.48,2.16,1.12]` to `[0.0846,2.1159,0.7718]` with target unchanged, no clamp and volume safety true.

## 10. Real 1× Run

Official route, speed `1×`, no scrub or multiplier:

- Scene Ready: `744.8 ms` after load start;
- Entry / active drift start: `1177.8 ms`;
- first camera motion: `1193.4 ms` (`15.6 ms` after Entry);
- stool-plane crossing: elapsed `85,649.4 ms`;
- final settle start: elapsed `92,015.9 ms`;
- active unpaused duration: `96,014.9 ms`;
- difference from target: `+14.9 ms`, inside `±500 ms`;
- paused-frame time: `0 ms`;
- endpoint handoff: exact, no snap.

Only one completed real 1× acceptance run was used after recovery; it was not repeated.

## 11. Locked Drift

Horizontal drag, vertical drag, wheel and keyboard input were attempted during Ambient Drift. State remained `AMBIENT_DRIFT`, input owner remained `CAMERA_DIRECTOR`, yaw/pitch remained `0`, orbit remained disabled and the rail continued unpaused. The automation surface did not expose a trusted pinch primitive; touch remains on the human checklist. TABLE_FREE_ORBIT drag worked afterward.

## 12. Entry Audio

- Direct load in both test environments: `AUTOPLAY_POLICY_BLOCKED`, paused, currentTime `0`, volume `0`, fallback armed.
- In-app browser trusted pointer: `AUDIO_PLAYBACK_FAILED`; fallback was consumed/removed and the failure stayed contained in controller state with no unhandled rejection.
- Chrome trusted pointer: `blocked → playing-after-gesture`; currentTime advanced `0.931 → 3.324 → 5.451 s`; volume ramped `0.043205 → 0.078962 → 0.08`; ramp-owner count `1 → 0`; fallback listener stayed removed.
- Marshall-first and Radio-first target automation was stopped after browser control was interrupted and was not retried indefinitely. Source audit confirms one audio element, capture-phase shared fallback, the `<300 ms` double-toggle guard and conditional `TAP TO START AUDIO` status.
- No audible-sound claim is made. **AUTOMATED AUDIO DEVICE / HUMAN AUDIBILITY NOT VERIFIED — HUMAN LISTENING REVIEW REQUIRED.**

## 13. Responsive Views

At 1280×720, 1440×900, 1280×800, 1024×768 and 1600×900 the MacBook stayed visible and unclipped; measured width ranged `17.351–23.135%`, the island/kitchen context remained, stools did not dominate and every safety inspection passed. The DPR-cap=2 route was captured, but the automated runner reported effective device DPR `1`; true DPR 2 remains a manual device check rather than a fabricated pass.

## 14. Reflection

No reflection code was changed in Stage 4B.3. The real 1× live audit observed source `10.6 Hz` and blur `10.7 Hz`, matching SLOW `12 Hz` intent. Static remains `0 Hz`; TABLE_FREE_ORBIT target remains `18 Hz`. No new render loop or reflection target was added.

## 15. Performance

Current real 1× sample at 1280×720 DPR 1: `60 FPS`, `61` draw calls and `425,476` rendered triangles. The accepted same-pipeline percentile baseline remains average `60.01 FPS`, median `59.88 FPS`, 1% low `53.76 FPS`, p95 `18.2 ms` for slow camera; faster orbit baseline is average `60`, median `59.88`, 1% low `54.05`, p95 `18.11 ms`. These baseline values are explicitly referenced, not relabelled as a newly rerun suite. Audio had one ramp owner during fade and zero afterward.

## 16. Regression

Scene Ready stayed atomic; official route stayed clean; debug/capture candidates stayed isolated; camera motion began immediately; locked drift, route visibility, resize and five responsive sizes passed; reduced-motion and Radio pause/resume architecture were preserved from 4B.2; the selected endpoint and TABLE_FREE_ORBIT passed. DPR 2 hardware rendering and audible Marshall/Radio listening remain manual acceptance items. No lighting, floor material, reflection shader, model, material or object placement was changed.

## 17. Files Changed

Current tracked/untracked Studio V2 implementation scope:

- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/createStudioV2RadioPanel.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/studioV2AmbientCamera.js`
- `src/studio-v2/studioV2AudioController.js`
- `src/studio-v2/studioV2CameraDirector.js`
- `src/studio-v2/studioV2CameraPoses.js`
- `src/studio-v2/studioV2CameraSafetyVolume.js`
- `src/studio-v2/studioV2FloorReflection.js` (preserved earlier accepted work; not reopened in 4B.3)
- this Stage 4B.3 review directory.

Unrelated legacy review folders and `public/models/fred-studio-v2/objects/imac_2021.glb` remain untouched and untracked.

## 18. Evidence

All evidence is under `docs/reviews/fred-studio-v2-camera-director-stage4b-3/`:

- screenshots `01` through `20` exactly as requested;
- `table-overview-composition-audit.json`;
- `stage4b3-revised-path.json`;
- `stage4b3-path-safety.json`;
- `stage4b3-end-handoff.json`;
- `stage4b3-table-orbit-safety.json`;
- `stage4b3-real-1x-timing.json`;
- `stage4b3-audio-browser-audit.json`;
- `stage4b3-performance.json`;
- `audio-manual-acceptance.md`.

## 19. Build

- `npm run build`: PASS; only the existing generic `>500 kB` chunk warning remains.
- `git diff --check`: PASS.
- Official and capture/debug routes completed without new application console errors during the recorded runs.
- The in-app audio failure was handled as controller state (`AUDIO_PLAYBACK_FAILED`), not an unhandled exception.

## 20. Git

- branch: `feat/fred-studio-v2-ambient-camera-drift`;
- worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`;
- accepted Stage 4A checkpoint remains `8ad143e003cd384339d17816aed3f77869010c39`;
- staged files: none;
- Stage 4B/4B.1/4B.2/4B.3 remain uncommitted, unpushed, unmerged and undeployed.

**NO COMMIT**
**NO PUSH**
**NO MERGE**
**NO DEPLOY**
**STAGE 4A CHECKPOINT UNCHANGED**

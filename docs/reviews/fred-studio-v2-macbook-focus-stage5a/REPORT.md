# Fred Studio V2 — Stage 5A MacBook Focus Camera

## 1. Status

PASS — USER VISUAL REVIEW ACCEPTED

Stage 5A.1 integration and final-gate results are recorded in `../fred-studio-v2-macbook-focus-stage5a-1/REPORT.md`.

## 2. Stage 4B Checkpoint

- Commit: `c844db743d2e527aa2e757a5ab92a6c7f709c05e`
- Message: `feat: complete Fred Studio ambient entry camera`
- Remote: `origin/feat/fred-studio-v2-ambient-camera-drift`
- Local and remote SHA match: YES

## 3. MacBook Display Audit

- Semantic target: `MACBOOK_DISPLAY_TARGET`
- Audited display mesh: `Object_6`, hierarchy `Ecran_6/Object_6`
- Complete MacBook world bounds: `0.2500 × 0.2500 × 0.3557 m`; centre `[0.961, 1.540, -0.050]`
- Display rectangle: approximately `0.3557 × 0.2444 m`, aspect `1.4554`
- Display centre: approximately `[1.08424, 1.54279, -0.05000]`
- Display normal/up/right: recorded in `macbook-display-geometry.json`
- Hinge `Object_8` and deck `Object_4` remain unchanged and are not used as the focus target.
- Table surface remains at `y = 1.415 m`.

## 4. Focus Pose Solver

- Target width occupancy: `78%` (`75–82%` acceptance range)
- Solver inputs: real display quad, display normal, camera FOV, viewport aspect and target occupancy.
- Focus FOV: `47°`; near: `0.025 m`; far unchanged.
- Distance varies by aspect ratio (approximately `0.298–0.397 m`), and is independent of DPR.
- Final approach retains a small perspective angle; measured skew is approximately `1.05–1.068`.

## 5. Focus Path

- Enter duration: `1500 ms`.
- Easing: existing Camera Director cubic ease-in/out; no spring, bounce or overshoot.
- Start pose is the current live TABLE_FREE_ORBIT pose; no TABLE_OVERVIEW snap.
- A restrained elevated/front-side quadratic control point is used because direct interpolation from side/opposite orbits can cross the MacBook bounds.

## 6. Safety Corridor

- Architecture: `STATE_SPECIFIC_MACBOOK_FOCUS_CORRIDOR`.
- 121 path samples per request.
- Final audited minimums: boundary `1.34 m`, MacBook bounds `0.0496 m`, table `0.1325 m`, display centre `0.2984 m`.
- Normal island/stool orbit colliders are bypassed only within the focus corridor; floor, ceiling, walls, glass, exterior, table, display and MacBook guards remain active.
- Focus near plane: `0.025 m`; normal `0.05 m` is restored on exit.

## 7. Final MACBOOK_FOCUS

- 1280×720 position: `[0.78644, 1.54746, -0.03362]`
- Target: `[1.08424, 1.53912, -0.05000]`
- FOV: `47°`
- Actual display width: `78%`; complete bezel, aluminium edge, deck and room context remain visible.
- Camera fixed; Orbit rotation, zoom and pan remain disabled.

## 8. Exit

- Escape: PASS.
- Outside screen click/tap: PASS.
- Future API: `closeMacbookFocus(source)`.
- Every exit resolves exactly to TABLE_OVERVIEW position `[0.48, 2.16, 1.12]`, target `[1.30, 1.43, -0.12]`, FOV `50°`, then enables TABLE_FREE_ORBIT.

## 9. Input Ownership

- Pointer intent threshold: `5 px`; an orbit drag does not focus.
- One transition owner: `CAMERA_DIRECTOR`; owner count never exceeds one.
- Duplicate focus requests are rejected while a transition/focus state owns input.
- Focus can be interrupted by Escape/outside click and converges to canonical exit.
- Radio SCREEN_PLAYER blocks entry; Radio source code and approved behavior remain unchanged.
- Rapid exit/re-click test converged to `TABLE_FREE_ORBIT`, owner count `0`, controls restored; no queued duplicate transition or deadlock.

## 10. Reflection

- Enter/exit transitions reuse `FAST` cadence, capped by the existing floor system at `22 Hz`.
- MACBOOK_FOCUS static returns to `0 Hz`; no new render/reflection pass was added.
- Reflection appearance and parameters are unchanged.

## 11. Reduced Motion

- Debug simulation and media preference use a restrained `200 ms` enter/exit without the quadratic sweep.
- Access remains available; the final focus composition is identical.

## 12. Responsive

All required DPR 1 viewports solve to `78%` width: 1280×720, 1440×900, 1280×800, 1024×768 and 1600×900. The selected browser backend did not expose a real DPR 2 override (it continued reporting DPR 1), so DPR 2 is recorded as unavailable rather than falsely claimed. The solver is DPR-independent because it consumes CSS viewport dimensions only. See `macbook-focus-responsive.json` and the responsive contact sheet.

## 13. Future Stage 5B Contract

- `getMacbookDisplayContract()` exposes world quad, screen-space quad, semantic axes, solved pose, active state, transition progress and screen-interaction readiness.
- `getMacbookDisplayProjection()` returns current projected measurements.
- `subscribeMacbookFocus(listener)` provides focus-state updates.
- `requestMacbookFocus()` and `closeMacbookFocus()` are the only camera entry/exit interfaces.
- No homepage, iframe, DOM screen content, project, resume or desktop UI was added.

## 14. Performance

- 1280×720 DPR 1 Focus-static sample: average/median `58 FPS`, p95 frame time approximately `17.24 ms`.
- Static Focus: `58` draw calls, `425,460` rendered triangles, reflection `0 Hz`.
- Transition reflection cadence: `FAST`, maximum target `22 Hz`; static cadence: `0 Hz`.
- No new rendering pass.

## 15. Regression

- Scene Ready unchanged and reaches READY.
- Accepted Ambient Camera rail/duration/entry behavior unchanged.
- Radio and Marshall audio continue; audio state/currentTime/volume are not mutated by Focus.
- Floor reflection look unchanged; resize re-solves the camera pose and the solver has no device-pixel-ratio input.
- Official and debug routes show no new console errors. Existing Three.js PCFSoftShadowMap deprecation warning remains generic/pre-existing.
- Route disposal releases pointer/keyboard subscriptions and the focus instance.
- Audio playback is not paused/restarted and no Focus code writes `currentTime`, volume or track selection.

## 16. Files Changed

- `src/studio-v2/studioV2MacbookFocus.js` (new)
- `src/studio-v2/studioV2CameraDirector.js`
- `src/studio-v2/studioV2CameraPoses.js`
- `src/studio-v2/studioV2CameraSafetyVolume.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `docs/reviews/fred-studio-v2-macbook-focus-stage5a/*` (new evidence/report)

No Lighting, Tone Mapping, Exposure, Floor Reflection appearance, Ambient rail, entry audio, Radio Panel, Marshall audio, geometry, object transform, TABLE_OVERVIEW, Scene Ready or model asset was changed.

## 17. Evidence

The review directory contains all 15 required PNGs and five required JSON audits. Contact sheets show 0/25/50/75/100% entry and exit progress. Official captures contain no debug panel.

## 18. Build

- `npm run build`: PASS (existing generic chunk-size warning only)
- `git diff --check`: PASS
- Official console: no new errors
- Debug console: no new errors

## 19. Git

- Stage 4B checkpoint: COMMITTED AND PUSHED
- Stage 5A branch: `feat/fred-studio-v2-macbook-focus`
- Stage 5A checkpoint message: `feat: complete Fred Studio Stage 5A desk interactions`
- Stage 5A checkpoint SHA: recorded from the resulting local and remote branch HEAD in the final delivery report
- Stage 5A push target: `origin/feat/fred-studio-v2-macbook-focus`
- Known unrelated untracked floor-reflection/placed-object evidence and `imac_2021.glb` remain untouched.

STAGE 4B: **COMMITTED AND PUSHED**

STAGE 5A: **FINAL GATE PASS · NO MERGE · NO DEPLOY**

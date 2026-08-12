# Fred Studio V2 — Camera Director Stage 4B

## 1. Status

NEEDS USER REVIEW

## 2. Stage 4A Checkpoint

- Commit: `8ad143e003cd384339d17816aed3f77869010c39`
- Message: `feat: add Fred Studio camera director foundation`
- Remote branch: `origin/feat/fred-studio-v2-camera-director`
- Local and remote commit SHAs matched after push.

## 3. ROOM_WIDE_START

- Position: `[-6.38, 1.96, 0.36]`
- Target: `[-1.8, 1.52, 0.12]`
- Quaternion: `[-0.0346760810, -0.6875697662, -0.0329065704, 0.7245429895]`
- FOV: `56°`
- Orbit radius: `4.607342 m`

The pose widens the accepted opening by changing the look target and FOV while
remaining in front of the accepted left/rear safety plane. It does not move the
camera behind the room shell. The opening retains the kitchen/island,
Marshall/Guitar, lounge edges and window daylight without exposing an invalid
wall edge or using an ultra-wide lens.

## 4. TABLE_OVERVIEW

- Position: `[-1.15, 1.82, 0.25]`
- Target: `[0.96, 1.38, -0.05]`
- Quaternion: `[-0.0767481102, -0.6520591795, -0.0666079137, 0.7513267863]`
- FOV: `50°`
- Orbit radius: `2.176166 m`
- Minimum sampled boundary clearance for the table orbit: `1.0738 m`
- Minimum sampled obstacle clearance for the table orbit: `0.06455 m`

The MacBook is clearly readable on the island without becoming a focus shot.
The island, stools and kitchen retain context. This exact pose is stored as the
canonical `TABLE_OVERVIEW` and `TABLE_FREE_ORBIT` entry and is the future return
contract for MacBook Focus.

## 5. Ambient Path

- Curve: centripetal Catmull–Rom, sampled with arc-length `getPointAt` lookup.
- Arc-length divisions: `1024`.
- Total camera travel: `5.23471 m`.
- Official duration: `96,000 ms`.
- Start hold: `1,800 ms` after Scene Ready.
- Start ease: `3,000 ms`; end ease: `4,000 ms`.
- FOV: continuous smoothstep from `56°` to `50°`.
- Position and target control points are recorded in
  `ambient-camera-path.json`.

The start/end timing changes speed continuously while the middle section runs
at constant distance velocity. Position, target and FOV are owned by one Camera
Director update; OrbitControls cannot displace the rail.

## 6. Path Safety

- Samples: `321`.
- Invalid samples: `0`.
- Required corrections: `0`.
- Minimum boundary clearance: `0.05 m`.
- Minimum obstacle clearance: `0.96675 m`.
- Minimum target-volume clearance: `0.82946 m`.
- Exterior leak: none in the fixed path review.

Safety sampling is precomputed against the accepted convex half-space interior
volume, sloped ceiling, target volume, island/stools and approved major obstacle
boxes. No per-frame full collision resampling was added.

## 7. State Flow

Official flow:

`ROOM_WIDE_START → AMBIENT_DRIFT → AMBIENT_USER_OVERRIDE → AMBIENT_DRIFT → TABLE_OVERVIEW → TABLE_FREE_ORBIT`

`AMBIENT_USER_OVERRIDE` is optional and temporary. `TABLE_OVERVIEW` is applied
exactly before enabling `TABLE_FREE_ORBIT`; the arrival pose, target and FOV are
preserved across the handoff.

## 8. User Override

- Yaw limit: `-25° / +25°`.
- Pitch limit: `-10° / +12°`.
- Drag activation threshold: `5 px`.
- Camera position: frozen at the saved rail point.
- Rail progress: frozen for the full override and return.
- Implementation: reusable spherical head-look offsets around a `3.2 m`
  virtual look target; no OrbitControls position orbit, pan, zoom or roll.

Debug tests at approximately 20%, 50% and 80% retained the saved rail position
and progress while applying bounded yaw/pitch offsets.

## 9. Idle Return

- Idle delay after pointer release: `2,000 ms`.
- Return duration: `800 ms`.
- Easing: cubic ease-in-out.
- Completion: exact base rail target and FOV are restored, then drift resumes
  from the frozen percentage.
- Re-interruption: a new valid background drag cancels the current return and
  starts from the currently displayed head-look offsets.

## 10. UI / Visibility Pause

- `SCREEN_PLAYER` open adds the `RADIO_PANEL` pause reason.
- Closing starts one `2,000 ms` resume delay on the open→closed edge; repeated
  Radio state publications do not extend it.
- Audio playback/selection is unchanged and does not start automatically.
- `document.hidden` and window blur add independent pause reasons.
- Returning visible uses a `250 ms` settle delay.
- Paused time is never added to `driftElapsedMs`, so there is no catch-up jump.
- Route disposal removes all pointer, keyboard, visibility, focus and media
  listeners. Route re-entry creates a fresh Director at `ROOM_WIDE_START`.

## 11. Reduced Motion

When `prefers-reduced-motion: reduce` is active, the official route remains at
`ROOM_WIDE_START` and never arms automatic drift. The accepted wider manual
profile becomes available through the existing Explore action. Debug provides
`AUTO`, `REDUCE` and `ALLOW` overrides; Debug speed settings never affect the
official route.

## 12. TABLE_FREE_ORBIT

- Target: `[0.96, 1.38, -0.05]`.
- Radius: `1.85–2.25 m`.
- Polar range: `1.28–1.46 rad`.
- Azimuth: continuous unbounded wrapping after a successful full sweep.
- Rotate speed: `0.36`.
- Zoom speed: `0.5`.
- Damping factor: `0.14`.
- Pan: disabled.
- Target-height bounds: `1.32–1.46 m`.
- Safety audit: `3` radii × `3` polar values × `360` azimuth samples = `3240`.
- Invalid samples: `0`; primary safe coverage: `360°`; excluded sector: none.

Four visual azimuth samples were reviewed. The camera remained inside the room,
above the island/stools exclusion volumes and did not cross floor, ceiling,
wall or glass limits. Because the complete sweep was safe, continuous wrapping
was enabled instead of imposing an artificial `-π/+π` seam.

## 13. Reflection Integration

The accepted floor-reflection implementation is unchanged. During drift it
automatically entered `FAST / 22 Hz`; the sampled observed source and blur rate
was `20 Hz`. At rest it returns to `STATIC / 0 Hz`. There is still one reflection
ownership loop and one paired blur update path.

## 14. Scene Ready

Scene Ready, loading cover and shader warm-up are unchanged. The Director pose
is installed before the first complete visible frame. The official route then
holds that complete `ROOM_WIDE_START` frame for `1.8 s`; no entrance animation,
fade, title or camera jump was added.

## 15. Visual Result

- Opening: wider and calmer, with balanced room anchors and no fisheye effect.
- Path: slow lateral approach with stable target motion and continuous FOV.
- Arrival: exact island/MacBook overview with no final snap.
- Table orbit: continuous safe sweep with a dedicated radius/polar profile.

## 16. Performance

Standard Debug viewport: `1280×720`, DPR `1`.

| State | FPS | Draw calls | Rendered triangles |
| --- | ---: | ---: | ---: |
| ROOM_WIDE_START | 57 | 99 | 780,688 |
| AMBIENT_DRIFT | 58 | 99 | 780,688 |
| AMBIENT_USER_OVERRIDE | 59 | 59 | 425,462 |
| RETURN_TO_RAIL | 59 | 59 | 425,462 |
| TABLE_FREE_ORBIT | 55 | 62 | 415,340 |

View-dependent draw/triangle counts change with frustum and reflection cadence.
No per-frame curve allocation, resampling, full collision raycast or duplicate
camera/reflection loop was introduced.

## 17. Regression

- Radio SCREEN_PLAYER: opens, pauses rail, closes and resumes after one delay.
- Audio: selection, playing/paused state and no-autoplay contract preserved.
- Floor reflection: fixed implementation and adaptive cadence preserved.
- Official route: no camera debug UI or helper geometry.
- Debug route: camera state, scrub, speed, safety and helpers remain debug-only.
- `/studio-v1`: loaded during regression and remained isolated.
- Route re-entry: reset to `ROOM_WIDE_START`.
- Viewport/DPR: reviewed at the standard `1280×720` DPR 1 baseline and the
  existing DPR/resize code path remains unchanged.

## 18. Files Changed

- `src/studio-v2/studioV2AmbientCamera.js`
- `src/studio-v2/studioV2CameraDirector.js`
- `src/studio-v2/studioV2CameraPoses.js`
- `src/studio-v2/studioV2CameraSafetyVolume.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `docs/reviews/fred-studio-v2-camera-director-stage4b/` evidence and report.

## 19. Evidence

- `01-stage4a-opening.png`
- `02-room-wide-start.png`
- `03-opening-comparison.png`
- `04-ambient-path-debug.png`
- `05-path-contact-sheet.png`
- `06-full-drift-arrival.png`
- `07-user-override-contact-sheet.png`
- `08-idle-return-contact-sheet.png`
- `09-return-reinterruption.png`
- `10-radio-pause-resume.png`
- `11-table-overview.png`
- `12-table-free-orbit-contact-sheet.png`
- `13-table-safe-azimuth.png`
- `14-reduced-motion.png`
- `15-final-official-room-wide-start.png`
- `16-final-official-table-overview.png`
- `ambient-camera-path.json`
- `table-orbit-safety.json`
- `ambient-drift-performance.json`

## 20. Build

- `npm run build`: PASS (existing generic chunk-size warning only).
- `git diff --check`: PASS.
- Official route console: no task-related error observed.
- Debug route console: no task-related error observed.

## 21. Git

STAGE 4A:

COMMITTED AND PUSHED

STAGE 4B:

NO COMMIT
NO PUSH
NO MERGE
NO DEPLOY

Current branch: `feat/fred-studio-v2-ambient-camera-drift`.

## Stage 4B.1 Production Hardening

Status: **NEEDS USER REVIEW**

### Arrival continuity

The rail endpoint, canonical `TABLE_OVERVIEW` and first
`TABLE_FREE_ORBIT` frame now pass through three separately rendered states.
The latter two preserve the live final rail pose instead of recalculating a
visually equivalent pose during the handoff. The captured endpoint audit found
zero difference for position, target, quaternion angle, FOV, orbit radius and
all projection-matrix elements across both boundaries. The acceptance limits
were `0.0001` for position, target and FOV and effectively zero quaternion
rotation.

Debug scrub semantics are explicit: `99.9%` is a frozen final rail sample,
`100%` is exact `TABLE_OVERVIEW`, and `TABLE_FREE_ORBIT` requires its separate
button. Capture-only `cameraProgress` is an evidence fixture and is not used by
the official route.

The real official 1× path completed with `96015.8 ms` active wall time against
the configured `96000 ms`, with `0 ms` pause accumulation. This is within the
required ±500 ms tolerance. The official route exposed no visible camera or
debug UI.

### User override and return

At 50% rail progress the base, yaw `−20°`, yaw `+20°`, pitch `−8°`, pitch
`+10°` and combined `+18°/+8°` samples retained the same camera position
`[-3.765, 1.9245, 0.2826]`, the same rail progress `0.5`, and frozen progress
`0.5`; only the displayed target changed. Smaller combined samples froze at
exactly `0.2` and `0.8`.

The nine-frame real idle-return sequence preserves the frozen rail base and
uses the existing 2000 ms idle plus 800 ms return. The deterministic debug-only
50% return fixture was re-interrupted successfully: owner changed to
`DEBUG_HEAD_LOOK`, input type to `DEBUG_REINTERRUPT`, return progress cleared,
and rail/frozen progress remained `0.5`.

Pointer ownership remains ordered before head-look: all placed-object meshes
(MacBook, Marshall and guitar) plus the world Radio group are registered in the
camera interaction target set; DOM player controls do not dispatch through the
renderer canvas; a background click without more than 5 px movement remains a
candidate only; movement must cross the existing 5 px threshold before the
camera claims `USER_HEAD_LOOK`.

### Reflection cadence

The accepted reflector target sizes, paired two-pass blur, floor shader,
material constants and final floor appearance are unchanged. Cadence ownership
still uses one render loop and updates source plus blur together. Only the
classification/rates changed:

- static: `0 Hz`;
- ambient drift: `SLOW / 12 Hz` target;
- head-look and return: `HEAD_LOOK / 15 Hz` target;
- TableFree orbit: `ORBIT / 18 Hz` target;
- explicit camera transitions: `FAST / 22 Hz` target.

The final 30-second official 1× drift sample observed an average `10.8 Hz`,
median interval `98.7 ms`, maximum interval `101.3 ms`, and `SLOW` on every
sample. Source and blur counts remained paired. A separate static sample
reported `STATIC / 0 Hz` with zero update-count delta.

### Responsive and TableFree verification

RoomWide and TableOverview were captured at `1280×720`, `1440×900`,
`1280×800`, `1024×768`, and `1600×900` at DPR 1, plus `1440×900` at DPR 2.
No canonical camera pose was changed for responsive correction.

The real TableFree pose audit covered 15 rendered samples across radii
`1.85`, `2.05` and `2.25 m`, both azimuth directions and alternating radius
while rotating. All samples were volume-safe. The exhaustive retained safety
audit remains `3240/3240` valid with minimum obstacle clearance `0.06455 m`.

Reduced-motion behavior remains official-route safe: the automatic rail is not
armed, `ROOM_WIDE_START` uses the bounded manual profile, and no debug UI is
required or exposed.

### Performance and regression

Final official drift sample at `1280×720`, DPR 1: `60 FPS`, `87` draw calls,
`636,514` rendered triangles. Counts remain view-dependent.

- Scene Ready/loading/warm-up: unchanged.
- Marshall audio and Radio panel controller: unchanged.
- MacBook interaction: unchanged.
- Lighting, materials, camera poses and floor appearance: unchanged.
- `/studio-v1`: isolated from all Stage 4B.1 code paths.
- Production build: PASS (existing generic chunk-size warning only).
- `git diff --check`: PASS.

### Stage 4B.1 evidence

- `17-clean-official-path-contact-sheet.png`
- `18-end-handoff-contact-sheet.png`
- `19-endpoint-pose-diff.json`
- `20-override-directions-contact-sheet.png`
- `21-override-freeze-proof.json`
- `22-idle-return-real-contact-sheet.png`
- `23-reinterruption-contact-sheet.png`
- `24-pointer-ownership-contact-sheet.png`
- `25-reflection-slow-cadence.png`
- `26-responsive-opening-contact-sheet.png`
- `27-responsive-table-contact-sheet.png`
- `28-table-360-real-orbit-contact-sheet.png`
- `29-full-duration.json`
- `30-final-official-room-wide.png`
- `31-final-official-table.png`
- `32-final-official-route.png`
- `reflection-30sec-audit.json`
- `responsive-audit.json`
- `table-orbit-real-audit.json`

### Git safety

Stage 4B.1: **NO COMMIT / NO PUSH / NO MERGE / NO DEPLOY**.

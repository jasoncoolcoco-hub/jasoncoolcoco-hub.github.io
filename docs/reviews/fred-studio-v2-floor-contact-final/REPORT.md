# Fred Studio V2 — Floor-Contact Camera Stability Report

Date: 2026-08-05  
Official route: `/studio-v2-import-test`  
Debug route: `/studio-v2-import-test?debug=1`

## Result

Floor-contact jitter is removed. The camera floor is now solved as a spherical-orbit constraint before final camera placement. The rectangular camera cage no longer performs a competing minimum-Y floor clamp, and keep-out projection no longer uses the Y axis.

The official route remains UI-free, preserves the approved opening position and composition, keeps pan disabled, retains immediate 360-degree horizontal viewing, and retains the previously approved narrow zoom range. The final opening PNG is byte-for-byte identical to the approved camera-stability reference (`SHA-256 d4ee1238…fad6ca`). Lighting, materials, model pruning, attribution, highlighting, and the visual presentation were not changed.

## Confirmed root cause

The previous floor path was:

1. OrbitControls applied polar input and damping.
2. Distance was clamped.
3. The rectangular camera cage clamped `camera.position.y` to its minimum.
4. Furniture keep-out projection and distance validation could alter the result again.
5. A last-valid fallback could replace the complete state.
6. OrbitControls was synchronized after correction, while the rejected spherical polar delta could still be requested by the next input/update.

The camera position could therefore be above the floor while OrbitControls still represented a downward-driving spherical state. Repeated updates produced the floor-contact feedback loop.

## Authoritative floor definition

The floor height was read from the actual imported floor mesh, not the environment sphere:

- mesh: `Plane_Material002_0`;
- material: `Material.002`;
- mesh bounds: minimum Y `-0.5386809291`, top surface Y `0.0205425931`.

| Setting | Final value |
| --- | ---: |
| `FLOOR_Y` | `0.0205425931` |
| Camera floor clearance | `0.70` |
| Target floor clearance | `0.53` |
| Floor angular epsilon | `0.004` radians |
| Minimum safe camera Y | `0.7205425931` |
| Minimum safe target Y | `0.5505425931` |

These values are centralized in `STUDIO_V2_FLOOR_SAFETY`.

## Final floor-handling order

1. Clamp or restore the target first; target Y cannot fall below the target-floor clearance.
2. Read candidate radius and polar angle from the camera-to-target offset.
3. Clamp radius to the active official/debug distance range.
4. Calculate the dynamic legal floor polar limit.
5. Clamp candidate `phi` before reconstructing the camera position.
6. Apply side-wall and ceiling cage constraints without a second floor-Y clamp.
7. Resolve furniture keep-outs deterministically using X/Z only.
8. Accept the complete valid state or retain the prior last-valid state once.
9. Synchronize OrbitControls and render only the accepted camera.

The formula is:

```text
minimumCameraY = FLOOR_Y + cameraFloorClearance
ratio = (minimumCameraY - targetY) / radius
dynamicMaxPolarAngle = acos(clamp(ratio, -1, 1))
safeMaxPolarAngle = min(configuredMaxPolarAngle, dynamicMaxPolarAngle - floorEpsilon)
```

The safe maximum is recalculated before each OrbitControls update and again from the actual candidate after target or radius changes.

## Blocked damping momentum

At floor contact, only illegal downward polar momentum is cancelled:

- `_sphericalDelta.phi` is cleared;
- dolly state responsible for the blocked candidate is cleared;
- target Y is already valid before the polar calculation;
- horizontal `_sphericalDelta.theta` is preserved;
- valid X/Z pan momentum is preserved on the debug route;
- damping is disabled only for the synchronization update and then restored.

This allows horizontal rotation to continue while the camera rests at the lower polar limit.

## Debug diagnostics

The debug route now reports:

- floor Y and both clearances;
- floor epsilon and minimum safe camera Y;
- current and candidate camera Y;
- target Y and orbit radius;
- current and dynamic maximum polar angles;
- active floor contact and downward-momentum cancellation;
- floor correction count and last floor candidate.

No floor diagnostics appear on the official route.

## Stress-test results

The clean final floor session combined 8 aggressive downward drags, 20 horizontal reversal actions at floor contact, 10 alternating zoom actions, and 6 held downward drags.

| Measurement | Result |
| --- | --- |
| Final camera Y | `0.7332` |
| Candidate camera Y | `0.7332` |
| Minimum safe Y | `0.7205` |
| Final radius | `3.2857` |
| Final polar angle | `1.8441` |
| Dynamic max polar | `1.8441` |
| Floor corrections | `6` |
| Last cancelled component | `POLAR.DOWN` |
| Blocked damping cleared | `YES` |
| Interior safe | `YES` |
| Five settled frame hashes | Identical |

Additional tests covered slow approach, 14 held downward inputs, 26 rapid downward/upward reversals, release with damping, horizontal rotation at floor contact, zoom close to the floor, trackpad-style wheel input, official full rotation, and the official lower polar limit.

## Boundary regressions

- Left/right/rear wall and glass stress: interior-safe; settled frames identical.
- Sofa keep-outs: interior-safe; no oscillation after release.
- Kitchen-island keep-out: interior-safe; no oscillation after release.
- Ceiling: remains interior-safe and settled frames are identical after release.
- Official route: 24 large rotation actions plus 20 narrow-zoom actions; settled frames identical.

The debug ceiling cage retains a very small existing tangential convergence under continued input (about `0.002` metres in the observed stress sequence), but it does not alternate vertically or continue after release.

## Remaining limitations

- Official Stage C pan remains intentionally disabled.
- Official zoom remains limited to the previously approved `0.36–0.48` range.
- Official polar viewing remains constrained to `1.30–1.70` radians.
- The broad debug route can reach wall, ceiling, and furniture constraints for reproduction, but it now uses the authoritative spherical floor solver.

## Verification

| Check | Result |
| --- | --- |
| Official opening composition | Restored and matched to the approved reference |
| Official route UI | `main > img` only |
| Floor candidate below safe Y | Not observed |
| Floor release oscillation | Not observed |
| Horizontal movement at floor | Passed; camera Y unchanged in focused test |
| Console errors | `0` |
| Production build | Passed — Vite, 501 modules transformed |

The existing Three.js `PCFSoftShadowMap` deprecation warning and Vite large-chunk advisory remain unrelated to this camera correction.

## Files modified

- `src/studio-v2/studioV2Config.js`
- `src/studio-v2/studioV2CameraSafety.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `docs/reviews/fred-studio-v2-floor-contact-final/REPORT.md`
- `docs/reviews/fred-studio-v2-floor-contact-final/interaction-trace.json`
- `docs/reviews/fred-studio-v2-floor-contact-final/01-official-opening-floor-safe.png`
- `docs/reviews/fred-studio-v2-floor-contact-final/02-debug-floor-diagnostics.png`

No coordinate-system, anchor, MacBook, photograph, or object-placement work was started. No commit, push, merge, or deployment was performed.

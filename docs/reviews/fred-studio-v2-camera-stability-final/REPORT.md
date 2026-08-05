# Fred Studio V2 — Camera Stability Final Report

Date: 2026-08-05  
Official route: `/studio-v2-import-test`  
Debug route: `/studio-v2-import-test?debug=1`

## Result

The official route now uses Stage B interaction: immediate 360-degree horizontal rotation plus a narrow safe zoom range. Pan and free target movement remain disabled. The accepted opening camera position, viewing direction, FOV, lighting, materials, model pruning, and UI-free presentation are unchanged.

Aggressive rotation, reversal, zoom, and polar-limit tests completed without a visible snap-back loop. Continued input at each zoom and polar boundary produced identical rendered-frame hashes. After 24 consecutive large rotations, the final 0.14 damping settles to identical sampled frames within 3.5 seconds.

## Confirmed jitter cause

The previous frame loop allowed OrbitControls and the custom safety cage to correct the same movement repeatedly:

1. OrbitControls applied the input and damping delta.
2. The safety code clamped target, camera bounds, furniture zones, and distance for up to five passes.
3. A furniture projection could change distance or enter another overlapping constraint.
4. The code cleared private OrbitControls deltas and called `controls.update()` again.
5. Remaining damping or the second update could request the blocked component again on the next frame.

This was most reproducible where the broad orbit, pan, and zoom ranges allowed the camera to reach the cage or overlapping furniture zones.

## Accepted update order

The final frame order is:

1. OrbitControls calculates the candidate movement.
2. Camera and target candidates are captured for diagnostics.
3. Target, zoom, camera bounds, and keep-out zones are validated once in a deterministic order.
4. Only a blocked axis is projected when a valid tangential movement remains possible.
5. If the one-pass result is still invalid, the complete last-valid state is retained.
6. Blocked OrbitControls deltas are cleared; damping is disabled only for the synchronization update and then restored.
7. The accepted camera and target are rendered once.

No invalid intermediate camera state is rendered.

## Official interaction settings

| Setting | Final value |
| --- | --- |
| Rotate | Enabled |
| Horizontal azimuth | Unlimited / 360° |
| Auto rotate | Disabled |
| Pan | Disabled |
| Zoom | Enabled, narrow range |
| Damping | Enabled, factor `0.14` |
| Fixed target | `[-6.001383, 1.889144, 0.2856]` |
| Camera radius | `0.36–0.48` metres |
| Polar range | `1.30–1.70` radians |

The fixed target lies on the original opening-camera sightline, 0.42 metres in front of the camera. This preserves the accepted opening composition while turning the orbit into a safe, near-first-person look-around. The complete permitted orbit capsule remains inside the loft cage and does not intersect the glass, floor, ceiling, sofas, coffee tables, or kitchen island.

## Last-valid state and blocked damping

The safety system now retains:

- last valid camera position;
- last valid target;
- last valid distance;
- requested camera and target before correction;
- last blocked request and boundary;
- cancelled movement components;
- whether damping was cleared.

Blocked momentum is removed by clearing OrbitControls spherical, pan, dolly, and scale deltas. Damping remains enabled during normal movement and is disabled only for the single synchronization update following a blocked candidate.

## Overlapping constraints

Two overlapping debug keep-out pairs were confirmed:

- `SOFA SOUTH` with `COFFEE TABLE SOUTH`;
- `SOFA NORTH` with `COFFEE TABLE NORTH`.

They are now resolved in declared order in one pass. A second projection cannot start a correction loop; any unresolved combination falls back once to the last-valid state. The official safe orbit capsule does not intersect these zones.

## Stress testing

Automated browser input covered:

- 24 repeated large horizontal rotations;
- 24 rapid horizontal direction reversals;
- 16 zoom-out and 16 zoom-in limit inputs;
- 20 rapid alternating zoom inputs;
- 14 repeated inputs against each polar boundary;
- debug-route cage, minimum-distance, and damping-cancellation reproduction;
- continued rendering after input release to detect oscillation or snap-back;
- official-route DOM and console inspection.

The detailed automated record is in `interaction-trace.json`.

## Verification

| Check | Result |
| --- | --- |
| Immediate official rotation | Passed |
| Complete horizontal look-around | Passed |
| Pan disabled on official route | Passed |
| Zoom limits stable under repeated input | Passed |
| Polar limits stable under repeated input | Passed |
| Direction reversal | Passed |
| Camera remains interior-safe | Passed |
| Official route UI | `main > img` only |
| Console errors | `0` |
| Production build | Passed — Vite, 501 modules transformed |

The console retains the existing Three.js `PCFSoftShadowMap` deprecation warning; it is unrelated to the camera system. The build retains the existing non-blocking large-chunk advisory.

## Remaining limitations

- Official Stage C pan remains intentionally disabled.
- Official zoom is intentionally limited to `0.36–0.48` metres.
- Vertical viewing is intentionally constrained to the safe `1.30–1.70` polar range.
- Debug mode keeps its broad camera range for reproduction and can still encounter boundaries, but blocked movement now stops deterministically without repeated snap-back.

## Files modified

- `src/studio-v2/studioV2Config.js`
- `src/studio-v2/studioV2CameraSafety.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `docs/reviews/fred-studio-v2-camera-stability-final/REPORT.md`
- `docs/reviews/fred-studio-v2-camera-stability-final/interaction-trace.json`
- `docs/reviews/fred-studio-v2-camera-stability-final/01-official-opening-final.png`

No coordinate-system, anchor, MacBook, photograph, or object-placement work was started. No commit, push, merge, or deployment was performed.

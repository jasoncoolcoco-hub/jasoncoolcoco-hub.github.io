# Fred Studio V2 Radio Panel Hybrid Handoff

## Result

The radio transition now uses a deliberate hybrid handoff. Readable compact text remains on the world-space CanvasTexture, readable formal text remains in the DOM player, and neither text surface is continuously transformed into the other.

## Architecture

- Opening: world compact content withdrawal → short shell-only partial launch → 35 ms hidden handoff → near-final screen shell arrival → formal content reveal.
- Closing: formal content withdrawal → short uniform 0.92 shell collapse → 35 ms hidden handoff → world compact layer fade-in.
- Close button, outside click, and Escape all call the same guarded close function.
- Duplicate close requests are ignored once the player leaves `OPEN`.
- The projected world return bounds are sampled and frozen when close begins, including after camera movement.
- The previous Canvas snapshot proxy and full-path text morph are no longer used.

## Timing

Official 1× nominal timing:

- Opening: 415 ms.
- Closing: 390 ms.
- Hidden midpoint: 35 ms in each direction.

Measured browser telemetry:

- Opening: 433.4 ms from `openStartedAtMs` to `openCompletedAtMs`.
- Closing: 397.4 ms from `closeStartedAtMs` to `closeCompletedAtMs`.
- Both measured totals remain inside the required 300–450 ms range.
- Debug route continues to support 1×, 0.5×, and 0.25× transition playback.

## Visual verification

- Formal text appears only after the screen shell is near its final position.
- Formal text withdraws before the closing shell begins its partial collapse.
- No readable text crosses the CanvasTexture/DOM boundary.
- The smoked-glass surface has no diagonal crease or reflection seam.
- World compact transform, material appearance, and final placement remain unchanged.
- Close button, outside click, and Escape all return to the same stable world compact panel.

## Camera movement

The camera was moved from `[-6.42, 1.92, 0.3]` to `[-6.134, 1.835, -0.109]` while the formal player remained open. The projected world bounds changed accordingly, and the closing telemetry recorded a close-time `PROJECTED RETURN` before the hybrid collapse began. The player returned to `WORLD_COMPACT` with face and glass opacity both at `1.000`.

## Audio and scene integrity

- Catalogue remained `READY`.
- Audio remained idle with no autoplay.
- Audio element count remained `1` through repeated transitions.
- Scene Ready Gate remained `READY`.
- No model, material, lighting, camera-limit, object-placement, or Marshall click behavior was modified.

## Performance

- Representative idle FPS: 60.
- Draw calls: 96.
- Rendered triangles: 780,044.
- Radio panel contribution remains 2 draw calls and 14 triangles.

## Evidence

- `opening-contact-sheet.png`
- `close-button-contact-sheet.png`
- `outside-click-contact-sheet.png`
- `escape-key-contact-sheet.png`
- `formal-player-no-crease.png`
- `world-compact-after-close.png`

## Validation

- Production build: passed.
- Audio controller tests: passed.
- Browser console: no task-related errors; only the existing Three.js PCFSoftShadowMap deprecation warning was observed.
- Git delivery: intentionally not performed.

NO COMMIT / NO PUSH / NO MERGE / NO DEPLOY.

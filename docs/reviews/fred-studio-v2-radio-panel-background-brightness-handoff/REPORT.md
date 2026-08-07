# Fred Studio V2 Radio Panel Background Brightness Handoff

## Result

The temporary Radio Panel focus dimming now enters and releases smoothly. At normal 1× speed, the room no longer appears to jump to a brighter exposure when `WORLD_COMPACT` returns.

## Root cause

The brightness difference came from the full-screen DOM layer:

`.studio-v2__radio-screen-layer`

Its open state used `background: rgba(3, 6, 7, 0.08)`. Before this patch, the `--open` class remained active throughout every closing phase, including `WORLD_COMPACT_ENTER`. The layer was then conditionally unmounted with the screen player, changing from the full dim value directly to no layer on the final frame. That removal produced the perceived room exposure jump.

No Radio Panel code changed renderer exposure, scene background, scene environment, or light intensity.

## New backdrop lifecycle

Opening:

- Hybrid handoff phases remain clear.
- Backdrop begins fading in when `SCREEN_PLAYER_ENTER` starts.
- It reaches the existing accepted `rgba(3, 6, 7, 0.08)` open-state strength without changing that strength.

Closing:

- `SCREEN_PLAYER_EXIT` retains the full dim treatment while formal content withdraws.
- Backdrop release starts at `PARTIAL_COLLAPSE_START`.
- It continues through the hidden handoff and overlaps `WORLD_COMPACT_ENTER`.
- At 1×, it reaches exact transparent approximately 65 ms before the player wrapper unmounts.
- Closed state contains no backdrop DOM and no pointer-blocking invisible layer.

## Timing and easing

- Official fade-in duration: 220 ms.
- Official fade-out duration: 220 ms.
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`.
- Debug 0.5× and 0.25× modes scale the backdrop duration with the existing transition-speed control for inspection.
- No per-frame JavaScript brightness calculation was added.

## Global rendering

GLOBAL THREE.JS LIGHTING:
UNCHANGED

- Renderer exposure: unchanged.
- Scene environment/background: unchanged.
- Directional, hemisphere, fill, window, and ceiling lighting: unchanged.
- Materials, floor reflection, shadows, and colour grading: unchanged.
- Persistent WebGL cost: zero.

## Preserved behavior

- Hybrid CanvasTexture/DOM handoff remains unchanged.
- No readable text morph was restored.
- No `Cmon` title jump or snapshot proxy returned.
- Formal smoked glass remains crease-free.
- Close button, outside click, and Escape use the same close function.
- Camera-move close still freezes the close-time world projection.
- Audio playback, pause state, selected track, and current time remain independent of the player UI lifecycle.

## Tests

- Normal 1× open/close repeated five times: passed.
- Close button: passed.
- Outside click: passed.
- Escape: passed.
- Playing close: audio continued from 0.197 s to 0.880 s.
- Paused close: current time remained 1.838 s.
- Camera move: camera moved from `[-6.42, 1.92, 0.3]` to `[-6.182, 1.835, -0.09]`; close cleanup passed.
- Double close / outside click overlap: passed.
- Reopen attempt during close: no stuck backdrop; final closed state passed.
- Outside click plus Escape: passed.
- Close request during opening: final state remained fully open/dimmed, never partially dimmed.
- Route exit during transition: backdrop and player DOM both removed.
- Fixed-camera performance: 57 FPS during automated capture, 96 calls, 780,044 triangles.

## Console and build

- Browser console: no task-related errors.
- Existing Three.js `PCFSoftShadowMap` deprecation warning remains unchanged.
- Audio controller tests: 1 passed.
- `git diff --check`: passed.
- `npm run build`: passed.
- Existing generic chunk-size warning remains unchanged.

## Files changed

- `src/studio-v2/StudioV2RadioScreenPlayer.jsx`
- `src/studio-v2/studio-v2.css`
- `docs/reviews/fred-studio-v2-radio-panel-background-brightness-handoff/REPORT.md`
- Evidence PNG files in this directory.

## Evidence

- `background-close-contact-sheet.png`
- `opening-contact-sheet.png`
- `final-screen-player.png`
- `final-world-compact.png`

## Git

No commit, push, merge, or deployment was performed.

# Fred Studio V2 radio close snapshot review

Date: 2026-08-07

## Scope

This review covers only the `SCREEN_PLAYER → WORLD_COMPACT` close handoff and
the formal player's diagonal glass crease. The approved compact transform,
glass material, camera, room lighting, object placement, catalogue, audio
controller, opening transition, and close-trigger semantics remain unchanged.

## Root causes

The previous compact proxy used CSS-positioned live text while the world face
used text rasterized into a `2048 × 778` CanvasTexture. Matching percentages did
not match the two text engines' glyph metrics, antialiasing, clipping, or
fractional non-uniform scaling. Their final swap could therefore still expose a
small baseline/mask discontinuity.

The diagonal formal-glass crease came from
`.studio-v2__radio-screen-reflection`: a large `110deg` linear-gradient overlay
rotated by `-8deg`. Its composited band read as a fold across the smoked glass.

## Final architecture

At close request the runtime force-renders the existing world compact canvas,
copies those exact pixels to a one-use offscreen canvas, and synchronously draws
that copy into the DOM transition canvas. The projected world target is sampled
once and frozen.

Ownership is:

1. `SCREEN_PLAYER`
2. `FORMAL_CONTENT_WITHDRAWAL`
3. `COMPACT_SNAPSHOT_PROXY`
4. `SNAPSHOT_AT_TARGET`
5. `WORLD_COMPACT_HANDOFF`
6. `WORLD_COMPACT`

Formal content fades without layout collapse. The snapshot becomes the sole
readable moving layer after formal withdrawal. On target arrival, one animation
frame reveals the already-ready world face, the next removes the snapshot, and
the following frame completes the React close.

## Verification

- Official `1×`: close button, outside click, Escape, camera-move-then-close,
  playing, paused, and reopen paths passed.
- Debug `0.25×`: snapshot title remained pixel-locked through the final return.
- Playing and paused states persisted across close/reopen.
- Official route exposed no debug speed controls.
- Formal glass retained smoked tone, blur, rounded edge and inset depth without
  the rotated diagonal reflection layer.
- Browser console errors: none.
- Runtime sample: 59 FPS, 96 draw calls, 780,044 rendered triangles.
- Snapshot generation: one `2048 × 778` canvas copy per close request; no
  persistent render or animation loop.
- Dependencies added: none.
- `npm run build`: passed, 518 modules transformed; only the existing generic
  chunk-size warning remained.

## Evidence

- `close-sequence-contact-sheet.png`: nine final-stage frames across all three
  close triggers.
- `close-button-sequence-contact-sheet.png`: eight close-button frames.
- `outside-click-sequence-contact-sheet.png`: eight outside-click frames.
- `escape-sequence-contact-sheet.png`: eight Escape frames.
- `formal-player-no-crease.png`: accepted formal glass surface.
- `debug-close-state.png`: snapshot ownership/readiness debug state at `0.25×`.

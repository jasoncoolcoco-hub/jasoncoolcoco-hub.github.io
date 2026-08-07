# Fred Studio V2 — Radio Panel V2

### A. Repository state

- Worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`.
- Branch: `feat/fred-studio-v2-interactions`.
- Starting HEAD: `2df69a192f3d17a8be87525cdc83e8b0b17608b3` (`feat: add licensed Marshall audio playback`).
- Existing uncommitted Radio Panel work was inspected and refined in place. It already contained the world-space panel, Scene Ready registration, catalogue readiness, Marshall blocker integration, audio-controller coverage, and the earlier `fred-studio-v2-radio-panel` review.
- Git status remains intentionally dirty. The Radio Panel implementation and both Radio Panel review folders are uncommitted. The pre-existing `fred-studio-v2-placed-objects` review and untracked `imac_2021.glb` remain unrelated and untouched.
- Nothing is staged.

### B. Final interaction architecture

`WORLD_COMPACT` is the first and default visible state. A genuine click projects its four world-space corners into viewport coordinates and starts a DOM transition proxy at those bounds. The proxy straightens and enlarges into `SCREEN_PLAYER`, while the fixed world panel keeps its semantic object and transform but dims its duplicated UI face. Closing requests a fresh projection using the current camera, reverses the transform toward that location, restores the world UI, and removes the DOM player. The official route no longer expands a playlist inside the 3D panel.

### C. Refined world panel

- Semantic ID: `MARSHALL_RADIO_PANEL_01`.
- Position: `[-2.180, 1.400, 0.860]`.
- Rotation: `[0, -0.959931, 0]` radians.
- Yaw: `-0.959931` radians / `-55°`.
- Pitch: `0°`.
- Roll: `0°`.
- Scale: `1`.
- Dimensions: `0.50 × 0.19 × 0.01 m` (width × height × thickness).
- Relationship to Marshall: the panel is aligned to the same yaw, its XZ centre is approximately `0.517 m` from the Marshall reference anchor, and its lower edge remains approximately `0.166 m` above the audited Marshall upper bound. It is closer than the previous `[-2.340, 1.340, 0.640]` position without intersecting Marshall, Guitar, floor, wall, or furniture.

### D. World panel visual refinement

- Previous material: colour `#101619`, roughness `0.20`, metalness `0`, clearcoat `0.34`, clearcoat roughness `0.22`, opacity `0.68`, transmission `0`, IOR `1.45`.
- New material: colour `#101619`, roughness `0.18`, metalness `0`, clearcoat `0.42`, clearcoat roughness `0.18`, opacity `0.54`, transmission `0`, IOR `1.45`.
- The lightweight glass keeps `castShadow=false`, `receiveShadow=false`, no refraction pre-pass, and no new light. Depth writing is disabled so the room reads subtly through the shell.
- The high-resolution compact texture now uses a lighter directional glass wash, a five-pixel outer reflection edge, and a two-pixel low-contrast inner border.
- The track title target size increased from `156 px` to `176 px` in the oversampled canvas; artist size increased from `86 px` to `96 px`; title tracking reduced from `10 px` to `7 px`; the redundant tiny playback word was removed.
- Opening-view result: `Cmon`, artist, and status symbol are readable without increasing the approved physical envelope or making the panel visually loud.

### E. Scene Ready

- Compact panel first frame: PASS. The delayed-panel test kept the loading cover active until all critical assets, compact shell, final metadata/fallback texture, shaders, and warm-up were ready.
- Catalogue metadata is resolved before the panel is marked ready, with the existing bounded `3000 ms` timeout.
- Fallback is fully drawn as `FRED STUDIO RADIO / Audio unavailable` before reveal.
- Audio binary critical: NO.
- Pop-in: none observed for shell, text, orientation, or material.
- Delayed-panel first-visible sample: scene ready `1348.3 ms`; first-visible frame `1348.5 ms`.

### F. Screen Player

- Technique: semantic React DOM region using the existing controller, mounted only after a world-panel click.
- Desktop single-track dimensions: `400 × 304 px`.
- Desktop multi-track dimensions: `400 × 360 px`.
- At `1280 × 720`, the final one-track bounds were approximately `left 816 px`, `top 232.32 px`; multi-track top was approximately `208.8 px`. The right margin is `5vw` (`64 px`) rather than a tight corner attachment.
- Styling: dark smoked backdrop, `18 px` radius, subtle blur/saturation, fine outer edge, inner border, restrained reflection, soft shadow, and an 8% maximum room dim.
- Single track uses the compact `304 px` height with one balanced row and no empty playlist field.
- Six and twenty tracks retain a fixed `360 px` window. The playlist alone scrolls internally.
- Narrow viewport test: `343 × 304 px` at a `375 × 667` viewport, with `16 px` safe side margins and no overflow.

### G. 3D-to-2D transition

- Projection: four compact-plane corners are transformed by the fixed group world matrix and projected through the active `PerspectiveCamera`; the resulting viewport bounds and screen-space top-edge angle seed the proxy.
- Open duration: `320 ms`.
- Close duration: `280 ms`.
- Strategy: transform-only FLIP-style DOM proxy using translate, rotate, scale, opacity, border radius, and a fixed final rectangle. No layout-sized width/height animation and no new continuous RAF loop were added.
- The actual world-space object never moves toward the camera.
- Camera move while open: closing calls `getRadioPanelScreenBounds()` at that moment. Visual testing after an outside-window orbit returned the proxy to the panel's new on-screen location.
- Reduced motion: spatial morphing is removed by the existing media query and the component uses a short crossfade/small-scale path; functionality is unchanged.

### H. Audio integration

- Marshall Play/Pause is preserved and remained synchronized with both compact and formal icons.
- Formal Play/Pause calls the same `studioV2AudioController.toggle()`.
- Track selection calls `setTrack(trackId)` and then `play()` on the same controller.
- A Debug-only in-memory catalogue fixture was added to validate real ID changes for 6/20-track cases without modifying production catalogue data. Selecting row 02 produced `trackId=debug-fixture-2` and `status=playing`.
- Single HTMLAudioElement: YES (`audioElementCount=1` in controller/debug state and controller tests).
- Route exit pauses/destroys the controller; re-entry returned `idle`, world compact, and no formal window.
- Autoplay: NO.
- Audio request timing: `preload="none"`; the M4A is requested only after Marshall, formal Play, or a genuine track-selection playback action. Opening the player alone does not request or restart audio.

### I. Input behaviour

- World panel click opens the formal window and never toggles audio.
- Drag beginning on the world panel is movement-filtered and does not open the player.
- Camera drag outside the formal window remains active; the formal window stayed fixed at the same DOM bounds.
- Pointer and wheel events inside the formal player stay with the DOM UI. A twenty-track wheel test changed internal playlist `scrollTop` from `0` to `416` without sending the gesture to the canvas.
- Keyboard buttons support Enter/Space natively; Escape closes the player. Focus-visible outlines are provided and focus is not trapped.
- Guitar remains excluded from the Marshall click target, and the Radio group remains a Marshall-interaction blocker.

### J. World-space verification

- Opening view: panel and Marshall read as one music zone; compact title is readable and the room remains dominant.
- Close review: glass edge, room transparency, thickness, and text hierarchy remain visible without plastic or screen glow.
- Side/orbit view: perspective narrowing and screen-edge rotation occur naturally.
- Opposite/rear view: the panel is naturally occluded or shows only its physical back according to room depth; no mirrored front UI is forced through geometry.
- Billboard: NO.
- Fixed world transform: YES.

### K. Multi-track tests

- 1 track: `400 × 304 px`; one balanced current row; no empty field.
- 6 tracks: six enabled rows were created in memory and the window stayed `400 × 360 px`.
- 20 tracks: twenty enabled rows were created in memory and the window stayed `400 × 360 px`.
- Scrolling: internal playlist scroll confirmed (`0 → 416 px`).
- Fixed window dimensions: PASS. Track count never increases the overall desktop window height beyond `360 px`.

### L. Performance

- FPS: `60`.
- WebGL draw calls: `96`.
- Rendered triangles: `780,044`.
- World panel delta versus the approved scene baseline: `+2` calls / `+14` triangles, unchanged from compact V1. The DOM screen player adds zero WebGL calls.
- Final production chunks: Studio V2 `399.86 kB` / `151.18 kB gzip`; CSS bundle `44.93 kB` / `9.42 kB gzip`.
- Compared with the previous Radio Panel report (`395.29 kB` / `149.97 kB gzip`), the Studio V2 JS chunk grew approximately `4.57 kB` raw / `1.21 kB gzip`. No new chunk or dependency was introduced.
- Transition runtime: CSS compositor transform/opacity work plus two opening RAFs; no persistent transition RAF and no added render loop.
- Catalogue metadata/UI-ready debug sample: `67.3 ms / 68.9 ms`, within the prior reviewed `49–74 ms / 50–75 ms` range.
- Warm official dev reload samples were `1281.9–1541.9 ms`. This absolute range was slower than the prior `925 ms` sample, but the bounded catalogue/UI timings did not regress; the variance occurred in the existing model/shader dev-load path rather than the small metadata dependency.

### M. Error handling

- Catalogue failure: Scene Ready remains true, the room stays usable, and compact shows `Audio unavailable` before reveal.
- Audio failure: remains isolated in the existing controller state and does not alter scene readiness or destroy the room.
- Screen-player fallback: opens normally with `Audio unavailable`, a disabled Play button, no large official error panel, and a restrained explanatory line.
- Route exit: screen player, transition state, listeners, canvas interaction, and audio controller are disposed.
- Re-entry/refresh: returns to `WORLD_COMPACT`, idle, no autoplay, and no leftover DOM player.

### N. Build

- Command: `npm run build`.
- Result: PASS.
- Vite: `7.3.6`.
- Transformed modules: `518`.
- Warning: existing generic `>500 kB` chunk advisory only.
- Errors: none.
- New dependencies: none.
- New chunks: none.
- Audio-controller regression test: PASS, including 6-track in-memory fixture selection with one audio element.
- Published M4A remains user-triggered; no audio binary was part of entry-critical requests.
- Local catalogue/audio remain excluded from production resolution.

### O. Changed files

Implementation files in the current uncommitted Radio Panel worktree:

- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/StudioV2RadioScreenPlayer.jsx`
- `src/studio-v2/createStudioV2MarshallInteraction.js`
- `src/studio-v2/createStudioV2RadioPanel.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/studio-v2.css`
- `src/studio-v2/studioV2AudioController.js`
- `src/studio-v2/studioV2AudioController.test.mjs`
- `src/studio-v2/studioV2EntryGate.js`
- `src/studio-v2/studioV2RadioPanelConfig.js`

New Radio Panel V2 review files:

- `docs/reviews/fred-studio-v2-radio-panel-v2/01-opening-refined-compact.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/02-marshall-close-refined-glass.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/03-side-view-fixed-yaw.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/04-click-transition-start.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/05-click-transition-mid.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/06-formal-player-open.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/07-formal-player-playing.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/08-formal-player-multitrack.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/09-formal-player-after-camera-move.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/10-close-transition-mid.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/11-returned-world-panel.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/12-first-visible-frame.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/13-debug-world-transform.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/14-debug-screen-player.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/15-catalogue-error-world-fallback.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/16-catalogue-error-screen-player.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/CONTACT_SHEET.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2/REPORT.md`

No production catalogue, audio binary, source/derivative GLB, Room/MacBook/Marshall/Guitar geometry or material, placed-object transform, opening camera, camera limit, room light, exposure, tone mapping, Studio V1 file, or package manifest changed.

### P. Visual verdict

PASS — ready for user visual review

### Q. Git safety

No commit, push, merge, or deployment was performed.

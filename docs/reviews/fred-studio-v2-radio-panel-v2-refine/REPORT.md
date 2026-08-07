# Fred Studio V2 — Radio Panel V2 Final Refinement

### A. Repository state

- Worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`.
- Branch: `feat/fred-studio-v2-interactions`.
- Starting HEAD: `2df69a192f3d17a8be87525cdc83e8b0b17608b3` (`feat: add licensed Marshall audio playback`).
- The existing uncommitted Radio Panel V2 implementation was refined in place. Nothing is staged. The pre-existing placed-object evidence and untracked `imac_2021.glb` remain unrelated and untouched.

### B. Issues addressed

1. Ghost removal: the semantic world group and transform remain alive, but both the compact UI plane and smoked-glass mesh are hidden from `OPENING_START` through `SCREEN_PLAYER_OPEN` and `CLOSING_TO_WORLD`. They return only after the reverse transition completes. The moving DOM proxy is therefore the only readable surface.
2. Outside click close: capture-phase document pointer tracking records an outside press, movement, duration, and release. A left click at or below `6 px` movement and `600 ms` closes through the shared close path; a drag remains available to OrbitControls. The dismissal marks the pointer-up default-prevented so the same gesture cannot toggle Marshall, while still allowing the canvas handlers to clean up normally.
3. Closer placement: the compact panel moved from `[-2.180, 1.400, 0.860]` to `[-2.140, 1.380, 0.940]`, reducing its horizontal XZ centre distance to the Marshall reference from approximately `0.517 m` to `0.430 m`.
4. Improved glass: the box shell gained a darker smoked colour, stronger clearcoat, tighter clearcoat roughness, more controlled opacity, environment response, explicit shell/content render order, and a content face pulled closer to the glass front.
5. Discoverability: the outer and inner reflective edges, header, title, artist and idle/play icons received small contrast increases. Size, landscape orientation and the restrained non-glowing aesthetic were preserved.

### C. Final compact world panel

- Semantic ID: `MARSHALL_RADIO_PANEL_01`.
- Position: `[-2.140, 1.380, 0.940]`.
- Rotation: `[0, -0.959931, 0]` radians.
- Yaw: `-55°`.
- Pitch: `0°`.
- Roll: `0°`.
- Dimensions: `0.50 × 0.19 × 0.01 m`.
- Thickness: `0.01 m`.
- Relation to Marshall: same yaw; approximately `0.430 m` XZ centre separation from the fixed Marshall reference at `[-2.050, 0.021, 1.360]`; the lower panel edge remains approximately `0.146 m` above the previously audited Marshall upper bound. No Marshall, Guitar, floor, wall or furniture intersection was observed.

### D. Compact visual refinement

- Material changed from colour `#101619`, roughness `0.18`, clearcoat `0.42`, clearcoat roughness `0.18`, opacity `0.54` to colour `#0d1517`, roughness `0.16`, clearcoat `0.56`, clearcoat roughness `0.12`, opacity `0.62`, and environment intensity `0.90`.
- Metalness remains `0`; transmission remains `0`; IOR remains `1.45`; no refraction pipeline, lights or shadows were added.
- The physical box shell renders before the canvas content plane. The content plane offset was reduced from `0.0008 m` to `0.00015 m` beyond the front surface so the UI reads as embedded in the glass rather than floating ahead of it.
- Outer edge opacity increased approximately `0.45 → 0.58`; the inner edge increased `0.10 → 0.14`.
- Header opacity increased `0.78 → 0.88`; title `0.98 → 0.99`; artist `0.82 → 0.87`; idle icon `0.76 → 0.86`; playing icon `0.94 → 0.98`.
- No glow, pulse, tutorial copy, arrow, size increase or orientation change was introduced.

### E. Formal window and close behaviour

- No-ghost result: PASS. Official-route screenshots show no readable compact face, residual dark card, or shell duplicate while the formal player owns the interface.
- Outside click: PASS. Scene and empty-area clicks close the player; player-internal controls, padding and playlist interactions remain inside.
- Close button: PASS.
- Escape: PASS.
- Reverse transition: PASS. It recomputes the panel's current projected bounds at close time. After a camera drag, the player returned to the new screen position.
- Audio continuity: PASS. Outside closing while `playing` ended in compact mode with the accessible state still reporting `playing`; current track and time were not reset.
- Clicking outside during the opening transition was also tested and ended deterministically in compact mode.

### F. Interaction integrity

- Marshall Play/Pause: PASS when the compact state is active.
- Formal Play/Pause: PASS through the same controller and single audio element.
- Track selection: preserved through the existing controller path.
- Outside-click conflict: PASS. Clicking Marshall while the formal player was open closed the player without toggling audio; the next compact-state Marshall click toggled normally.
- Camera drag: an outside drag kept the formal player open; the following outside click closed it.
- Route exit: audio/controller/UI cleanup preserved.
- Re-entry: returned to compact-only, `idle`, with no formal window.
- Autoplay: NO.

### G. World-space verification

- Opening view: the panel is easier to notice and reads more clearly as part of the Marshall music zone without dominating the room.
- Close/cropped review: edge, face and dark internal layer remain distinct; the panel still reads as smoked glass rather than glossy plastic.
- Fixed transform: YES.
- Billboard: NO.
- Camera-move-then-close: PASS. The return used the current projected bounds rather than the opening bounds.

### H. Performance

- WebGL draw calls: `96`.
- Rendered triangles: `780,044`.
- Panel contribution: unchanged at `2` calls / `14` triangles.
- FPS: the prior foreground reviewed baseline remains `60`; this pass's automated background samplers reported `24–38` while running one or two remote WebGL review surfaces. Calls, triangles, scene code and the render loop were unchanged, indicating browser/background throttling rather than a panel-side GPU regression.
- Runtime cost: document pointer listeners exist only while the formal player is mounted; no permanent RAF loop was added.
- Dependencies: none added.

### I. Build

- Command: `npm run build`.
- Result: PASS.
- Vite: `7.3.6`.
- Transformed modules: `518`.
- Warning: existing generic `>500 kB` chunk advisory only.
- Errors: none.
- Studio V2 chunk: `401.93 kB` / `151.77 kB gzip`.
- Published M4A remains user-triggered only; no autoplay or entry-critical audio request was introduced.
- Local catalogue/audio remain excluded from production resolution.

### J. Changed files

Files directly refined in this pass:

- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/StudioV2RadioScreenPlayer.jsx`
- `src/studio-v2/createStudioV2MarshallInteraction.js`
- `src/studio-v2/createStudioV2RadioPanel.js`
- `src/studio-v2/studioV2RadioPanelConfig.js`

Existing uncommitted Radio Panel V2 implementation files preserved in the same worktree:

- `src/studio-v2/StudioV2ImportPage.jsx`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/studio-v2.css`
- `src/studio-v2/studioV2AudioController.js`
- `src/studio-v2/studioV2AudioController.test.mjs`
- `src/studio-v2/studioV2EntryGate.js`

New refinement evidence:

- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/01-opening-compact-refined.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/02-close-compact-glass-refined.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/03-formal-open-no-ghost.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/04-outside-click-close-mid.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/05-returned-compact-after-outside-close.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/06-debug-transform-refined.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/07-debug-visibility-modes.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/08-contact-sheet.png`
- `docs/reviews/fred-studio-v2-radio-panel-v2-refine/REPORT.md`

Pre-existing unrelated, still untracked and untouched:

- `docs/reviews/fred-studio-v2-placed-objects/`
- `public/models/fred-studio-v2/objects/imac_2021.glb`

No audio binary, production catalogue, source GLB, Marshall/Guitar transform, placed-object transform, room-wide lighting, camera, Studio V1 or package file changed.

### K. Visual verdict

PASS — ready for final user approval

### L. Git safety

No commit, push, merge, or deployment was performed.

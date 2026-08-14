# Fred Studio V2 — Stage 5A.1 Desk Interaction Integration

## 1. Status

FINAL GATE PASS — USER VISUAL REVIEW ACCEPTED

## 2. Stage 5A Baseline

The accepted responsive `MACBOOK_DISPLAY_TARGET`, 78% display occupancy, 47° FOV, 0.025 m near plane, focus safety corridor, unified exits, and canonical TABLE_OVERVIEW return are preserved.

## 3. Music Regression

Direct entry is correctly rejected by browser autoplay policy. The regression was in the one-shot recovery path: a `NotAllowedError` during the first attempted gesture disarmed fallback permanently, so no later trusted gesture could recover playback.

## 4. Audio Fix

The single reusable audio element remains independent of Camera Director state. Playback is attempted at entry, starts at volume 0, and fades to 0.10 over 4500 ms. Policy rejection keeps fallback armed until a gesture succeeds; actual media errors remain separate. A trusted MacBook gesture was verified to both start audio and enter focus without double toggling.

## 5. MacBook Anytime Shortcut

MacBook focus is accepted from ROOM_WIDE_START, AMBIENT_DRIFT, AMBIENT_USER_OVERRIDE, TABLE_OVERVIEW, TABLE_FREE_ORBIT, and can pre-empt TABLE_SKIP_TRANSITION. Ambient rail ownership is consumed permanently. The current live pose is the transition origin; exit returns to canonical TABLE_OVERVIEW and hands off to TABLE_FREE_ORBIT.

## 6. Table Click Target

`TABLE_ISLAND_INTERACTION_TARGET` is an invisible semantic proxy matching the audited kitchen-island body. It excludes stools, Radio, Marshall, and cabinetry. MacBook hit testing has priority.

## 7. Table Skip

The action exists only before rail completion. It uses Camera Director state `TABLE_SKIP_TRANSITION`, interpolates from the live pose over 650–1200 ms, consumes the rail, and enters TABLE_FREE_ORBIT after canonical TABLE_OVERVIEW. Runtime verification observed the exact transition and completion states.

## 8. TABLE_FREE_ORBIT Pitch

The old root cause was `maxPolarAngle: 1.25`, which prevented horizontal viewing. The profile now exposes actual view pitch from -35° through horizontal to +6°. +6° is the safe all-yaw intersection; +7° and above can enter the stool-row safety volume at some rear headings. The canonical overview handoff remains visually unchanged.

## 9. Combined Yaw/Pitch

The audit samples 360 yaw headings across 1.45, 1.775, and 2.1 m radii. The global safe range is -35° to +6°, with horizontal safe at every sampled heading. Island collision is ignored only inside TABLE_FREE_ORBIT because this orbit intentionally travels over the island; room boundaries and all non-island furniture remain enforced.

## 10. State Machine

- Normal: ENTRY → AMBIENT_DRIFT → TABLE_OVERVIEW → TABLE_FREE_ORBIT.
- MacBook shortcut: ENTRY/DRIFT → MACBOOK_FOCUS_TRANSITION → MACBOOK_FOCUS → TABLE_OVERVIEW → TABLE_FREE_ORBIT.
- Table shortcut: ENTRY/DRIFT → TABLE_SKIP_TRANSITION → TABLE_OVERVIEW → TABLE_FREE_ORBIT.

## 11. Reflection

Existing cadence is preserved: slow rail, fast transitions, active orbit, static 0 Hz. No reflection loop or look change was introduced.

## 12. Reduced Motion

Automatic drift remains disabled. MacBook and table shortcuts use a 200 ms restrained transition; yaw, pitch, and zoom remain available.

## 13. Responsive

Scene Ready and profile behavior were exercised at 1280×720, 1440×900, 1280×800, 1024×768, and 1600×900. The responsive MacBook solver is unchanged.

## 14. Performance

At 1280×720 DPR 1 the earlier Stage 5A.1 reference was 58 FPS, 99 draw calls, and 780,688 rendered triangles. The final-gate focus sanity sample at 1600×900 was 58 FPS, 85 draw calls, and 475,484 rendered triangles. Interaction raycasts occur only on pointer events; no per-frame full-scene raycast was added.

## 15. Regression

Ambient entry and drift, canonical overview, table skip, TABLE_FREE_ORBIT, Radio Panel readiness, Marshall/audio control, Scene Ready, MacBook focus/exit, floor reflection, responsive resize, and production routing remain intact. Audio continues through camera shortcuts. The official route has no debug panel or debug runtime exposure. One final-gate lifecycle regression was corrected by restoring disposal of the debug-only runtime reference when leaving the route.

## 16. Files Changed

- `src/studio-v2/studioV2AudioController.js`
- `src/studio-v2/studioV2AmbientCamera.js`
- `src/studio-v2/studioV2CameraDirector.js`
- `src/studio-v2/studioV2CameraPoses.js`
- `src/studio-v2/studioV2CameraSafetyVolume.js`
- `src/studio-v2/studioV2MacbookFocus.js`
- `src/studio-v2/createStudioV2Scene.js`
- `src/studio-v2/StudioV2DebugPanel.jsx`
- `src/studio-v2/studioV2Config.js`
- `src/studio-v2/studioV2MaterialTuning.js`
- this review directory

Stage 5A baseline files remain part of the same uncommitted worktree.

## 17. Evidence

See this directory for audio runtime, desk pitch, eye-level, MacBook focus, path-safety, profile, and performance evidence.

## 18. Build

- audio controller tests: PASS
- production build: PASS
- `git diff --check`: PASS
- generic Vite chunk-size warning: unchanged

## 19. Git

- branch: `feat/fred-studio-v2-macbook-focus`
- Stage 4B checkpoint remains `c844db7`
- checkpoint message: `feat: complete Fred Studio Stage 5A desk interactions`
- checkpoint SHA: recorded from the resulting local and remote branch HEAD in the final delivery report
- push target: `origin/feat/fred-studio-v2-macbook-focus`

NO MERGE
NO DEPLOY
STAGE 4B HISTORY PRESERVED

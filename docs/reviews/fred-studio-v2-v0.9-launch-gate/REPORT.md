# Fred Studio V2 — v0.9 Public Launch Gate

Date: 2026-08-17

Release branch: `feat/fred-studio-v2-scene-expansion`

Production domain: `https://jasoncoolcocobobo.com/`

## Release scope

This gate covers the accepted Fred Studio V2 initial public release: the interactive studio room, Photo Wall system, MacBook focus flow, Catalina desktop, visible Chrome Dock trigger, and the MacBook-hosted V1 Home experience.

The public MacBook Home scope is intentionally limited to:

- Home
- Footprints

Life, End Film, Folder, Projects, and AI Coding expansion remain deferred. No future-stage content was added during this gate.

## Gate results

- Root route: Fred Studio V2 loads successfully at `/`.
- Room: stable first render; table orbit, physical MacBook, and cork-board hit targets respond to real pointer/raycast input.
- Photo Wall: complete manifest-driven layout loads; all 39 placed photos render; no black or blank photos observed; hover, detail open/close, and focus exit restore correctly.
- MacBook: physical MacBook → focus → visible Chrome → site works with actual pointer clicks.
- Site lifecycle: Back and Escape both restore `MACBOOK_FOCUS`; repeated reopen and full leave/revisit cycles show no dead input, stale lifecycle state, duplicate site layer, camera jump, or ghost overlap.
- V1 Home: native scrolling works; Home and Footprints remain intact; Projects and future-stage content are absent from the v0.9 portal scope.
- Audio: autoplay restriction is handled; playback starts from a trusted interaction and remains stable through repeated MacBook and Photo Wall cycles.
- Responsive: desktop, 900 × 720, and 390 × 844 viewports remain operable with no horizontal document overflow. The room remains intentionally desktop-first on small screens.
- DPR: verified at 2× desktop and 1× narrow viewport without interaction regressions.
- Console/network: no runtime errors or missing-asset failures observed. One non-blocking Three.js deprecation warning remains for `PCFSoftShadowMap` fallback.
- Performance: 20-sample steady-state capture held 60 FPS; debug metrics showed 1,434,516 triangles, 166 geometries, 128 textures, anisotropy 8, room first frame 212 ms, and measured load 4003.9 ms on the local test environment.

## Targeted checks

Passed:

- `node src/studio-v2/studioV2AudioController.test.mjs`
- `node src/studio-v2/studioV2MacbookPortal.test.mjs`
- `node src/studio-v2/studioV2PhotoBoardLayout.test.mjs`
- `node src/studio-v2/studioV2PhotoDetail.test.mjs`
- `node src/studio-v2/studioV2PhotoHover.test.mjs`
- `node src/studio-v2/studioV2PhotoMaterial.test.mjs`
- `node src/studio-v2/studioV2PhotoWallFocus.test.mjs`
- `node src/studio-v2/studioV2PhotoWallScale.test.mjs`
- `node src/studio-v2/studioV2PolaroidGeometry.test.mjs`
- `npm run photos:intake:check` — 39 valid source photos, 0 corrupt; 43 existing files preserved
- `npm run build`
- `git diff --check`

## Evidence

- `01-room.png` — default Fred Studio room
- `02-photo-wall-focus.png` — complete Photo Wall focus view
- `03-macbook-focus.png` — accepted MacBook focus and Catalina desktop
- `04-home-hero.png` — v0.9 Home hero inside the MacBook site portal
- `05-footprints.png` — Footprints and globe interaction area

## Deployment

Deployment uses the existing GitHub Pages workflow at `.github/workflows/deploy.yml`, triggered by a push to `main`. The workflow installs dependencies, builds the Vite site, and deploys the Pages artifact. Vite base remains `/`, and `CNAME` remains `jasoncoolcocobobo.com`.

Release checkpoint `100cc8dc49d65e08a98d69ac578bf75181bc8d8c` was pushed to the feature branch and fast-forwarded to `main`. GitHub Actions run [32005687601](https://github.com/jasoncoolcoco-hub/jasoncoolcoco-hub.github.io/actions/runs/32005687601) completed successfully: both the build and GitHub Pages deploy jobs passed.

Live verification at `https://jasoncoolcocobobo.com/` passed:

- HTTPS and the production root resolve to Fred Studio V2.
- The scene reaches Scene Ready and all critical production assets load.
- The physical MacBook, visible Chrome target, Home, native scrolling, Footprints, Back, Escape, and reopen route work with real browser input.
- The Photo Wall focus, hover, Photo Detail, close, and exit route work with real browser input; all 39 photos are visibly populated.
- A trusted click on the visible Fred Studio Radio starts the production audio track.
- The observed production asset inventory contained 65 assets, including 8 GLBs, 40 Photo Wall resources, the published audio catalogue, and the production audio file; no localhost asset URL was present.
- Production console output contained no errors. The only entry was the known non-blocking Three.js shadow-map deprecation warning.

## Stage 5G.1 cold-load performance optimization

Stage 5G.1 preserves the accepted production assets and renderer quality while restructuring the startup dependency graph. The prior release had a real unfamiliar-device production observation of roughly 55–60 seconds and a local cold-contention baseline as high as 25.35 seconds. The entry gate previously covered eight distinct GLB requests, while the early page lifecycle exposed approximately 161 MB of nominal response-body bytes.

The optimized loading tiers are:

- Tier 1: room, MacBook, Marshall, guitar, radio metadata, cork board, and all 39 Photo Wall photos.
- Tier 2: Polaroid camera, document folder, and coffee cup, loaded after Scene Ready.
- Tier 3: published audio media, the MacBook Home bundle, and Footprints/Earth assets.

The root bundle now dynamically imports Home. MacBook Focus preloads the Home bundle and the viewport-appropriate full-resolution hero, but Home does not mount until the visible Chrome trigger is clicked. Footprints and its 4096 Earth textures load only after the MacBook site is opened and Footprints is approached. The audio catalogue remains available for the room radio while the unchanged published M4A starts only at Scene Ready or from a playback action. No lower-resolution, lower-DPR, lower-detail, or lossy substitute was introduced.

Final Gate local production-preview results on 2026-08-17:

| Measurement | Scene Ready |
|---|---:|
| Cold run 1 | 5.408 s |
| Cold run 2 | 5.548 s |
| Cold run 3 | 5.590 s |
| Cold median | 5.548 s |
| Warm run | 2.527 s |

The entry gate now reports five requests, the nominal Scene Ready footprint is approximately 78.3 MB, and the main entry JavaScript is approximately 200 KB instead of 363 KB. The three cold runs used isolated local origins so HTTP cache entries were not shared.

Local visual and functional parity passed for the normal room, all Tier 2 props, the complete 39-photo wall, Photo Wall hover/detail/exit, Catalina desktop, visible Chrome icon, Home, native scrolling, Footprints with a 4096-texture WebGPU Earth, Back, Escape, full MacBook leave/revisit, and trusted-gesture audio recovery. Repeated lifecycle checks retained one Portal, one Home instance, one Earth canvas, and one audio resource.

Production performance and live verification will be appended after the Stage 5G.1 checkpoint reaches GitHub Pages. The remaining intentionally unchanged Tier 1 weight is led by approximately 28.47 MB of Photo Wall images plus the room, guitar, and Marshall models.

## Known non-blocking limitations

- The 3D room is desktop-first and uses a deliberately cropped composition on a narrow mobile viewport, while keeping core entry and exit paths usable.
- Before Stage 5G.1, a cold production browser session took roughly 55–60 seconds to reach Scene Ready in the launch-gate environment while loading the large 3D payload from a cold edge cache. This remains the historical baseline until the optimized production deployment is measured.
- The current Three.js version emits a `PCFSoftShadowMap` deprecation warning and falls back to `PCFShadowMap`; no visible failure was observed.
- The generated JavaScript bundle produces Vite's existing large-chunk advisory; it does not block this release.

## Decision

Launch gate: **PASS**. Local and live-production verification found no release-blocking visual, interaction, asset, console, audio, responsive, or performance defect in the accepted v0.9 scope.

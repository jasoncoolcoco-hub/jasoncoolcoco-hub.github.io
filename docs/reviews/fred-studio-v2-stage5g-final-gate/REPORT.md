# Fred Studio V2 — Stage 5G Final Gate

Date: 2026-08-19

Branch: `perf/fred-studio-v2-tier1-delivery`

Checkpoint: this report is included in `perf: finalize Fred Studio V2 Stage 5G`

## Accepted release state

- Marshall, Guitar, physical Folder/report stack, Coffee cup, and the Radio panel are absent from the normal production runtime. Their rollback assets remain untouched.
- Audio has no speaker or Radio dependency. The first trusted click starts the selected track without consuming that click's original interaction; later interactions neither restart nor duplicate playback.
- Photo Wall releases only after all 39 original full-quality photos are ready. The rejected bootstrap/proxy handoff is not present in the production bundle, and focus/detail interactions retain the accepted layout, materials, and transforms.
- Footprints annotations are physically disposed as soon as site exit begins and recreated on re-entry, preventing city/place labels from outliving the Earth layer.
- Lighting, tone mapping, floor reflection, kitchen stabilization, Camera Director, MacBook, and Polaroid camera remain on the accepted paths.

## Delivery and CDN decision

The final Visual Ready delivery inventory is 44 active assets and 62,820,624 raw source bytes (59.91 MiB): the Room, MacBook, Polaroid camera, cork board, Photo Wall manifest, and 39 full-quality photo images. Photo quality is intentionally not reduced to pursue a cold-load number.

The immutable R2 staging release previously verified all 49/49 uploaded objects for byte integrity, MIME, CORS, public access, and `Cache-Control: public, max-age=31536000, immutable`. Browser-cold staging measurements remained externally bandwidth-limited at roughly 103–111 seconds while the browser-warm control was about 2.123 seconds. CDN delivery alone did not solve that network path, so production remains on the established GitHub Pages origin. No staging-domain asset-base override is present in the production build; R2, its staging hostname, and its Cache Rule remain unchanged for future testing.

## Final Gate verification

- Automated Studio checks: 11/11 pass (entry/Visual Ready, delivery resolver/preload, audio gesture lifecycle, MacBook portal, Photo Wall layout/focus/detail/hover/material/scale, and Polaroid geometry).
- Photo intake integrity: pass; 39 valid originals, 0 corrupt or unsupported files.
- Desktop production-preview browser path: pass for physical MacBook click → `MACBOOK_FOCUS` → visible Chrome → Home → Footprints → Back/Escape → `MACBOOK_FOCUS`.
- Footprints Back and Escape exits: annotation root and label counts were 0 from the first sampled exit frame through MacBook restoration; re-entry restored one annotation layer and 19 labels.
- Photo Wall: physical board entry, full-quality focus, Photo Detail, return, and repeated focus/exit passed; no bootstrap or loading-driven swap was observed.
- Audio: the physical MacBook click both entered focus and moved audio to `PLAYING-AFTER-GESTURE`; playback time continued through later interactions with no restart.
- Browser console: no uncaught error or Stage 5G warning observed.
- Production bundle audit: no staging hostname, rejected bootstrap, removed-object delivery URL, CDN credential name, or credential literal found.
- `npm run build`: pass; Vite transformed 533 modules in 2.32 seconds. The existing chunk-size advisory remains non-blocking.
- `git diff --check`: pass.

## Release path

After this gate, the accepted checkpoint is pushed on the feature branch, merged to `main`, and deployed only through the existing GitHub Pages workflow triggered by `main`. The custom domain and Cloudflare/R2 configuration are not modified.

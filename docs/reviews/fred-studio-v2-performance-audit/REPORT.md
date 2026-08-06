# Fred Studio V2 Performance Audit

Audit date: 2026-08-05  
Working tree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`  
Branch: `feat/fred-studio-v2-interactions`  
Audit scope: measurement and recommendations only. No scene, camera, placement, lighting, material, anchor, or route changes were made.

## 1. Executive summary

The current complete scene renders at 60 FPS under the audited local desktop conditions, but it is carrying more geometry and texture memory than the visible composition needs. The primary runtime bottleneck is the guitar: it accounts for 309,867 source triangles and 619,734 rendered triangles once its shadow pass is included. The combined Marshall and guitar GLB is also the largest download at 47.78 MiB.

The room is already relatively lean at 77,410 source triangles. The MacBook is extremely light geometrically at 1,190 triangles, but its four 2048×2048 textures have an estimated 85.12 MiB uncompressed mipmapped GPU footprint. The full asset set has an estimated 399.83 MiB mipmapped RGBA8 texture footprint before PMREM, frame buffers, renderer targets, driver overhead, or other page resources.

The recommended next task is a reversible optimisation pass focused first on the guitar's small detail meshes and texture delivery. Preserve the room and MacBook geometry, use GPU-compressed textures, and keep stable semantic placement IDs independent of source GLB node names.

## 2. Audit method and limitations

Two complementary measurements were used:

1. A static GLB parser inspected each source file's buffers, accessors, mesh primitives, node hierarchy, materials, embedded images, and texture references. It excludes the known removed dining/window-decoration roots from the room total.
2. Browser runtime isolation toggled the room, MacBook, Marshall, guitar, and debug helpers independently and recorded `WebGLRenderer.info`, load timing, and frame cadence at device pixel ratio 1.

Runtime samples were taken locally at 1728×1117 and 1440×900 after warm-up, using six frame-rate samples per state at 650 ms intervals. All states were VSync-limited at 60 FPS, so these measurements demonstrate that this machine has headroom; they do not establish performance on integrated-GPU laptops or mobile devices.

Local resource timings were served from browser cache. Their reported transfer size was therefore only cache/protocol metadata and must not be interpreted as production download size. The byte sizes reported below are the authoritative public asset sizes. JavaScript heap samples varied with garbage collection and are not suitable for attributing memory to individual assets.

## 3. Current scene totals

| Metric | Current complete scene |
|---|---:|
| Source triangles | 502,634 |
| Runtime rendered triangles | 930,370 |
| Runtime draw calls | 94 |
| Runtime geometries | 68 |
| Runtime textures | 64 |
| Total GLB download size | 73.16 MiB |
| Estimated mipmapped RGBA8 texture memory | 399.83 MiB |
| Measured warm FPS | 60.0 |
| Average frame interval | 16.67 ms |

The difference between 502,634 source triangles and 930,370 rendered triangles is mainly the shadow pass. Every placed asset casts shadows, so each of its mesh primitives is rendered once for the main scene and once into the shadow map. The room uses selective shadow casters, adding only 2,512 runtime triangles beyond its visible pass.

## 4. Asset-level metrics

| Asset | File size | Nodes | Meshes / draws (source) | Vertices | Source triangles | Runtime contribution | Textures | Estimated GPU texture memory |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Room | 22.95 MiB | 67 | 31 | 90,899 | 77,410 | 24 calls / 79,922 triangles | 22 source / 24 runtime | 123.19 MiB |
| MacBook Pro | 2.43 MiB | 9 | 3 | 1,222 | 1,190 | +6 calls / +2,380 triangles | 4 | 85.12 MiB |
| Marshall amp | part of 47.78 MiB combined GLB | 41 | 22 | 137,283 | 114,167 | +44 calls / +228,334 triangles | 12 | 63.84 MiB |
| Gibson guitar | part of 47.78 MiB combined GLB | 13 | 10 | 197,545 | 309,867 | +20 calls / +619,734 triangles | 24 | 127.68 MiB |

The Marshall and guitar occupy the same `marshall_amp.glb`, so their file size and network request cannot currently be separated. Their geometry, node, material, and texture metrics can be separated by hierarchy.

## 5. Source file inventory

| Asset | Project path | Bytes | SHA-256 |
|---|---|---:|---|
| Room | `public/models/fred-studio-v2/loft_interior_6_for_free.glb` | 24,059,568 | `5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19` |
| MacBook | `public/models/fred-studio-v2/objects/macbook_pro_2021.glb` | 2,548,260 | `1a38db1f63a4699573a0393c888b2191030c99cf81c2d3325712a69cb2b7af5f` |
| Marshall + guitar | `public/models/fred-studio-v2/objects/marshall_amp.glb` | 50,101,456 | `3b65fe43920c4d1fdfc593ad76e157a080aae435274bf5f244e54149bbebe8df` |

All three files are GLB 2.0 with embedded images. None currently uses Draco, Meshopt, KTX2, or Basis texture compression. The Marshall file uses `KHR_materials_specular`; no other delivery compression extension was found.

## 6. Runtime isolation results

The following authoritative sample is from the 1728×1117 viewport at DPR 1. The 1440×900 repeat produced the same draw, triangle, geometry, and texture counts and the same 60 FPS cadence.

| Runtime state | Draw calls | Rendered triangles | Geometries | Textures | Warm FPS |
|---|---:|---:|---:|---:|---:|
| Room only | 24 | 79,922 | 33 | 24 | 60 |
| Room + MacBook | 30 | 82,302 | 36 | 28 | 60 |
| Room + Marshall | 68 | 308,256 | 55 | 36 | 60 |
| Room + guitar | 44 | 699,656 | 43 | 48 | 60 |
| Room + Marshall + guitar | 88 | 927,990 | 65 | 60 | 60 |
| Complete scene | 94 | 930,370 | 68 | 64 | 60 |
| Complete, debug helpers disabled repeat | 94 | 930,370 | 68 | 64 | 60 |
| Complete, axes/grid/bounds/lights enabled | 107 | 930,376 | 79 | 67 | 60 |

Debug helpers add 13 calls, 11 geometries, 3 textures, and only 6 triangles. They are not a production-route geometry bottleneck, but keeping them debug-only remains appropriate.

## 7. Loading and readiness timing

Representative local cached ranges at DPR 1 were:

| Stage | Observed range |
|---|---:|
| Room ready | 162.5–225.6 ms |
| PMREM/environment preparation | 68.5–72.8 ms |
| Placed asset setup | 234.3–260.5 ms |
| Complete scene ready / controls interactive | 480.2–546.4 ms |
| Estimated first complete textured frame | 496.9–563.1 ms |

These are development-local timings, not a public-network promise. The room could be shown earlier if placed assets were requested after the first room frame. The current combined Marshall/guitar file prevents those two objects from being independently lazy-loaded without generating separate derivative files.

## 8. Largest meshes

| Rank | Asset / mesh | Triangles | Share of complete source scene |
|---:|---|---:|---:|
| 1 | Guitar – Body Detail | 102,393 | 20.37% |
| 2 | Guitar – Neck | 60,172 | 11.97% |
| 3 | Marshall – amp body | 51,328 | 10.21% |
| 4 | Room – `node_0.001_Material.006_0` | 50,000 | 9.95% |
| 5 | Guitar – Strings | 49,296 | 9.81% |
| 6 | Guitar – Body Detail (second primitive) | 38,519 | 7.66% |
| 7 | Marshall – amp panel | 33,535 | 6.67% |
| 8 | Guitar – body bottom | 27,036 | 5.38% |
| 9 | Guitar – fretboard | 15,808 | 3.15% |
| 10 | Marshall – secondary material mesh | 13,886 | 2.76% |

The remaining ten entries in the machine-readable top-20 table are in `asset-metrics.json`. The largest MacBook mesh has only 848 triangles; its complete model is not a geometry concern.

## 9. Texture inventory and memory

The GPU estimate uses `width × height × 4 bytes × 1.33` for an RGBA8 mip chain. It is deliberately a comparable planning estimate, not an exact driver allocation.

- Room: 22 embedded PNG/JPEG textures. The largest is 4096×2048, 5.00 MiB compressed, and approximately 42.56 MiB decoded with mips. Most others are 1024×1024 or smaller.
- MacBook: four 2048×2048 maps. Each is approximately 21.28 MiB decoded with mips, totaling 85.12 MiB despite the compact 2.43 MiB GLB.
- Marshall: twelve 1024×1024 maps across three main material zones, totaling 63.84 MiB estimated.
- Guitar: twenty-four 1024×1024 maps across six material zones, totaling 127.68 MiB estimated.

No duplicate embedded-image byte hashes were found across the three GLBs. Reused texture references inside an asset are shared rather than duplicated. Runtime texture count is higher than raw room texture count because renderer environment/PMREM resources are included.

## 10. Geometry structure and duplication

The audit found no non-indexed primitives, morph targets, bones, skins, animations, multi-material geometry groups, duplicated geometry instances, or duplicate embedded image hashes. Each mesh contains one primitive, so imported source mesh count is also the source visible-pass draw count.

This rules out several easy fixes: there is no large non-indexed buffer to index, no duplicated geometry to instance, and no duplicated image byte payload to deduplicate. Meaningful savings require selective geometry reduction, shadow policy changes, texture delivery changes, or asset scheduling.

## 11. Materials and shader cost

Source materials are conventional PBR materials:

- Room: 17 MeshStandard materials, all opaque and double-sided.
- MacBook: 1 shared MeshStandard source material across 3 meshes.
- Marshall: 5 materials: 3 physical and 2 standard.
- Guitar: 8 materials: 7 physical and 1 standard.

The runtime comparison system retains source, original-clone, and refined-clone material sets. Approximately 46 placed-asset material objects can therefore remain in memory, while only 16 are active at a time. These sets share geometry and textures; their JavaScript/material-object overhead is small, although switching variants may leave more than one shader program compiled in the renderer cache.

Clearcoat and physical shading are concentrated on MacBook aluminium/display and guitar body/neck detail zones. Refined MacBook aluminium also uses material anisotropy, while texture anisotropy is applied to maps. None of these is the first-order bottleneck compared with the guitar's geometry and the aggregate texture footprint.

## 12. Shadow cost

The placed assets all cast shadows. This doubles their rendered triangle contribution and doubles their visible-pass draw calls in the measured state:

- MacBook: 1,190 source → 2,380 runtime triangles.
- Marshall: 114,167 source → 228,334 runtime triangles.
- Guitar: 309,867 source → 619,734 runtime triangles.

The guitar alone supplies approximately 66.6% of the complete scene's rendered triangles. If later visual review finds that selected guitar micro-detail meshes do not produce visible shadows at ordinary viewing distance, disabling shadows only for those submeshes could remove significant shadow work without changing visible geometry. That is a separate visual change and was not performed in this audit.

## 13. Hidden or low-value geometry candidates

These are candidates for a future derivative-asset pass, not approval to remove them now.

| Candidate | Potential source-triangle saving | Visual risk | Rationale |
|---|---:|---|---|
| Guitar strings and small hardware/detail subsets | 50k–110k | Medium | High density; much is sub-pixel outside close-ups. Preserve strings and defining hardware silhouettes. |
| Guitar body underside/back cover | 6k–25k | Low–medium | Partly occluded against the cabinet; visibility depends on orbit limits. |
| Marshall hidden rear/interior/small control geometry | 10k–25k | Medium | Some surfaces may never face the approved camera, but source names are not sufficient proof. |
| MacBook underside details | <100 | Low | Too little geometry to justify a special pass. |
| Room hidden geometry | 5k–10k uncertain | High | Generic source node names make semantic removal risky; the room is already modest. |

The room's 50,000-triangle mesh and the guitar's 102,393-triangle Body Detail mesh require visual/node mapping before any edit. Names alone are not reliable enough for destructive removal.

## 14. Per-asset decision

| Asset | Decision | Reason |
|---|---|---|
| Room | Keep geometry as-is | 77,410 triangles is reasonable for the primary environment. Consider delivery compression and selective texture work only. |
| MacBook | Keep geometry and texture resolution as-is | 1,190 triangles is negligible. Four 2048 maps support close-ups; GPU-compressed texture delivery is the useful optimisation. |
| Marshall | Light optimisation | Selectively reduce unseen rear/interior and overly dense panel details; keep cabinet/head silhouette and controls. Suggested 80k–95k source triangles. |
| Guitar | Moderate optimisation | It dominates geometry and shadows. Preserve body, neck, headstock, hardware identity, and close-up appearance while reducing micro-detail. Suggested 120k–180k source triangles after visual testing. |

No asset replacement is recommended. The approved look and verified physical placement can be preserved with derivative optimisation.

## 15. Optimisation options and trade-offs

### Mesh compression

Meshopt or Draco can reduce download bytes but does not reduce triangles, draw calls, or post-decode GPU vertex work. Meshopt is a good first candidate because it supports efficient decode and progressive delivery; Draco may compress geometry more strongly but has additional decode and pipeline complexity. Either requires a derivative-file workflow and browser QA.

### GPU-compressed textures

KTX2/Basis is the highest-confidence memory and transfer opportunity. Depending on the target GPU format and content, the current 399.83 MiB RGBA8 mip estimate could plausibly fall to roughly 60–140 MiB. Exact results require generated KTX2 files and device testing. Preserve the room's 4096×2048 image, MacBook 2048 maps, and Marshall/guitar 1024 maps initially; change encoding before changing resolution.

### Texture resizing

Do not reduce the MacBook's 2048 textures or Marshall/guitar 1024 atlases before close-up comparison. Small, non-focal room textures may tolerate 512–1024 resizing. Any resize must be assessed at the closest permitted official camera distance.

### Lazy loading

Render the room first, then load placed objects. This can improve first meaningful paint without changing final fidelity. Splitting the combined Marshall/guitar derivative would allow independent scheduling, but source files must remain untouched and the split must preserve transforms and identifiers.

### Draw-call reduction

Merging static meshes by material could reduce Marshall calls, but it weakens semantic identity, per-object visibility, material comparison, and future interactions. The guitar has only ten visible source draws, so merging it is not a priority. Geometry and texture delivery offer better value.

### Debug code splitting

The debug panel and spatial helpers are currently available to the route code even when the official route does not render their controls. A future dynamic import gated by `?debug=1` could reduce official-route JavaScript. This should be measured from the production bundle before implementation.

## 16. Stable IDs and interaction safety

Future optimized derivatives should not make interactions depend on generated GLB node or material names. Recommended approach:

1. Keep each placed object under its existing stable parent placement group and anchor transform.
2. Maintain an external manifest mapping a stable semantic ID to asset, anchor, role, and expected world-space bounds.
3. Set `userData.studioV2Id` on the stable parent or semantic child wrappers.
4. Let derivative internals change while keeping those external IDs and parent transforms unchanged.
5. Validate checksums, final world-space bounding boxes, floor/counter contact, camera framing, and interaction targets after every derivative build.

This allows safe decimation, mesh merging, or GLB splitting later without invalidating placement and interaction logic.

## 17. Proposed acceptance targets

These targets are intentionally conservative enough to preserve the accepted visual baseline:

| Metric | Current | Proposed target |
|---|---:|---:|
| Source triangles | 502,634 | 300k–350k |
| Runtime triangles with shadows | 930,370 | 600k–700k |
| Draw calls | 94 | 60–75 |
| Runtime textures | 64 | ≤64, with compressed GPU formats |
| Estimated GPU texture memory | 399.83 MiB | ≤150–200 MiB |
| GLB download | 73.16 MiB | 30–45 MiB |
| Desktop FPS | 60 measured | 60 sustained |
| Ordinary laptop FPS | Not yet measured | 50–60 average, ≥45 1% low |
| Public room-first-frame | Not yet measured | ≤1.5–2.0 s on warm broadband |
| Public interaction-ready | Not yet measured | ≤3.0 s on warm broadband |

Draw-call reduction should not be pursued at the cost of stable object identity. If the derivative retains 80–90 calls but meets frame, memory, and loading targets, that is acceptable.

## 18. Recommended next task and sequence

The next task should be a reversible derivative-asset optimisation spike, not an in-place scene rewrite.

1. Copy source GLBs into a generated derivative workspace; keep the original project source assets unchanged.
2. Convert embedded PNG/JPEG maps to KTX2/Basis at their current resolutions and measure actual download and GPU formats.
3. Generate a guitar derivative targeting 160k–180k triangles first. Reduce Body Detail, strings, and occluded underside selectively while preserving silhouette and close-up hardware identity.
4. Generate a light Marshall derivative targeting 80k–95k triangles, focusing only on verified hidden/rear/interior or excessive panel detail.
5. Apply Meshopt to derivative geometry and compare decode time and download size.
6. Optionally split Marshall and guitar derivatives for independent lazy loading while preserving stable parent IDs and transforms.
7. Test official and debug routes at the closest camera distance and on an ordinary integrated-GPU laptop.
8. Accept a derivative only if screenshots, world bounds, anchor placement, material comparison, shadows, camera constraints, and interactions match the approved baseline.

Primary risk: aggressive guitar reduction can flatten strings, pickup hardware, fretboard detail, and the Les Paul body edge in close views. Secondary risk: compressed normal/metal-roughness maps can show block artifacts or altered specular response. Keep each optimisation reversible and compare against the current GLB checksum baseline.

## Verification status

- Production build: PASS — `npm run build` completed with Vite 7.3.6 (503 modules transformed). The existing >500 kB chunk advisory remains a warning, not a failure.
- Official route visual/interaction regression: PASS — `/studio-v2-import-test` loaded the approved room, MacBook, Marshall, and guitar composition with only the accessible canvas image in the DOM and no visible controls.
- Debug route controls/helpers regression: PASS — `/studio-v2-import-test?debug=1` retained runtime, material comparison, spatial placement, camera, collision, and helper controls; the measured complete state remained 94 calls / 930,370 triangles / 68 geometries / 64 textures.

Machine-readable evidence:

- `asset-metrics.json`: source GLB inventory, mesh/material/texture details, category totals, hashes, and top meshes.
- `runtime-metrics.json`: browser runtime isolation counts, timing samples, and viewport metadata.

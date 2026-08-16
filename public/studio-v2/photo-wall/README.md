# Fred Studio V2 photo-wall workflow

1. Place original JPG, JPEG, PNG, or WebP files in `source/` without renaming or
   modifying them. This directory is local-only and Git-ignored apart from its
   `.gitkeep`; commit the web-ready derivatives from `generated/` instead.
2. Run `npm run photos:intake` to scan dimensions and merge new photographs into
   `manifest.json`. Existing IDs and manual configuration are preserved.
3. Run `python3 scripts/generate-studio-v2-photo-derivatives.py` from the project
   root to create 1920px, colour-normalized display derivatives in `generated/`.
   The generator preserves aspect ratio, handles multi-picture JPEG sources,
   and rejects blank or near-solid output. Run it with `--check` to validate
   existing derivatives without changing them. The root-level
   `packagingMode: "all-polaroid"` normalizes every placed photo to the same
   instant-print family while preserving legacy per-entry metadata. The
   root-level `normalizedSize` applies one physical size family to every placed
   slot without removing the compatible per-entry size fields.
4. Use `x` and `y` as the photograph's visual center in normalized cork-surface
   coordinates: `(0,0)` is top-left and `(100,100)` is bottom-right. Leave both
   values `null` to keep a photograph unplaced. `rotation` is in degrees and
   `zOrder` creates a subtle overlap-depth offset.
5. Any enabled entry with finite `x` and `y` values is rendered. The current V1
   arrangement places all real photographs for visual review and remains editable
   entirely through the manifest. Positioned manifest order defines stable slot
   numbers `01–39`; swapping photo content fields between two entries preserves
   each slot's `x`, `y`, `size`, `rotation`, and `zOrder`.
6. Use `?debug=1&photoWallReview=1` for the clean frontal review. Append
   `&photoSlots=1` for slot numbers, `&photoGrid=1` for the coordinate grid, or
   `&debugPanel=1` to restore the full runtime panel. These overlays and controls
   cannot be enabled on the normal production route.

The runtime reads image dimensions, derives aspect ratio and orientation, and
generates lightweight Three.js paper geometry. No per-photo GLB is required,
and the manifest may contain any number of entries.

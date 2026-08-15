# Fred Studio V2 photo-wall workflow

1. Place original JPG, JPEG, PNG, or WebP files in `source/` without renaming or
   modifying them.
2. Run `npm run photos:intake` to scan dimensions and merge new photographs into
   `manifest.json`. Existing IDs and manual configuration are preserved.
3. Create web-ready display derivatives in `generated/` only when needed.
   Preserve the original aspect ratio and avoid destructive cropping. `style`
   defaults to `print`; use `polaroid` only when explicitly desired.
4. Keep `x`, `y`, `rotation`, and `zOrder` reserved for the later coordinate and
   composition stage. The current fixture collection is a temporary packaging
   validation preview, not the final board layout.

The runtime reads image dimensions, derives aspect ratio and orientation, and
generates lightweight Three.js paper geometry. No per-photo GLB is required,
and the manifest may contain any number of entries.

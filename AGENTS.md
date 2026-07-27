# Personal Website Working Agreements

## Safety

- Work on feature branches. Do not modify `main` directly.
- Do not push, merge, publish, deploy, or change DNS without explicit approval.
- Preserve `CNAME` and its value, `jasoncoolcocobobo.com`.
- Preserve existing Git configuration and online files.
- Treat `source_assets/` as local, read-only source material. Never overwrite,
  crop, recompress, rename, delete, commit, or upload its original files.
- Keep `source_assets/` and `90_Backup/` ignored by Git.
- Store web-ready image derivatives in `public/images/`.

## Architecture

- Use React, Vite, JavaScript, npm, Motion, and ordinary CSS.
- Keep Vite `base` set to `/` for the custom-domain GitHub Pages site.
- Do not add a large UI library or Three.js without a confirmed requirement.
- Put editable site copy, chapter labels, and profile links in
  `src/data/siteContent.js`.
- Keep components focused and preserve the chapter structure: Home,
  Footprints, Lab, and Thanks.

## Quality

- Build mobile behavior intentionally; do not merely shrink desktop UI.
- Support keyboard navigation, focus visibility, ARIA, and
  `prefers-reduced-motion`.
- Run `npm run build` after implementation and inspect task-related changes.
- Do not invent personal links or biographical copy. Use `AVAILABLE SOON` when a
  real destination is not provided.

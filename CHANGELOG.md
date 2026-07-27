# Changelog

## 0.1.0 — 2026-07-27

### Added

- React and Vite JavaScript foundation using npm and Motion.
- Full-viewport Home chapter with responsive full-bleed hero photography.
- Sequenced, reduced-motion-aware loading and editorial text animation.
- Desktop chapter rail and purpose-built mobile chapter menu.
- Accessible, keyboard-operated Profile Drawer with scroll lock and focus
  management.
- Configurable desktop-only hero micro-parallax with reduced-motion and
  touch-device safeguards.
- Centralized site copy, chapter metadata, and profile link configuration.
- Real phone, email, GitHub, Instagram, and LinkedIn destinations.
- Session-only WeChat reveal and copy interaction with inline confirmation.
- Responsive web image derivatives while preserving the original source.
- Vite public-directory CNAME mirror for future GitHub Pages builds.
- Project, design, safety, and source-asset documentation.
- Local pre-V0.1 backup under `90_Backup/`.

### Preserved

- Existing `CNAME` and custom domain configuration.
- Existing Git history and `main` branch.

### Changed

- Reduced Home to the photograph, name, chapter navigation, and scroll prompt.
- Replaced the light Profile Drawer with a floating dark glass contact panel.
- Refined Profile proportions with a 52px desktop title, 15px contact values,
  compact rows, and a clamped 420–520px desktop width.
- Added layered glass edge lighting and restrained 180ms contact-row
  hover/focus feedback.
- Harmonized contact values with the site font at 15px/500 and introduced a
  quieter unrevealed WeChat status.
- Kept the glass surface permanently mounted behind a transform-only motion
  wrapper, eliminating first-open backdrop-filter initialization flashes.
- Shortened the drawer motion to a 24px/0.992 entrance and 16px/0.995 exit,
  synchronized with a static 12% overlay.
- Preloaded and decoded responsive hero imagery before starting a 1.5-second
  photo → chapter navigation → name → scroll entrance sequence.
- Applied Barlow Condensed 700 to both `JASON LI` headings with a condensed
  system-font fallback stack and font-readiness gating.
- Removed the black loading cover in favor of a static blue-gray pre-image
  canvas and a subtle decoded-image fade.
- Removed biography, location, and supporting copy from Home and Profile.
- Increased the Profile glass base to `rgba(22, 22, 26, 0.50)` with `36px`
  blur, reducing background detail while preserving the existing edge and
  depth treatment.
- Slowed the decoded-photo, chapter, masked-title, and scroll entrance into a
  restrained 2.78-second sequence.
- Extended Profile Drawer motion to a synchronized 0.62-second opening and
  0.37-second closing while keeping the glass surface permanently rendered.
- Increased the Profile glass base again to `rgba(18, 18, 22, 0.70)` with
  `44px` blur and `140%` saturation, while reducing the page overlay to 8%.
- Expanded the Home entrance into a four-stage 4.65-second photo, chapter,
  title, and scroll sequence.
- Slowed the Profile Drawer to a synchronized 0.88-second opening and
  0.49-second closing, using shorter transform distances without adding delay.
- Deferred the Drawer's initial focus by one animation frame so the close
  control reliably receives focus after the permanently mounted overlay becomes
  visible.

### Not included

- Footprints, Lab, and Thanks chapter content.
- Downloadable CV.
- Deployment, publishing, merging, or remote changes.

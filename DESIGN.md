# Jason Li Personal Website — Design System

## Site structure

The site is organized as four editorial chapters:

1. **01 HOME** — full-screen introduction and profile access.
2. **02 FOOTPRINTS** — reserved for a future place-based exploration; no globe
   or Three.js dependency is included in V0.1.
3. **03 LAB** — reserved for selected projects, systems, and experiments.
4. **04 THANKS** — reserved for acknowledgements and a closing moment.

Only Home is active in V0.1. Future chapters remain visible as quiet orientation
markers and never navigate to empty pages.

## Home visual rules

- The first view occupies `100svh` and uses the portrait photograph as a
  full-bleed background.
- The composition is a single photographic field, not a split layout, card
  grid, or slide.
- The normal Home state contains only the full-bleed photograph, `JASON LI`,
  chapter navigation, and the quiet scroll indicator.
- The name is large, restrained, editorial, and anchored over the image without
  tracking the pointer.
- Home and Profile use `Barlow Condensed` at weight 700 for `JASON LI`. The
  fallback stack is `Arial Narrow`, `Helvetica Neue Condensed`,
  `Roboto Condensed`, `Helvetica Neue`, Arial, and sans-serif. All navigation
  and contact text remains on the site's system sans-serif stack.
- No subtitle, location line, biography, or supporting paragraph appears on
  Home.
- Dark overlays exist only to protect legibility while preserving the
  photograph's texture and color.
- Desktop uses `object-position: 50% 54%`; mobile uses `47% 50%` to retain the
  subject in the much narrower crop.

## Animation sequence

The desktop and mobile hero derivatives are preloaded with media-specific
`<link rel="preload" as="image">` entries. The entrance begins only after the
selected image has fired `load`, completed `decode()`, and Barlow Condensed 700
has resolved through `document.fonts.load()`. The font stylesheet is connected
early with Google Fonts preconnect hints, so visible headings do not swap after
their reveal.

The timeline starts when those assets are ready:

1. `0.00s`: the decoded photograph fades from opacity 0 to 1 and settles from
   scale `1.02` to `1`.
2. `1.10s`: the photograph is stable after a restrained 1.10s fade and scale
   settle.
3. `1.30s`: chapter rows enter from top to bottom with 7px vertical movement,
   150ms row spacing, and no text splitting. `SOON` follows its row by 150ms;
   the full chapter rail settles at approximately `2.20s`.
4. `2.50s`: `JASON LI` reveals as one masked element over 1.10s.
5. `3.90s`: the scroll indicator begins a simple 0.75s fade, completing the
   full entrance at approximately 4.65s.

There is no loading cover and no animated background color, blur, or
backdrop-filter. A static blue-gray canvas prevents white or black flashes
before the decoded photograph is composited.

All motion uses soft easing without bounce. With `prefers-reduced-motion`, the
same content is presented almost immediately and movement is removed.

### Optional hero micro-parallax

`siteContent.home.hero.enableHeroParallax` controls the desktop background
experiment. When enabled, fine-pointer desktop devices can move the photograph
by at most 6px horizontally and 4px vertically. Motion springs add restrained
inertia, and pointer exit returns the image gradually to center.

The parallax wrapper remains unrotated at a `1.03` scale while the experiment is
active; the inner image independently performs the initial `1.02` to `1`
settling animation. Touch devices, viewports below 1024px, coarse pointers, and
`prefers-reduced-motion` always receive the static version. Setting the option
to `false` removes all pointer movement and restores the original static hero
behavior without changing the loading sequence.

## Chapter navigation

- Desktop navigation is vertically centered at the left edge.
- Each desktop row reveals its number and name together; rows stagger by 150ms
  and their quieter `SOON` labels follow after 100ms.
- Home has a clear rule marker and full-opacity label.
- Future chapters are lower contrast and include `SOON`.
- Future entries are intentionally non-interactive.
- Mobile uses a top chapter control and expandable compact list instead of a
  scaled-down desktop rail.

## Profile Drawer

- The name is the profile trigger and exposes a dialog from the right.
- Desktop uses a floating right panel with viewport spacing and a `32px` corner
  radius and `clamp(420px, 34vw, 520px)` width. Mobile is near-full-screen with
  a small safe-area margin.
- Desktop typography uses a `52px` title, `15px`/`500` contact values, and `9px`
  uppercase labels with restrained tracking. Mobile scales the title and values
  independently for readability. Contact values use the site's inherited font
  at roughly 90% white so they remain clear without overpowering the labels.
- The Profile title shares the Home title's Barlow Condensed 700 family,
  `-0.02em` tracking, and `0.88` line height while remaining much smaller.
- The panel combines an `rgba(18, 18, 22, 0.70)` dark neutral base with a very
  low-contrast 145-degree surface gradient: the upper-left is slightly brighter
  and the lower-right slightly darker. It uses `44px` backdrop blur and `140%`
  saturation. A denser lower-right glass tint further suppresses large
  background lettering without turning the panel opaque.
- A fine translucent border, paired inset light and dark edges, plus a
  pointer-transparent `::before` highlight along the top and left create subtle
  glass thickness. Soft layered outer shadows separate the panel from the
  photograph without producing a glow.
- The backdrop only slightly darkens the Home image with a static 8% black
  surface and never applies an additional blur.
- The panel contains only the `JASON LI` title and a restrained vertical contact
  list. It has no biography, location, or explanatory paragraphs.
- Phone and email use their native contact schemes. GitHub, Instagram, and
  LinkedIn open safely in a new tab. CV is non-interactive until a real file is
  supplied.
- WeChat begins as `CLICK TO REVEAL`. The first activation reveals the ID;
  later activations copy it and briefly announce `COPIED` without a dialog. The
  unrevealed prompt uses the same value typography at lower contrast; the
  revealed ID returns to the normal information style.
- Interactive contact rows remain visually flat at rest. Hover and
  `focus-visible` add a faint translucent white surface, move the row no more
  than `3px` to the right, and slightly brighten both label and value over
  `180ms`. CV remains dim and receives no interactive treatment.
- Close button, backdrop click, and Escape all close the drawer.
- The overlay, motion wrapper, and inner glass surface remain mounted while the
  page is active. When closed they use `opacity: 0`, `visibility: hidden`,
  `pointer-events: none`, `aria-hidden`, and `inert`; this avoids rebuilding the
  browser's backdrop-filter layer on every open.
- The outer wrapper alone animates opacity and transforms. It opens from
  `opacity: 0`, `x: 20px`, and `scale: 0.994` to rest over `0.88s` using
  `cubic-bezier(0.22, 1, 0.36, 1)`. It closes over `0.49s` toward
  `opacity: 0`, `x: 14px`, and `scale: 0.996`, then resets invisibly for the next
  open. The overlay starts simultaneously and shares the `0.88s` opening and
  `0.49s` closing durations.
- The inner surface owns all glass background, backdrop blur, border, edge
  highlight, and shadow styles from its first frame. None of those properties
  are animated or transitioned. The motion wrapper is compositor-prepared with
  `will-change: transform, opacity` and `translateZ(0)`.
- Reduced-motion mode removes translation and scaling and retains only a
  near-instant opacity change.
- Background scrolling is locked while open.
- Focus moves into the drawer, is trapped within it, and returns to the title
  trigger after close.
- Dialog semantics and accessible labels are required.

## Mobile rules

- Preserve a minimum useful viewport and safe-area spacing.
- Keep the subject centered independently of desktop framing.
- Left-align the name for narrow screens and keep it at an editorial, readable
  scale.
- Replace the side rail with the compact chapter control.
- Render the glass profile panel near-full-screen with safe margins,
  touch-friendly rows, and wrapping for long contact values.

## Source asset protection and derivative generation

`source_assets/hero-original.jpg.jpeg` is the read-only source. It remains
unchanged and is excluded from Git.

The V0.1 derivatives were produced locally with macOS `sips`; neither is
cropped:

```sh
sips -Z 2400 -s format jpeg -s formatOptions 84 \
  source_assets/hero-original.jpg.jpeg \
  --out public/images/hero/jason-li-hero-2400.jpg

sips -Z 1440 -s format jpeg -s formatOptions 82 \
  source_assets/hero-original.jpg.jpeg \
  --out public/images/hero/jason-li-hero-1440.jpg
```

The desktop derivative is `2400×1591` at about 1.2 MB. The mobile derivative is
`1440×954` at about 296 KB. A checksum comparison against the pre-V0.1 backup
confirmed the source file was unchanged.

The original root `CNAME` is retained unchanged. `public/CNAME` mirrors the same
domain so Vite includes it in a future `dist/` deployment artifact.

## Future extension

- **Footprints:** add a data-led geographic experience only after its interaction
  model and performance budget are approved.
- **Lab:** introduce a reusable project data model before creating project
  views.
- **Thanks:** create a quiet closing chapter that follows the same typographic
  and motion system.
- Keep future chapters driven by `siteContent.js` and add dependencies only when
  their implemented features require them.

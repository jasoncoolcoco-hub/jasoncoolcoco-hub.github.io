# Changelog

## Unreleased

### Added

- One-time Footprints life-line activation sequence: Huizhou base,
  Huizhou–Changchun growth, Changchun base, Changchun–Kuala Lumpur growth, and
  Kuala Lumpur base.
- Ease-in-out cubic route growth using synchronized index draw ranges on the
  approved core and glow TubeGeometry.
- One restrained, slow draw-range energy highlight per completed primary route.
- Reduced-motion completion state with no growth sequence or continuous energy
  movement.
- Sixteen unique Footprints destinations connected by seventeen Earth-local
  secondary routes, including one shared Seoul node reached from Changchun and
  Kuala Lumpur.
- Thirty sorted visit-month records stored on explicit route records, retaining
  each visit's origin-base relationship without duplicating destination nodes.
- Distance-mapped cool-blue secondary arcs and compact tangent-plane
  destination nodes with shared materials and correct Earth depth occlusion.
- Kuala Lumpur initial-view quaternion derived from its real surface vector,
  with centralized `-10°` yaw and `+3.5°` pitch composition offsets that retain
  East Asia above Kuala Lumpur while bringing Hawaii to the Pacific limb.
- Hysteresis-based external Footprints entry detection at 55%/8%, allowing one
  replay per genuine section entry without resets from zoom, drag, resize, or
  React rerenders.
- Coordinated secondary route growth in `firstVisit` order: `150ms` staggering
  for Changchun and `130ms` for Kuala Lumpur, with cached-curve-length growth
  durations between `700ms` and `1850ms`.
- One restrained `320ms` destination-node activation when each route arrives.
- Reduced-motion entry that keeps the Kuala Lumpur composition and directly
  exposes the complete static route state.
- Earth-local HTML label anchors for all three bases and sixteen destinations,
  including hysteresis-stabilized front-face visibility and automatic
  camera projection during rotation, drag, zoom, scroll, and resize.
- Place labels that show restrained English names by default and
  expand to Chinese names plus visit months derived from the canonical
  `visits` arrays only when selected.
- Single-place selection through destination/base nodes or their English labels,
  with blank-space and Escape clearing plus rear-Earth hit rejection.

### Changed

- Corrected Footprints label drift by sizing both renderer and projection from
  the Earth mount's transform-independent layout dimensions instead of a
  Motion-scaled bounding rectangle.
- Bound every base and destination label to its actual rendered node-dot Mesh,
  then derived front-face visibility and 2D overlay coordinates from the
  Mesh's live world position on every frame.
- Added an off-by-default, development-only
  `?footprints-label-debug=1` anchor cross with place ID and projected
  coordinates for validating node-to-label binding.
- Separated destination identity from secondary-route visit history so one
  destination can safely connect to multiple bases while existing single-route
  labels continue deriving the same compact visit display.
- Added Hong Kong, Macau, Taipei, Tokyo, and Seoul with six new secondary
  routes and eleven new visit-month records. Seoul selection highlights only
  its two incoming routes and groups visits by origin base.
- Kept the unchanged `0.0277rad/s` globe rotation active throughout the
  complete route-entry timeline. The renderer derives its start quaternion
  from the Malaysia–Asia target and the timeline's actual duration, arriving
  without pause, speed easing, reverse motion, or completion snapping.
- Retained the intro interaction lock for zoom, drag, and keyboard orientation
  while allowing page scroll and the constant-speed globe rotation to continue.
- Replaced the former circular desktop render boundary with a transparent
  `84vw × 100svh` scene surface (`92vw` on compact desktops), removing the
  right-edge canvas clipping that truncated enlarged atmosphere and route glow.
- Constrained Explore zoom with separate `1.04` atmosphere and `1.10` route
  visual radii plus at least `24px` browser-edge padding, while preserving the
  requested `1.70` target wherever the viewport can safely contain it.
- Added a restrained Earth-local Explore framing correction of `x: -0.08` and
  `y: -0.045`; navigation, grain, section layout, and canvas position remain
  fixed.
- Replaced runtime label collision shifting with one permanent 2D offset per
  place; expanded details grow below a fixed English-name anchor without moving
  it.
- Separated Huizhou and Hong Kong with opposing fixed label offsets while
  preserving their real 3D anchors and selected-state positions.
- Removed all route hit geometry, route hover, hover dimming, and cross-endpoint
  reactions. Selecting a destination now brightens only its own secondary route
  and node, while every unrelated route, node, and base remains unchanged.

### Preserved

- Approved Earth geometry, camera, lighting, materials, interaction, route
  shape, primary-node coordinates, primary-route appearance and animation, and
  depth occlusion.

## 0.2.0 — 2026-07-28

### Added

- Full-screen Footprints chapter with a black cinematic field and restrained
  CSS grain.
- Scroll-linked Home darkening plus globe entrance, settled, and reverse-exit
  states.
- Official-example-based Three.js TSL Earth with realistic local day, night,
  cloud, roughness, bump, city-light, and atmosphere textures.
- WebGPU rendering with automatic WebGL2 backend fallback and an error-only
  static poster fallback.
- State-specific quaternion controls, keyboard accessibility, and globe-only
  two-preset zoom.
- Five independent Footprints layers for background, chapter navigation, globe,
  future Photo Space, and future Memory Transition.
- Explicit `GLOBE_IDLE`, `GLOBE_SELECTED`,
  `ENTERING_MEMORY`, `PHOTO_SPACE`, and `EXITING_MEMORY` scene states.
- Slow idle rotation, visibility-aware frame pausing, capped pixel ratio,
  reduced-motion behavior, and reduced 2048px textures for mobile or
  lower-capability devices.
- Third-party source, licence, and texture attribution documentation.
- Maintainable base-location and primary-route configuration for Huizhou,
  Changchun, and Kuala Lumpur.
- Static Earth-local base nodes with a bright point, tangent ring, and
  restrained halo.
- Static elevated Huizhou–Changchun and Changchun–Kuala Lumpur life routes,
  built from spherical interpolation, a sinusoidal altitude profile,
  Catmull–Rom curves, and two-layer TubeGeometry.

### Changed

- Made the chapter navigation derive its active state from the visible chapter,
  including the compact mobile control.
- Marked Footprints as available while keeping Lab and Thanks in the `SOON`
  state.
- Lifted shadow-side detail with restrained hemispheric and ambient fill while
  preserving the natural day-night transition and subtle city lights.
- Shifted the viewer-facing composition toward the darker hemisphere while
  keeping ocean, land, cloud, atmosphere, and city-light detail readable.
- Replaced object-group zoom with Earth-camera distance zoom, keeping material
  world space stable and eliminating the zoom-black failure.
- Set a `1.70` requested Explore zoom while deriving the actual maximum from
  live canvas dimensions, camera FOV, and a safety margin so the globe cannot
  be clipped on smaller viewports.
- Replaced continuous globe wheel and pinch zoom with a desktop-only,
  empty-globe double-click toggle between the approved `1.00` and responsive
  maximum
  camera-distance presets, with Enter and Space as keyboard alternatives.
- Reframed both normal and enlarged Earth states on the right at the same `8vw`
  desktop offset (`4vw` on narrower desktops), removing all extra horizontal
  movement during enlargement.
- Split idle rotation into a faster `0.0277` radians-per-second Default rate and
  a calmer `0.0147` Explore rate, blended over `0.58s`.
- Corrected Explore horizontal drag so the visible surface follows the pointer
  direction while retaining the approved local-axis constraint.
- Added direct, restrained Explore vertical drag with an absolute `±18°`
  transformed-axis pitch clamp.
- Reduced Explore horizontal and vertical sensitivity again to `0.42` and
  `0.32` multipliers for more precise close inspection without affecting
  Default automatic rotation.
- Added exponential drag-target damping at rate `14`, producing a short,
  non-inertial catch-up of about `0.16s` without bounce or orientation reset.
- Preserved the wide-screen canvas safety area and calibrated camera distances
  while allowing the responsive maximum to approach the largest unclipped
  framing.
- Removed edge sparkle by increasing limb geometry resolution, reducing bump
  strength, raising roughness, stabilizing atmosphere alpha/depth compositing,
  and reducing the background grain contribution.
- Disabled Default manual rotation and removed its trackball, pre-drag
  quaternion, and restoration states; Default now supports automatic rotation,
  native scrolling, and the empty-globe size toggle only.
- Kept Explore drag orientation permanent and removed all pre-enlarge snapshots,
  hard resets, and exit-pose restoration; shrinking still changes camera
  distance and rotation-speed target only.
- Restored native mouse-wheel, trackpad scroll, and browser pinch behavior over
  the canvas; mobile now keeps a fixed, non-draggable `1.00` globe and native
  vertical page scrolling.
- Added a drag-distance guard so globe rotation cannot accidentally trigger the
  size toggle, while keeping deliberate double-click zoom immediately available
  and future routes and nodes retain priority through a reserved interaction
  marker.
- Isolated navigation and background from every Globe Scene and camera
  transform, with documented normal and transition-only z-index order.
- Removed the DOM pulse-pin, cluster, label, and focus-to-expand system.

### Removed

- Removed the earlier Kuala Lumpur–Singapore validation route and its dormant
  placeholder configuration.

### Deferred

- Touch destination selection, spatial Photo Space, memory tunnel, photo colour
  extraction, and transition animation remain deferred.

### Preserved

- Approved Home V0.1 visual implementation, Profile Drawer, custom domain, and
  deployment configuration.

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

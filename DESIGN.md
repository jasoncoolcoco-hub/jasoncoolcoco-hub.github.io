# Jason Li Personal Website — Design System

## Site structure

The site is organized as four editorial chapters:

1. **01 HOME** — full-screen introduction and profile access.
2. **02 FOOTPRINTS** — active V0.2 foundation for a place-based globe
   experience.
3. **03 LAB** — reserved for selected projects, systems, and experiments.
4. **04 THANKS** — reserved for acknowledgements and a closing moment.

Home and Footprints are implemented. Lab and Thanks remain visible as quiet
orientation markers and never navigate to empty pages.

## Footprints V0.2 foundation

- Footprints follows Home as a full-viewport, sticky cinematic chapter on a
  blue-black base. An extremely low-contrast CSS grain layer prevents the black
  field from feeling digitally flat without introducing a visible texture tile.
- Home remains intact inside an outer transition shell. As the reader leaves
  Home, a non-interactive black veil gradually darkens the approved hero before
  the Footprints stage reaches the viewport.
- The Footprints chapter uses a `320svh` scroll range. The globe arrives from
  below and at reduced scale, settles near the center, then reverses upward and
  into the distance near the end of the chapter.
- Entrance rotation is restrained to approximately 150 degrees. The reverse
  exit adds approximately 150 degrees in the opposite chapter direction.
  During the settled state the globe rotates slowly. Interaction behavior is
  explicitly separated by size state: Default is a calm automatic presentation
  with no manual rotation, while enlarged quaternion controls permanently
  update the current orientation.
- The left navigation receives an explicit chapter ID, so `02 FOOTPRINTS`
  becomes active only within the Footprints stage. Home remains active in the
  Home stage; Lab and Thanks retain their quiet `SOON` treatment.
- The primary V0.2 renderer directly adapts the official Three.js
  `webgpu_tsl_earth` example into a reusable React lifecycle. It uses
  `WebGPURenderer`, TSL node materials, local 4096×2048 day/night/surface
  textures, day-night mixing, cloud and roughness channels, bump mapping, city
  lights, and a back-face atmosphere shell. No example webpage, iframe,
  screenshot, video, Inspector, or debug GUI is embedded.
- Three.js is pinned to `0.185.0`. The renderer code is dynamically imported
  when the globe approaches the viewport, so the large renderer chunk is not
  part of the initial Home execution path.
- The Earth is cooler than the source example: blue-black water, desaturated
  cool land, restrained warm city lights, and a cold-blue atmospheric rim. The
  hidden upper-left sun is moved slightly behind the camera-facing plane so the
  globe's central impression is night-oriented. A weak hemispheric and ambient
  cold fill plus a texture-derived shadow surface preserves ocean, land, cloud,
  and city-light detail without flattening the day-night terminator.
- The premium limb treatment uses 96-segment sphere geometry, restrained bump
  strength (`0.36`), and a `0.38–0.54` roughness range so cloud and surface
  normals do not create sub-pixel specular sparkle at the silhouette. The
  atmospheric back-face shell disables depth writing, uses alpha-to-coverage,
  and premultiplies its transparent output for a stable soft rim without bright
  RGB leakage. Background grain remains present at `0.09` opacity but is too
  quiet to read as edge snow through the translucent atmosphere.
- `WebGPURenderer` uses WebGPU when available and automatically falls back to
  its WebGL2 backend. Renderer initialization, texture loading, or unsupported
  graphics failures reveal a static poster captured from this integrated Earth
  renderer. The fallback never appears during normal loading or successful
  rendering.
- There are no stars, dense networks, pulse-marker fields, or dashboard
  decoration. Geographic labels remain a restrained HTML overlay rather than a
  texture or 3D dashboard layer.

### Independent scene layers

The sticky Footprints viewport contains five sibling layers rather than one
shared transformed wrapper:

1. `FootprintsBackground` — near-black tint and grain, z-index token `0`.
2. `ChapterNavigation` — fixed chapter UI, normal z-index token `30`.
3. `GlobeScene` — scroll entrance/exit wrappers and Earth canvas, normal
   z-index token `20`.
4. `PhotoSpace` — empty, hidden future boundary, z-index token `25`.
5. `MemoryTransition` — empty, hidden future overlay, z-index token `50`.

Manual zoom changes only the dedicated Three.js Earth camera distance. The
navigation, background, Photo Space, and transition layers are siblings of the
globe layer and cannot inherit its camera, canvas, or Motion transforms.
During the future `ENTERING_MEMORY` state only the Globe Scene z-index rises to
`40`; the navigation stays physically fixed at `30` and may fade to `58%`
opacity over 280ms before the transition overlay takes control.

The Footprints scene state uses `GLOBE_IDLE`, `GLOBE_SELECTED`,
`ENTERING_MEMORY`, `PHOTO_SPACE`, and `EXITING_MEMORY`.
Idle and single-place selection are active now. Place controls use
`data-globe-interactive="true"` so their selection action takes priority over
the empty-globe zoom gesture. The three memory states currently define only
layer ownership, pointer behavior, and control disabling; they do not render a
tunnel or photo experience.

### Route data

`src/data/locations.js` defines Huizhou, Changchun, and Kuala Lumpur as the
approved origin, stage, and current bases. `src/data/routes.js` connects them
with stable IDs and keeps every altitude, radius, colour, opacity, and node-role
parameter outside the renderer.

`geoToVector3.js` converts latitude and longitude into the same local spherical
coordinate system used by the Earth textures. `createRouteCurve.js` samples the
shortest spherical direction and raises it with
`sin(pi * progress) * maxAltitude` before constructing a centripetal
Catmull–Rom curve. `createFootprintsRouteLayer.js` builds the two persistent,
double-layer TubeGeometry routes and the three tangent-plane base nodes.

The Huizhou–Changchun route peaks at `0.145` Earth radii and the longer
Changchun–Kuala Lumpur route peaks at `0.22`. Their core radii are `0.0023` and
`0.0024`; restrained transparent glow shells use `3.0` and `3.1` times those
radii. The complete layer is a child of the Earth visual group, so camera zoom,
scroll rotation, automatic rotation, and Explore drag preserve geographic
alignment. Earth and core routes write depth normally; transparent halo and
glow materials keep depth testing enabled but do not write depth, allowing the
Earth to occlude every rear-facing segment without transparent-layer artifacts.

The life-line activation uses the existing renderer frame loop. Its approved
primary timings remain unchanged: it waits `800ms`, activates Huizhou over
`420ms`, pauses `160ms`, grows Huizhou–Changchun over `1450ms`, activates
Changchun over `420ms`, later pauses `220ms`, grows Changchun–Kuala Lumpur over
`2050ms`, and activates Kuala Lumpur over `450ms`. After the last secondary
destination activation, the completed route composition remains unchanged for
`520ms` while the globe continues at the same normal angular speed.

Growth uses an ease-in-out cubic value to update the existing core and glow
TubeGeometry index draw ranges together. No route geometry or material is
allocated per frame, and the final draw range is identical to the approved
static route. Node activation interpolates the existing group from `0.85` to
`1` scale while bringing its point, tangent ring, and halo to their configured
final opacity.

After completion, each route has one preallocated, depth-tested highlight tube
whose draw-range window moves in the approved route direction. The short route
uses a `10%` window over `5.4s`; the long route uses a `12%` window over `6.2s`
with a `0.22` phase offset. Each segment fades at the loop boundary, and the
base core and glow remain unchanged beneath it.

### Secondary destinations and routes

`src/data/destinations.js` is the single source of truth for sixteen unique
ordinary places. It owns only place identity, display names, coordinates, and
role; visits and origin-base relationships belong to explicit route records in
`src/data/secondaryRoutes.js`. The seventeen routes contain thirty visit-month
records. This separation allows one Seoul node to serve both
Changchun–Seoul and Kuala Lumpur–Seoul without duplicating its coordinates,
node, or label.

Development validation rejects duplicate destination IDs, route IDs,
base/destination route pairs, duplicate or unsorted visit months, missing
destinations, and unknown bases. Route helpers derive per-destination route
groups and aggregate visits for existing label behavior without creating a
second source of visit data.

`src/data/secondaryRoutes.js` also centralizes the secondary altitude,
geometry, colour, opacity, and node tokens. `createSecondaryRouteLayer.js`
reuses the primary layer's
latitude/longitude conversion and shortest-direction spherical curve
generator. Route height maps angular distance through a square-root curve from
`0.045` to `0.13` Earth radii, keeping nearby Southeast Asian arcs low while
allowing Chicago, Hawaii, and Los Angeles to clear the globe without competing
with the primary life line.

The secondary route core uses `#78c8ff` at `0.68` opacity and a radius of
`0.00135` Earth radii. Its `#4a9bd8` glow uses `0.09` opacity and `2.4` times
the core radius. Ordinary destination nodes use a `0.0025`-radius dot, a
`0.0048–0.0063` tangent ring, and a restrained `0.0105` halo, all expressed
relative to the Earth radius. Shared materials and node geometry keep the
seventeen-route layer lightweight; route segment counts vary from `40` to `92`
according to angular distance.

Secondary routes join the same draw-range animation controller as the primary
life line. Changchun routes begin Seoul, Chicago, Vladivostok in `firstVisit`
order with a `150ms` stagger. Kuala Lumpur routes are sorted by each route's
`visits[0]` and start with a `130ms` stagger; equal dates preserve route
configuration order, including Tokyo before Seoul and Hawaii before Los
Angeles. Route duration is derived from cached curve length and clamped to
`700–1850ms`.

Each destination begins one `320ms` point/ring/halo activation after its first
incoming route arrives. When multiple routes share a destination, the node
controller keeps the maximum completed activation progress, so the later route
cannot reset an already visible Seoul node. Repeated visit months never create
another geometry or animation. Secondary routes have no continuing energy
movement or photo-space behavior. Their destination labels and single-place
selection are described below. Reduced motion exposes the complete static layer
immediately.

The whole secondary layer is a child of the existing Earth-local route group,
so automatic rotation, Explore drag, camera-distance zoom, resize, and scroll
composition cannot separate it from the globe. Core, glow, dot, ring, and halo
materials keep depth testing enabled. Transparent materials do not write depth,
allowing the Earth depth buffer to hide rear-facing routes and nodes without
creating transparent-shell artifacts.

An external Footprints entry is recognized when at least 55% of the Earth
canvas intersects after previously falling to 8% or less. This hysteresis
prevents observer-edge oscillation from resetting the scene. Each external
entry receives a monotonically increasing entry ID, restores the configured
initial Earth view, and restarts the complete route sequence once. React
rerenders, resize, zoom, drag, release, and automatic rotation do not generate
entry IDs and cannot restart it. Leaving prepares an empty timeline for the
next external entry. A future return from Photo Space can use a distinct entry
reason and preserve orientation instead of entering this external path.

`footprintsView.js` defines Kuala Lumpur as the initial focus plus a `-10°` yaw
and `+3.5°` pitch offset. The renderer converts Kuala Lumpur with the shared
`geoToVector3`, aligns that surface vector with the camera-facing `+Z`
direction using a quaternion, applies the offset quaternion, and compensates
the current scroll-group rotation. This produces a focus vector of
approximately `(-0.173, -0.061, 0.983)`, placing Kuala Lumpur left and slightly
below center while bringing Hawaii to the right-hand limb. With zero scroll
rotation, the canonical orientation quaternion is approximately
`(0.259412, 0.947293, 0.052121, 0.180621)` in `x/y/z/w` order. While the scene
is outside, scroll changes recompute this prepared orientation before
rendering; after entry, ordinary rerenders and resize never reset it.

The confirmed composition is the intro target rather than its first frame.
Every external entry reads the route layer's complete timeline, multiplies it
by the approved Default angular speed (`0.0277rad/s`), and rotates backward
around the globe's local north axis to derive the intro start quaternion.
The start quaternion is applied and world matrices are updated before the
scene is exposed. During the route timeline the orientation is calculated
from `introStartQuaternion × rotationY(normalAngularSpeed × elapsedTime)`,
so it arrives at the target composition on the completion frame without
speed changes, easing, reverse motion, or a visible correction. Current
scroll rotation is removed from this calculation so page scrolling does not
disturb the scheduled world-space composition.

Empty-globe double-click, Enter/Space size toggles, Explore drag, and arrow-key
rotation are ignored while `introLocked`; destination selection, page scroll,
and chapter navigation remain available. `introLocked` now controls input
only: automatic rotation continues at the unchanged Default speed throughout
the complete timeline, including the final `520ms` settle. On completion the
lock clears and the same incremental delta-time rotation continues from the
target quaternion with no resume ramp. Reduced motion completes the route
state immediately at the target orientation and retains the existing
no-idle-rotation behavior.

### Entry composition and enlarged framing

`footprintsView.js` is also the single source of truth for the enlarged visual
envelope. The transparent desktop render surface spans `84vw × 100svh`
(`92vw` on compact desktops) so routes can leave the globe without being
clipped by the former circular canvas boundary. The section, navigation, and
background retain their existing isolation.

The requested Explore zoom remains `1.70`, but the live maximum is constrained
independently by a `1.04` atmospheric radius and a `1.10` route/glow radius.
Each resize reserves at least `24px` at every browser edge, updates the camera
aspect and WebGL/WebGPU renderer size, then chooses the stricter horizontal or
vertical camera-distance limit. Explore adds only a small Earth-local
translation of `x: -0.08`, `y: -0.045`; it does not move or scale the canvas,
navigation, grain, or page. At the 1280×708 Chrome review viewport the resulting
maximum was approximately `1.2691`; 1024×768 and 900×700 produced
approximately `1.2759` and `1.2681`.

### Fixed labels and place selection

The renderer owns a sibling HTML label layer inside the Earth canvas. Every
label anchor is a stable reference to the actual visible node-dot Mesh. On each
render frame, the renderer updates the scene and camera matrices, reads that
Mesh with `getWorldPosition()`, and projects the resulting world position with
the active Three.js camera. This includes the complete Earth parent chain, so
labels follow automatic rotation, Explore drag, camera-distance zoom, scroll
composition, and resize without storing page coordinates.

The WebGL canvas and HTML overlay are siblings inside the same positioned
`.earth-canvas` mount. Camera aspect, renderer size, and 2D label projection all
use the mount's transform-independent `clientWidth` and `clientHeight`; they do
not use a `getBoundingClientRect()` size contaminated by the Motion entrance
transform.

Every visible base and ordinary destination shows only its low-contrast English
name by default. `footprintsLabels.js` supplies one permanent pixel offset for
each place. The runtime adds that offset directly to the projected anchor and
never performs collision shifts, side swapping, selected-state repositioning,
or automatic avoidance. Labels stay horizontal in screen space. Expanded
information is a child block below the English name, so adding Chinese text and
visits never changes the primary label's top-left anchor.

The close Huizhou/Hong Kong pair uses intentionally opposing fixed offsets:
Huizhou is `(-22px, -22px)` from its projected anchor and Hong Kong is
`(22px, 8px)`. These offsets separate the two English names in the confirmed
Asia–Pacific composition without moving either geographic anchor or changing
the selected-state layout.

Visibility requires both a projected point inside the canvas and a positive
surface-normal/camera-direction dot product. Hidden labels need `0.06` to become
visible; visible labels remain until the value drops to `0.015`. This hysteresis
reduces silhouette flicker. Rear-facing labels receive `aria-hidden` and
`tabindex="-1"`, while node raycasting rejects hits behind the nearest Earth
intersection.

Development builds support an off-by-default coordinate overlay through
`?footprints-label-debug=1`. It draws a cross at the un-offset projected node
anchor and prints the place ID plus overlay coordinates. The debug layer is
pointer-transparent and is never created in production builds.

Only base and destination node hit meshes participate in raycasting. Routes
have no hit geometry and cannot respond to hover or click. Clicking a
destination node or its English label selects exactly that destination,
slightly strengthens its node, and raises only routes whose `destinationId`
matches to `1.42` material emphasis. A normal destination therefore highlights
one route; Seoul highlights its Changchun and Kuala Lumpur routes together
without changing either base. Every unrelated route and node remains at its
configured default value.

Clicking a base only strengthens that base to `1.12` and reveals its Chinese
name. A new place replaces the prior selection, while Earth or canvas
whitespace clears it. A single-route destination keeps the compact visit line.
Seoul groups details by `From Changchun` and `From Kuala Lumpur`, with each
group formatting its own route-level visits; for example `2024-01` becomes
`2024.01`.

### Footprints performance and accessibility

- The renderer pixel ratio is capped at `1.65`, responds to element resizing,
  dynamically loads near the chapter, and stops its frame loop while outside
  the viewport or while the document is hidden.
- Desktop-capable devices load the official 4096×2048 textures. Viewports up to
  700px, devices reporting no more than 4GB of memory, or devices with no more
  than four logical processors use locally generated 2048×1024 derivatives.
- Reduced motion removes scroll transforms and idle rotation while leaving the
  globe and complete glass/material treatment visible immediately. Enlarged
  manual orientation remains permanent and preset camera changes are direct.
- The globe interaction area remains keyboard-focusable with a visible focus
  marker. Arrow keys rotate only in Explore. On desktop, Enter or Space provides
  the keyboard equivalent of the empty-globe double-click size toggle; Escape
  clears the current place selection. Visible place labels expose keyboard
  button semantics and use Enter or Space for the same selection action.
- Desktop zoom has exactly two user-facing presets: `DEFAULT` at `1.00` and
  a viewport-safe `MAXIMUM`. The requested maximum is `1.70`, but every resize
  derives the actual camera-distance limit from canvas width, height, the
  `28°` camera FOV, the atmospheric and route envelopes, and at least `24px`
  of browser-edge safety before applying that target.
  Double-clicking empty globe space toggles these presets
  by changing only the dedicated Three.js camera distance. Exponential damping
  at `6.1` reaches visual rest in about 0.75 seconds without overshoot. The
  internal `0.90` minimum anchor remains reserved for entrance or exit work and
  is not exposed as a manual stop. Both presets share the same right-weighted
  canvas position: `8vw` on standard desktops, `4vw` on narrower desktops, and
  zero on mobile. Explore applies the small world-space `-0.08/-0.045` framing
  correction described above without moving the canvas.
  The wide-desktop canvas uses `84vw × 100svh`, capped at `1050px` high, and a
  `5.83` base camera distance. This preserves the approved default apparent
  size while the dynamic maximum keeps the complete atmosphere and route glow
  inside the canvas. Compact desktop viewports retain the `5.35` camera distance
  and receive their own calculated maximum.
- Default idle rotation runs at `0.0277` radians per second. Enlarged idle
  rotation runs at `0.0147` radians per second, approximately 53% of the default
  rate. The active speed exponentially reaches 90% of its new target over
  `0.58s` when entering or leaving Explore, preventing a freeze or speed step.
  The route intro always uses the Default `0.0277rad/s` rate. Its interaction
  lock does not multiply, blend, or otherwise alter that angular speed, and
  completion continues directly into the same Default idle update.
- Explore drag uses positive horizontal pointer delta and post-multiplies a
  quaternion around the Earth's local north axis, so the visible surface follows
  the grab direction directly. Horizontal sensitivity uses a `0.42` multiplier.
  Vertical pointer delta uses the same direct sign around the
  camera horizontal axis at a `0.32` multiplier, so upward and downward drags
  move the visible surface in the matching direction. Pitch is recalculated
  from the transformed north axis every frame and clamped to `±18°`; no roll
  input or unrestricted pole-view trackball is enabled. Arrow-key pitch follows
  the same clamp.
- Default pointer movement never reaches the Three.js drag runtime and cannot
  rotate the globe. The DOM layer records only whether a pointer moved beyond
  four pixels, solely to suppress an accidental double-click toggle for 350ms;
  it never captures the pointer or prevents native page gestures. Enter and
  Space retain the keyboard size toggle, while arrow-key rotation is available
  only in Explore.
- Enlarged pointer input accumulates small yaw and pitch targets rather than
  mutating the quaternion immediately. Exponential damping at rate `14` applies
  90% of that short buffer in approximately `0.16s`, providing weight without
  velocity-based inertia, bounce, or long glide. Idle rotation remains paused
  until the buffer settles, then ramps back to 90% over approximately `0.35s`
  from the exact released orientation.
- Exiting Explore changes only the camera-distance target from the calculated
  maximum to
  `1.00`. The current quaternion is never replaced or interpolated toward a
  stored pose, so shrinking and subsequent default-size rotation continue from
  the exact enlarged orientation while the rotation speed blends back to
  `0.0277` radians per second.
- There is no globe wheel, trackpad, or pinch zoom handler. Mouse-wheel and
  two-finger gestures retain native page behavior even over the canvas, and the
  canvas declares `pan-y pinch-zoom` instead of globally blocking browser zoom.
  The globe world matrix, shader normals, atmosphere, chapter layout,
  background, and navigation never scale.
- Explore uses a four-pixel mouse drag threshold. In Default, pointer movement
  beyond four pixels starts no rotation but suppresses the size toggle for
  350ms, preventing a drag from becoming an accidental double-click. Future
  route and node elements opt into the higher-priority interactive target
  convention above.
- Default and Explore share one persistent current orientation. No pre-drag,
  pre-enlarge, or exit restoration snapshot exists; only Explore can mutate the
  orientation manually.
- Mobile uses the centered fixed-size `1.00` globe and existing compact chapter
  control with no manual zoom or rotation. Pointer movement is not captured, so
  page scrolling and native browser gestures remain available.
- Reduced motion applies a direct preset change rather than strong camera
  travel. The fallback exposes a descriptive static Earth image without
  claiming an unfinished route experience.

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

- **Footprints:** preserve the approved route and fixed-label hierarchy while
  future work adds only explicitly reviewed place-detail or photo-space
  transitions without turning the chapter into a dashboard.
- **Lab:** introduce a reusable project data model before creating project
  views.
- **Thanks:** create a quiet closing chapter that follows the same typographic
  and motion system.
- Keep future chapters driven by `siteContent.js` and add dependencies only when
  their implemented features require them.

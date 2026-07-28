# Third-party attribution

## Three.js Earth rendering

The Footprints Earth renderer adapts the rendering structure and TSL material
logic from the official Three.js `webgpu_tsl_earth` example:

- Example:
  <https://threejs.org/examples/webgpu_tsl_earth.html>
- Versioned source:
  <https://github.com/mrdoob/three.js/blob/r185/examples/webgpu_tsl_earth.html>
- Three.js version used by this project: `0.185.0`
- Licence: MIT
- Copyright: © 2010–2026 Three.js authors
- Licence text:
  <https://github.com/mrdoob/three.js/blob/r185/LICENSE>

Adapted concepts include the WebGPU renderer with WebGL2 fallback, day/night
texture mixing, sun-orientation mask, cloud and roughness channels, bump
mapping, city lights, Fresnel atmosphere, and back-face atmosphere shell.

Project-specific changes include the React lifecycle, responsive sizing,
scroll-linked and pointer rotation, cooler colour treatment, restrained
atmosphere, revised night-oriented lighting, performance limits, and static
failure fallback. The Three.js example page, Inspector, parameter GUI, and
OrbitControls are not embedded or copied.

## Earth textures

The following files are distributed with the official Three.js r185 example
and stored locally in `public/images/earth/`:

- `earth_day_4096.jpg`
- `earth_night_4096.jpg`
- `earth_bump_roughness_clouds_4096.jpg`

Versioned source directory:
<https://github.com/mrdoob/three.js/tree/r185/examples/textures/planets>

The official example identifies these as Earth textures from Solar System
Scope, resized and merged for the example:

- Source: <https://www.solarsystemscope.com/textures/>
- Licence: Creative Commons Attribution 4.0 International
- Licence text: <https://creativecommons.org/licenses/by/4.0/>
- Attribution: Earth textures © Solar System Scope, used under CC BY 4.0.
  Resized and channel-merged versions are provided by the Three.js example.

The project does not modify or overwrite these three source texture files.

The following 2048×1024 derivatives were generated locally from those files
with macOS `sips` for mobile and lower-capability devices:

- `earth_day_2048.jpg`
- `earth_night_2048.jpg`
- `earth_bump_roughness_clouds_2048.jpg`

They retain the same Solar System Scope CC BY 4.0 attribution. The originals
remain unchanged.

`earth-fallback.png` is a local crop captured from this project's integrated
renderer using the attributed textures and adapted Three.js material logic. It
is used only when neither graphics backend initializes or when texture loading
fails; it is not a screenshot of the official example webpage.

## Rendering reference

The official Three.js example credits the Three.js Journey “Earth shaders”
lesson as its conceptual foundation:

- <https://threejs-journey.com/lessons/earth-shaders>

No course files, screenshots, videos, or lesson source code are included in
this project.

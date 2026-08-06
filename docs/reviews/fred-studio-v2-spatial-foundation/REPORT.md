# Fred Studio V2 spatial placement foundation

Date: 2026-08-05  
Route: `/studio-v2-import-test?debug=1`  
Official regression route: `/studio-v2-import-test`

## Coordinate convention

- Coordinate space: Three.js world space, right-handed.
- Units: world units. Model proportions are consistent with approximately one metre per world unit, but the GLB is not treated as a certified metric source.
- Origin: `[0.000, 0.000, 0.000]` at the unchanged imported-model root.
- +X: from the living-area opening toward the kitchen/cabinet end.
- +Y: upward from the floor toward the ceiling.
- +Z: from the window/south side toward the opposite/north interior wall.
- Model root transform: position `[0.000, 0.000, 0.000]`, rotation `[0.000, 0.000, 0.000]`, uniform scale `1.000`.
- Actual floor: `Y = 0.020542593133827006` (`0.021` in copied/debug display values).

## Audited spatial records

The interior record excludes the environment sphere and is retained as a stable, rounded placement reference.

- Interior centre: `[0.105, 2.217, 0.797]`.
- Interior minimum: `[-7.039, -0.539, -5.785]`.
- Interior maximum: `[7.249, 4.973, 7.379]`.
- Camera safety bounds: minimum `[-6.550, 0.721, -4.650]`, maximum `[5.050, 3.720, 3.380]`.
- Authored target bounds: minimum `[-5.650, 0.551, -4.450]`, maximum `[4.850, 2.900, 3.150]`.
- Approved official fixed target: `[-6.001, 1.889, 0.286]`.
- Approved opening camera: `[-6.420, 1.920, 0.300]`.

## Debug tools implemented

- AXES uses the documented world origin and labels the positive X, Y, and Z ends.
- GRID is a rectangular usable-room grid at `floorY + 0.006`, with 0.25-unit minor lines and 1.0-unit major lines.
- BOUNDS independently displays the audited interior, camera-safe, and target-safe boxes in restrained blue/green-grey colours.
- PICK POSITION uses one raycaster and reports world position, world normal, mesh, material, surface classification, and camera distance.
- Pick classification supports FLOOR, HORIZONTAL UP, VERTICAL WALL, CEILING / DOWNWARD, ANGLED, and UNSUITABLE.
- The neutral marker is visible only while picking is enabled; CLEAR PICK removes its record and marker.
- `PLACEMENT_PLACEHOLDER` supports numeric world position, degree display/radian storage rotation, dimensions, uniform scale, visibility, reset, move-to-pick, surface alignment, and stable transform copying.
- Named-anchor drafting generates copy-ready text only. No file, browser storage, backend, or final object placement is performed.
- TransformControls was intentionally omitted. Numeric controls preserve the accepted orbit/collision stability and avoid competing pointer listeners or gizmo-induced camera jitter.

## Placement rules

- Desktop objects: require an upward-facing horizontal surface and offset the object base along the picked normal.
- Wall photos: require a vertical surface, align local +Z with the wall normal, and keep a shallow normal clearance.
- Floor objects: require FLOOR and keep the base at actual floor Y plus z-fighting clearance.
- Interaction points: remain inside target-safe bounds and preserve camera-safe clearance.

## Verified examples

Floor pick:

```js
position: [-0.797, 0.021, 0.863]
surfaceNormal: [0.000, 1.000, 0.000]
surfaceType: 'FLOOR'
mesh: 'Plane_Material002_0'
material: 'Material.002'
cameraDistance: 5.961
```

Wall pick:

```js
position: [3.445, 2.064, -5.164]
surfaceNormal: [0.000, 0.000, 1.000]
surfaceType: 'VERTICAL WALL'
material: 'material'
cameraDistance: 11.278
```

Wall-aligned placeholder:

```js
{
  position: [3.445, 2.064, -4.952],
  rotation: [0.000, 0.000, 0.000], // radians
  scale: [0.600, 0.400, 0.400],
  size: [0.600, 0.400, 0.400],
  uniformScale: 1.000,
}
```

Generated anchor draft:

```js
PHOTO_WALL_01: {
  position: [3.445, 2.064, -4.952],
  rotation: [0.000, 0.000, 0.000],
  scale: [0.600, 0.400, 0.400],
  surfaceNormal: [0.000, 0.000, 1.000],
  note: "Debug placement draft for PHOTO_WALL_01; review before adding to STUDIO_V2_ANCHORS.",
}
```

## Official-route regression and performance

- The official route rendered with only the loft canvas in the accessible DOM: no debug panel, axes, grid, bounds, marker, placeholder, gizmo, attribution, anchor text, helper label, highlight, or selection outline.
- The official route initializes no spatial-debug subsystem and attaches no picking listeners.
- `/studio-v1` loaded without browser console errors and no V1 source file was changed in this worktree.
- Browser verification at 1280 × 720 held 60 FPS. Baseline rendering showed 24 calls; axes/grid/pick/placeholder evidence states showed 28–32 calls. Helpers are created once, toggled by visibility, and disposed with their pointer listeners and GPU resources.
- The model transform, camera safety, official rear-view limits, removals, lighting, materials, shadows, and environment were not modified.

## Evidence

- `01-debug-axes-grid.png`
- `02-debug-floor-pick.png`
- `03-debug-wall-pick.png`
- `04-debug-placeholder.png`
- `05-debug-anchor-output.png`
- `06-official-route-clean.png`

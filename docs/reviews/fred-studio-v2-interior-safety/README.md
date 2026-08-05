# Fred Studio V2 — interior-only camera safety review

Date: 2026-08-04  
Route: `/studio-v2-import-test`

## Website attribution removal

The website UI no longer contains a Credits control, credit modal, author name, asset title, source link, or licence notice. This applies to normal mode, Explore, and `?debug=1`. Internal attribution and checksum records remain in repository documentation only.

## Approved opening camera

```json
{
  "position": [-6.42, 1.92, 0.3],
  "target": [-2.35, 1.62, 0.16],
  "fov": 50,
  "near": 0.05,
  "far": 160
}
```

The camera sits in the open living-room channel between the two sofa keep-out volumes. Its viewing direction remains aligned with the kitchen and dining composition while its position is inside the audited loft envelope.

## Interior camera cage

Camera position bounds:

```text
min [-6.55, 0.72, -4.65]
max [ 5.05, 3.72,  3.38]
```

OrbitControls target bounds:

```text
min [-5.65, 0.55, -4.45]
max [ 4.85, 2.90,  3.15]
```

Zoom / dolly limits:

```text
minDistance 1.20
maxDistance 4.65
```

Polar limits:

```text
minPolarAngle 0.12π
maxPolarAngle 0.82π
```

Azimuth remains unrestricted so the visitor can look through 360 degrees, but the resulting camera and target are clamped inside the room before every render.

## Furniture keep-out volumes

Camera-only exclusion boxes protect:

- south sofa;
- north sofa;
- both coffee tables;
- kitchen island and stools;
- dining table and chairs;
- kitchen cabinet line.

When the camera enters an exclusion box, it is projected to the nearest valid face plus a 0.035-unit separation. The position cage, target cage, distance limits, and exclusions are applied for up to five correction passes. If a conflicting configuration cannot be resolved, the camera falls back to the approved interior opening position.

The enforcement runs:

- after OrbitControls change events;
- after every controls update and before every render;
- during camera reset interpolation;
- when loading a normal or debug preset;
- when a debug camera configuration is supplied.

## Browser verification

- Opening camera: `INTERIOR SAFE = YES` at `[-6.42, 1.92, 0.3]`.
- All eight debug presets: safe after application.
- Explore: horizontal rotation remained enabled and camera stayed safe while crossing constrained regions.
- Aggressive zoom-out plus repeated Shift-pan reached the target maximum and produced 39+ active corrections; camera remained safe and stopped before the kitchen cabinet/glass-side boundary.
- Reset: both the mid-animation sample and settled destination remained safe; final camera and target exactly matched the approved opening values.
- Clean and debug DOM snapshots contained no Credits, author, asset-title, source, or licence UI.
- Browser console: no task-related errors.

## Required screenshots

- `01-opening-interior.png`
- `02-explore-interior.png`
- `03-reset-interior.png`
- `04-outdoor-movement-rejected.png`

# Fred Studio coordinate system V1

## Stable world convention

- `1 Three.js unit = 1 metre`.
- Floor corner `D` is the world origin: `(0, 0, 0)`.
- Positive `X` runs from `D` to `A`.
- Positive `Y` is vertical.
- Positive `Z` runs from `D` to `C`.
- All future object anchors belong in `studioCoordinates` before scene code uses them.

## Expanded floor

| Corner | Coordinate (m) |
| --- | --- |
| D | `(0, 0, 0)` |
| A | `(112, 0, 0)` |
| B | `(112, 0, 72)` |
| C | `(0, 0, 72)` |

Wall 1 remains edge `A–B`, Wall 2 remains edge `B–C`, and edges `C–D` and `D–A` remain open.

## Expanded roof

| Corner | Coordinate (m) |
| --- | --- |
| roofD | `(0, 57.2, 0)` |
| roofA | `(112, 40.8111, 0)` |
| roofB | `(112, 10, 72)` |
| roofC | `(0, 26.3889, 72)` |

The roof remains one plane over the complete rectangular floor. Its fall direction is preserved from the approved shell while the lowest and highest elevations rise from `8 / 44 m` to `10 / 57.2 m`.

## Previous shell baseline

`previousShellBaseline` is the frozen approved 56 × 36 m shell, including its original floor corners, roof corners, wall definitions, and hero camera. The active `studioShellBaseline` is the expanded 112 × 72 m coordinate baseline.

## Debug workflow

Open `/studio-v1?debug=1`:

1. Enable `GRID`, `AXES`, and optionally `LABELS`.
2. Click the Floor to read an `(X, Y, Z)` coordinate in metres.
3. Enter coordinates and choose `PLACE` to position the marker precisely.
4. Choose `COPY` to copy the coordinate as `[x, y, z]`.

The grid, coordinate marker, axes, labels, and controls are unavailable on the normal `/studio-v1` route.

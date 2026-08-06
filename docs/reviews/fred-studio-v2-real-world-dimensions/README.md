# Fred Studio V2 verified real-world dimensions

Date: 2026-08-05

Coordinate audit: `1 world unit = 1 metre`.

## MacBook Pro 2021 (16-inch)

The runtime measures the loaded GLB before normalization using a world-space `Box3`. Physical axes are source `Z = width`, `Y = height`, and `X = depth`.

- Raw width: `0.35790002 m`
- Raw open height: `0.25152549 m`
- Raw overall open depth: `0.25149327 m`
- Raw base footprint depth: `0.24589966 m`
- Raw base thickness: `0.01035400 m`
- Target width: `0.35570000 m`
- Calculated uniform scale: `0.3557 / 0.35790002 = 0.9938529760350392`
- Final width: `0.35570000 m`
- Final open height: `0.24997936 m`
- Final overall open depth: `0.24994733 m`
- Final base footprint depth: `0.24438811 m`
- Final base thickness: `0.01029036 m`

The final overall open depth is within approximately `0.75%` of the `0.2481 m` official depth. The source GLB's base geometry is thinner than the official `0.0168 m` closed-body specification; a uniform width-derived scale cannot correct thickness independently without making the width incorrect, so the source geometry is preserved.

## Marshall amplifier and Gibson Les Paul

The runtime measures the amplifier root `Cube.027` separately from the retained guitar and cable. Physical axes are source `Z = width`, `Y = height`, and `X = depth`.

- Raw amplifier width: `0.75507202 m`
- Raw amplifier height: `0.97626685 m`
- Raw amplifier depth: `0.40000771 m`
- Approximate target width: `0.77000000 m`
- Width-derived candidate scale: `1.01977027303965`
- Accepted target tolerance: `±0.02000000 m`
- Applied uniform scale: `1.00000000`
- Final amplifier width: `0.75507202 m`
- Final amplifier height: `0.97626685 m`
- Final amplifier depth: `0.40000771 m`
- Final Gibson Les Paul total Box3 length: `1.02273335 m` (approximately `1.02 m`)

The raw amplifier width is already within `0.01492798 m` of the approximate target. Applying the width-derived `1.01977` candidate would make the guitar `1.04295307 m` long, outside the requested range, so the verified native scale is retained.

Both models use uniform scaling only. Their scale records are calculated after GLB node transforms and are exposed in the debug runtime as `scaleCalibration`.

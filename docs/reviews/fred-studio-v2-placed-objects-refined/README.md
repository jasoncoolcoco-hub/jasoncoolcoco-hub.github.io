# Fred Studio V2 right-side object refinement

> Superseded by the verified real-world MacBook and Marshall dimension calibration. The images in this folder document the earlier iMac review state.

Date: 2026-08-05

## Final anchors

### `MARSHALL_GUITAR_FLOOR_01`

```js
{
  position: [-2.050, 0.021, 1.360],
  rotation: [0.000, -0.959931, 0.000],
  scale: 1,
  surfaceNormal: [0.000, 1.000, 0.000],
}
```

- Asset scale changed from `0.82` to `1.08`.
- The full 32-mesh Marshall amplifier and Gibson guitar setup is retained.
- Position and rotation are mirrored to the opening-view right side across the rug boundary.
- Finished world bounds are approximately `1.214 × 1.105 × 1.247 m`.

### `IMAC_ISLAND_01`

```js
{
  position: [0.917, 1.415, -0.900],
  rotation: [0.000, 0.000, 0.000],
  scale: 1,
  surfaceNormal: [0.000, 1.000, 0.000],
}
```

- Asset scale changed from `0.0047` to `0.0052`.
- Finished dimensions are approximately `0.162 × 0.512 × 0.612 m`.
- The iMac sits on the opening-view right side of the island with approximately `0.20 m` living-edge setback.
- The back faces the opening camera and the screen faces the kitchen.

Both assets keep scale-1 anchor parents. Only their imported material metalness, roughness, and environment response are tuned; room lighting and room materials are unchanged.

## Evidence status

- `01-opening-view-updated.png` — captured.
- `02-marshall-guitar-updated.png` — captured.
- `03-imac-updated.png` — pending because local-browser access was blocked during file capture.
- `04-marshall-closeup-material.png` — pending because local-browser access was blocked during file capture.
- `05-imac-closeup-material.png` — pending because local-browser access was blocked during file capture.
- `06-debug-anchor-values-updated.png` — pending because local-browser access was blocked during file capture.

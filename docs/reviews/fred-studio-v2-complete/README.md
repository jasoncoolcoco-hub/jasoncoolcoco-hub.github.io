# Fred Studio V2 — camera, PBR, IBL, and interaction review

Date: 2026-08-04  
Route: `/studio-v2-import-test`  
Scope: Studio V2 only. Studio V1, the source GLB, mesh transforms, furniture placement, and source textures were not changed.

## Opening camera

The reference composition is now an interior view along the long room axis. It places both sofas at the lower corners, the coffee tables and rug in the foreground, the island in the middle, the kitchen behind it, and the dining table plus visible forest on the right.

```json
{
  "position": [-7.48, 1.92, 0.3],
  "target": [1.7, 1.62, 0],
  "fov": 50,
  "near": 0.05,
  "far": 160
}
```

The opening camera is set once at scene creation. `Reset View` disables Explore and eases back to the exact configuration over 900 ms. Narrow screens use a 72° responsive FOV while keeping the same position and target.

## Environment and rendering

- Environment mesh detection uses four signals: audited bounds, large diagonal, panorama texture ratio, and sphere/environment naming.
- Selected environment: `Sphere_Material017_0` / material `Material.017`.
- Panorama: 4096 × 2048.
- The panorama texture is cloned for equirectangular PMREM generation. The original visible sphere and forest remain unchanged and visible.
- `scene.environmentIntensity`: 1.05.
- Renderer: sRGB output, ACES Filmic tone mapping, exposure 0.90, DPR cap 2.
- Texture anisotropy: 8 (capped against the device maximum).
- Lighting: hemisphere 0.18; warm key 1.10 at `[5, 8, 4]`; cool fill 0.18 at `[-4, 3, -3]`.
- Selective PCF soft shadows: enabled, 2048² map. Imported floor/rug/architecture receive; sofas, kitchen, dining chairs, and metal detail cast.
- AO: off. Bloom: off. The project has no existing compatible post-processing pipeline, so no large rendering dependency was added.

## Targeted material changes

Values below are runtime-only changes to named imported materials. Textures and geometry are untouched.

| Category | Material | Previous metal / rough | New metal / rough | Env | Additional change |
|---|---|---:|---:|---:|---|
| Sofa A | `Material.005` | 0 / 1.00 | 0 / 0.58 | 0.94 | color multiplier `#b5b5b5` |
| Sofa B | `Material.007` | 0 / 1.00 | 0 / 0.58 | 0.94 | color multiplier `#b5b5b5` |
| Floor | `Material.002` | 0.7649 / 0 | 0 / 0.28 | 1.16 | color `#a8a8a8`; normal scale 0.50 |
| Rug | `Material.012` | 0 / 0.8211 | 0 / 0.92 | 0.42 | normal scale 0.62 |
| Timber | `Material.003` | 0 / 0.1789 | 0 / 0.42 | 0.72 | — |
| Ceiling | `Plane.001__0` | 0 / 0.60 | 0 / 0.54 | 0.68 | — |
| Painted dark surfaces | `material` | 0.7163 / 0.0726 | 0.08 / 0.50 | 0.78 | — |
| Combined kitchen | `Material.006` | 0.4491 / 0.1333 | 0.45 / 0.34 | 1.22 | compromise for cabinets + faucet + handles + oven |
| Dining chairs | `Material.010` | 0 / 1.00 | 0 / 0.62 | 0.72 | — |
| Metal detail | `Material.011` | 0.6434 / 0 | 0.90 / 0.24 | 1.35 | — |

The source GLB combines kitchen cabinetry, sink, faucet, handles, and oven in the same mesh/material (`node_0001_Material006_0` / `Material.006`). Separate cabinet and metal PBR values are therefore not possible without splitting the model or changing source assets. The selected compromise keeps handles and appliance highlights visible without turning the cabinets into mirrors.

## Inspector and controls

- Debug-only raycast inspector highlights a clicked mesh and reports mesh name, material name/type, color, roughness, metalness, opacity, transparency, environment intensity, normal scale, and maps.
- Debug controls include camera presets (reference, 44/46/50 FOV trials, detail views, opposite view), IBL and shadow toggles, environment/exposure/key sliders, helpers, and camera/material/visual JSON copy buttons.
- Explore enables damping (0.06), pan, zoom, broad polar movement, and azimuth `-Infinity` to `Infinity`.
- A browser drag test moved the camera from `[-7.48, 1.92, 0.3]` to `[9.582, 1.92, -4.715]`, then Reset returned exactly to the opening camera.

## Verification

- 1440 × 900: no document overflow; model ready; opening, sofa, floor/rug/wood, kitchen, and opposite views captured.
- 1728 × 1117: same five required captures saved at the exact requested dimensions.
- 1920 × 1080: no document overflow; model ready; validation capture saved.
- 390 × 844: no document overflow; model ready; responsive 72° FOV and mobile header verified.
- Runtime sample at 1440 × 900 with debug UI: 55–60 FPS, 35 draw calls, 138,118 rendered triangles including shadow pass, 42 geometries, 25 textures, anisotropy 8, approximately 347 ms warm local load.
- Browser console: no errors in clean or debug route.
- Source GLB SHA-256 remains `5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19`.

## Screenshots

Required 1728 × 1117 files are in this directory. Exact 1440 × 900 duplicates are in `1440x900/`.

- `01-opening-reference-match.png`
- `02-sofa-material-match.png`
- `03-floor-rug-wood-material-match.png`
- `04-kitchen-metal-material-match.png`
- `05-360-degree-opposite-view.png`
- `validation-1920x1080.png`
- `validation-mobile-390x844.png`

# Fred Studio V2 imported-asset material refinement report

## Audit conclusions

- The source audit covers 35 visible mesh primitives: 3 MacBook meshes and 32 Marshall/guitar meshes.
- All audited primitives contain UV0 and vertex normals, all materials use smooth shading, and no topology or normal repair was required.
- The MacBook's three meshes originally shared one `MacBookPro` material. Runtime refinement now clones by audited mesh identity so the chassis/deck, display/glass, and hinge can respond independently.
- Marshall and guitar source materials are already divided into useful zones. Shared materials are cloned once per explicit audited override and reused only by meshes that need the same treatment.
- Marshall cabinet and grille detail is partly combined inside the same source texture atlas. Their per-pixel colour/normal/metallic-roughness data remains preserved; full geometric separation would require source-authoring work outside this task.
- Guitar body detail, pickguard, pickups, and part of the hardware are partly combined in a 1024² atlas, so their scalar metalness uses a controlled compromise rather than forcing the complete atlas to metal.
- MacBook maps are 2048² and adequate for the requested framing. All Marshall/guitar maps are 1024² and remain the limiting factor for extreme close-ups.

## Colour and texture handling

- GLTFLoader already supplied correct colour spaces, so runtime colour-space corrections required: **0**.
- Base-colour and emissive maps remain sRGB.
- Normal, combined metallic-roughness, and AO maps remain non-colour data.
- No source map, UV, image resolution, or room environment was replaced.
- Relevant asset textures use `min(renderer maximum, 8)` anisotropy; verified runtime value: **8**.
- Both ORIGINAL and REFINED material instances share the same source texture objects and the same `scene.environment`.

## Final scalar overrides

`M`, `R`, and `ENV` mean metalness, roughness, and envMapIntensity. `CC` and `CCR` mean clearcoat and clearcoat roughness.

| Asset zone | Audited target | Original M / R / ENV | Refined M / R / ENV | CC / CCR | Notes |
|---|---|---|---|---|---|
| MacBook aluminium chassis/deck | `Object_4` | 1 / 1 / 1 | 0.88 / 0.36 / 0.92 | 0.04 / 0.68 | Physical material; anisotropy 0.16; embedded keyboard/trackpad atlas preserved. |
| MacBook screen/glass | `Object_6` | 1 / 1 / 1 | 0 / 0.10 / 0.78 | 0.52 / 0.12 | Physical glass layer; source screen colour and emissive maps preserved. |
| MacBook hinge | `Object_8` | 1 / 1 / 1 | 0.90 / 0.32 / 1.00 | — | Dedicated audited hinge mesh. |
| Marshall cabinet/tolex/grille atlas | `Marshall_Amp_Body` | 1 / 1 / 1 | 0 / 0.74 / 0.56 | 0 / 0 | Normal scale reduced to 0.52; both source cabinet meshes retain atlas detail. |
| Marshall control panel | `Marshall_Amp_Panel` | 1 / 1 / 1 | 0.84 / 0.34 / 1.02 | 0 / 0 | Metal panel and controls retain source PBR maps. |
| Marshall repeated hardware | `Anis` | 1 / 1 / 1 | 0.86 / 0.34 / 1.04 | 0 / 0 | Applied only to the 16 audited hardware/detail meshes. |
| Marshall small accessory | `Material` | 0 / 0.8348 / 1 | 0.08 / 0.50 / 0.50 | — | Restrained non-chrome response. |
| Marshall label | `Label` | 0 / 1 / 1 | 0 / 0.48 / 0.42 | — | Emissive intensity forced to 0; original colour preserved. |
| Guitar lower body | `Body_Bottom` | 1 / 1 / 1 | 0 / 0.36 / 0.90 | 0.62 / 0.20 | Controlled lacquer response. |
| Guitar body detail/hardware atlas | `Body_Detail` | 1 / 1 / 1 | 0.52 / 0.32 / 1.02 | 0.28 / 0.22 | Mixed-atlas compromise for pickups, pickguard, and hardware. |
| Guitar neck | `Neck` | 1 / 1 / 1 | 0 / 0.50 / 0.62 | 0.12 / 0.42 | Wood grain preserved; softer than the body. |
| Guitar fretboard | `FretBoard` | 1 / 1 / 1 | 0 / 0.68 / 0.40 | 0 / — | Darker and less reflective than body lacquer. |
| Guitar strings/hardware | `Strings` | 1 / 1 / 1 | 0.95 / 0.24 / 1.16 | 0 / — | Controlled narrow metal highlights. |
| Guitar lacquered body/cover | `Body` | 1 / 1 / 1 | 0 / 0.36 / 0.94 | 0.62 / 0.20 | Original sunburst maps preserved. |
| Guitar cable jacket | `Material.006` | 0 / 0.9864 / 1 | 0 / 0.74 / 0.42 | — | Non-metallic red cable finish. |
| Guitar cable detail | `Strings.001` | 1 / 1 / 1 | 0.28 / 0.46 / 0.72 | 0 / — | Audited as BezierCurve accessory detail, not the guitar strings. |

## Geometry, shadow, placement, and runtime

- Normal corrections: **none**. The source vertex normals are present and visually stable; no geometry was cloned or recomputed.
- Existing cast/receive shadow flags remain enabled for all imported meshes. No room shadow setting changed.
- MacBook anchor remains `[0.961, 1.415, -0.050]`, rotation `[0, 0, 0]`, calibrated asset scale `0.9938529760350392`.
- Marshall/guitar anchor remains `[-2.050, 0.021, 1.360]`, rotation `[0, -0.959931, 0]`, asset scale `1`.
- Debug comparison swaps cached original/refined material instances; it does not reload GLBs and is absent from the official route.
- Stabilized debug reading: **60 FPS**, **94 draw calls**, **930,370 triangles**, **64 textures**.

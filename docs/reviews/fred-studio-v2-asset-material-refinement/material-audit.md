# Fred Studio V2 imported-asset material audit

Audit captured from the original GLB material definitions before this refinement pass. Runtime defaults reflect Three.js GLTFLoader behaviour: compatible assets use `scene.environment`, `envMapIntensity` defaults to `1`, colour/emissive maps decode as sRGB, and normal/metallic-roughness/AO maps remain data textures.

## Findings before editing

- All 35 visible mesh primitives include vertex normals and UV0; no missing normals, flat-shaded materials, or missing UVs were found.
- The MacBook uses one shared `MacBookPro` material for its three distinct meshes (lower chassis/deck, display/glass, hinge). This is the largest source of incorrect surface uniformity.
- The Marshall asset separates body, panel, repeated detail/hardware, accessory, and logo materials, but its cabinet/grille regions are atlas-driven and cannot be fully split without authoring new geometry or UVs.
- The guitar separates body, body detail, neck, fretboard, strings, cable, and cover materials. Fine hardware and pickguard zones remain partially combined inside source material/texture atlases.
- Source colours are not broadly crushed by factors: most textured materials use neutral `[1,1,1,1]`; the red cable is the only strongly tinted factor.
- Original scalar roughness/metalness defaults are frequently `1/1` because the actual response is carried by combined metallic-roughness textures. Targeted scalar overrides must preserve those maps.
- The geometry already supplies smooth vertex normals. No vertex-normal recomputation is justified before visual comparison.

## MacBook Pro 2021

Source: `public/models/fred-studio-v2/objects/macbook_pro_2021.glb`

| Mesh | Parent hierarchy | Material / type / sharing | Base RGBA | M / R / Env | Opacity / transparent / flat / normals / UV | Colour | Normal | Roughness | Metalness | AO | Emissive |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Object_4 | Sketchfab_model / root / GLTF_SceneRootNode / MacBook Body_2 / Object_4 | MacBookPro / MeshStandardMaterial / 3 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T0 2048×2048 sRGB | T3 2048×2048 NoColorSpace/data | T1 2048×2048 NoColorSpace/data | T1 2048×2048 NoColorSpace/data | — | T2 2048×2048 sRGB |
| Object_6 | Sketchfab_model / root / GLTF_SceneRootNode / Ecran_6 / Object_6 | MacBookPro / MeshStandardMaterial / 3 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T0 2048×2048 sRGB | T3 2048×2048 NoColorSpace/data | T1 2048×2048 NoColorSpace/data | T1 2048×2048 NoColorSpace/data | — | T2 2048×2048 sRGB |
| Object_8 | Sketchfab_model / root / GLTF_SceneRootNode / Ecran_6 / Charniere_5 / Object_8 | MacBookPro / MeshStandardMaterial / 3 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T0 2048×2048 sRGB | T3 2048×2048 NoColorSpace/data | T1 2048×2048 NoColorSpace/data | T1 2048×2048 NoColorSpace/data | — | T2 2048×2048 sRGB |

### Embedded texture inventory

| Image | MIME | Dimensions | Close-up limitation |
|---|---|---|---|
| 0 | image/jpeg | 2048×2048 | Adequate for the requested framing |
| 1 | image/png | 2048×2048 | Adequate for the requested framing |
| 2 | image/jpeg | 2048×2048 | Adequate for the requested framing |
| 3 | image/png | 2048×2048 | Adequate for the requested framing |

## Marshall amplifier + Gibson Les Paul

Source: `public/models/fred-studio-v2/objects/marshall_amp.glb`

| Mesh | Parent hierarchy | Material / type / sharing | Base RGBA | M / R / Env | Opacity / transparent / flat / normals / UV | Colour | Normal | Roughness | Metalness | AO | Emissive |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Cube.024_Marshall Amp Body_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.024 / Cube.024_Marshall Amp Body_0 | Marshall_Amp_Body / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T0 1024×1024 sRGB | T2 1024×1024 NoColorSpace/data | T1 1024×1024 NoColorSpace/data | T1 1024×1024 NoColorSpace/data | — | — |
| Cube.027_Marshall Amp Body_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.027_Marshall Amp Body_0 | Marshall_Amp_Body / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T0 1024×1024 sRGB | T2 1024×1024 NoColorSpace/data | T1 1024×1024 NoColorSpace/data | T1 1024×1024 NoColorSpace/data | — | — |
| Cube.027_Marshall Amp Panel_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.027_Marshall Amp Panel_0 | Marshall_Amp_Panel / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T4 1024×1024 sRGB | T6 1024×1024 NoColorSpace/data | T5 1024×1024 NoColorSpace/data | T5 1024×1024 NoColorSpace/data | — | — |
| Cube.027_Marshall Amp Panel_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.027_Marshall Amp Panel_0 | Marshall_Amp_Panel / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T4 1024×1024 sRGB | T6 1024×1024 NoColorSpace/data | T5 1024×1024 NoColorSpace/data | T5 1024×1024 NoColorSpace/data | — | — |
| Cube.027_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.027_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.028_Material_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.028 / Cube.028_Material_0 | Material / MeshStandardMaterial / 1 mesh | 0.53474, 0.53474, 0.53474, 1 | 0 / 0.8347882331686102 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | — | — | — | — | — | — |
| Cube.029_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.029 / Cube.029_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.030_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.030 / Cube.030_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.031_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.031 / Cube.031_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.032_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.032 / Cube.032_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.033_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.033 / Cube.033_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.034_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.034 / Cube.034_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.035_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.035 / Cube.035_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.036_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.036 / Cube.036_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.037_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.037 / Cube.037_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.038_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.038 / Cube.038_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.039_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.039 / Cube.039_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.040_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.040 / Cube.040_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.041_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.041 / Cube.041_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.042_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.042 / Cube.042_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Cube.043_Anis_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Cube.043 / Cube.043_Anis_0 | Anis / MeshPhysicalMaterial / 16 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T8 1024×1024 sRGB | T10 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | T9 1024×1024 NoColorSpace/data | — | — |
| Plane.005_Label_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Cube.027 / Plane.005 / Plane.005_Label_0 | Label / MeshStandardMaterial / 1 mesh | 0, 0, 0, 1 | 0 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | — | — | — | — | — | — |
| Les_Paul_Body.001_Body_Bottom_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_Body.001 / Les_Paul_Body.001_Body_Bottom_0 | Body_Bottom / MeshPhysicalMaterial / 1 mesh | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T12 1024×1024 sRGB | T14 1024×1024 NoColorSpace/data | T13 1024×1024 NoColorSpace/data | T13 1024×1024 NoColorSpace/data | — | — |
| Les_Paul_Body.001_Body Detail_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_Body.001 / Les_Paul_Body.001_Body Detail_0 | Body_Detail / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T16 1024×1024 sRGB | T18 1024×1024 NoColorSpace/data | T17 1024×1024 NoColorSpace/data | T17 1024×1024 NoColorSpace/data | — | — |
| Les_Paul_Body.001_Body Detail_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_Body.001 / Les_Paul_Body.001_Body Detail_0 | Body_Detail / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T16 1024×1024 sRGB | T18 1024×1024 NoColorSpace/data | T17 1024×1024 NoColorSpace/data | T17 1024×1024 NoColorSpace/data | — | — |
| Les_Paul_Body.001_Neck_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_Body.001 / Les_Paul_Body.001_Neck_0 | Neck / MeshPhysicalMaterial / 1 mesh | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T20 1024×1024 sRGB | T22 1024×1024 NoColorSpace/data | T21 1024×1024 NoColorSpace/data | T21 1024×1024 NoColorSpace/data | — | — |
| Les_Paul_Body.001_FretBoard_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_Body.001 / Les_Paul_Body.001_FretBoard_0 | FretBoard / MeshPhysicalMaterial / 1 mesh | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T24 1024×1024 sRGB | T26 1024×1024 NoColorSpace/data | T25 1024×1024 NoColorSpace/data | T25 1024×1024 NoColorSpace/data | — | — |
| Les_Paul_Body.001_Strings_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_Body.001 / Les_Paul_Body.001_Strings_0 | Strings / MeshPhysicalMaterial / 1 mesh | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T28 1024×1024 sRGB | T30 1024×1024 NoColorSpace/data | T29 1024×1024 NoColorSpace/data | T29 1024×1024 NoColorSpace/data | — | — |
| Les_Paul_Body.001_Body_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_Body.001 / Les_Paul_Body.001_Body_0 | Body / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T32 1024×1024 sRGB | T34 1024×1024 NoColorSpace/data | T33 1024×1024 NoColorSpace/data | T33 1024×1024 NoColorSpace/data | — | — |
| Les_Paul_BodyCover.001_Body_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / Les_Paul_BodyCover.001 / Les_Paul_BodyCover.001_Body_0 | Body / MeshPhysicalMaterial / 2 meshes | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T32 1024×1024 sRGB | T34 1024×1024 NoColorSpace/data | T33 1024×1024 NoColorSpace/data | T33 1024×1024 NoColorSpace/data | — | — |
| BezierCurve.001_Material.006_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / BezierCurve.001 / BezierCurve.001_Material.006_0 | Material.006 / MeshStandardMaterial / 1 mesh | 0.285293, 0, 0.0001653950000000107, 1 | 0 / 0.986434841442783 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | — | — | — | — | — | — |
| BezierCurve.001_Strings.001_0 | Sketchfab_model / 13505c18ce3342f4bf6a61ad48c01b7c.fbx / RootNode / BezierCurve.001 / BezierCurve.001_Strings.001_0 | Strings.001 / MeshPhysicalMaterial / 1 mesh | 1, 1, 1, 1 | 1 / 1 / 1 | 1 / transparent=no / flat=no / N=yes / UV=yes | T28 1024×1024 sRGB | T30 1024×1024 NoColorSpace/data | T29 1024×1024 NoColorSpace/data | T29 1024×1024 NoColorSpace/data | — | — |

### Embedded texture inventory

| Image | MIME | Dimensions | Close-up limitation |
|---|---|---|---|
| 0 | image/png | 1024×1024 | Limited for extreme close-up |
| 1 | image/png | 1024×1024 | Limited for extreme close-up |
| 2 | image/png | 1024×1024 | Limited for extreme close-up |
| 3 | image/png | 1024×1024 | Limited for extreme close-up |
| 4 | image/png | 1024×1024 | Limited for extreme close-up |
| 5 | image/png | 1024×1024 | Limited for extreme close-up |
| 6 | image/png | 1024×1024 | Limited for extreme close-up |
| 7 | image/png | 1024×1024 | Limited for extreme close-up |
| 8 | image/png | 1024×1024 | Limited for extreme close-up |
| 9 | image/png | 1024×1024 | Limited for extreme close-up |
| 10 | image/png | 1024×1024 | Limited for extreme close-up |
| 11 | image/png | 1024×1024 | Limited for extreme close-up |
| 12 | image/png | 1024×1024 | Limited for extreme close-up |
| 13 | image/png | 1024×1024 | Limited for extreme close-up |
| 14 | image/png | 1024×1024 | Limited for extreme close-up |
| 15 | image/png | 1024×1024 | Limited for extreme close-up |
| 16 | image/png | 1024×1024 | Limited for extreme close-up |
| 17 | image/png | 1024×1024 | Limited for extreme close-up |
| 18 | image/png | 1024×1024 | Limited for extreme close-up |
| 19 | image/png | 1024×1024 | Limited for extreme close-up |
| 20 | image/png | 1024×1024 | Limited for extreme close-up |
| 21 | image/png | 1024×1024 | Limited for extreme close-up |
| 22 | image/png | 1024×1024 | Limited for extreme close-up |
| 23 | image/png | 1024×1024 | Limited for extreme close-up |
| 24 | image/png | 1024×1024 | Limited for extreme close-up |
| 25 | image/png | 1024×1024 | Limited for extreme close-up |
| 26 | image/png | 1024×1024 | Limited for extreme close-up |
| 27 | image/png | 1024×1024 | Limited for extreme close-up |
| 28 | image/png | 1024×1024 | Limited for extreme close-up |
| 29 | image/png | 1024×1024 | Limited for extreme close-up |
| 30 | image/png | 1024×1024 | Limited for extreme close-up |
| 31 | image/png | 1024×1024 | Limited for extreme close-up |
| 32 | image/png | 1024×1024 | Limited for extreme close-up |
| 33 | image/png | 1024×1024 | Limited for extreme close-up |
| 34 | image/png | 1024×1024 | Limited for extreme close-up |
| 35 | image/png | 1024×1024 | Limited for extreme close-up |


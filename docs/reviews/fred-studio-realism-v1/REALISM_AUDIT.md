# Fred Studio Render Realism V1 — Audit

Baseline: `rectangular-studio-shell-v1` at approved commit `e2d57be`
Baseline SHA-256 before realism work: `9eaef61b8695f627a3256b52e7b949433bad7baa1fc171afd6f10f9d123065c8`

The approved room footprint, roof corners, wall proportions, open edges, and hero camera are out of scope for modification. The realism pass may add finish layers, physical thickness outside the interior boundary, trim, and millimetre-scale offsets that prevent overlap.

## Audit findings

1. **Infinitely sharp edges:** the floor slab, roof fascia, Wall 2, and most curtain-wall members use raw box or surface geometry with mathematically sharp edges, so highlights cannot describe their scale.
2. **Wall 2 is a single surface:** the rear wall has no physical depth, back face, side returns, or believable top closure. Its diagonal triangle split is visible in wireframe and can produce inconsistent lighting.
3. **Roof construction is visually thin:** the roof has nominal thickness surfaces, but its open edges and junctions lack a continuous rounded closure and the inner surface reads as a large dark sheet.
4. **Flat-colour materials:** concrete, wall, roof, and frame materials are mainly single colours with scalar roughness. They lack low-frequency colour variation and micro-surface response.
5. **Missing micro-normal and AO variation:** no procedural bump/normal or ambient-occlusion maps are assigned to the main architectural finishes, leaving broad surfaces digitally perfect.
6. **Glass reads as a teal transparent block:** the facade uses a transparent physical material without transmission, IOR, attenuation, or physical panel thickness. The dark exterior sits very close to it and compresses depth.
7. **Facade members are generic boxes:** mullions and rails are separate sharp-edged meshes; repeated members are not instanced, frame depth is shallow, and top/bottom/corner junctions lack proper caps.
8. **Floor reads as one slab:** the main floor has no restrained granular variation, perimeter contact darkening, finish joints, or separate timber finish zone in the active shell.
9. **Timber generator repeats visibly:** the existing 1024px canvas uses uniform horizontal bands and identical board lengths; it does not create staggered ends, individual board colour variation, or subtle bevel gaps.
10. **Lighting is hotspot-driven:** several bright point lights create local falloff and game-like pools rather than large, soft architectural illumination. The hemisphere light is strong enough to flatten shadow hierarchy.
11. **Shadow hierarchy is inconsistent:** the key light uses a large map but the current PCF setup and bias values do not provide dependable soft contact at floor/wall, roof/wall, and frame/glass junctions.
12. **Roof is underexposed:** its warm-brown colour and current light direction combine into near-black areas, losing the approved roof plane and making the space feel capped by a void.
13. **Exterior depth is insufficient:** the facade has no layered cold exterior volume or broad reflection cue, so glass transparency reveals a nearly flat dark backing.
14. **Colour management is only partially tuned:** sRGB output and ACES are enabled, but physically-correct-light intent, exposure, shadow type, and neutral material values are not coordinated as one photographic response.
15. **Debug inspection is incomplete:** geometry views exist, but there are no dedicated material, lighting, shadow, glass, realistic, or clay controls for isolating realism problems.
16. **Stage violates this pass scope:** the central padded stage is currently visible and must be hidden for an architectural-shell-only realism review.

## Implementation direction

- Preserve the frozen shell baseline byte-for-byte.
- Add procedural textures no larger than 1024px; use deterministic variation.
- Replace the zero-thickness glass panels with thin physical volumes and use instancing for repeated frame members.
- Add finish-layer geometry and restrained trims without changing the approved interior footprint.
- Rebalance the scene around a soft warm key, low ambient fill, and cold facade-side fill.
- Add REALISTIC and CLAY inspection paths plus focused review cameras.

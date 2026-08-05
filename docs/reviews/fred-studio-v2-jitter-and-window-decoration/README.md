# Fred Studio V2 window-decoration and boundary-stability review

Verification evidence for removing the window-side hanging banner set and eliminating camera clamp feedback jitter.

## Window decoration removal

The source GLB contains the five white hanging banner pieces as five independent groups: `Plane007` through `Plane011`. Their bounds and shared banner material identify the complete row shown above the window. These groups do not contain the window frame or wall geometry.

All five groups and every descendant mesh are hidden at runtime before model audit, material tuning, shadow setup, or rendering. Hidden descendants also have `castShadow` and `receiveShadow` disabled. There was no separate banner collider, keep-out zone, raycast target, label, or helper to retain. The application-wide object-selection raycaster remains removed.

The source GLB was not edited. SHA-256 remains:

`5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19`

## Clamp feedback stabilization

Previously, OrbitControls damping retained blocked rotation, pan, and dolly motion after the custom camera cage corrected the camera. The next frame reapplied the same illegal residual, so the camera and clamp could repeatedly fight each other.

The render sequence is now:

1. OrbitControls applies the current intended movement.
2. Camera and target safety are enforced together before rendering.
3. If safety changed either value, the blocked OrbitControls spherical delta, pan offset, dolly direction, cursor-zoom flag, and scale are cleared.
4. OrbitControls updates once from the corrected legal camera/target pair so its internal spherical state matches the rendered state.
5. The next frame starts without the illegal residual.

The old OrbitControls `change` listener clamp was removed, eliminating recursive clamp-vs-controls feedback. Valid damping movement remains smooth. A blocked component stops at the legal boundary; new valid input can continue along another direction.

## Boundary stress results

All values remained `INTERIOR SAFE YES`.

| Limit | Settled camera | Result |
| --- | --- | --- |
| Sofa keep-out | `[-5.252, 1.755, 3.377]` | Corrections and stabilizations both stopped at 4 |
| Room wall/cage | `[-6.55, 1.92, -1.213]` | Stable at exact X minimum |
| Glass side | `[0.575, 1.92, 3.38]` | Stable at exact Z maximum; corrections and stabilizations both stopped at 17 |
| Floor | `[-5.399, 0.72, 0.265]` | Stable at exact Y minimum |
| Ceiling | `[-4.397, 3.72, 0.23]` | Stable at exact Y maximum |
| Minimum zoom | camera `[-3.546, 1.708, 0.201]` | Stable at distance 1.2 |
| Maximum zoom | camera `[-4.011, 2.722, -1.45]` | Stable at distance 4.65 |

After each blocked interaction, camera coordinates, correction count, stabilization count, and last-clamp status were sampled again after a second delay and remained unchanged. Two settled official-route screenshots were also byte-identical, confirming no residual visual movement.

## Regression checks

- Official route DOM contains only the accessible 3D canvas.
- Official OrbitControls remain enabled immediately.
- Debug UI appears only with the exact `?debug=1` condition.
- Dining table and all dining chairs remain removed.
- No object highlighting, inspector, or yellow selection box returned.
- No visible attribution returned.
- Camera cage, target cage, safe zoom, furniture keep-outs, damping, and indoor 360-degree orbit remain active.

## Evidence

- `01-window-decoration-removed.jpg`
- `02-official-glass-boundary-stable.jpg`
- `03-debug-glass-boundary-stable.jpg`

# Fred Studio V2 correction review

## Rendering-layer dining-set removal

The source GLB was inspected before the correction. The dining set consists of four independent object groups:

- rectangular timber table top;
- table legs and supports;
- the complete chair group on one side;
- the complete chair group on the opposite side.

The timber and dark materials are shared with unrelated loft objects, so no material-wide removal is used. The four dining-only groups are hidden at runtime before material tuning, shadow configuration, model audit, or rendering. Every descendant mesh is also marked not visible and has shadow casting and receiving disabled.

The original GLB remains unchanged. Its SHA-256 checksum is:

`5760cd49693e08773676b192090a50985787cf731d0c6e7e284f1c4814638c19`

The former dining-set camera keep-out zone was removed. No dining selection target, raycast target, helper, label, collider, or debug preset remains. The room-wide camera cage and the keep-out zones for sofas, coffee tables, kitchen island/stools, and kitchen cabinet line remain active.

## Route separation

The official route renders only the 3D canvas after loading:

`http://127.0.0.1:5176/studio-v2-import-test`

OrbitControls are enabled immediately with damping, bounded pan, safe zoom, unrestricted indoor azimuth, camera clamping, and target clamping. No header, title, navigation, buttons, instructions, debug panel, inspector, tooltip, or attribution UI is rendered.

The debug interface is rendered only when this exact condition is true:

```js
new URLSearchParams(window.location.search).get('debug') === '1'
```

Debug route:

`http://127.0.0.1:5176/studio-v2-import-test?debug=1`

Development mode, localhost, refresh state, `debug=true`, and unrelated query parameters do not enable the debug interface.

## Highlighting removal

The object-selection raycaster, pointer handlers, selected-object record, mesh/material inspector, and yellow BoxHelper were removed from both routes. Browser clicks on furniture in official and debug modes produced no visual change or object metadata.

## Browser verification

- Official DOM after loading: only the accessible 3D canvas.
- Official direct drag: scene rotated without clicking Explore.
- Official dining area: floor visible; table top, supports, and all dining chairs absent.
- Official furniture click: no outline, glow, box, colour change, label, or tooltip.
- Debug route: header and black diagnostic panel available.
- `?debug=true`: no interface, proving exact `debug=1` gating.
- Debug boundary test: `INTERIOR SAFE YES`; 109 safety corrections; last correction `INTERIOR CAMERA CAGE`.
- Debug object click: no selection runtime and no yellow helper.
- Visible dining-area floor: no floating dining-set shadows.
- Unrelated sofas, coffee tables, kitchen island, island stools, kitchen cabinets, and room shell remain visible.

## Evidence

- `01-official-opening.png`
- `02-official-rotated.png`
- `03-official-dining-area-empty.png`
- `04-official-click-no-highlight.png`
- `05-debug-interface.png`
- `06-debug-click-no-highlight.png`

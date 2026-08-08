# Fred Studio V2 — Stage 2 Directional Daylight & Shadow Hierarchy

## 1. Status

NEEDS USER REVIEW

Stage 2 is implemented and technically verified. This report does not self-declare the visual result as final PASS.

## 2. Stage 1 Preserved

- `StudioV2KitchenPainted` remains `#ffffff` over the source cabinet atlas, so the former double-darkening does not return.
- `StudioV2IslandPainted` remains the source-supported `#3b3b3b`.
- The accepted forest mesh remains the visible background while `RoomEnvironment` PMREM remains the independent IBL source.
- Scene Ready, the Radio hybrid handoff, Marshall audio, placed-object transforms, cameras, routes, and official/debug separation remain intact.
- No planar reflection, SSR, reflection render target, or reflection post-process was introduced.

## 3. Why the Neutral Baseline Looked Flat

The Stage 1 baseline prioritised material inspection. IBL at `0.78`, a non-shadowing window area contribution at `0.72`, ceiling bounce at `0.20`, and directional fill at `0.04` collectively raised most orientations into a similar brightness range. The shadow-casting key was only `0.52`, with shadow contribution `0.38` and radius `5`, so broad fill masked most stool, island, furniture, and floor relationships even though shadow rendering was active.

Stage 2 reduces broad fill and makes the window-side directional key the dominant spatial cue. A key-only diagnostic confirmed that the shadow map, floor receiver, and existing stool-leg casters worked; the remaining missing island/stool casters were then corrected explicitly.

## 4. Light Budget

| Control | Stage 1 | Stage 2 |
| --- | ---: | ---: |
| RoomEnvironment IBL intensity | 0.78 | 0.45 |
| Directional daylight key | 0.52 | 1.80 |
| Window RectAreaLight | 0.72 | 0.25 |
| Ceiling bounce RectAreaLight | 0.20 | 0.05 |
| Non-shadowing directional fill | 0.04 | 0.00 |
| Exposure | 0.90 | 0.72 |
| Shadow contribution | 0.38 | 0.65 |
| Shadow radius | 5 | 3 |

The `1.80` key is intentionally above the initial exploratory range. Values at or below `1.00` did not produce a visible cast-shadow hierarchy once minimum material readability was retained. Overall brightness is not increased: IBL, window fill, ceiling bounce, directional fill, and exposure were all reduced. The resulting key-to-fill ratio, rather than raw scene brightness, creates the hierarchy.

No lights were added. The scene still contains four configured lights, with the non-shadowing directional fill retained at zero intensity.

## 5. Key Direction

- Position: `[-2.2, 4.6, -5.6]`
- Target: `[-2.2, 0.5, -0.3]`
- Colour: `#fff8ef`
- Relationship: the key begins at the glazed/window side (`-Z`) and travels inward across the floor and room toward `+Z`.
- Shadow map: one `2048 × 2048` map.
- Orthographic shadow camera: left `-8`, right `8`, top `6`, bottom `-4`, near `0.5`, far `24`.
- Bias: `-0.00035`; normal bias: `0.025`.

The audited frustum covers the island, stools, opening-view floor, Marshall/Guitar zone, primary furniture, and the major receiving architecture without adding another shadow camera or light.

## 6. Casters / Receivers

Added to the selective room caster policy:

- `StudioV2IslandPainted`
- `StudioV2IslandTimber`
- `StudioV2StoolTimber`

Already participating and preserved:

- `StudioV2StoolLegMetal`
- major kitchen and furniture casters already in the selective set
- Marshall and Guitar placed-object meshes, which retain their existing cast/receive policy
- the main floor receiver (`Material.002`), unchanged

No blanket “all tiny meshes cast shadows” policy was enabled. The caster correction adds three shadow-pass draw calls and 644 rendered shadow triangles in the opening view compared with the Stage 1 baseline.

## 7. Tone Mapping

The final light rig was compared at the same fixed opening camera and `1600 × 1000` viewport:

- Neutral: exposure `0.72` — selected.
- ACESFilmic: exposure `0.72` — slightly lifts/compresses mid-tones and weakens the deep-black hierarchy.
- AgX: exposure `0.72` — creates the strongest grey veil and the weakest shadow separation.

The same exposure was retained after matching the visible forest/window brightness; this also isolates the tone-mapping operator rather than hiding differences with exposure compensation. Neutral best preserves the approved black island/cabinets, timber warmth, forest highlights, and the separation between direct light, penumbra, and IBL fill.

The `tone` and `exposure` URL overrides are accepted only by debug/capture routes. The official route continues to use the selected Neutral `0.72` default.

## 8. Visual Result

- Opening: the glazing remains the brightest zone; the room now steps down through window-side floor, middle room, and deeper kitchen/lounge planes.
- Kitchen: cabinet planes remain readable without restoring the near-black atlas multiplier; handles and appliances retain specular separation.
- Island/stools: seats and legs now cast readable directional floor shadows, with a visible island-to-floor falloff instead of a floating silhouette.
- Lounge: the sofa remains black while cushion faces, seams, and contact areas show directional volume rather than uniform grey fill.
- Marshall: grille, cabinet, guitar, and edge response remain distinct; the setup reads as grounded without a new local light.
- Window highlights: the visible forest stays controlled and no exposure-driven washout was introduced.
- Multi-view orbit: the hierarchy remains coherent through the approved safe camera range, with no exterior leak observed.

Evidence uses the existing fixed presets at `1600 × 1000`: `opening`, `KITCHEN_DETAIL`, `FLOOR_RUG_DETAIL`, `SOFA_DETAIL`, `MARSHALL_FRONT`, and `OPPOSITE`.

## 9. Materials

No Stage 2 base-colour, texture, UV, roughness, metallic, normal, emissive, Marshall, Guitar, Radio, or MacBook material changes were made. The Stage 1 kitchen `#ffffff` atlas multiplier and island `#3b3b3b` source colour remain unchanged.

## 10. Floor

Floor reflection remains deliberately deferred. Stage 2 uses the existing material-only floor and its shadow receiver; there is no planar reflection, SSR, reflection render target, or reflection post-processing.

## 11. Performance

Fixed opening view after Scene Ready and warm-up:

- FPS: 59–60 in the focused debug/capture audit tab
- Draw calls: 99
- Rendered triangles: 780,688
- Geometries: 69
- Textures: 65
- Scene lights: 4
- Shadow-casting lights: 1
- Shadow maps: 1 at `2048²`
- Environment target: the existing RoomEnvironment PMREM target
- Reflection render targets: 0

The 99 calls / 780,688 triangles include the selective island and stool caster correction. No new dependency, post-process, reflection pass, light, or additional shadow map was added.

## 12. Regression

- Scene Ready: READY; all entry-critical conditions and shader/warm-up gates completed.
- Official route: READY with no visible debug UI and no console warning/error.
- Debug route: READY; controls and readiness diagnostics available; no yellow selection helper and no console warning/error.
- Marshall audio: direct world click verified playing → paused → playing, with current time preserved on resume.
- Radio Panel: open, close button, outside click, and Escape all verified; selected track/state preserved; the accepted 220 ms background dim/release transition remains unchanged, with no title jump or brightness snap observed.
- Camera: official orbit drag remained inside the approved view, Scene Ready stayed active, and no exterior leak appeared.
- Resize: `1024 × 768` produced a matching `1024 × 768` canvas while Scene Ready and interactions remained active.
- Route exit/re-entry: `/studio-v2-import-test` → `/` → `/studio-v2-import-test` returned to READY successfully.

## 13. Build

- `npm run build`: PASS with Vite 7.3.6; 519 modules transformed. The existing generic chunk-size warning remains.
- `git diff --check`: PASS.
- Official route console: no warnings or errors.
- Debug route console: no warnings or errors.

## 14. Git

- Branch: `feat/fred-studio-v2-lighting-rebuild`
- Worktree: `/Users/lixinyu/Personal Shit/AI_HUB/30_Apps/personal-website-v2-interactions`
- Base HEAD: `9233bf8e58b4ecf6fdb8d62261c98261619ba4cf`
- Stage 1 and Stage 2 changes remain intentionally uncommitted.
- No files were staged.
- Unrelated pre-existing untracked files remain untouched: `docs/reviews/fred-studio-v2-placed-objects/` and `public/models/fred-studio-v2/objects/imac_2021.glb`.

NO COMMIT
NO PUSH
NO MERGE
NO DEPLOY
ORIGINAL REJECTED WORKTREE UNCHANGED

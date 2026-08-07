# Fred Studio V2 Marshall Audio Interaction Review

## Scope

This review covers the catalogue-driven Marshall click-to-play interaction only. It does not change the approved room, placed assets, materials, lighting, camera, delivery derivatives, or Scene Ready requirements.

## Architecture

- Controller: `src/studio-v2/studioV2AudioController.js`
- Marshall interaction: `src/studio-v2/createStudioV2MarshallInteraction.js`
- One reusable `HTMLAudioElement` per controller instance; no element is inserted into page layout.
- The active development or production catalogue is fetched only after Scene Ready and does not select or request the track file until a user-triggered play operation.
- `preload="none"`, `autoplay=false`, catalogue-provided volume and loop settings.
- The controller exposes `loadCatalogue`, `loadDefaultTrack`, `setTrack`, `next`, `previous`, `play`, `pause`, `toggle`, `stop`, `destroy`, `getState`, and `subscribe`.

## Measured interaction timeline

| Step | Measured result |
| --- | --- |
| Official route ready, no click | Scene Ready `true`; audio `idle`; no visible player/buttons; no `.m4a` resource request |
| First Marshall click | `playing`; default track `cmon-latin-mafia-fred-edit`; sampled currentTime `0.985 s` |
| Second Marshall click | `paused`; currentTime `1.455 s` |
| Third Marshall click | `playing`; currentTime advanced to `2.531 s`, confirming resume rather than restart |
| Drag beginning over Marshall | State remained `playing`; no toggle |
| Guitar click on a fresh opening view | State remained `idle` |
| Rapid Marshall clicks | Deterministic final state `paused`; no console errors or unhandled promise rejection |
| Navigate away while playing | Studio route and canvas destroyed immediately; Studio active class removed |
| Re-enter Studio V2 | Audio returned `idle`; no autoplay |

## Debug route

The Debug-only audio section reports catalogue state, selected track, title, playback state, currentTime, duration, volume, loop, Marshall hover/hit state, pointer movement, last interaction result, last error, and route-active state. Play, Pause, Stop, Reload Catalogue, and future multi-track selection all use the same controller as the 3D interaction.

Measured playing state:

- catalogue: `READY`
- track: `cmon-latin-mafia-fred-edit` / `Cmon`
- audio: `PLAYING`
- currentTime: `1.25 s`
- duration: `255.58 s`
- volume: `0.80`
- loop: `OFF`

The existing Marshall source/derivative selector was exercised and still reloaded the route successfully with `marshall=source`; Scene Ready remained `true` and audio remained `idle`.

## Hit and drag protection

- Stable semantic target: `MARSHALL_AMP`
- Strategy: raycast the Marshall and Guitar semantic roots, accept only when the nearest semantic hit belongs to Marshall
- Maximum click movement: `6 CSS px`
- Maximum press duration: `600 ms`
- OrbitControls camera changes during an active pointer gesture classify the gesture as a drag
- Guitar is explicitly excluded even where its geometry overlaps the amplifier in screen space
- No visible hit mesh, outline, highlight, collider, or extra draw call

## Error verification

- Missing catalogue request: controller enters `error`; no scene dependency
- Invalid catalogue structure: rejected with a specific validation error
- Missing default track: rejected with a specific validation error
- Disabled default or selected track: rejected
- Missing/unsupported audio source: Debug state entered `ERROR` with `Failed to load because no supported source was found.` while Scene Ready remained `true`
- Rejected `audio.play()` promise: captured as controller error without an unhandled rejection
- Route exit during playback/loading: controller is paused and destroyed; late operations cannot publish new state
- Repeated fast toggles: share one in-flight operation and do not create overlapping playback or another audio element

No continuous retry loop is used. The Debug route provides an explicit catalogue reload action.

## Scene Ready and performance

- Audio is absent from `ENTRY_CRITICAL_ASSETS` and all Scene Ready conditions.
- Catalogue loading is started only after `markSceneReady()`.
- The complete audio file is not requested before the first user playback action.
- Debug sample: `60 FPS`, `94 draw calls`, `780,030 rendered triangles`.
- No LED was added because a natural, accepted indicator position could not be identified without visual guesswork.
- Draw-call impact: `0`.

## Evidence

- `official-marshall-idle.png`: official opening view before interaction
- `official-marshall-playing.png`: official opening view while controller state is playing; no visible player or visual treatment change
- `debug-audio-playing.png`: Debug audio section in the playing state
- `drag-over-marshall-no-toggle.png`: post-drag official view with playback state unchanged
- `route-exit-paused.png`: destination route after Studio V2 teardown
- `audio-error-debug.png`: Debug-only missing/unsupported source error with the 3D scene intact

Screenshots do not prove audible output by themselves; the measured state timeline above records the runtime verification.

## Automated and build checks

- `node src/studio-v2/studioV2AudioController.test.mjs`: PASS
- `npm run build`: PASS, 515 modules transformed
- Build warning: existing chunk-size warning for chunks above 500 kB
- No source file directly imports the ignored local audio binary.

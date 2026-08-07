# Fred Studio V2 Music Library

This directory defines the file layout and catalogue schema for Fred Studio V2 music. Playback is owned by the reusable, catalogue-driven Studio V2 audio controller rather than by the Marshall click handler itself.

## Directory roles

- `tracks/local/` contains local-development audio. Its audio files are excluded from Git.
- `tracks/published/` is reserved for audio explicitly approved for public deployment.
- `covers/` stores optional track artwork.
- `catalog.local.json` contains the local playlist and is excluded from Git.
- `catalog.published.json` is the tracked production catalogue and must reference only publicly permitted files in `tracks/published/`.
- `catalog.example.json` documents the track schema with fictional data and remains trackable.

The local and production catalogues are intentionally separate. Development prefers `catalog.local.json`; production reads only `catalog.published.json` and never falls back to the local catalogue.

## Adding a track

1. Copy the audio file into `tracks/local/` for local development, or into `tracks/published/` only after publication approval.
2. Optionally copy artwork into `covers/`.
3. Add one track object to the appropriate catalogue with `id`, `title`, `version`, `artist`, `file`, `cover`, `enabled`, `loop`, and `volume` fields.
4. Keep track IDs and normalized file names stable so future interaction code does not depend on display titles.

Prefer MP3 or M4A/AAC for browser delivery. WAV and FLAC are not recommended for normal web delivery because of their size. Do not convert a compatible source solely to change its extension.

## Runtime requirements

- Local development reads `catalog.local.json`. Production reads the tracked `catalog.published.json`, whose files must live in `tracks/published/`.
- The Marshall interaction toggles the catalogue's enabled `defaultTrackId`; future tracks can be added to the catalogue without rewriting the controller.
- The controller already exposes `setTrack`, `next`, and `previous` for future multi-track controls.
- The audio library must never block the Studio V2 Scene Ready Gate.
- The production audio file is requested only after a real user playback action; audio must not autoplay.
- Leaving the Studio V2 route must pause playback.
- Missing or unreadable audio must not prevent the 3D scene from loading.
- Catalogue files contain metadata only and must not hard-code playback behavior.

An empty published catalogue uses `defaultTrackId: null` and `tracks: []`. The controller reports `NO_PUBLISHED_TRACK` without blocking or damaging the Studio V2 scene.

## Publishing a permitted replacement track

1. Obtain a track that is permitted for public website use.
2. Copy it into `tracks/published/`.
3. Add its complete entry to `catalog.published.json` and set its ID as `defaultTrackId`.
4. Run the production build.
5. Verify the exact published audio URL from the built or hosted site.
6. Commit and deploy only after the file and rights are approved.
7. If Cmon is formally licensed later, replace the production file and catalogue entry without changing the Marshall controller.

## Published track rights status

- Track: `Cmon (LATIN MAFIA & Fred edit)`
- Project path: `tracks/published/cmon-latin-mafia-fred-edit.m4a`
- Status: public website use permission confirmed by the project owner.
- Confirmation date: `2026-08-07`

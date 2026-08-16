# Generated photo-wall assets

This directory contains web-ready display derivatives and the small procedural
fixture set used to validate the packaging system. Original user photographs
belong in `../source/` and must never be overwritten.

Generate real-photo derivatives with
`python3 scripts/generate-studio-v2-photo-derivatives.py`. The tool writes
1920px, quality-90, 4:4:4 progressive JPEGs, normalizes embedded colour
profiles to sRGB, handles multi-picture JPEGs safely, and rejects blank output.
It never modifies the source files. Each manifest entry's `generatedFilename`
points at its derivative.

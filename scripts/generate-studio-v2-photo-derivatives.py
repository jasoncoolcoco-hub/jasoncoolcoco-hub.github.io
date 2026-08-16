#!/usr/bin/env python3
"""Generate and validate web-ready Fred Studio V2 photo derivatives."""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

from PIL import Image, ImageCms, ImageOps, ImageStat


PROJECT_ROOT = Path(__file__).resolve().parents[1]
PHOTO_WALL_ROOT = PROJECT_ROOT / "public/studio-v2/photo-wall"
MANIFEST_PATH = PHOTO_WALL_ROOT / "manifest.json"
MAX_DIMENSION = 1920
JPEG_QUALITY = 90
MIN_LUMA_RANGE = 4
MIN_LUMA_STDDEV = 1.0


def placed_photos() -> list[dict]:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    return [
        photo
        for photo in manifest["photos"]
        if isinstance(photo.get("x"), (int, float))
        and isinstance(photo.get("y"), (int, float))
    ]


def first_frame_srgb(source_path: Path) -> Image.Image:
    with Image.open(source_path) as source:
        source.seek(0)
        image = ImageOps.exif_transpose(source).convert("RGB")
        icc_profile = source.info.get("icc_profile")
        if not icc_profile:
            return image
        try:
            source_profile = ImageCms.ImageCmsProfile(io.BytesIO(icc_profile))
            destination_profile = ImageCms.createProfile("sRGB")
            return ImageCms.profileToProfile(
                image,
                source_profile,
                destination_profile,
                outputMode="RGB",
            )
        except (ImageCms.PyCMSError, OSError, ValueError):
            return image


def image_quality(path: Path) -> dict:
    with Image.open(path) as image:
        image.seek(0)
        sample = ImageOps.exif_transpose(image).convert("RGB")
        sample.thumbnail((320, 320), Image.Resampling.LANCZOS)
        luminance = sample.convert("L")
        statistics = ImageStat.Stat(luminance)
        minimum, maximum = luminance.getextrema()
        return {
            "format": image.format,
            "height": image.height,
            "lumaRange": maximum - minimum,
            "lumaStddev": statistics.stddev[0],
            "width": image.width,
        }


def validate_derivative(photo: dict, path: Path) -> dict:
    if not path.exists():
        raise RuntimeError(f"{photo['filename']}: derivative is missing: {path}")
    quality = image_quality(path)
    if quality["format"] != "JPEG":
        raise RuntimeError(f"{photo['filename']}: expected JPEG derivative")
    if max(quality["width"], quality["height"]) > MAX_DIMENSION:
        raise RuntimeError(f"{photo['filename']}: derivative exceeds {MAX_DIMENSION}px")
    source_aspect = photo["width"] / photo["height"]
    derivative_aspect = quality["width"] / quality["height"]
    if abs(source_aspect - derivative_aspect) > 0.002:
        raise RuntimeError(f"{photo['filename']}: derivative aspect ratio changed")
    if quality["lumaRange"] < MIN_LUMA_RANGE or quality["lumaStddev"] < MIN_LUMA_STDDEV:
        raise RuntimeError(f"{photo['filename']}: derivative is blank or near-solid")
    return quality


def generate_derivative(photo: dict) -> Path:
    source_path = PHOTO_WALL_ROOT / "source" / photo["filename"]
    output_path = PHOTO_WALL_ROOT / photo["generatedFilename"]
    if not source_path.exists():
        raise RuntimeError(f"{photo['filename']}: source is missing")
    if output_path.suffix.lower() not in {".jpg", ".jpeg"}:
        raise RuntimeError(f"{photo['filename']}: derivative must be JPEG")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image = first_frame_srgb(source_path)
    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
    temporary_path = output_path.with_suffix(f"{output_path.suffix}.tmp")
    try:
        image.save(
            temporary_path,
            format="JPEG",
            quality=JPEG_QUALITY,
            subsampling=0,
            optimize=True,
            progressive=True,
        )
        validate_derivative(photo, temporary_path)
        temporary_path.replace(output_path)
    finally:
        temporary_path.unlink(missing_ok=True)
    return output_path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="validate without regenerating")
    args = parser.parse_args()
    photos = placed_photos()
    for slot_number, photo in enumerate(photos, start=1):
        derivative_path = PHOTO_WALL_ROOT / photo["generatedFilename"]
        if not args.check:
            derivative_path = generate_derivative(photo)
        quality = validate_derivative(photo, derivative_path)
        print(
            f"slot {slot_number:02d}: {photo['filename']} -> "
            f"{quality['width']}x{quality['height']} "
            f"luma-stddev={quality['lumaStddev']:.2f}"
        )
    print(f"Photo derivative {'check' if args.check else 'generation'} passed: {len(photos)} photos")


if __name__ == "__main__":
    main()

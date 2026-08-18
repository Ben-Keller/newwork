#!/usr/bin/env python3
"""Validate the New Work handoff package before archiving."""

from __future__ import annotations

import csv
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov"}


def asset_strings(value):
    if isinstance(value, dict):
        for child in value.values():
            yield from asset_strings(child)
    elif isinstance(value, list):
        for child in value:
            yield from asset_strings(child)
    elif isinstance(value, str) and value.startswith("assets/"):
        yield value


def main() -> None:
    errors: list[str] = []
    all_files = [
        p for p in ROOT.rglob("*")
        if p.is_file()
        and "new-work-site" not in p.relative_to(ROOT).parts
        and ".git" not in p.relative_to(ROOT).parts
        and ".pnpm-store" not in p.relative_to(ROOT).parts
    ]
    media = [p for p in all_files if p.suffix.lower() in MEDIA_SUFFIXES and "references/" not in p.relative_to(ROOT).as_posix()]
    for path in all_files:
        relative = path.relative_to(ROOT)
        if path.stat().st_size == 0:
            errors.append(f"zero-byte file: {relative}")
        if any(part.startswith(".") for part in relative.parts) or any(token in path.name.lower() for token in (".part", ".tmp", ".huh")):
            errors.append(f"temporary/hidden file: {relative}")

    projects = json.loads((ROOT / "content" / "projects.json").read_text())
    if not isinstance(projects, list) or not projects:
        errors.append("projects.json must be a non-empty list")
    ids = [p.get("_id") for p in projects]
    slugs = [p.get("slug") for p in projects]
    if len(ids) != len(set(ids)):
        errors.append("duplicate project _id")
    if len(slugs) != len(set(slugs)):
        errors.append("duplicate project slug")
    for project in projects:
        if project.get("visible") is not False or project.get("needsReview") is not True:
            errors.append(f"seed safety flags invalid: {project.get('_id')}")
        for rel in asset_strings(project):
            if not (ROOT / rel).is_file():
                errors.append(f"missing fixture asset: {rel}")
        keys = [block.get("_key") for block in project.get("contentBlocks", [])]
        if any(not key for key in keys) or len(keys) != len(set(keys)):
            errors.append(f"missing/duplicate content block _key: {project.get('_id')}")
        focal = project.get("cover", {}).get("focalPoint", {})
        if not all(isinstance(focal.get(axis), (int, float)) and 0 <= focal[axis] <= 1 for axis in ("x", "y")):
            errors.append(f"missing/out-of-range cover focalPoint: {project.get('_id')}")
        for block in project.get("contentBlocks", []):
            if block.get("_type") in {"video", "heroVideo", "shortLoop"} and not block.get("poster"):
                errors.append(f"video block missing poster: {project.get('_id')} / {block.get('_key')}")

    manifest_rows = list(csv.DictReader((ROOT / "metadata" / "asset-manifest.csv").open()))
    manifest_paths = {r["local_path"] for r in manifest_rows}
    actual_manifest_media = {p.relative_to(ROOT).as_posix() for p in media}
    if manifest_paths != actual_manifest_media:
        for rel in sorted(actual_manifest_media - manifest_paths):
            errors.append(f"media missing from manifest: {rel}")
        for rel in sorted(manifest_paths - actual_manifest_media):
            errors.append(f"manifest path missing on disk: {rel}")

    for path in media:
        suffix = path.suffix.lower()
        if suffix in {".mp4", ".webm", ".mov"}:
            probe = json.loads(subprocess.check_output([
                "ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)
            ]))
            video_streams = [s for s in probe.get("streams", []) if s.get("codec_type") == "video"]
            audio_streams = [s for s in probe.get("streams", []) if s.get("codec_type") == "audio"]
            if not video_streams:
                errors.append(f"no video stream: {path.relative_to(ROOT)}")
            if audio_streams and path.is_relative_to(ROOT / "assets" / "web-ready"):
                errors.append(f"preview must be silent: {path.relative_to(ROOT)}")
            if suffix == ".mp4" and video_streams and video_streams[0].get("codec_name") != "h264":
                errors.append(f"MP4 is not H.264: {path.relative_to(ROOT)}")
        else:
            result = subprocess.run(["identify", f"{path}[0]"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            if result.returncode:
                errors.append(f"image does not decode: {path.relative_to(ROOT)}")

    source_rows = list(csv.DictReader((ROOT / "metadata" / "source-links.csv").open()))
    if len(source_rows) < 40:
        errors.append("source-links.csv unexpectedly incomplete")

    if errors:
        print("PACKAGE VALIDATION FAILED")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)

    source_count = sum("assets/source/" in p.relative_to(ROOT).as_posix() for p in media)
    ready_count = sum("assets/web-ready/" in p.relative_to(ROOT).as_posix() for p in media)
    video_count = sum(p.suffix.lower() == ".mp4" for p in media)
    print("PACKAGE VALIDATION PASSED")
    print(f"projects={len(projects)}")
    print(f"media_manifest_rows={len(manifest_rows)}")
    print(f"source_media={source_count}")
    print(f"web_ready_media={ready_count}")
    print(f"mp4_files={video_count}")
    print(f"source_links={len(source_rows)}")


if __name__ == "__main__":
    main()

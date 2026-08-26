#!/usr/bin/env python3
"""Regenerate asset-manifest.csv from the packaged media and provenance notes."""

from __future__ import annotations

import csv
import hashlib
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "metadata" / "asset-manifest.csv"
MEDIA_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov"}

OLIVER_SUPPLIED_FILMS = {
    "oliver videos/an_unexpected_life___helen_mayer (1080p).mp4": {
        "project": "Mercury — An Unexpected Life",
        "project_slug": "mercury-helen-mayer",
        "source_page": "https://oliverhamilton.com/project/mercury-helen-mayer/",
        "source_media_url": "https://vimeo.com/867257158",
    },
    "oliver videos/toyota_-_tour_de_france (1080p).mp4": {
        "project": "Tour De France x Toyota",
        "project_slug": "tour-de-france",
        "source_page": "https://oliverhamilton.com/project/tour-de-france/",
        "source_media_url": "https://vimeo.com/758886121",
    },
    "oliver videos/humu_vignette_#2 (1080p).mp4": {
        "project": "Humu — Make Work Better, Holly",
        "project_slug": "humu-meet-holly",
        "source_page": "https://oliverhamilton.com/project/humu-meet-holly/",
        "source_media_url": "https://vimeo.com/790211466",
    },
    "oliver videos/in_due_time_-_toyota_x_olympics (1440p).mp4": {
        "project": "Olympics & Toyota — In Due Time",
        "project_slug": "olympics-toyota-alex-massailas",
        "source_page": "https://oliverhamilton.com/project/olympics-toyota-alex-massailas/",
        "source_media_url": "https://vimeo.com/477261846",
    },
    "oliver videos/one_of_the_greats___josh_fabian (1080p).mp4": {
        "project": "Mercury — One of the Greats",
        "project_slug": "mercury-josh-fabian",
        "source_page": "https://oliverhamilton.com/project/mercury-josh-fabian/",
        "source_media_url": "https://vimeo.com/867257700",
    },
}

OLIVER_GALLERY_SOURCES = {
    f"oliver/{item['project_slug']}/gallery-cut-08s.mp4": source_key
    for source_key, item in OLIVER_SUPPLIED_FILMS.items()
}


def md_url(value: str) -> str:
    match = re.search(r"\[[^]]+\]\((https?://[^)]+)\)", value)
    if match:
        return match.group(1)
    match = re.search(r"https?://[^\s|]+", value)
    return match.group(0) if match else ""


def clean(value: str) -> str:
    return value.strip().strip("`").replace("\\|", "|")


def parse_michael() -> dict[str, dict[str, str]]:
    path = ROOT / "references" / "site-research" / "michael-portfolio-manifest.md"
    mapping: dict[str, dict[str, str]] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("| `michael_"):
            continue
        cells = [clean(cell) for cell in line.strip().strip("|").split("|")]
        name = cells[0]
        if len(cells) == 7:  # source still/GIF table
            project, kind, source_page, source_media, dimensions, caveat = cells[1:]
            derivation = "public portfolio rendition"
        elif len(cells) == 6:  # derived MP4 table
            project, derivation, source_media, dimensions, caveat = cells[1:]
            kind = "working MP4 extract"
            source_page = "https://newwork.agency/"
        else:
            continue
        mapping[f"michael/{name}"] = {
            "project": project,
            "kind_label": kind,
            "source_page": md_url(source_page) or "https://newwork.agency/",
            "source_media_url": md_url(source_media),
            "derivation": derivation,
            "reported_dimensions": dimensions,
            "notes": caveat,
        }
    return mapping


def parse_oliver() -> dict[str, dict[str, str]]:
    path = ROOT / "references" / "site-research" / "oliver-portfolio-manifest.md"
    mapping: dict[str, dict[str, str]] = {}
    project = ""
    source_page = ""
    project_slug = ""
    slug_map = {
        "Mercury — An Unexpected Life": "mercury-helen-mayer",
        "Tour De France x Toyota": "tour-de-france",
        "Humu — Make Work Better, Holly": "humu-meet-holly",
        "Olympics & Toyota — In Due Time": "olympics-toyota-alex-massailas",
        "Mercury — One of the Greats": "mercury-josh-fabian",
    }
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("### "):
            project = line[4:].strip()
            project_slug = slug_map.get(project, "")
        elif line.startswith("Source page: "):
            source_page = line.removeprefix("Source page: ").strip()
        elif line.startswith("| `") and project_slug:
            cells = [clean(cell) for cell in line.strip().strip("|").split("|")]
            if len(cells) != 5:
                continue
            name, kind, source_or_derivation, dimensions, notes = cells
            # Oliver's manifest already stores the project directory in Local file.
            mapping[f"oliver/{name}"] = {
                "project": project,
                "kind_label": kind,
                "source_page": source_page,
                "source_media_url": md_url(source_or_derivation),
                "derivation": source_or_derivation if "Locally assembled" in source_or_derivation else "public portfolio rendition",
                "reported_dimensions": dimensions,
                "notes": notes,
            }
    for source_key, item in OLIVER_SUPPLIED_FILMS.items():
        mapping[source_key] = {
            "project": item["project"],
            "kind_label": "Owner-supplied source film",
            "source_page": item["source_page"],
            "source_media_url": item["source_media_url"],
            "derivation": "Owner-supplied local film",
            "reported_dimensions": "",
            "notes": "Supplied for this build; confirm final web-use approval before production.",
            "rights_status": "owner-review",
        }
    return mapping


def media_info(path: Path) -> tuple[str, str, str, str]:
    suffix = path.suffix.lower().lstrip(".")
    if suffix in {"mp4", "mov", "webm"}:
        cmd = [
            "ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=width,height,codec_name:format=duration",
            "-of", "default=noprint_wrappers=1:nokey=0", str(path),
        ]
        data = {}
        for line in subprocess.check_output(cmd, text=True).splitlines():
            if "=" in line:
                key, value = line.split("=", 1)
                data[key] = value
        return data.get("width", ""), data.get("height", ""), data.get("duration", ""), data.get("codec_name", suffix)
    cmd = ["identify", "-format", "%w|%h|%m", f"{path}[0]"]
    width, height, codec = subprocess.check_output(cmd, text=True).split("|", 2)
    return width, height, "", codec.lower()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_key_for(relative: Path) -> tuple[str, str]:
    parts = relative.parts
    if parts[:2] == ("assets", "source"):
        return "/".join(parts[2:]), ""
    if parts[:3] == ("assets", "web-ready", "images"):
        key = "/".join(parts[3:])
        candidate = ROOT / "assets" / "source" / key
        if candidate.exists():
            return key, str(candidate.relative_to(ROOT))
        if key == "michael/michael_native_portfolio_video-poster.webp":
            video_key = "michael/michael_native_portfolio_video_clip.mp4"
            video_source = ROOT / "assets" / "source" / video_key
            return video_key, str(video_source.relative_to(ROOT))
        if key.endswith("-poster.webp"):
            gif_key = key.removesuffix("-poster.webp") + ".gif"
            gif_source = ROOT / "assets" / "source" / gif_key
            if gif_source.exists():
                return gif_key, str(gif_source.relative_to(ROOT))
        person = parts[3]
        stem_path = Path(*parts[4:]).with_suffix("")
        for suffix in (".png", ".webp", ".jpg", ".jpeg"):
            candidate = ROOT / "assets" / "source" / person / stem_path.with_suffix(suffix)
            if candidate.exists():
                key = str(candidate.relative_to(ROOT / "assets" / "source"))
                return key, str(candidate.relative_to(ROOT))
    if parts[:3] == ("assets", "web-ready", "video-previews"):
        key = "/".join(parts[3:])
        supplied_source = OLIVER_GALLERY_SOURCES.get(key)
        if supplied_source:
            return supplied_source, f"assets/source/{supplied_source}"
        candidate = ROOT / "assets" / "source" / key
        return key, str(candidate.relative_to(ROOT)) if candidate.exists() else ""
    return "", ""


def main() -> None:
    provenance = parse_michael() | parse_oliver()
    rows = []
    for base in (ROOT / "assets" / "source", ROOT / "assets" / "web-ready"):
        for path in sorted(
            p for p in base.rglob("*")
            if p.is_file() and p.suffix.lower() in MEDIA_SUFFIXES
        ):
            relative = path.relative_to(ROOT)
            key, derived_from = source_key_for(relative)
            item = provenance.get(key, {})
            person = next(
                (
                    name for name in ("michael", "oliver")
                    if any(part == name or part.startswith(f"{name} ") for part in relative.parts)
                ),
                "oliver",
            )
            width, height, duration, codec = media_info(path)
            is_web = relative.parts[:2] == ("assets", "web-ready")
            is_placeholder = "motion-placeholder" in path.name
            heightened = "chanel_test" in path.name
            publish_status = "prototype-only"
            if is_placeholder:
                publish_status += ";not-source-film"
            if heightened:
                publish_status += ";do-not-publish-without-explicit-approval"
            rows.append({
                "asset_id": "nw-" + hashlib.sha1(relative.as_posix().encode()).hexdigest()[:12],
                "person": person,
                "project": item.get("project", ""),
                "asset_layer": "web-ready" if is_web else "source",
                "kind": "Gallery preview cut" if "gallery-cut-" in path.name else item.get("kind_label", "video" if path.suffix.lower() == ".mp4" else "image"),
                "local_path": relative.as_posix(),
                "derived_from": derived_from,
                "format_or_codec": codec,
                "width_px": width,
                "height_px": height,
                "duration_seconds": duration,
                "source_reported_dimensions_or_duration": item.get("reported_dimensions", ""),
                "source_page": item.get("source_page", ""),
                "source_media_url": item.get("source_media_url", ""),
                "derivation": (
                    "Silent short gallery cut from the supplied source film"
                    if is_web and "gallery-cut-" in path.name
                    else "normalized/extracted WebP derivative"
                    if is_web and path.suffix.lower() == ".webp"
                    else "web-ready copy"
                ) if is_web else item.get("derivation", ""),
                "rights_status": item.get("rights_status", "owner-review;replace-with-approved-master"),
                "publish_status": publish_status,
                "notes": item.get("notes", ""),
                "sha256": sha256(path),
            })
    fieldnames = list(rows[0])
    with OUT.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote {len(rows)} rows to {OUT}")


if __name__ == "__main__":
    main()

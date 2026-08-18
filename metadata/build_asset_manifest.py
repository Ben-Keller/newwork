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

ANJALI_SUPPLIED_FILMS = {
    "anjali videos/what_whack_wears_case_study (1080p).mp4": {
        "project": "Adobe — What Whack Wears",
        "source_page": "https://arao.squarespace.com/new-page-10/",
        "source_media_url": "https://vimeo.com/720040595",
    },
    "anjali videos/liev_schreiber_-_daydream_stella_artois (1080p).mp4": {
        "project": "Stella Artois — Daydream",
        "source_page": "https://arao.squarespace.com/stella-produced/",
        "source_media_url": "https://vimeo.com/439413250",
    },
    "anjali videos/rakuten__duet (1080p).mp4": {
        "project": "Rakuten — Duet",
        "source_page": "https://arao.squarespace.com/rakuten-produced/",
        "source_media_url": "https://vimeo.com/479336941",
    },
}

ANJALI_GALLERY_SOURCES = {
    "anjali/adobe-what-whack-wears-gallery-cut-08s.mp4": "anjali videos/what_whack_wears_case_study (1080p).mp4",
    "anjali/stella-artois-daydream-gallery-cut-06s.mp4": "anjali videos/liev_schreiber_-_daydream_stella_artois (1080p).mp4",
    "anjali/rakuten-duet-gallery-cut-08s.mp4": "anjali videos/rakuten__duet (1080p).mp4",
}

ANJALI_ASSETS = {
    "anjali/anjali-adobe-portrait.webp": {
        "project": "Adobe",
        "kind_label": "Portfolio still",
        "source_page": "https://arao.squarespace.com/new-page-10/",
        "source_media_url": "https://images.squarespace-cdn.com/content/v1/56246b41e4b0a77217f66aed/1691454923058-QHE9SDX6KQVMAF0XIPHK/Screen+Shot+2023-08-07+at+2.33.06+PM.png?format=750w",
        "derivation": "public portfolio rendition",
        "reported_dimensions": "750×626",
        "notes": "Public portfolio asset supplied through the original brief; confirm project credit and reuse rights.",
    },
    "anjali/anjali-stella-artois.webp": {
        "project": "Stella Artois",
        "kind_label": "Portfolio still",
        "source_page": "https://arao.squarespace.com/stella-produced/",
        "source_media_url": "https://images.squarespace-cdn.com/content/v1/56246b41e4b0a77217f66aed/1691430784833-K7H7SS36JTUK8ODGHKV9/Daydream+-+Stella+Artois+-+M.+Ward+Feat.+Alia.jpg?format=1000w",
        "derivation": "public portfolio rendition",
        "reported_dimensions": "1000×563",
        "notes": "Public portfolio asset supplied through the original brief; confirm project credit and reuse rights.",
    },
    "anjali/anjali-rakuten.gif": {
        "project": "Rakuten",
        "kind_label": "Motion-derived still",
        "source_page": "https://arao.squarespace.com/rakuten-produced/",
        "source_media_url": "https://images.squarespace-cdn.com/content/v1/56246b41e4b0a77217f66aed/1691442725277-0I7ERC6OIE004151VQP5/rakuten.gif?format=1000w",
        "derivation": "public portfolio rendition",
        "reported_dimensions": "600×338",
        "notes": "Static prototype derivative of the public portfolio GIF; obtain an approved motion master before publication.",
    },
    "anjali/anjali-rakuten-duet-frame.webp": {
        "project": "Rakuten — Duet",
        "kind_label": "Motion-derived still",
        "source_page": "https://arao.squarespace.com/rakuten-produced/",
        "source_media_url": "https://vimeo.com/479336941",
        "derivation": "Still frame extracted from the owner-supplied film at 14 seconds",
        "reported_dimensions": "960×540",
        "notes": "Owner-supplied for this build; confirm project credit and final web-use approval before production.",
    },
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


def parse_anjali() -> dict[str, dict[str, str]]:
    supplied = {
        source_key: {
            **item,
            "kind_label": "Owner-supplied source film",
            "derivation": "Owner-supplied local film",
            "reported_dimensions": "",
            "notes": "Supplied for this build; full project playback uses Vimeo and the local master stays outside public.",
            "rights_status": "owner-review",
        }
        for source_key, item in ANJALI_SUPPLIED_FILMS.items()
    }
    return ANJALI_ASSETS | supplied


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
        if key in ANJALI_ASSETS and key != "anjali/anjali-rakuten.gif":
            source_candidate = ROOT / "assets" / "source" / key
            derived = str(source_candidate.relative_to(ROOT)) if source_candidate.exists() else ""
            return key, derived
        if key == "anjali/anjali-rakuten.webp":
            source_key = "anjali/anjali-rakuten.gif"
            return source_key, f"assets/source/{source_key}"
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
        supplied_source = OLIVER_GALLERY_SOURCES.get(key) or ANJALI_GALLERY_SOURCES.get(key)
        if supplied_source:
            return supplied_source, f"assets/source/{supplied_source}"
        candidate = ROOT / "assets" / "source" / key
        return key, str(candidate.relative_to(ROOT)) if candidate.exists() else ""
    return "", ""


def main() -> None:
    provenance = parse_michael() | parse_oliver() | parse_anjali()
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
                    name for name in ("michael", "oliver", "anjali")
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

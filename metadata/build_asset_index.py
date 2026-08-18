#!/usr/bin/env python3
"""Build a portable visual index for the packaged web-ready media."""

from __future__ import annotations

import csv
import html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "metadata" / "asset-manifest.csv"
OUT = ROOT / "assets" / "ASSET_INDEX.html"


def main() -> None:
    rows = [r for r in csv.DictReader(MANIFEST.open(encoding="utf-8")) if r["asset_layer"] == "web-ready"]
    cards = []
    for row in rows:
        path = row["local_path"].removeprefix("assets/")
        label = f'{row["person"].title()} · {row["project"]}'
        notes = row["publish_status"]
        if row["duration_seconds"]:
            media = f'<video controls muted loop playsinline preload="metadata" src="{html.escape(path)}"></video>'
        else:
            media = f'<img loading="lazy" src="{html.escape(path)}" alt="Asset preview: {html.escape(label)}">'
        cards.append(
            f'<article>{media}<h2>{html.escape(label)}</h2>'
            f'<code>{html.escape(path)}</code><p>{html.escape(notes)}</p></article>'
        )
    document = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Work asset index</title>
<style>
:root{{font-family:Arial,sans-serif;color:#111;background:#f4f3ef}}body{{margin:0;padding:24px}}header{{max-width:900px;margin:0 0 40px}}h1{{font-size:clamp(2.5rem,8vw,7rem);line-height:.9;margin:.1em 0}}header p{{max-width:65ch;font-size:1rem;line-height:1.5}}main{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}}article{{min-width:0}}img,video{{display:block;width:100%;aspect-ratio:4/5;object-fit:cover;background:#ddd}}h2{{font-size:.9rem;margin:10px 0 4px}}code{{font-size:.7rem;overflow-wrap:anywhere}}article p{{font-size:.72rem;color:#666;margin:6px 0 24px}}@media(max-width:1000px){{main{{grid-template-columns:repeat(2,1fr)}}}}@media(max-width:560px){{body{{padding:14px}}main{{grid-template-columns:1fr}}}}
</style></head><body><header><h1>New Work<br>asset index</h1><p>{len(rows)} web-ready working assets. All items require owner review and approved-master replacement/clearance before public launch; see <code>../metadata/rights-and-usage.md</code>.</p></header><main>{''.join(cards)}</main></body></html>"""
    OUT.write_text(document, encoding="utf-8")
    print(f"wrote {OUT} with {len(rows)} cards")


if __name__ == "__main__":
    main()

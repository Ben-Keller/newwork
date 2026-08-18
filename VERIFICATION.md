# Package verification

Verified: 2026-08-14

## Automated result

`python metadata/validate_package.py` completed successfully.

| Check | Result |
|---|---|
| Provisional project records | 16; unique IDs/slugs; all safely `visible=false`, `needsReview=true` |
| Source media | 47 files |
| Web-ready media | 48 files |
| Asset manifest | 95 rows; exact one-to-one coverage of every source and web-ready media file |
| Distinct MP4 clips | 9 (18 files because each appears in source and web-ready layers) |
| Video decode | All MP4s probe successfully as H.264 video with no audio stream |
| Image decode | Every PNG, WebP, and GIF first frame decodes successfully |
| Fixture paths | Every local asset path referenced by `content/projects.json` exists |
| Source-link inventory | 47 records |
| JSON/CSV | Parsed successfully |
| Empty/partial/hidden package files | None |

## Visual inspection

- Contact sheets for all 27 Oliver stills and all 12 Michael web-ready image/poster files were inspected; the frames are coherent, correctly oriented, and free of obvious decode/crop failures.
- A frame from each of the nine MP4s was extracted and inspected.
- `assets/ASSET_INDEX.html` provides a portable 4/2/1-column visual browser for reviewing every web-ready image and clip after unzipping.

## Deliberate limitations

- The five Oliver MP4s are still-derived 8-second interaction placeholders, not extracts from the protected Vimeo films. They exist only so one build can implement and test motion loading, hover/in-view playback, fallbacks, and reduced-motion behavior. Replace them before launch.
- Michael's four MP4s are working extracts from public GIF/direct-hosted portfolio media and remain prototype renditions rather than approved masters.
- Seven Michael YouTube references and five Oliver Vimeo IDs are recorded in the portfolio manifests. Protected/unavailable playback endpoints were not bypassed.
- All portfolio media requires owner review, definitive metadata, rights clearance, accessible descriptions/captions, and—where possible—approved original masters before public publication.
- Final identity assets, licensed fonts, contact details, manifesto, reel selection, and project credits were not supplied. The specification defines safe placeholders and replacement points without inventing them.

## Re-run

From the package root:

```sh
python metadata/build_asset_manifest.py
python metadata/build_asset_index.py
python metadata/validate_package.py
sha256sum -c metadata/checksums.sha256
```

Regenerate `metadata/checksums.sha256` after any intentional package change.

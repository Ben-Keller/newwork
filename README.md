# New Work — Oliver revision

Edit `new-work-oliver-review/` on `main`. Preserve `new-work-site/` for parallel comparison.

| View | Address | Source/content |
|---|---|---|
| Project Studio / Oliver review | http://127.0.0.1:4327/ | Revision, prototype content |
| Existing version | http://127.0.0.1:4325/ | Preserved baseline |
| Side-by-side comparison | http://127.0.0.1:4328/ | `node hosting/review.mjs` |
| Live CMS development | http://127.0.0.1:4329/ | `npm run dev:cms` in the revision |
| Production release preview | http://127.0.0.1:4330/ | `node hosting/serve.mjs --root-release` |
| Online client review | https://ben-keller.github.io/newwork/ | Oliver revision, published CMS content |
| Client CMS | https://new-work.sanity.studio/ | Published Sanity Studio |

The `deploy-site.yml` publisher builds the Oliver revision from published Sanity content at the existing GitHub Pages review address. It checks for CMS changes every 15 minutes and rebuilds only when needed. The review stays `noindex`; newworkagency.com and its DNS are unchanged. Studio uses the approved New Work artwork, a custom theme, a client overview and direct editing links. Contact placeholders remain intentionally editable. See DEPLOYMENT.md for operational details.

- [Release and CMS publishing workflow](DEPLOYMENT.md)
- [Domain cutover and rollback](hosting/ROOT_RELEASE.md)
- [Client editing guide](studio-new-work/CLIENT_GUIDE.md)
- [Oliver comment register](reviews/oliver-2026-10/README.md) and [editing rules](reviews/oliver-2026-10/EDITING.md)

## Historical project handoff

The material below records the original brief. Current editing, CMS, publication and rights-workflow rules are in `AGENTS.md`, `DEPLOYMENT.md` and the review register; later user decisions supersede this original brief.

# New Work website — single-run build package

This archive is the implementation handoff for a complete New Work portfolio website. It combines the agreed product direction, an executable build brief, provisional CMS content, reference research, and a representative media library assembled from Oliver Hamilton's and Michael's public portfolios.

The current GitHub, Sanity Studio, webhook, local content, and no-merge release process is documented in [`DEPLOYMENT.md`](DEPLOYMENT.md).

The old versioned package remains a recovery tool documented in [hosting/README.md](hosting/README.md). It is no longer the source of the prepared publisher.

## Start here

1. Give the repository-building agent the entire unzipped folder.
2. Use `BUILD_PROMPT.md` as the primary instruction.
3. Treat `PRODUCT_SPEC.md` and `CONTENT_MODEL.md` as binding requirements.
4. Import or map `content/site-settings.json` and `content/projects.json` into Sanity.
5. Use `assets/web-ready/` for the first working build; retain `assets/source/` only for provenance and reprocessing.
6. Review `metadata/rights-and-usage.md` before publishing anything publicly.

The build must run without Sanity credentials by using the included local content as a visibly labeled, `noindex` prototype. In that mode it may display the safe seed records in `homeOrder` despite their publication flags. Production mode must show only human-approved Sanity records. Connecting a Sanity project and Cloudflare Pages account should be an environment/configuration step, not a rewrite.

### Included working set

- 47 source-media files: 32 Oliver items and 15 Michael items.
- 48 web-ready files: 39 image/poster derivatives and nine distinct silent MP4 previews/placeholders.
- 16 conservative, unpublished seed project records.
- 47 traceable design, portfolio, creative-deck, and official technical links.
- A portable visual browser at `assets/ASSET_INDEX.html`.

## Package map

| Path | Purpose |
|---|---|
| `BUILD_PROMPT.md` | Copy-ready instruction for a coding agent to build the site in one run |
| `PRODUCT_SPEC.md` | Complete behavior, visual, technical, accessibility, and acceptance specification |
| `CONTENT_MODEL.md` | Sanity document and object schemas, validation, queries, and editorial rules |
| `content/` | Provisional site settings and project records wired to packaged media |
| `assets/source/oliver/` | Portfolio-resolution Oliver references, grouped by project |
| `assets/source/michael/` | Portfolio-resolution Michael references and working motion extracts |
| `assets/web-ready/` | Normalized derivatives for immediate use in the prototype/build |
| `metadata/asset-manifest.csv` | Machine-readable file/source/provenance inventory |
| `metadata/source-links.csv` | Every design and portfolio link recovered from the supplied materials |
| `metadata/rights-and-usage.md` | Publication, clearance, and source-quality caveats |
| `metadata/checksums.sha256` | Integrity hashes for every packaged file except the checksum file itself |
| `VERIFICATION.md` | Completed structural/media QA and known limitations |
| `references/source-brief/` | Supplied source documents |
| `references/creative-direction/` | Creative deck, extracted cues, and rendered pages |
| `references/site-research/` | Full reference analysis and portfolio extraction notes |

## Product in one sentence

A bright, highly curated four-column mixed-media gallery with a short typographic brand moment and optional reel, opening into quiet gray editorial project pages that handle film, photography, animation, and integrated campaigns equally well.

## Status labels

- **Build-ready:** structure, interaction rules, schema, breakpoints, motion limits, performance goals, and component behavior.
- **Provisional:** project names inferred from public filenames, draft alt text, project ordering, bios, contact details, and any placeholder copy.
- **Designer-supplied later:** final wordmark/SVGs, logo animation, licensed fonts, final color/timing refinements, and design review adjustments.
- **Owner-confirmed before launch:** client names, credits, project descriptions, final masters, accessibility captions/transcripts, and rights clearance.

## Non-negotiable safeguards

- Never publish a public-portfolio asset merely because it is in this package; confirm that New Work controls or has permission to reuse it.
- Do not present filename-derived labels as verified campaign titles.
- Do not infer client relationships from a loose logo list.
- Do not ship third-party font files without a web license.
- Do not autoplay sound or make navigation dependent on hover, motion, or a custom cursor.

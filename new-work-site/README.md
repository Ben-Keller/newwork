# New Work portfolio

An Astro 7 production portfolio with a kinetic 4/2/2 editorial gallery, four differentiated still/motion project templates, Astro shared transitions, a lazily loaded GSAP motion layer, a typed local/Sanity adapter, a sibling standalone Sanity Studio 6, and Cloudflare Pages configuration. The checked-in fixture content is an internal prototype working set: the whole set is understood to need content refinement, is blocked from indexing, and is not cleared for public use.

The current visual direction draws on mid-century print advertising and contemporary type specimens: a warm paper ground with restrained grain, dense black display type, hard rules and numbered captions, with interactive action strips and section markers kept strictly black and white. It deliberately avoids gradients, rounded cards, shadows, and copied reference artwork.

The four desktop work tracks share one native scroll target and use subtle first-order response coefficients instead of separate parallax distances or springs. For local motion tuning, append `?motionDebug=1` to `/`; the temporary overlay reports target scroll, filtered scroll, lag, and response for every track and is absent from normal page loads.

## Requirements

- Node.js `>=22.12.0`; Node 22 LTS is recommended.
- pnpm 11.19.0, matching `packageManager` in `package.json`.
- No account or credential is required for local prototype mode.
- A Sanity project, dataset, and appropriate tokens are required only for Studio, seeding, and production-content builds.

## Start locally

From this directory:

```sh
cp .env.example .env
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:4321`. The default `.env.example` selects `PUBLIC_CONTENT_MODE=prototype`, so the site uses the local fixtures and media immediately.

The prototype deliberately omits both a page-wide disclaimer bar and per-item review markers because the whole fixture site is provisional. It still emits `noindex, nofollow` on every page; editorial status and publication blockers remain in Sanity Studio and the build pipeline.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the Astro development site. |
| `pnpm typecheck` | Run Astro and strict TypeScript checks. |
| `pnpm lint` | Run ESLint across Astro and TypeScript source. |
| `pnpm test` | Run the Vitest content, ordering, safety, adjacency, and normalization suite. |
| `pnpm test:coverage` | Run the unit suite with enforceable coverage reporting. |
| `pnpm test:e2e` | Run accessibility and interaction checks in Chromium, Firefox, and WebKit desktop/mobile projects. |
| `pnpm test:e2e:visual` | Opt-in retained visual-regression suite; update baselines only after an approved design review. |
| `pnpm test:all` | Run the complete local release gate: types, lint, coverage, build/output audit, and preview-server browsers. |
| `pnpm qa:capture` | With the static preview running on port 4321, refresh the retained desktop/mobile QA screenshots. |
| `pnpm build` | Regenerate attribution data and create the static site in `dist/`. |
| `pnpm preview` | Preview the completed static build locally. |
| `pnpm content:attribution` | Regenerate `src/content/local/asset-attribution.json` from the copied asset manifest. |
| `npm --prefix ../studio-new-work run dev` | Start the standalone Sanity Studio on port 3333. |
| `pnpm sanity:seed` | Idempotently upload/map fixture assets and merge source-matched seed documents with preservation-first defaults. |
| `pnpm sanity:seed:dry-run` | Produce the proposed document/asset plan without uploads or dataset writes. |
| `pnpm sanity:audit` | Read the published dataset and fail on singleton, migration, gallery-reference, slug, or silent publication-filter drift. |
| `pnpm sanity:typegen` | Extract the Studio schema and regenerate query-aware frontend types. |

For a first Playwright run, install the configured browser if it is not already present:

```sh
pnpm exec playwright install chromium
pnpm test:e2e
```

Do not record any command as passing unless its final exit status was observed. The handoff checklist and result log live in `VERIFICATION.md`.

## Content modes and the no-fallback rule

The same view types in `src/lib/types.ts` feed both content sources. The source is selected only by `PUBLIC_CONTENT_MODE`.

| Mode | Source and behavior |
|---|---|
| `prototype` | Uses `src/content/local/*.json`; returns all 16 provisional projects in `homeOrder` even though their public flags are deliberately false; renders without review-marker chrome; forces site-wide `noindex`; does not generate the production sitemap. |
| `preview` | Requires the server-only `SANITY_PREVIEW_TOKEN`; reads the draft-aware preview perspective without page overlays and forces site-wide `noindex`. Host this only behind access control. |
| `production` | Fetches the published perspective from project `7un4plyu`, dataset `production`; excludes hidden, future, review-blocked, approval-blocked, incomplete, and placeholder media records; generates only approved static routes. |

Unknown mode names fail configuration. Preview and production have **no fixture fallback**. Missing Sanity configuration, a missing preview token, an unreachable API, or a failed query must fail the build instead of presenting provisional content as approved work.

Before any public build, set all of these explicitly in the build environment:

```dotenv
PUBLIC_CONTENT_MODE=production
PUBLIC_SANITY_PROJECT_ID=7un4plyu
PUBLIC_SANITY_DATASET=production
PUBLIC_SITE_URL=https://www.example.com
```

`PUBLIC_SITE_URL` must be the canonical origin, with no path suffix. Use a preview origin for preview builds; never let a branch preview emit production canonicals.

`Site Settings → Default SEO` supplies missing descriptions, indexing policy, and the confirmed share image across the site; page-specific SEO remains authoritative when present. Sanity share images are rendered through a focal-point-aware 1200×630 (approximately 1.91:1) transform. Project covers are never promoted to social cards implicitly, and `/404` is always `noindex`. A production sitemap is generated only for built HTML pages whose final robots directive is indexable and whose canonical matches the sitemap URL; prototype builds generate no sitemap and their `robots.txt` blocks crawling.

### Environment-variable safety

- `SANITY_WRITE_TOKEN` is a server-side seed credential. Keep it in a local secret store or protected CI variable, rotate it after the initial import if practical, and never prefix it with `PUBLIC_`.
- `SANITY_PREVIEW_TOKEN` is reserved for a protected preview workflow. It is also secret and must never reach browser code or public build logs.
- `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` are non-secret frontend identifiers. The app defaults to `7un4plyu` and `production`, but explicit build variables remain useful for auditable deployments.
- `PUBLIC_CONTACT_EMAIL` can temporarily override an approved contact address at build time.
- Analytics remains off by default. The Cloudflare beacon loads only in production mode when `PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` is set. Do not add the token until privacy approval is recorded.
- Commit `.env.example`; never commit `.env` or token values.

## Local fixtures and media

The local adapter reads:

- `src/content/local/projects.json`
- `src/content/local/site-settings.json`
- `src/content/local/asset-attribution.json`

Fixture paths beginning with `assets/web-ready/` are normalized to `/media/` URLs. Their shipped files therefore belong under the corresponding location in `public/media/`:

```text
assets/web-ready/images/example.webp
→ public/media/images/example.webp
→ /media/images/example.webp
```

Michael's expanded review library follows the same convention. The 24 untouched portfolio renditions live under `../assets/source/michael/portfolio-expansion/`; normalized WebP review copies live under `../assets/web-ready/images/michael/portfolio-expansion/` and `public/media/images/michael/portfolio-expansion/`. The manifest records the original portfolio URL, dimensions, derivation, checksum, and publication blockers for each source/derivative pair. Prototype mode interleaves these images as unnamed Michael portfolio tiles for visual curation. They make no project or credit claims and are excluded entirely from production until their identity, rights, accessibility treatment, and approved masters are confirmed.

Keep fixture source IDs, block `_key` values, provenance, and every safety flag stable. The importer stores a fixture source ID as hidden `legacyId` metadata and lets Sanity assign the public document `_id`. In particular, never discard or auto-clear:

- `needsReview`
- `doNotPublishWithoutExplicitApproval`
- `prototypeOnly`
- `previewIsPlaceholder`
- `altNeedsReview`
- `needsApprovedEmbed`
- `needsApprovedMaster`
- `sourceDurationSeconds`

Every fixture project also carries two deterministic `textNote` blocks as prototype layout copy. They intentionally use raw `body` strings so the seed importer can convert them to Portable Text, and both `needsReview` and `prototypeOnly` must remain `true` until an editor replaces and approves the copy in Sanity.

The About page uses the dedicated `aboutPage` singleton for its motion-story copy, accessible fallback, closing action, and sharing details. Keep canonical `../content/site-settings.json` identical to the app-local mirror. The seed importer prefers the canonical file; the prototype runtime reads the app-local file.

Changing `visible` in a fixture does not authorize publication. Local fixtures are for internal composition and behavior review only.

## Connect Sanity

### 1. Confirm the local environment

The standalone Studio in `../studio-new-work` and this Astro app are configured for the same target. The public values can be kept explicit in `.env`:

```dotenv
PUBLIC_SANITY_PROJECT_ID=7un4plyu
PUBLIC_SANITY_DATASET=production
```

The Studio is standalone and is never mounted in Astro. For local Studio access, add its origin (normally `http://localhost:3333`) to the Sanity project's CORS origins with credentials enabled. Add a final Studio origin separately if the Studio is later hosted.

### 2. Seed safely

Create a narrowly scoped Sanity token that can create/update documents and upload assets in the selected dataset, then provide it only to the seed process:

```dotenv
SANITY_WRITE_TOKEN=replace-with-a-secret-write-token
```

Run:

```sh
pnpm sanity:seed:dry-run
pnpm sanity:seed
```

The importer is designed to be idempotent. It matches records by hidden `legacyId` metadata (with type-and-slug fallback), lets Sanity generate IDs for new projects and notes, preserves block keys and internal safety metadata, reuses uploaded assets when possible, and creates provisional records with `visible=false` and `needsReview=true`. It must never promote seed content automatically.

The default `preserve` update policy is intentionally editorial-first:

- Existing scalar copy, publication choices, completed `needsReview` review state, unkeyed arrays, keyed-array order, and editor-only keyed items are retained.
- New fixture fields and newly keyed fixture items are added without duplicating existing deterministic keys; new keyed items append after the existing editorial order.
- A fixture value of `true` always reasserts the heightened blockers `doNotPublishWithoutExplicitApproval`, `prototypeOnly`, `previewIsPlaceholder`, `altNeedsReview`, `needsApprovedEmbed`, and `needsApprovedMaster`.
- If an editor has replaced a fixture image/file with a different Sanity asset reference, the replacement object remains intact; safety metadata belonging to the old fixture asset is not copied onto the replacement.

This means clearing a heightened blocker only in Studio is not durable across later seed runs while the matching fixture or manifest still says it is unresolved. Update the binding fixture/manifest after documented approval, or do not rerun the seed against that reviewed record.

When an owner deliberately wants fixture-owned values and ordered arrays to overwrite overlapping editorial work, opt into force update with either form:

```sh
pnpm sanity:seed -- --force-update
```

```sh
SANITY_SEED_UPDATE_MODE=force pnpm sanity:seed
```

Force update takes fixture values for every field represented by the fixture and replaces ordered arrays exactly, while retaining existing object fields the fixture does not model. It also reapplies the safe imported state (`visible=false`, `needsReview=true`, and seeded `noIndex=true`), so it cannot publish or promote content. It can overwrite copy, asset choices, block order, and editor-added array items; use it only after reviewing the fixture diff. `SANITY_SEED_UPDATE_MODE=preserve` is the explicit spelling of the default. Unknown mode names and command options fail instead of guessing.

After the import, remove the token from the shell/session if it is no longer needed. Review the importer summary and resolve any missing local file before editorial review.

The dry run accepts `SANITY_PREVIEW_TOKEN` for read-only comparison when present and otherwise uses the public dataset view. It calculates document changes and asset checksum reuse without uploads or mutations. The write command requires `SANITY_WRITE_TOKEN`; the preview token is never accepted as write authority.

### 3. Use Studio

```sh
cd ../studio-new-work
npm run dev
```

Sanity's development server defaults to port 3333. The client-facing editorial desk contains:

- **Start here** for shortcuts, review counts, and the publishing checklist.
- **Work page** for opening copy, the drag-to-order project gallery, the optional homepage reel preview, and page SEO.
- **About page** for the motion-led experience's opening copy, accessible fallback, closing action, visibility, and page SEO.
- **Projects** for project pages grouped by editorial state.
- **Asset library** for reusable media, descriptions, credits, rights, and related projects.
- **Contact page**, **Footer**, and **Brand & navigation** for their dedicated website areas.

System metadata, imported provenance, legacy fields, Notes, comments, releases, scheduled drafts, tasks, and singleton delete/duplicate actions are hidden from the routine client workflow. Analytics is deployment-controlled and is not an editable Studio field.

Project presentation is editable independently from its ordered content blocks. The supported home composition, theme, title/hero, layout-variant, and motion-intensity fields—and their safe legacy fallbacks—are documented in [`docs/PRESENTATION_MODEL.md`](docs/PRESENTATION_MODEL.md).

On project pages, the same cover used by the home gallery appears once in the opening hero: copy remains first in the document, desktop places the cover on the right, and mobile stacks it immediately after the copy. The ordered content blocks render below without repeating a cover-equivalent legacy block. Provisional fixtures include gated Lorem Ipsum copy; the non-production renderer supplies neutral geometric media studies where project-specific secondary media is absent. Replace both kinds of scaffolding with approved content before publication.

The portfolio is presented as an open-ended, non-ranked selection. Project detail pages intentionally omit position labels, collection totals, and index-style reading progress. Previous/next controls remain browsing paths only and do not communicate a fixed sequence.

### 4. Approve a project deliberately

Before publishing a production record:

1. Confirm the title, slug, ownership, client, year, description, roles, contributors, and credits.
2. Replace portfolio derivatives with approved masters where required.
3. Confirm the cover, crop/hotspot, alt text, posters, preview length, captions/transcript, and external player permissions.
4. Clear every relevant review, prototype, placeholder, embed/master, and explicit-approval flag only after the approval is recorded.
5. Set a unique `homeOrder`, choose `featuredOnHome`, set `visible=true`, and check any scheduled `publishAt` value.
6. Publish the document and verify the next static build before considering it live.

The production adapter applies its safety filter again at build time. A Studio publish action alone is not enough to make an unsafe record public.

The motion-led About page and the optional homepage video preview are independent. `/about` and its navigation item appear only when the About experience is enabled (the local prototype fixture keeps it available for review); the former `/reel` URL redirects permanently to `/about`. The homepage preview still requires its own enable flag plus an approved poster and desktop source. Notes routes and navigation render only when Notes is enabled and at least one eligible item exists; otherwise `/notes` is absent.

## Automated deployment and content updates

The root GitHub Actions workflows deploy the standalone Studio/schema and the production Astro site independently. Site builds always query published Sanity content; publishing relevant Sanity documents triggers a site-only rebuild through a protected GitHub workflow-dispatch webhook.

Sanity remains the sole source of editorial content, while GitHub `main` remains the sole source of application and Studio code. CMS exports are never committed or merged with fixtures.

See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the complete token setup, webhook values, local content workflow, no-merge Git rules, snapshot command, migration sequence, testing, and rollback procedure.

## Replace prototype assets

For each approved replacement:

1. Obtain the original master and written web-use approval. Do not upscale a portfolio rendition, bypass a protected player, remove a watermark, or manufacture a film from stills.
2. Produce a web derivative appropriate to the role. Home previews are muted, silent, 3–8 seconds, and normally under 2–4 MB. The five Oliver previews are eight-second editorial montages cut from the owner-supplied source films in `assets/source/oliver videos/`; full source films stay outside `public/` while project players continue to use their configured full-film references.
3. Preserve aspect ratio, dimensions, source URL, owner, project, derivation notes, checksum, rights status, and usage status in the canonical asset tracker.
4. For fixture review, copy the derivative to `public/media/` and update the matching `assets/web-ready/...` path in the fixture. Keep source masters outside the shipped public directory.
5. Update `src/content/local/asset-manifest.csv`, then run `pnpm content:attribution` and review the generated attribution record.
6. For production, upload the approved asset through Studio, set the crop/hotspot and accessibility metadata, clear safety flags only with evidence, and rebuild.
7. Confirm poster-first behavior, intrinsic dimensions, focal point, error fallback, reduced motion, Save-Data, keyboard access, and mobile crop before launch.

Local stills are built into width-matched AVIF and WebP source sets; AVIF-capable browsers receive the smaller format while WebP remains the universal fallback. Run `pnpm media:video` after adding or replacing a gallery-preview MP4. It creates silent, fast-start H.264 files capped at 960px and synchronizes the canonical `assets/web-ready` derivatives into `public/media`. Full project films use click-to-load Vimeo players and must never be copied into Astro's public directory. `pnpm verify:media` is part of every build and rejects original WebP files above 1 MiB, gallery previews above 2.5 MiB, non-progressive MP4s, or any locally shipped full film.

Never expose internal source URLs, rights notes, or tokens in the public UI or structured data.

## Replace the brand layer

The current identity is deliberately legal fallback typography and live text. Final assets can be installed without changing page structure:

### Licensed fonts

The local prototype resolves Futura and PP Neue Montreal from the designer machine without copying those commercial desktop files into the repository. For a public deployment:

1. Obtain Futura and PP Neue Montreal WOFF2 files plus explicit web-use license confirmation.
2. Store only approved web font files in a stable public font directory.
3. Replace the local-only `@font-face` sources at the top of `src/styles/brand.css`; retain `font-display: swap`, the weight/stretch mappings, and the family aliases `New Work Sans` and `New Work Display`.
4. Adjust only the typography and color tokens in the same file, then review line breaks, focus contrast, logo scale, LCP, and CLS at every QA width.

Do not commit desktop font files, commercial fonts without a license, or a font merely because it exists on a designer's machine.

### Wordmark and compact mark

`src/components/Wordmark.astro` accepts full/compact variants, dark/light tones, an SVG `viewBox`, approved path data, or a reviewed Sanity image/SVG while retaining an accessible text label. `BrandLockup.astro` optically crops the owner-supplied SVG's unused right-side canvas so its live-type `Agency` qualifier can sit against the lower stroke of the W. Header and footer begin as NW-only toggle buttons; activating either synchronously reveals or removes `Agency`, with `aria-pressed` and a changing Show/Hide label. The header qualifier is approximately one-quarter to one-third of the NW height, while the footer qualifier is deliberately half that relative scale. The owner-supplied `new-black.svg` is packaged at `assets/web-ready/brand/new-black.svg` and served from `/media/brand/new-black.svg`; it supplies the shared NW mark, Safari mask, touch icon, and organization-metadata identity without modifying its vector paths. `/favicon.svg` preserves that artwork inside a centered, rounded white square with transparent outer corners for consistent browser-tab rendering. The active home title uses the owner-supplied kit at `assets/source/brand/new-work-title-letter-kit`: its canonical `0 0 5176.81 834` master supplies the single-line uppercase silhouette, while seven standalone SVGs mask each letter’s media/hover treatment. It renders at 92% of the available title measure. The sentence-clean kit and original uppercase kit remain intact, served, and imported as `sentence-clean` and `legacy` rollback options; changing the single `ACTIVE_TITLE_KIT` value restores either treatment without moving assets or changing animation code. All three preserve the stable `data-nw-letter`, `data-word`, `data-letter-index`, and `data-nw-part` contracts. The gallery begins directly beneath the title stage without a label/count rail; its four desktop tracks keep irregular top and bottom edges, and the outer two bleed beyond the gallery before being clipped at the viewport. Cards place each photograph or preview directly into its media footprint with no inset mat, bounding frame, border, or angled crop. They form a tightly packed image-only contact sheet with no names, rules, indexes, clients, or types below the media; pointer hover and keyboard focus reveal only the title, while each link keeps a permanent accessible project name.

The optional manifesto uses a wide sentence-case measure rather than an all-caps block. Its visible character count is scrubbed directly against page position: scrolling down writes the sentence forward and scrolling back up removes characters in reverse. Reduced-motion and no-JavaScript paths show the complete statement immediately.

The shared footer is a full-height editorial closing panel rather than a utility strip. It pairs a four-line New Work statement with CMS-backed People links, route-aware Explore links, the configured contact/social destinations, the oversized supplied wordmark, and a compact legal line. Desktop uses a twelve-column closing spread; mobile preserves semantic source order while reflowing the directory into an asymmetric two-column composition. The Contact route suppresses the repeated footer email so the address appears only in the main contact content.

Use clean path-only SVG artwork from the identity designer when code-owned artwork is preferred, or upload the approved full and compact assets in Site Settings. The typed adapter carries both CMS fields into the header; the compact asset replaces the full mark at the narrow breakpoint. Preserve the visible name as the link's accessible label and keep the title-stage duplicate hidden from assistive technology. Do not convert the persistent wordmark into a CSS background or upload unapproved artwork.

### Intro motion

Keep the session gate, five-second non-blocking cap, single muted preview limit, project-poster fallbacks, persistent black-name resting state, GSAP cleanup, and reduced-motion/Save-Data behavior in `LogoIntro.astro`. Replace only the mask artwork and visual timeline targets. Never make route navigation, page scrolling, or content decoding depend on the animation.

### Motion and route lifecycle

Astro's `ClientRouter` provides the accessible route announcement and a 160 ms crossfade. `src/components/MotionRuntime.astro` installs a lightweight route lifecycle; routes with motion hooks dynamically load one GSAP context, then revert it and pause registered media on `astro:before-swap`. Static routes, reduced-motion sessions, and Save-Data sessions do not request the GSAP/plugin chunk. Do not add long-lived page listeners or ScrollTriggers outside that lifecycle. The wordmark is the only persistent global element, so navigation current-state markup is refreshed on every route.

Shared easing, timing, movement limits, declarative data hooks, transition-name helpers, media registration, reduced-motion behavior, and designer integration examples are documented in [`MOTION_SPEC.md`](MOTION_SPEC.md). Import browser animation APIs from `src/lib/motion/client` or `src/lib/motion/vendor`; use the server-safe `src/lib/motion` barrel from Astro frontmatter.

Required design handoff inputs are the final full wordmark, compact/social mark, favicon, SVG view boxes/paths, licensed font files and license proof, intro artwork/keyframes, final palette, crop feedback, and one consolidated accessibility-aware review.

## Rights and launch checklist

Every included media item is `prototype-only`, `owner-review`, and usually `replace-with-master` until a stronger decision is recorded. Public visibility on another portfolio is not evidence of a reusable license, ownership transfer, talent release, music clearance, or client approval.

Before changing `PUBLIC_CONTENT_MODE` to production or connecting a public domain, obtain and record:

- confirmed project title, client/commissioner, year, role, contributors, and credits;
- permission for every still, poster, loop, embed, logo, recognizable person, soundtrack, and territory/term of use;
- approved original masters, color treatment, crops, and social-share crops;
- meaningful alt text and captions/transcripts for dialogue-bearing or meaningful motion;
- approved public visibility, home order, scheduled date, and SEO copy;
- approved external-player embed/domain/privacy settings and a useful failure fallback;
- any expiry, territory, award-entry, test-work, client-review, or exclusivity restrictions;
- final contact details, manifesto/about copy, wordmark, favicon, fonts, and font license;
- privacy approval before analytics or a contact-form processor is enabled;
- a completed `VERIFICATION.md` with automated and manual results.

The Chanel-labelled test image has a heightened explicit-approval block. Oliver's five gallery previews now use real owner-supplied footage, while their full-player references and final web-use approval still require confirmation. Michael's included loops are working derivatives, not source masters.

Record decisions in Sanity's internal fields or the production asset tracker. Do not treat the fixture JSON, copied manifest, or this repository as the final clearance record.

The working-set register is in [`docs/CONTENT_READINESS.md`](docs/CONTENT_READINESS.md). Deployment, rollback, incident response, secret rotation, monitoring, backups, and account-controlled launch checks are in [`docs/OPERATIONS.md`](docs/OPERATIONS.md). The required manual assistive-technology and device matrix is in [`docs/ACCESSIBILITY_QA.md`](docs/ACCESSIBILITY_QA.md).

## Verification

The unit suite is in `tests/unit/`; the browser suite is in `tests/e2e/`. It covers the 16-project order, production safety filters, adjacent-project navigation, fixture media mapping, exact responsive grid columns, key routes, still and motion templates, disabled optional modules, mobile-menu focus behavior, reduced motion, no-JavaScript content, failed-media resilience, overflow, prototype safeguards, the five-second non-blocking title stage, visibility-triggered preview autoplay, and device-bounded preview concurrency. Representative captures live in `artifacts/qa/`.

Complete the command and visual matrix in `VERIFICATION.md` on the final commit. A browser binary or external service being unavailable must be recorded as **NOT RUN** or **BLOCKED**, never inferred as passing.

# V2 website review workplan

Prepared 13 October 2026 from `/Users/ben/Downloads/V2 (1).pptx`, Oliver's follow-up supplied in this chat, the supplied logo-arrangement image, and the current local website source on `main`, commit `5f747cc`. Updated with Ben's confirmation that the four-row request applies to the main work gallery and that `newworkagency.com` is already registered.

**Coverage:** all 14 embedded comments across all six slides. Oliver Hamilton authored every comment, dated 11 October 2026 in the file. Slide counts are 1, 5, 1, 1, 3, and 3. No additional comment threads or replies were found. The deck has no substantive speaker notes.

**Follow-up coverage:** F01 adds the four-row main gallery; F02 supplies the new brand arrangement and updates C02/C05; F03 adds domain preparation and launch planning. The complete plan covers the deck and these follow-ups together.

**Purpose:** a complete implementation plan for the website pictured in the deck. The comments are review evidence. They do not authorize implementation, publishing, deployment, or production content changes. This task creates the plan only.

## Interpretation and scope

The requested direction is a new homepage identity with a train-station ticker, a four-row main gallery with a ticker that names work while browsing, a flatter Behind the scenes section, cleaner footer and Contact layouts, and a prepared launch at `newworkagency.com`.

- Slide 1 approves the opening logo experience with “no notes!” Preserve its appearance and behavior while changing the later homepage state.
- Slide 2 distinguishes the compact header icon from the large homepage logo. These need separate asset decisions.
- The item to move beside Work and Contact is the descriptor, “film + photo production agency.” The screenshot and its arrow support this interpretation.
- Slide 4 requests a mosaic for **Behind the scenes**. It does not request rebuilding the main four-column work gallery.
- Slide 5's alignment comment targets the Featured links area at the lower right. Its separate left-hand annotation asks to keep the footer logo/ticker assembly.
- Slide 6 has no object-specific annotation for “make it smaller.” Treat reducing both the Contact heading and email treatment as a proposed interpretation, pending confirmation.
- “Maybe” hover/shuffle behavior, “Should we try” ticker words, and “put an address on there?” are exploratory requests. Prepare concrete treatments for review rather than treating them as settled design details.
- Ben confirmed that the follow-up's four-row request refers to the main work gallery. At the existing four-column desktop layout, the target is 16 tiles, down from the current cap of 20. Mobile should reflow the same selection naturally; it should not be capped at four mobile rows.
- The new reference shows solid black artwork: a horizontal `new work.` wordmark, a tightly stacked wordmark, and two block-based compact alternatives. This updates the branding direction beyond the outlined/solid treatment in the deck. The reference establishes appearance; individual placements and production vector masters still need identification.

## Follow-up tasks and logo mapping

| ID | Follow-up | Planned response | Completion check |
|---|---|---|---|
| F01 | Main gallery should be four rows tall instead of five. | Curate 16 gallery tiles, preserve four desktop columns, and distribute film/still work across the shorter gallery. Preserve omitted projects and their routes. | Four tiles per desktop column, 16 visible tiles total for the agreed selection, and a natural two-column reflow. Recheck wide-feature spans, stored gallery order, and video distribution. |
| F02 | New logo and arrangements supplied. | Update C02/C05 using this reference. Proposed use: horizontal wordmark beside the hero ticker where space allows; supplied stacked wordmark in compact layouts/footer; two-band compact icon in the header. Keep the three-band N/W/A alternative for explicit selection. | Exact selected vector art, solid-black treatment, tight spacing, and terminal period are preserved without distortion. No screenshot background or “Original” label enters the site. Splash changes remain subject to C01. |
| F03 | Prepare the domain so the site can launch after the next revision. | Prepare the existing GitHub Pages deployment for the confirmed registered domain, including root-path publishing, production content, DNS, HTTPS, and rollback. | A tested release candidate and a domain-specific cutover checklist exist. Public activation happens only on an explicit launch request. |

The reference image is saved unchanged at `references/review-2026-10-13/oliver-logo-arrangements.png`.

The existing `new-work-logo-03.svg`, `new-work-logo-04.svg`, and `new-work-logo-05.svg` were visually checked. They show older stacked n/w treatments, not the block-based compact marks in the new reference. `new-black.svg` is an older serif NW mark. Existing title/social wordmarks also differ from the new arrangement. Do not substitute these as exact matches. Obtain or identify the supplied original vector masters before final brand integration; the PNG is sufficient for planning and layout reference.

## Complete comment-to-task register

IDs below preserve the PowerPoint comment index. P1 means required implementation work, P2 means an exploratory treatment or content decision, and Preserve means an existing treatment to protect. All implementation items remain planned.

| ID / slide | Requested change | Planned response | Completion check |
|---|---|---|---|
| C01 / 1 | “no notes!” | **Preserve:** retain the opening media-filled logo experience. Establish before/after reference captures. | Splash layout, playback, entry, reverse scroll, and motion fallbacks retain their current behavior. Any shared-logo change is reviewed explicitly. |
| C02 / 2 | Change the top-left mark to the new icon. | **P1:** replace the typed `nw` header mark with the confirmed compact icon. Preserve its home link and accessible name. | Correct artwork and proportions at desktop/mobile widths and on light/dark pages. Browser icons change only if the supplied icon is intended for that use too. |
| C03 / 2 | Work should move the page down to the work gallery. | **P1:** make Work reveal the post-splash content and land at `#work-gallery`, below the fixed header. Apply the same destination from other routes and the mobile menu. | Same-page and cross-page clicks reach the first gallery row. Keyboard and no-JavaScript navigation work. Explicit Work navigation and browser Back retain their distinct behaviors. |
| C04 / 2 | Move the indicated text near Work and Contact. | **P1:** move “film + photo production agency” from the hero to the navigation area. | Descriptor and navigation align without collisions or duplicate visible copy. Define a compact mobile arrangement. |
| C05 / 2 | Bring in the new logo and put the train-station ticker beside it. | **P1:** assemble the confirmed full wordmark and homepage ticker in the post-splash hero. | New identity and ticker read as one composition. C01's approved opening remains intact. Footer ticker remains present. |
| C06 / 2 | Add SF, LA, NYC, and an actual clock. | **P1:** extend the homepage ticker's content and add a real browser-time-driven display. Proposed display pairs each city with its local time. | All three city labels appear. Time updates without reload and uses the selected timezone and format. Numbers and colon render correctly. |
| C07 / 3 | Ticker detaches on scroll, floats around mid-right, and displays the hovered project's client/title. | **P1:** use one homepage ticker with docked and floating states. Feed it from gallery project data on pointer hover and keyboard focus. | Transition reverses cleanly. Text matches the active project, clears after exit, and cannot intercept clicks. Long titles, missing clients, touch, and route changes have defined behavior. |
| C08 / 4 | Replace glossy bubbles with a flat rectangular grid/mosaic; possibly enlarge or shuffle images on hover. | **P1:** replace the Behind the scenes 3D ring with a flat editorial mosaic. **P2:** prototype subtle enlargement and foreground emphasis for hover/focus. | Rectangular photos and consistent spacing replace frosted cards, depth blur, and orbiting. All images remain reachable on mobile/keyboard. Main gallery layout is unchanged by this request. |
| C09 / 5 | Change “beautiful” to “impactful.” | **P1:** use “Looking to create something impactful?” in the contact callout. | Exact revised copy appears wherever this callout renders, with no awkward wrapping. |
| C10 / 5 | Improve formatting/alignment of the indicated area. | **P1:** rebuild the Featured footer directory's alignment, column sizing, and relationship to the logo and legal line. | Long titles wrap cleanly. Columns, heading, and margins align at wide and narrow widths. No clipping or overlap. |
| C11 / 5 | Keep the footer ticker; try Arriving, In transit, Departing, Early. | **P1:** preserve an independent footer ticker. **P2:** preview the proposed travel vocabulary as its own word set. | Hero and footer tickers both operate. “IN TRANSIT” fits. Review the existing “IS” connector against the new phrases before finalizing copy. |
| C12 / 6 | Clean up the Contact page formatting. | **P1:** establish a compact page hierarchy and common alignment for heading, email, location/address, and socials. | Contact details form a coherent group. Spacing remains balanced at mobile, tablet, and desktop sizes. |
| C13 / 6 | “make it smaller” | **P1, target to confirm:** prototype a smaller Contact heading and less dominant email bar with reduced intervening whitespace. | Review confirms the intended target. Approved scale preserves legibility, wrapping, and a usable click/tap area. |
| C14 / 6 | “put an address on there?” | **P2/content dependency:** add an approved public address or city-level location to the Contact details, according to the owner's preference. | Display only supplied, confirmed location information. Optional field disappears cleanly when empty. No invented street address or office claims. |

## Decisions and inputs

These decisions affect final acceptance, but most layout and interaction work can proceed with the existing prototype data.

| Decision | Proposed starting point | Needed from | Blocks |
|---|---|---|---|
| Full logo and compact icon | Follow the newly supplied solid-black arrangements. Proposed placements are documented under F02. Existing inspected SVGs are not exact matches. | Ben or the designer: identify the vector masters and select the two-band versus three-band compact mark. | Final C02/C05/F02 appearance. |
| Splash versus new logo | Preserve slide 1 and apply the new identity to the post-splash hero/header. Review the transition because the current implementation shares one title between both states. | Design reviewer if new artwork conflicts with the shared title. | Final brand handoff, not ticker infrastructure. |
| Clock meaning and format | Rotate `SF HH:MM`, `LA HH:MM`, `NYC HH:MM`, using city-local time and minute updates. Use `America/Los_Angeles` for SF/LA and `America/New_York` for NYC. | Ben/Oliver/Mike: confirm city-local versus one clock, and 12-hour versus 24-hour format. | Final C06 display. These labels alone do not establish office locations. |
| Gallery ticker with no active project | Show the homepage city/service rotation when no card has hover or keyboard focus. Hide the floating board after the gallery. | Design review of the interaction prototype. | Final C07 state behavior. |
| Footer vocabulary and connector | Preview the four proposed travel phrases independently from homepage content. Consider removing “IS” if it makes phrases read awkwardly. | Copy/design reviewer. | Final C11 word set. |
| Smaller Contact treatment | Reduce both heading and email block first. The deck does not identify one of them as the exclusive target. | Ben/Oliver: confirm during layout review. | Final C13 acceptance. |
| Public contact details | Use only confirmed email, socials, and public location/address. Keep existing placeholders clearly within prototype work until replaced. | Owner: exact address/location, email, and social destinations. | C14 and complete final Contact content. |
| Behind the scenes material | Reuse current imagery for the layout prototype. Current BTS images are drawn from the work gallery as placeholders. | Owner, only if authentic BTS content is expected in this round. | Content authenticity, not the mosaic redesign. |
| Four-row gallery edit | Main gallery is confirmed. Propose a reviewed 16-tile edit with balanced still/video coverage; retain omitted projects outside this selection. | Design/content reviewer: approve the exact 16 tiles. | Final F01 selection, not the four-row requirement. |
| Domain and account access | `newworkagency.com` is registered. Public registrar record names Squarespace Domains LLC. Proposed canonical address is `https://newworkagency.com`, with `www` redirecting to it. | Owner: DNS account access, canonical-host preference, and the contact mailbox to use. | DNS verification and eventual launch. |
| Launch content | Current Pages packaging still uses prototype data. Prepare the release using approved production content and confirm the 16-tile edit in that data. | Owner/editor and release operator. | Public launch readiness. A new domain alone does not settle this. |

## Implementation sequence

Suggested responsibility: the developer implements and verifies; Ben coordinates assets/content; Oliver and Mike review the design interpretations. These are proposed roles, not assignments or contacted people.

### 1. Establish references and resolve shared design choices

**Covers:** C01 and decisions affecting C02, C05, C06, C11, C13, C14.

- Capture local desktop/mobile references for the splash, post-splash hero, gallery, BTS, footer, and Contact page.
- Match supplied assets to the compact icon and full logo. Record which existing variants remain in use.
- Prepare the revised header/hero, footer, mosaic, and Contact layouts using the chosen artwork or explicit prototype slots.
- Define ticker states and the point at which the hero releases it. Review the shared splash/title implementation before replacing artwork.

**Exit:** approved or explicitly provisional choices for each open decision; a reference set that protects slide 1.

### 2. Build the shared ticker foundation

**Covers:** C05, C06, C07, C11. **Dependency:** state/content decisions from step 1; can use provisional text while assets are pending.

- Refactor `SplitFlapTicker.astro` so each instance owns its state, timers, animations, and cleanup. Its current `querySelector` initializes only the first ticker.
- Add digits, colon, and the punctuation needed by client/project names. The current alphabet contains only spaces and A–Z.
- Support both rotating word lists and an externally supplied project label. Ensure a new hover target cancels stale transitions instead of finishing the old title first.
- Allocate a stable board width per context. Define a readable treatment for long project names, such as two lines or whole-word segments. Keep the full title available to assistive technology.
- Derive live time from the current date in the selected timezone. Refresh on minute boundaries and when the tab becomes visible again. Do not use a static build-time value.
- Keep homepage and footer word sets independent. Keep ordinary project-link labels accessible; the animated board should not repeatedly announce decorative flips or clock ticks.
- Provide non-flipping reduced-motion behavior, a useful initial no-JavaScript label, and a way to stop decorative cycling where needed. Dispose timers/listeners on Astro route transitions.

**Exit:** two tickers can run together, clock text stays current, and project labels update without stale text or route leaks.

### 3. Update header, hero, and Work navigation

**Covers:** C02–C06, F01, F02. **Dependencies:** step 2 and confirmed branding for final visual acceptance.

- Wire the compact icon into `SiteHeader.astro` and the full logo into the post-splash hero.
- Move the descriptor into the header's navigation composition. Avoid placing it inside the moving logo/title element.
- Place the homepage ticker beside the full logo with enough reserved space for its longest idle display.
- Route Work through the gallery-anchor behavior, including mobile and cross-route links. The current Work event uses `enterWorkAtTop`, which selects the post-splash top; a separate `revealGallery` already performs the gallery scroll.
- Wait until the gallery has stable geometry before scrolling, account for header height, and use a direct jump for reduced motion. Keep modified-click/new-tab behavior native.
- Preserve project-to-gallery restoration for Back/close navigation. An explicit Work click should intentionally select the beginning of the gallery.
- Reduce the selected main gallery from 20 to 16 tiles using a reviewed selection. Update `MAX_GALLERY_ENTRIES` and its explanatory comments, then check the existing row-based distribution of video tiles. Do not crop the section with a fixed height or merely hide row five with CSS.
- Ensure wide-feature placements cannot expand the agreed selection beyond four desktop rows. Preserve media aspect ratios and the main gallery's existing column behavior; four rows here means four tiles per desktop column, not a new equal-height image treatment.
- Check persisted ordering/removal preferences against the new selection. If needed, version the local selection state so old preferences cannot reintroduce removed tiles or leave gaps. Update the Pages smoke test that explicitly expects 20 current-version tiles.

**Exit:** header composition is stable and every Work entry path lands at the work, while the opening experience remains available as designed.

### 4. Connect the floating gallery ticker

**Covers:** C07. **Dependencies:** steps 2–3.

- Dock the board next to the homepage logo before gallery entry. Float it at mid-right while the gallery is the active section, with safe viewport gutters.
- Keep the board in a stable overlay layer so existing column transforms and project transitions do not move it unexpectedly. Leave pointer events on the work cards.
- Feed the label from each card's actual project `client` and `title`, with a title-only fallback. Avoid duplicating a client already contained in the title. Define asset-specific naming only when the data supplies it.
- Give keyboard focus the same title behavior as pointer hover. On touch layouts, show useful card labels without requiring a hover or an extra tap before navigation.
- Use focus/hover state to arbitrate active content. Clear it on exit, route change, and gallery replacement. Restore the idle cycle only after the active label clears.
- Reverse the docking transition on upward scroll. Hide the floating board outside the gallery, including BTS, Contact, and project overlays. Keep the footer ticker independent.
- Check existing card labels with the floating display. Retain accessible names and avoid two competing visual labels on desktop.

**Exit:** the board identifies the current work reliably without obscuring content, stealing clicks, or interfering with navigation.

### 5. Replace the Behind the scenes carousel

**Covers:** C08. **Dependency:** mosaic treatment from step 1. Can be implemented independently of the ticker after that choice.

- Replace the circular 3D stage with a responsive, rectangular mosaic using the current image source as a prototype.
- Remove frosted surfaces, rounded bubble styling, depth blur, automatic orbiting, and carousel-specific drag/momentum behavior from the active component.
- Establish deliberate portrait/landscape placements, consistent gutters, and sensible crop/focal positioning. Keep content order deterministic and keyboard order logical.
- Start with subtle image enlargement and foreground emphasis on hover/focus. Avoid moving a link away from the pointer. Treat actual image shuffling as a separate optional experiment.
- For touch, provide a usable static mosaic and a clearly defined tap action. Do not leave old “bring photograph to the front” buttons or carousel instructions attached to a grid.
- Update responsive image sizes for the new geometry and preserve lazy loading. Keep working images available with JavaScript disabled and motion reduced.
- Replace tests for deliberate carousel behavior with tests for the mosaic. Keep general accessibility, media, and navigation coverage.

**Exit:** BTS reads as a board of photographs at every supported size, with the approved hover treatment and no active carousel machinery.

### 6. Finish callout, footer, and Contact

**Covers:** C09–C14. **Dependencies:** step 2 for footer ticker; confirmed contact data for final content.

- Change the callout sentence to “Looking to create something impactful?”
- Rebalance the footer using shared horizontal margins and intentional alignment between the signature, Featured directory, and legal line. Let long titles wrap; the current directory relies on `max-content` columns and `white-space: nowrap`.
- Preserve the footer logo/ticker assembly and preview the separate travel word set, including its longer “IN TRANSIT” label.
- Scope Contact typography changes to the Contact page. Its heading currently inherits a very large shared `.utility-content h1` rule, so changing that globally could affect unrelated pages.
- Reduce the proposed heading/email scale and the gap between them. Align details to a common grid; stack them naturally on narrow screens.
- Render the confirmed address/location close to the email and socials. Use the existing `location` field if one concise string is sufficient. Add a separate optional address field only if multiline or structured content is needed.
- If a schema/query change is necessary, update the schema, frontend view types, query/normalizer, local fixture, and generated types together. Keep existing content compatible. Prepare any production content update separately for an explicit request.
- Check the actual email length and address line lengths before accepting the layout. Additional replacement of visible lorem-ipsum email/social content is a dependency discovered during review, not a supplied replacement in the comments.

**Exit:** footer and Contact satisfy the approved layouts, links remain functional, and final content contains no guessed contact details.

### 7. Verify against the comment register and hand off

**Dependency:** all implemented steps and final input choices.

- Review one comparison for each slide and mark every C01–C14 and F01–F03 item implemented, preserved, or explicitly deferred by decision. Attach evidence and note any remaining content inputs.
- Exercise the splash-to-hero transition, Work navigation, project open/close and Back, gallery hover/focus, touch navigation, footer, and Contact.
- Test narrow mobile, tablet, and desktop widths, plus long titles/email/address, 200% zoom, no JavaScript, and reduced motion. Check horizontal overflow and header/ticker collisions.
- Verify multiple ticker instances, minute rollover, timezone selection across date/daylight-saving boundaries, tab suspension/resume, rapid hover changes, and cleanup after repeated route navigation.
- Run focused browser tests while iterating, followed by the complete relevant project checks below. Update visual baselines only after reviewing the intentional changes.
- Deliver the local result at `http://127.0.0.1:4325/` with the completed comment register and a list of unresolved owner inputs. Work directly on `main` in this checkout. Publishing or production Sanity changes require a separate explicit request.

**Exit:** every comment has evidence or a recorded decision; relevant checks pass; the local result is ready to review.

## Domain preparation and launch for newworkagency.com

This work can begin alongside the design revision. Recommended starting point: retain the existing GitHub Pages hosting and the existing Squarespace domain registration/DNS, then change the website records at launch. A registrar transfer or hosting migration is not required by the requested design changes.

### Verified baseline on 13 October 2026

| Item | Finding | Implication |
|---|---|---|
| Ownership input | Ben confirmed the domain is already registered. | No domain purchase is needed. |
| Registrar | Public Verisign RDAP identifies Squarespace Domains LLC, IANA ID 3827. | Start by locating the owner's Squarespace Domains account. |
| Nameservers | `dns1.p03.nsone.net` through `dns4.p03.nsone.net`. | Confirm the actual DNS control panel with the owner; nameserver branding alone does not identify account access. |
| Existing website DNS | Apex A records: `198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145`. `www` CNAME: `ext-sq.squarespace.com`. | The domain currently points at Squarespace infrastructure. Preserve these values in the rollback record. This is a DNS finding, not confirmation of what an existing website displays. |
| Email and other records | Public lookups returned no explicit apex MX, TXT, CAA, or AAAA answers; a repeated AAAA lookup succeeded after the first timed out. | Confirm email with the owner and the DNS panel. Do not assume a working `hello@newworkagency.com` mailbox or infer that all email-related subdomains are absent. |
| GitHub Pages | Read-only `gh api` returned workflow publishing, `cname: null`, HTTPS enforcement enabled, and `https://ben-keller.github.io/newwork/`. | Hosting is configured, but the new domain is not attached. The current HTTPS setting does not prove that a certificate exists for the new domain. |
| Publishing code | Workflow still builds V1/V2. `hosting/config.json` sets `v2ContentMode` to `prototype`; `hosting/build.mjs` appends `/v2` even when the overall base is `/`. | Prepare a proper root-domain release. Merely updating a hostname or base environment variable will leave the review-version structure in place. |

Sources for baseline: read-only DNS queries and GitHub CLI, [public registrar record](https://rdap.verisign.com/com/v1/domain/newworkagency.com), local `hosting/config.json`, `hosting/build.mjs`, and `.github/workflows/deploy-site.yml`. The observed apex IPs match [Squarespace's published website records](https://support.squarespace.com/hc/en-us/articles/360035485391-DNS-records-for-connecting-third-party-domains). The web retrieval tool could not open the apex or www website, so current website content and availability remain unverified.

### D01 — Account and DNS preparation, before the revision is finished

**Owner:** domain owner with the developer preparing the change sheet.

1. Confirm access to Squarespace Domains and the account that owns the GitHub repository. Keep the business as the domain owner and confirm renewal is enabled.
2. Export or record the full DNS zone from its control panel. Public queries above are a baseline, not a complete zone inventory. Identify current site records, mail records, forwarding, and any verification records.
3. Confirm the canonical host. Proposed choice: `newworkagency.com`, with `www.newworkagency.com` redirecting to it.
4. Prepare GitHub's domain-verification TXT record under the account/organization that will own the Pages site. Once authorized, add and verify that specific record while leaving website routing unchanged. Retain the verification record. Use the value generated by GitHub; do not invent it. See [GitHub domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
5. Confirm whether a mailbox already exists. If not, choose the email provider and intended address, then configure and test its mail records separately. Website hosting does not create an email inbox. Supply the tested address for C12–C14.

**Exit:** account access, complete DNS backup, host choice, verification instructions, and email ownership are recorded. These are preparation tasks; no account or DNS settings were changed during this analysis.

### D02 — Prepare the root-domain release locally

**Owner:** developer, with editor input. **Can start immediately as a later implementation task.**

- Prepare production publishing at `https://newworkagency.com/`, with `/work/...` and `/contact` at the root. Update the workflow's hardcoded GitHub origin/base, the versioned packaging, and the corresponding verification scripts/tests together. The site already reads `PUBLIC_SITE_URL` and `PUBLIC_BASE_PATH`; use the approved origin and `/` in the production build. Astro's [custom-domain guidance](https://docs.astro.build/en/guides/deploy/github/) explains the site/base relationship.
- Preserve local historical files. Decide the disposition of old public `/v1` and `/v2` links and define redirects where needed. Do not silently publish the archived review versions as the new public site or delete archives as a side effect.
- Prepare a release from approved production content. Resolve remaining contact/project placeholders and verify the agreed gallery edit in the production data. Keep prototype mode and `noindex` for review builds; enable public indexing only for the approved production release.
- Check canonical URLs, sitemap, robots directives, social-preview URLs, 404 behavior, font/media paths, all project routes, and the Contact page using the final origin.
- Prepare a repeatable last-good build and the rollback steps. Confirm how production Sanity updates will rebuild the site; the current review packaging ignores CMS content, even if the webhook fires.
- Update `DEPLOYMENT.md` and `hosting/README.md` to describe the final publishing setup when implemented. The retained V1/V2 packaging is an observed code fact, not a direction to revive the retired branch/checkout workflow.

**Exit:** a local production release candidate works at root paths, contains the intended content, and passes the relevant source/build/browser checks. This does not publish it.

### D03 — Prepare the DNS change sheet

If the existing `Ben-Keller/newwork` Pages site remains the host, the proposed website records are:

| Name | Type | Proposed target |
|---|---|---|
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `www` | CNAME | `ben-keller.github.io` |

These replace the current website A/CNAME records only. Retain unrelated DNS/mail records. Recheck the zone and targets at execution time. If repository ownership changes, update the GitHub target accordingly. Configure the custom domain in Pages before pointing website DNS there. Because this repository uses a custom Actions workflow, adding a repository `CNAME` file is not the setup mechanism. See [GitHub custom-domain configuration](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

**Exit:** the owner can review exact before/after records and restoration values. No website records change during preparation.

### D04 — Launch after the revision and content are accepted

**Owner:** release operator and domain owner. **Requires an explicit request to launch.**

1. Confirm the approved build/commit and full DNS backup. Schedule the change when the owner can verify the site and email.
2. Publish the reviewed production artifact and configure `newworkagency.com` in the repository's Pages settings. Treat the Pages setting as part of cutover because it changes hosting behavior.
3. Apply the reviewed website DNS records. Verify apex and www resolution, leaving email records intact.
4. Wait for the custom-domain certificate to provision, enable/confirm HTTPS enforcement, and verify HTTP/HTTPS and apex/www redirects. GitHub provisions certificates automatically after successful DNS checks. See [GitHub HTTPS setup](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).
5. Test the homepage, gallery, representative project routes, media, Contact email, 404 page, social previews, sitemap, and production robots directives from the actual domain.
6. Record the deployed commit and verify the subsequent CMS rebuild path once production content is connected. Do not declare launch complete from a green build alone.

Allow a launch window for DNS and certificate provisioning; do not promise an instantaneous switch. Roll back a broken release by restoring the last-good artifact, or restore the captured website DNS if a hosting-level rollback is necessary. Keep domain registration and mail configuration intact.

### D05 — After-launch check

Check the domain again after propagation, confirm email delivery with the owner, and review any missing routes/media or indexing problems. Schedule a follow-up only if requested; this workplan does not create an automation.

## Source map for implementation

All paths are relative to `/Users/ben/Documents/NewWork`. These are inspected entry points, not a claim that every file must change.

| Area | Primary source files | Current finding |
|---|---|---|
| Header branding and navigation | `new-work-site/src/components/SiteHeader.astro`, `DesktopNav.astro`, `MobileMenu.astro`, `NwMark.astro`; `new-work-site/src/layouts/BaseLayout.astro` | Header renders typed `nw`; brand asset inputs already exist, but the current header does not render them. Work routes to the home-page top state. |
| Shared logo and hero | `new-work-site/src/components/LogoIntro.astro`; `new-work-site/src/pages/index.astro`; `new-work-site/src/styles/brand.css` | One title participates in splash and post-splash layout. Descriptor lives in LogoIntro. Changes must protect C01. |
| Ticker | `new-work-site/src/components/SplitFlapTicker.astro` | Existing footer board rotates PHOTO/CREATIVE/FILM. Single-instance initialization, alphabet-only animation, and initial-text-based width need extension. |
| Gallery labels and lifecycle | `new-work-site/src/components/ProjectCard.astro`, `ProjectGrid.astro`; `new-work-site/src/lib/motion/card-pointer.ts`, `gallery.ts`, `lifecycle.ts`, `work-project-router.ts` | Cards already have project data and accessible titles. Gallery persistence and project transitions require careful ticker cleanup. |
| Four-row gallery selection | `new-work-site/src/components/ProjectGrid.astro`; `new-work-site/tests/pages/pages.spec.ts` | Current selection cap and Pages smoke test both use 20. Update to the reviewed 16-tile selection and check wide-feature behavior. |
| Behind the scenes | `new-work-site/src/components/BehindTheScenes.astro`; `new-work-site/src/lib/bts.ts`, `bts-carousel.ts`, `bts-momentum.ts` | Active view is a frosted 3D carousel. BTS data currently derives from work-gallery images. |
| Callout/footer | `new-work-site/src/components/ContactCallout.astro`, `SiteFooter.astro`; `new-work-site/src/styles/brand.css` | “Beautiful” is hardcoded. Footer signature/ticker exists; Featured links use sizing that resists wrapping. |
| Contact/data | `new-work-site/src/components/ContactDetails.astro`; `new-work-site/src/pages/contact.astro`; `new-work-site/src/styles/global.css`; `new-work-site/src/content/local/site-settings.json`; `new-work-site/src/lib/types.ts`, `content.ts`, `groq.ts`; `studio-new-work/schemaTypes/documents/contactPage.ts` | Heading/email are oversized in the reviewed treatment. A location string exists. Prototype email/location/socials are placeholders. |
| Verification | `new-work-site/tests/e2e/portfolio.spec.ts`, `logo.spec.ts`, `bts.spec.ts`, `accessibility.spec.ts`, `no-js.spec.ts`, `visual.spec.ts`; relevant unit tests | Existing assertions encode typed `nw`, footer-only ticker content, Work-at-top behavior, and rotating BTS. Change only assertions superseded by this review. |
| Domain and publishing | `hosting/config.json`, `hosting/build.mjs`, `hosting/verify.mjs`, `hosting/hosting.test.mjs`; `.github/workflows/deploy-site.yml`; `new-work-site/astro.config.mjs`; `new-work-site/playwright.pages.config.ts`; `DEPLOYMENT.md`; `hosting/README.md` | Current pipeline still packages prototype V1/V2. Custom-domain root publishing needs coordinated changes rather than a hostname substitution. |

## Verification commands for implementation

From `new-work-site/`, run the relevant existing gates after implementation:

```sh
pnpm sanity:audit
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm verify:dist
pnpm test:e2e
pnpm test:e2e:visual
```

Use focused Playwright files first for iteration. `sanity:audit` is a read-only content check and may require configured credentials. Do not run seed, sync, migration, or write commands to make it pass.

If schemas or GROQ change, regenerate and review `studio-new-work/schema.json` and `new-work-site/src/sanity.types.ts` using the repository type-generation command, then run `npm run deploy:check` from `studio-new-work/`. Review `git diff --check` and the complete diff before handoff.

For the four-row selection and later publishing changes, also run the hosting packaging tests and Pages browser smoke tests. Adapt them to the approved root-domain packaging as part of D02; do not retain assertions that deliberately force the old `/v2` launch path. Exercise both the local root build and the final production-origin configuration before deploying.

These are planned implementation checks. This analysis did not run the website test suite or verify live browser behavior. The local HTTP check at port 4325 did not find a running server. All six embedded screenshots were inspected directly and slide annotation geometry was read from the PPTX. A LibreOffice rendering attempt failed, so this review does not claim a PowerPoint or full-slide-render inspection.

## Planning estimate and dependency order

Indicative effort for one developer, assuming assets/content arrive promptly and one consolidated design review:

| Work package | Estimated developer effort |
|---|---:|
| References, asset mapping, design decisions | 0.5–1 day |
| Shared ticker, clock, lifecycle and accessibility | 1–1.5 days |
| Header, hero and Work navigation | 0.5–1 day |
| Gallery docking and project labels | 0.75–1.25 days |
| Four-row selection and associated checks | 0.25–0.5 day |
| BTS mosaic replacement | 0.75–1.25 days |
| Callout, footer and Contact layout | 0.75–1.25 days |
| Integration, browser checks and review corrections | 1–1.5 days |
| **Website revision subtotal** | **5.5–9.25 developer days** |
| Domain preparation and root-domain publishing work | 0.75–1.25 days |
| Cutover and post-launch verification | 0.25–0.5 day |
| **Total including launch work** | **6.5–11 developer days** |

This is a planning estimate, not a delivery commitment. Waiting for brand assets, final contact information, account access, DNS propagation, extra design rounds, or a new structured CMS address model can extend elapsed time. After shared design decisions, BTS, Contact, and domain preparation are independent of most ticker development. The highest-risk website sequence is shared ticker, hero integration, gallery behavior, then navigation/regression checks. Public launch additionally depends on approved production content and a tested root-domain build.

## Original comments

Verbatim source text follows, with line breaks preserved. This appendix makes the coverage auditable without reopening the deck.


### C01 · Slide 1

> no notes!

### C02 · Slide 2

> Let's change this to new icon

### C03 · Slide 2

> when 'work' get's pressed, it should push down the page to the work gallery

### C04 · Slide 2

> Let's put this at the top near the 'work' and 'contact line

### C05 · Slide 2

> Let's bring the new logo in and let's feature the little trainstation 'ticker' next to it on this front page.

### C06 · Slide 2

> let's add some more words to the ticker. 
> let's add:
> SF
> LA
> NYC
> the time (like actual clock showing the time)

### C07 · Slide 3

> Once you scroll down and start to see the work, mike and I think that the 'ticker' should disengage from the new work assembly and then hover sort of somewhere right around the mid right part of the page. The content in the wording will actually the title of the project that the viewer's cursor is hovering over. So as you hover over a project, the ticker reads the client/project name etc.

### C08 · Slide 4

> Let's change this to more of a grid, or mosaic. Right now it feels a little to sleek, almost like it's selling products in each one of these bubbles. If we could go with something that's a little bit flatter and more rectangular, we could make it almost look like a frame with a bunch of pictures in it, or a bulletin board with with a bunch of pics on it. Maybe as the mouse hovers, images can sort of enlarge or shuffle to be more revealed or prominent.

### C09 · Slide 5

> let's change beautiful to 'impactful'

### C10 · Slide 5

> feeling like this could be formatted better, better aligned in the frame.

### C11 · Slide 5

> let's keep this here too. Should we try different words in the ticker? Arriving
> In transit
> Departing
> Early

### C12 · Slide 6

> the formatting on this page is pretty strange. Can we clean this up

### C13 · Slide 6

> make it smaller

### C14 · Slide 6

> put an address on there?

## Original follow-up supplied in chat

> Couple things:
> Can we make the gallery view 4 rows tall instead of 5?
> I've included the new logo.
> Below is our new logo arrangement as well.
>
> From a domain standpoint, what do we need to start doing to get this thing up and running after the next rev? Is there groundwork we can do to get it set up so we can hit the ground running?

Ben subsequently confirmed: “Main work gallery” and “already registered. newworkagency.com”.

![Oliver's supplied logo arrangements](/Users/ben/Documents/NewWork/references/review-2026-10-13/oliver-logo-arrangements.png)

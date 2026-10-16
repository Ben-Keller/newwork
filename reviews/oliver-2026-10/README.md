# Oliver revision — implementation and review

Implemented in an independent copy of the existing site on 13 October 2026. The existing version is preserved for comparison. On 16 October, Ben requested launch preparation and CMS updates: Studio/schema and scoped settings are now deployed, and the local publisher targets the Oliver revision. The public website and DNS have not changed; workflow changes still need a reviewed push.

## Review the two versions

- **Side by side:** http://127.0.0.1:4328/
- **Existing version:** http://127.0.0.1:4325/ — `new-work-site/`
- **Oliver revision:** http://127.0.0.1:4327/ — `new-work-oliver-review/`

Project Studio's **New Work — Oliver Review** card opens the revised app on port 4327. Its docs link to all three views; its Stop/status controls manage only the revised app. The original remains separately available on port 4325.

From the repository root, `node hosting/review.mjs` starts both apps and the comparison page. It can reuse matching running previews and refuses a port occupied by a different app. View controls cover opening, gallery and Contact, at desktop, tablet and phone widths.

**Future edits belong only in `new-work-oliver-review/`.** Read [editing and promotion rules](EDITING.md). Both apps stay in this checkout on `main`; no extra branch/worktree was created. Source/assets are independent, and the revised app has its own browser-storage namespace and gallery-order version.

## Selected ticker style

Ben selected **Tall** on 16 October 2026. Both tickers now use its portrait split flaps, pale station lettering and dark casing directly in the shared `SplitFlapTicker.astro` component. One-line content, actual city times, automatic messages and project hover/focus remain intact.

The chooser, other variations and experiment code have been removed. The selected appearance is shared across content modes and no longer depends on saved review preferences. Historical comparison screenshots remain in `captures/`.

## Comment audit — 16 October 2026

Re-read all 14 comment XML records and the author record in `/Users/ben/Downloads/V2 (1).pptx`. Oliver Hamilton authored all of them, across six slides; the six speaker-note parts are empty. Original wording and slide interpretations remain in [the source workplan](../../new-work-site/docs/V2_COMMENT_WORKPLAN.md#original-comments). The three F-items come from Oliver's chat follow-up.

**Implementation coverage:** C01 is preserved, C02–C13 have implemented responses, and C14's real address is intentionally deferred by Ben and remains client-editable. F01/F02 are implemented and reflected in CMS settings; F03 uses the approved existing review address with automated CMS checks; custom-domain activation is intentionally deferred. “Implemented” means the change exists and has evidence; it does not record Oliver's final acceptance. No missing requested layout or interaction was found in this audit.

| ID / slide | Oliver's request | Current disposition | Evidence and what remains |
|---|---|---|---|
| C01 / 1 | “no notes!” on the opening | Preserved | Opening media and entry/return behavior retained. Ben's follow-up now uses one native SVG instance for splash and home, with identical letter spacing and individual-letter hover in both states. The separate font title and w–o spacing patch were retired on 16 October. Checks are recorded in [QA](QA.md). |
| C02 / 2 | Use the new header icon | Implemented; placement for review | Exact supplied two-band n/w vector appears once in the header and remains stationary when the mobile menu opens; the separate larger menu logo has been removed. CMS image marks now turn white on dark project pages, matching inline SVG behavior. Final review should confirm that compact variant; Oliver did not explicitly choose between the two supplied alternatives. [Asset provenance](BRAND.md). |
| C03 / 2 | Work should scroll to the gallery | Implemented | Same-page/cross-route and mobile Work links reach the first gallery row. Browser Back restores the previous gallery position. Fresh browser checks passed. |
| C04 / 2 | Move the descriptor beside Work/Contact | Implemented | “film + photo production agency” is in the header, including the compact mobile arrangement; no duplicate hero descriptor. The same descriptor stays visible and in place while opening/closing the mobile menu. Menu/Close share a fixed-width control. Fresh identity and menu stability checks passed. |
| C05 / 2 | New full logo with a train-station ticker beside it | Implemented; Tall selected by Ben | Exact horizontal vector and single-line Tall board form the hero. Style alternatives and selector are removed. Docked/floating/narrow layouts checked; compact layouts reserve clearance so scrolling gallery cards cannot overlap the docked board. |
| C06 / 2 | Add SF, LA, NYC and real time | Implemented | Full city names and actual local times rotate with agency messages on one line. Current format is 24-hour; clocks update by minute and catch up after suspension. Fresh clock checks passed. No new format decision is required unless Oliver requests one. |
| C07 / 3 | Detach the ticker into mid-right gallery; name hovered work | Implemented | One board docks/floats, follows client/project hover and keyboard focus, restores the rotation on exit and hides after the gallery. Touch keeps it inline. Fresh interaction checks passed. |
| C08 / 4 | Flat rectangular BTS mosaic; optional hover emphasis | Layout implemented; imagery remains provisional | CSS mosaic replaces the active bubble carousel; hover enlarges a frame and reveals its caption, keyboard focus reveals the caption. Current pictures are sourced from portfolio work. Supply real BTS images if the section should present actual behind-the-scenes material. Shuffle was an optional suggestion, not an omitted requirement. |
| C09 / 5 | Change “beautiful” to “impactful” | Implemented | Exact callout: “Looking to create something impactful?” Fresh copy check passed. |
| C10 / 5 | Improve footer formatting/alignment | Implemented; visual acceptance pending | Signature/directory composition and wrapping Featured links are rebuilt. Per Ben's follow-up, the train board sits to the right of the stacked logo with flush bottom edges, including mobile. Verified 24 layouts across Chromium/WebKit at 320–1920px; desktop/mobile screenshots and comparison inspected. |
| C11 / 5 | Keep footer ticker; try Arriving / In transit / Departing / Early | Implemented | Independent Tall footer board uses all four phrases; “IS” and pause control are removed. Fresh word-set and independent-cycle checks passed. |
| C12 / 6 | Clean up Contact formatting | Layout implemented | Compact heading, ruled email row and aligned Location/Elsewhere details. Placeholder content remains by Ben's instruction. Fresh responsive and long-content checks passed. |
| C13 / 6 | “make it smaller” | Implemented interpretation; visual acceptance pending | Both Contact heading and email treatment were reduced. The original comment does not identify a single target; confirm the resulting scale in the consolidated review, rather than treating that ambiguity as missing code. |
| C14 / 6 | “put an address on there?” | Deferred content, by Ben | Optional multiline location/address field exists. Real address is not supplied. Ben confirmed on 16 October that placeholders should remain during launch preparation and be easy for the client to update later. The hosted CMS now has that multiline field; clearing it hides Location. This is not a launch gate. |
| F01 / chat | Four rows instead of five in the main gallery | Implemented; exact edit for review | Sixteen unique tiles, four per desktop lane; two-column mobile reflow. First-row top edges remain complete during upward momentum. The gallery reserves room around the ticker/reel, and lateral motion stays inside the outer margins. Count/layout, motion paint and navigation checks are recorded in [QA](QA.md). The same 16-item review selection is stored in Sanity; 12 unused placements remain in a reserve. Editorial acceptance of the selection can be recorded in consolidated review. |
| F02 / chat | Use the new logo and arrangements | Implemented; placements for review | Exact vector masters used for horizontal hero, stacked footer and compact header. The old “missing vector masters” dependency is resolved. Browser icons remain unchanged; they were not explicitly included in the request. |
| F03 / chat | Do groundwork for newworkagency.com launch | Review publication authorized; domain deferred | The publisher targets the existing GitHub Pages review address with published CMS content and 15-minute change checks. Studio has the approved branding and a customized client dashboard. Domain activation is a separate future action; no webhook token is required for the active flow. [Launch preparation](../../hosting/ROOT_RELEASE.md). |

Fresh audit: `tests/e2e/review.spec.ts` passed **25 cases on desktop/mobile Chromium**, with one intentional touch exclusion for mouse-hover behavior. Existing snapshot evidence was inspected for BTS and Contact/footer; Tall's hero/footer screenshots and build were verified earlier on the same date. All 1,110 original baseline files remain intact. This audit changed review documentation only.

## Domain workplan status

| ID | Status |
|---|---|
| D01 | Open owner/account work: confirm DNS access, export the complete zone, confirm email provider/mailbox and obtain/add GitHub’s verification TXT record when authorized. Public lookup data is not a full DNS zone. |
| D02 | Production root build verified from updated CMS content: 93 HTML pages, 16 tiles and 553 root/legacy routes. Local publisher switched to the revision. Contact placeholders are explicitly permitted. A reviewed push installs the workflow on GitHub. |
| D03 | Exact existing/proposed apex and www records, sequence and restoration values documented. No DNS changes made. |
| D04 | Open launch execution: deploy the approved production artifact, attach the domain, change website DNS, verify HTTPS/redirects and confirm the CMS rebuild path. Requires the explicit launch request described in the project rules. |
| D05 | Post-launch domain, content and email checks documented. No automation or future run was scheduled. |

## Remaining closure work

| Action | Owner | When / dependency |
|---|---|---|
| Review the current revision once against C02/F02, C08, C10, C13 and F01: compact icon placement, mosaic, footer, Contact scale and exact gallery edit. Record acceptance or specific changes. | Ben / Oliver / Mike | Before calling the design accepted. Tall is already selected by Ben and is not an open style decision. |
| Replace Contact placeholders when details are ready, or clear optional address/social fields. | Client/editor directly in CMS | Deferred by Ben on 16 October; no code change or launch hold required. |
| Supply and select genuine BTS photographs, or explicitly accept the existing portfolio-derived material. | Oliver / Mike / content owner | Content decision for C08; the mosaic layout itself is complete. |
| Review final production project titles, copy, metadata and 16-item selection. | Content owner + developer | Before public launch. The local review still visibly includes “Dune / Tansy — Title to Confirm” and has filler metadata/project copy. Review fixtures are not a substitute for approved production CMS content. |
| Confirm DNS/account access, full zone backup, canonical host and mailbox/provider; complete domain verification when authorized. | Domain owner + developer | Before DNS cutover. |
| Push the prepared publisher, attach the domain, deploy and verify HTTPS/redirects/email; add and test the Sanity rebuild hook. | Developer + domain owner | Explicit launch action, DNS access and dedicated GitHub Actions token. The local workflow and production package are ready. |

Read-only checks on 16 October: GitHub Pages still reports `https://ben-keller.github.io/newwork/`, workflow publishing and `cname: null`. Public apex A records remain `198.185.159.144`, `198.185.159.145`, `198.49.23.144`, `198.49.23.145`; `www` points to `ext-sq.squarespace.com`. The apex MX lookup returned no answer, which does not establish mailbox/account status or replace a full DNS export. GitHub, DNS and email were unchanged. The later scoped Sanity update is recorded below.

The earlier Contact placeholder guard has been removed following Ben's 16 October instruction. Production packaging reports the placeholders without blocking. The 4327 design review remains prototype content with `noindex`; the separate 4330 package reads published CMS content.

## Verification

See [QA results](QA.md) for commands, outcomes, visual evidence and limits. The baseline manifest is unchanged and the integrity checker verifies all 1,110 captured files locally (683 portable source/master files in CI).

## Launch preparation and CMS update — 16 October 2026

The request after the comment audit authorized updating Sanity and preparing the publisher. New fields connect the three logo placements, header descriptor, homepage ticker messages/cities, footer callout/messages/heading and BTS selection to the revision. The hosted Studio exposes these fields and a clearer Contact editor. Archived About and old footer controls are hidden while stored content is retained.

The one-time backed-up migration changed four settings documents atomically, retaining Contact placeholders exactly and preserving 12 unused placements separately. The current CMS audit found 17/17 public Work records with media, 16 curated placements and no active Notes. All 114 validated documents have zero errors. No Project/ordinary Asset documents were edited or deleted.

The production package and revised single publisher are prepared. The automatic rebuild hook is now saved in Sanity but disabled; its dedicated GitHub Actions token is still needed. [Deployment instructions](../../DEPLOYMENT.md), [client guide](../../studio-new-work/CLIENT_GUIDE.md) and [domain cutover](../../hosting/ROOT_RELEASE.md) identify the remaining steps. There was no Git push, public website deployment or DNS change.


## Splash ticker follow-up — 16 October 2026

C05/C07/C11: Ben reported an intermittent board flash on first load. The homepage board now starts hidden in server-rendered HTML and remains hidden during route cleanup. CSS excludes both home and footer boards until the one shared wordmark has completed its transition into the home layout. This also covers the desktop board after it moves outside the page content into the document body. Returning to the splash removes the boards immediately, including with reduced motion. The no-JavaScript page keeps its static boards because that fallback has no splash. The selected Tall styling and gallery behavior are preserved.


## Footer copyright alignment — 16 October 2026

C10: Ben requested the copyright alongside the other footer information rather than in a separate lower row. The legal block now occupies the rightmost column beside Featured. Below 1100px, the logo and train board share the first row, with Featured and copyright beside each other in the next row. At phone widths the project links use one column to keep the legal block readable and prevent overlap. Copyright text, CMS fields and the existing logo/board alignment are unchanged.


## Remove BTS small caption — 16 October 2026

C08 follow-up: Ben requested removing “A closer look.” The caption was cleared from the published Work-page document; the component, content normalization, Studio default and deliberate migration defaults no longer restore it. The optional CMS caption field remains available and explains that leaving it empty shows only the heading. The section heading and mosaic are unchanged.

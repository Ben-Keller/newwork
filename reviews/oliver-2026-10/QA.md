# Oliver revision — verification

Verified locally on 13 October 2026. All edits are in `new-work-oliver-review/` and the review/release tooling; the original app is preserved.

## Automated checks

| Check | Outcome |
|---|---|
| Astro type check | 177 files, zero errors, warnings or hints |
| ESLint | Passed |
| Unit tests | 17 files, 159 tests passed |
| Hosting unit tests | 3 passed |
| Prototype build and distribution verification | 71 pages, 961 files verified |
| Media delivery budgets | 830 files checked, including fast-start video delivery |
| Root-domain package | 211 root/legacy routes verified, 16 gallery tiles, root asset paths and prototype metadata |
| Chromium desktop/mobile | 156 passed in the final broad run; two media-timing failures passed in a sequential focused recheck; 28 intentional exclusions. All 158 applicable cases have passing results. |
| Firefox desktop and WebKit desktop/mobile | 50 applicable cases passed across the cross-browser run and focused recheck; 1 touch-only exclusion. The final Firefox gallery-transition/Back recheck also passed both cases. |
| Visual regression | 12 desktop/mobile snapshots passed after updating and visually inspecting the new mosaic baselines |
| Packaged root browser checks | 12 passed on the final root candidate: Chromium desktop/mobile and WebKit desktop |
| Baseline integrity | All 1,110 captured files unchanged; 683 portable source/master files also checked |
| Whitespace / patch check | `git diff --check` passed |

The media-heavy broad run exposed two timing-sensitive assertions around portal completion/capture. After restarting the development preview, the sequential transition checks passed. Browser suites are therefore documented with a low worker count instead of running competing media suites concurrently.

Browser coverage includes first and repeated entry, gallery selection, actual timezone clocks, minute and visibility updates, hover/focus priority, ticker cleanup, mobile menus, touch labels, keyboard and reduced motion, 320px overflow, long Contact content, film/photo routes, live media continuity and browser Back. The gallery's in-flight scroll offset is preserved when a project opens; deferred layout refresh also preserves the browser's scroll position. The targeted transition/hover/template checks passed twice on both Chromium profiles after the final fix (12 passing cases). The fresh-preview media/Back recheck then passed all four applicable cases, with two deliberate mobile exclusions.

The old baseline app keeps its original tests and snapshots. In the revised app, expectations for the retired carousel, typed header mark, old footer join and twenty-tile gallery were replaced with the new agreed behavior. Visual snapshots cover opening, hero, gallery, mosaic, Contact/footer and a film project on desktop/mobile. They use fixed time, reduced motion and a seeded background for repeatability. Actual clock/animation behavior is covered separately.

## Performance and accessibility

- Supplied logo paths remain native SVG; each asset is under 4 KB.
- BTS is a CSS grid of lazy responsive images and native links, without the previous carousel runtime on the home page.
- Decorative ticker updates stop offscreen, in hidden tabs and with reduced motion; clocks catch up when the tab returns. Per Ben's latest follow-up, both tickers use one line in a compact dark casing, with no visible pause control or external captions.
- Splash background animation stops after entry and while hidden. Motion controllers, observers and listeners dispose on route changes.
- Sixteen gallery tiles replace twenty, with versioned browser-storage keys to avoid stale ordering. Existing responsive AVIF/WebP and optimized video delivery remain verified.
- Focus treatments, native links, screen-reader labels, no-JS routes and media fallbacks are exercised by the browser suite. A poster fallback was added to the short-loop player for no-JS use.

No Lighthouse score, production field Core Web Vitals or public-domain uptime is claimed. These are local build/browser checks and concrete delivery improvements.

## Production content and launch limits

A read-only production build produced and verified 93 pages / 983 files. The audit found 17/17 published Work documents with public media, 28 gallery placements, no active Notes and 16 legacy rollback Project documents. Production packaging then correctly stopped because Contact still contains placeholder email, location and social URLs. It retained the previous packaged candidate; the final local candidate uses prototype content and `noindex`.

Ben confirmed on 13 October 2026 that Contact should keep its placeholder email, location/address and social links. This is intentional review content, with no further Contact input needed for this revision. Final Contact details can be supplied for a future public launch; dedicated BTS photographs can replace the current gallery-derived material when supplied. No production CMS write, DNS change, publication, commit or push was performed. GitHub's candidate workflow is prepared locally but was not run remotely. See [launch preparation](../../hosting/ROOT_RELEASE.md).

## Repeat the checks

```sh
# Repository root
node hosting/check-review-baseline.mjs
node --test hosting/hosting.test.mjs
node hosting/root-release.mjs
node hosting/verify-root-release.mjs

cd new-work-oliver-review
npm run typecheck
npm run lint
npm test
# Run browser suites sequentially to avoid media-heavy browser contention.
PLAYWRIGHT_EXTERNAL_SERVER=1 ./node_modules/.bin/playwright test --project=desktop-chromium --project=mobile-chromium --workers=2
VISUAL_REGRESSION=1 PLAYWRIGHT_EXTERNAL_SERVER=1 ./node_modules/.bin/playwright test tests/e2e/visual.spec.ts --project=desktop-chromium --project=mobile-chromium --workers=1
./node_modules/.bin/playwright test --config=playwright.pages.config.ts --workers=1
```

Use Node 22.12 or newer. Start the local comparison with `node hosting/review.mjs`; restart the revision dev server after a production build before reviewing development styles. Final desktop/mobile captures reported no page errors or horizontal overflow. Screenshot evidence and selected check logs are in `captures/` locally; maintained regression images are under `new-work-oliver-review/tests/e2e/visual.spec.ts-snapshots/`.

## Project Studio launcher correction — 13 October 2026

The existing `new-work-portfolio` card now displays **New Work — Oliver Review** and launches `new-work-oliver-review/` on port 4327. Its identity/history are preserved, while the process name is `oliver-review` to avoid adopting an old website PID. Card metadata, documentation and the preview image identify the revision. Documentation links to the original (4325) and comparison (4328).

Project Studio was restarted. Python compilation, both JavaScript syntax checks and registry validation passed with no registry errors; unrelated pre-existing warnings concern other apps. Live setup/apps/resources and launch/status endpoints identify the revision. A Stop/cold-Launch cycle verified the updated page and confirmed that the original and comparison process IDs remained unchanged. No website source or production service was changed for this correction.

## Individual-letter wordmark hover — 13 October 2026

Ben requested that splash hover affect each letter independently. The shared canvas now retains its original media source. Only the hovered letter plays its assigned video or shows its assigned still; a ready video glyph is removed from the shared mask to avoid doubled edges. Leaving pauses the letter video and restores the shared fill. Reduced-motion and Save-Data hover use a static image without loading a letter video.

The focused hover suite passed 11 cases across desktop Chromium, Firefox and WebKit plus mobile Chromium/WebKit; four mouse-only fallback cases are deliberately skipped on touch profiles. It covers all seven letters, switching back between letters, the unchanged shared source, inactive-video cleanup, leaving and returning from the gallery, reduced motion and Save-Data. Type checking reported zero errors/warnings/hints. The refreshed prototype build verified 71 HTML pages / 961 files and the root verifier checked 211 root/legacy routes. The original application remains unchanged.

## Bare ticker and rotating city clocks — 13 October 2026

Removed “On the clock”, “Now viewing”, the external city caption, and both ticker pause buttons. Removed the floating board's background, border, padding and shadow, plus the shared dark outer housing. Individual split-flap tiles are the only visible ticker elements. The home board now cycles Film + photo → San Francisco / local time → In production → Los Angeles / local time → New work → New York / local time. City names and times occupy separate rows. Hover/focus temporarily shows the project, then returns to the current automatic entry; footer words remain independent.

The final focused browser run passed 23 cases across desktop Chromium, Firefox and WebKit and mobile Chromium/WebKit, with two intentional touch exclusions for mouse hover. Coverage includes a complete automatic cycle, transparent docked/floating wrappers, absence of captions/buttons, minute accuracy, hidden-tab catch-up, reduced-motion behavior, focus priority and route cleanup. The first run caught unfinished glyph animations when reduced motion was enabled; rendering now cancels those even when the glyph does not change. The mobile footer timer check now waits for the visibility callback before advancing simulated time.

All four ticker unit tests passed, including DST, date boundaries, explicit city/time rows and long titles. Astro checked 177 files with zero errors/warnings/hints, and focused ESLint passed. Eight affected desktop/mobile visual baselines were refreshed; city/time captures were also visually inspected with no page errors or horizontal overflow. See `captures/ticker-clean-desktop-hero.png`, `captures/ticker-clean-desktop-gallery.png` and `captures/ticker-clean-mobile-hero.png`.

The local prototype candidate was rebuilt and verified: 71 HTML pages / 961 files and 211 root/legacy routes. All 1,110 baseline files remain intact. No publication or external service change was made.

## Single-line ticker casing — 13 October 2026

Ben's subsequent clarification supersedes the bare, two-row appearance above: both tickers now have a compact charcoal casing, with one row of split flaps. The home board has 20 cells so full city names and their times fit together, including “San Francisco 05:00”. Responsive cell spacing keeps the casing inside a 320px viewport. Long project names continue through single-line pages. External captions, white framing and pause controls remain absent.

The focused checks passed 14 browser cases on desktop Chromium/WebKit and mobile Chromium, with one deliberate touch-hover exclusion. The four ticker unit tests passed; Astro checked 177 files with no errors/warnings/hints, and focused ESLint passed. Eight affected desktop/mobile visual baselines were refreshed. Additional city/time captures were inspected with zero page errors and no horizontal overflow: `captures/ticker-single-line-desktop-hero.png`, `captures/ticker-single-line-desktop-gallery.png` and `captures/ticker-single-line-mobile-hero.png`.

## Five removable ticker directions — 13 October 2026

Added a prototype-only comparison panel for Platform, Signal, Rollsign, Metro and Quartz. It changes both boards without replacing their text/timer controllers. Choices and panel collapse state survive client navigation and reload within the tab. Signal uses local 5×7 SVG glyph masks; its narrow observers attach only while that direction is selected and disconnect on switching/navigation. No remote fonts, image downloads, canvas, duplicate ticker instances or perpetual animation loops were introduced.

All experiment code is in `src/experiments/ticker-styles/`, with one import and one mount in `BaseLayout.astro`. Disabling `TICKER_REVIEW_ENABLED` removes the controls and uses `SELECTED_TICKER_STYLE`, ignoring saved review preferences. The folder README explains both this quick lock-in and complete removal/final adoption. Production-mode pages omit the experiment.

All 23 applicable focused cases have passing results across desktop Chromium/WebKit and mobile Chromium (21 passed in the first run; two desktop accessibility cases passed after increasing the selected button number's contrast). One mouse-hover case is intentionally excluded on touch. Checks cover all five styles at 1440/390/320px, single-line content, both board instances, real clock-to-pixel updates, observer cleanup, navigation, reload, keyboard operation, collapse/reopen and chooser accessibility. Existing clock, hover, reduced-motion and visibility checks also passed.

Astro checked 181 files with zero errors/warnings/hints; focused ESLint and all four ticker unit tests passed. All 12 existing desktop/mobile page snapshots passed unchanged, with the temporary chooser excluded from permanent page baselines. Dedicated screenshots of every direction on desktop and phone, plus close-ups, were visually inspected; all ten views reported no page errors or horizontal overflow. Captures use `ticker-direction-{desktop|mobile}-{platform|signal|paper|metro|quartz}.png` and `ticker-direction-detail-*.png` in `captures/`.

The refreshed prototype package verified 71 HTML pages / 963 files and 211 root/legacy routes. The local preview on 4327 was restarted and its five buttons verified. All 1,110 original baseline files remain intact. Nothing was published.

## Platform-only variations — 13 October 2026

Ben clarified that all five choices should remain variations of the original black mechanical train board. The current chooser is **Platform variations**: Platform, Slim, Recessed, Tall and Bold. Every choice retains black split tiles, pale lettering, a central seam, the same flip motion and one-line content. Differences are limited to casing depth, hinge detail, tile proportions, spacing and lettering. The rejected treatments and dot-matrix renderer were removed. A new session key resets the older choices and collapsed state for this round.

All nine focused browser cases passed on desktop Chromium/WebKit and mobile Chromium. They cover all five variations through 320px, split-flap faces/seams, current clock and sequence continuity, both board instances, keyboard selection, navigation/reload persistence, collapse/reopen and chooser accessibility. Type checking covered 180 files with no errors/warnings/hints; focused ESLint passed. Close-ups of all five were visually inspected along with the mobile layout. All ten desktop/mobile captures reported no page errors or horizontal overflow; files start with `ticker-platform-` in `captures/`. All 1,110 original baseline files remain unchanged. The same single-flag chooser removal remains available.

The prototype package verified 71 pages / 963 files and 211 root/legacy routes. The separate Project Studio launcher was offline when a refresh was attempted, but the running site on 4327 remained available. Direct HTTP and post-build browser checks confirmed the five new choices and current Recessed hinge styling; no launcher restart was needed.

## Tall selected — 16 October 2026

Ben selected Tall as the permanent appearance. Its exact tile proportions, lettering and casing now live in the shared ticker component for both home and footer, across content modes. The four alternatives, chooser, session-preference code, experiment files and chooser-only tests were removed. The 320px sizing rule is retained in the home component. Current review documentation now describes the selected style; earlier comparison captures remain historical evidence.

All 14 applicable focused browser cases have passing results across desktop Chromium/WebKit and mobile Chromium; one mouse-hover case is intentionally skipped on touch. The initial mobile reduced-motion test exposed a test timing race: the fake clock advanced before the browser delivered its media-query change. Waiting one animation frame before advancing the clock resolved it; that test then passed on all three profiles. No ticker runtime logic changed. Astro checked 177 files with zero errors/warnings/hints, and focused ESLint passed.

Eight affected desktop/mobile visual scenarios were refreshed, with the desktop/mobile hero and mobile footer inspected against the selected appearance. The local prototype package verified 71 HTML pages / 961 files and 211 root/legacy routes. Post-build comparison checks confirmed both versions load, Tall is active and the selector is absent; see `captures/ticker-tall-final-comparison.png`. All 1,110 captured original files remain intact. No publication or external service change was made.

## Comment closure audit — 16 October 2026

Re-extracted all 14 comments and Oliver Hamilton's author record from the supplied PPTX. All six note parts are empty. Checked the original requests and three chat follow-ups against the current source, review decisions and screenshot evidence. The [current register](README.md#comment-audit--16-october-2026) now distinguishes implemented responses from final acceptance, deliberately deferred Contact content, provisional BTS imagery and unfinished launch execution.

Fresh command: `./node_modules/.bin/playwright test tests/e2e/review.spec.ts --project=desktop-chromium --project=mobile-chromium --workers=1` with Node 22. Result: 25 passed, one intentional touch-hover skip. All 1,110 original baseline files match. No website source or production content changed for this audit.

Read-only GitHub CLI confirmed no Pages custom domain (`cname: null`) and the existing GitHub repository URL. Public DNS still returns the recorded website A records and Squarespace www CNAME; apex MX returned no answer. This does not verify DNS-account access or mailbox ownership. Production Sanity content was not re-audited. The existing site workflow still builds the older versioned package; the prepared root workflow only creates an artifact. Domain setup and publisher promotion remain open launch work.

## Production preparation and CMS alignment — 16 October 2026

Ben requested the Oliver revision as the publishing source and updated Sanity editing controls, then explicitly retained Contact placeholders. `deploy-site.yml` now builds the revision from published Sanity content, verifies the root-domain package and tests desktop/mobile routes. It retains a recovery artifact and requires the intended Pages custom domain before public activation. The manual candidate workflow remains artifact-only. No Git commit/push, website deployment or DNS change was performed.

Studio schema, TypeGen, TypeScript, lint and build checks passed. The first sandboxed Studio build could not resolve Sanity's runtime CDN; the authorized network-enabled run passed. The updated Studio and 1/1 schemas deployed successfully to `https://new-work.sanity.studio/`.

The scoped migration passed its dry run, backed up the four settings documents privately, uploaded/reused three logo files, and applied revision-guarded changes atomically. It preserved Contact email/location/social fields exactly, stored the reviewed 16 gallery placements and retained 12 others in reserve. A repeat dry run reported the migration already applied and made no changes. No Project/ordinary Asset documents were edited or deleted. Full Sanity validation: **114 documents valid, zero errors**. Published graph audit: **17/17 Work documents public, 16 placements, zero public Notes**; 16 legacy Project rollback documents remain untouched.

Website verification: TypeScript/Astro **177 files, zero errors/warnings/hints**; full ESLint passed; **162 unit tests across 17 files and coverage gates passed**. Hosting packaging tests: **7 passed**. Review browser suite: **25 passed, one intentional touch-hover skip** on desktop/mobile Chromium. Production build: **93 HTML pages / 985 files**, followed by **553 root/legacy routes** checked with correct production metadata and 16 gallery tiles.

Visual inspection caught a real cross-origin issue: Sanity file SVGs returned HTTP 200 but could not render as CSS masks. CMS logos now use ordinary, proportioned image elements; no cross-origin mask permission is needed. The production browser gate checks actual image decode/natural dimensions and rejects CORS/CSP errors, not merely successful asset requests. All **16 production browser tests passed** after the fix, including all gallery links, navigation/Back, Contact, legacy prefixes, real 404s, CMS artwork and editable ticker data. Assertions allow later client changes to email, cities, wording and artwork.

Desktop/mobile production hero, footer and Contact captures are stored as `captures/cms-production-{desktop|mobile}-{hero|footer|contact}.png`. Corrected logo views were visually inspected; captures report no page errors or horizontal overflow. Production preview is port 4330; the prototype review stays on 4327 and live CMS development is 4329. `git diff --check` passed; all **1,110 original baseline files remain intact**, and the migration backup/release output are gitignored.

Remaining external setup: push the reviewed source/workflows, verify and attach the custom domain, complete DNS/HTTPS cutover, and create/test the automatic Sanity rebuild hook using a dedicated GitHub Actions token. No existing hook was found. The existing GitHub `SANITY_AUTH_TOKEN` is for Studio deployment only. Editorial BTS imagery and final project copy remain client decisions; Contact placeholders are expressly permitted. Updated operational and client guides distinguish these remaining steps from completed preparation.


## Existing-login webhook preparation — 16 October 2026

After Ben asked to use the existing connections, read-only checks confirmed the GitHub Keychain login and Sanity CLI session work. No dedicated automation token was discoverable in named project variables/files or GitHub repository/environment secret names. The GitHub login is a broad CLI OAuth credential, so it was not copied into Sanity.

The new `prepare-rebuild-hook.ts` passed Studio TypeScript and focused ESLint checks and a read-only dry run. An authorized apply created `Rebuild Oliver website` (`fKWccdydRTrBVsyj`) and read back its disabled state. The hook targets only the single site workflow, published website document types and `production`; draft/version events are excluded. Its Authorization header is intentionally absent until the dedicated token is located. No build was dispatched and no public website or DNS state changed. Earlier references to an empty hook list above record the state before this follow-up.


## Opening wordmark pair spacing — 16 October 2026

Ben noticed excess space between the w and o in the opening wordmark. Read-only extraction of the supplied logo PDF's page-5 paths confirmed the pair should advance 143.2617 PDF units (573 font units), versus the generic w advance of 659. A −.086em margin on the second-word w restores the exact supplied overlap while retaining its complete glyph box for independent hover video. The horizontal hero, footer and header SVGs already match their source artwork and are unchanged.

Measured w/o/r/k advances against the source at 320, 390, 768, 1440 and 1920px: all within .0015em, with no horizontal overflow. Desktop/phone captures were inspected (`captures/wordmark-spacing-1440.png` and `wordmark-spacing-390.png`). Existing hover tests passed 7 cases across desktop Chromium, desktop WebKit and mobile Chromium, with two intentional touch-hover exclusions. These cover all seven interactive letters, unchanged shared media, entry/return, reduced motion and Save-Data. Astro checked 177 files with zero errors/warnings/hints, and focused ESLint passed.

The production package was rebuilt and verified (93 HTML pages / 985 files; 553 root/legacy routes). Port 4330 serves the correction as well as the revision dev preview on 4327. All 1,110 baseline files remain unchanged. No CMS mutation, public deployment or DNS change was needed.

## Single shared splash/home wordmark — 16 October 2026

Ben's follow-up supersedes the pair-spacing patch above. The splash font renderer and separate home logo were replaced by one native SVG instance inside HomeIdentity. Both states consume the exact horizontal artwork paths; only whole-word placement changes. The shared media fill, individual hover media, hit areas and solid home title all derive from these paths. Unused LogoMaskExperience and legacy logo-intro motion implementations were removed. See BRAND.md for source geometry and the CMS replacement-image fallback.

Regression coverage now checks the same DOM element survives splash → home → splash, all eight paths equal the supplied SVG, intraword spacing is identical after rearrangement, every letter selects only its own media in both states, inactive videos pause, and reduced motion/Save-Data avoid video requests. Layout measures the unanimated reserved footprint to prevent the entrance skew from influencing final placement. A Safari placement failure during development prompted that correction; a later dev-server run was interrupted by rebuilding shared assets. Final browser verification therefore ran against the completed, stable production package.

Final validation: Astro **178 files, zero errors/warnings/hints**; full ESLint passed; **164 unit tests across 18 files passed**. The production splash/hover/navigation suite passed **39 tests**, with 12 documented device-specific exclusions, across desktop Chromium, mobile Chromium and desktop WebKit. The production CMS/routes suite passed **24 tests**. The broader prototype review checks also passed for gallery, ticker, Contact and browser Back. No failing check remains in the final production splash suite.

The final production package contains **93 HTML pages / 981 files**; verification passed **553 root/legacy routes**, production metadata and 16 gallery tiles. Port **4330** serves the rebuilt result; **4327** serves the same shared component in prototype mode. Desktop/mobile screenshots (`captures/unified-wordmark-{splash|home}-{1440|390}.png`) show one native artwork instance and no page errors. The live side-by-side comparison was checked and captured (`captures/unified-wordmark-comparison.png`). All **1,110 baseline files remain intact**. No CMS mutation, public deployment or DNS change was made for this fix.

## Stable mobile menu header — 16 October 2026

Ben reported the mobile header shuddering when Menu opens. Measurements at 390px identified two independent causes: the open panel replaced the 32px header mark with a 40px duplicate, while its hidden summary changed from “Menu” to “Close menu,” widening the control by roughly 42px and pushing the descriptor sideways.

The menu now keeps the original header, compact mark, descriptor and summary control visible throughout. Menu/Close labels share one intrinsic-width grid cell, the same icon rotates into a cross, and only the navigation panel and links animate. The duplicated menu logo/header/close button were removed. The dialog includes the existing toggle, retains keyboard focus trapping, restores scroll/focus without scrolling the toggle into view, supports reversing an exit animation, and releases the modal on navigation or desktop resize. Background splash gestures are suspended while the menu is open. A fast-keyboard race found during verification was fixed by focusing the already-visible toggle synchronously rather than on a later animation frame.

Final production-preview verification: **24 menu tests passed** across desktop Chromium, mobile Chromium and mobile WebKit. Frame-by-frame checks at **320, 390, 600 and 767px** require the same logo, descriptor and trigger nodes, no hidden frames and less than **0.5px** movement/size change throughout opening and closing. Tests also cover scroll restoration, Escape, keyboard focus wrapping, rapid reversal, desktop breakpoint changes, Work navigation, reduced motion, and an open-menu Axe scan with no serious/critical violations. **Three production CMS/artwork tests passed**, after making the existing Contact link check wait for non-empty reveal text; the other production route/navigation checks passed in the preceding run.

Astro checked **179 files with zero errors/warnings/hints**; full ESLint passed; **164 unit tests passed**. Final root packaging verified **93 HTML pages / 981 files**, **553 root/legacy routes** and 16 gallery tiles. Port **4330** serves the rebuilt production preview and **4327** the revised development app. Open/closed mobile captures and the live baseline comparison were visually inspected (`captures/mobile-menu-stable-{closed|open}.png`, `captures/mobile-menu-comparison.png`). All **1,110 baseline files remain intact**. No production CMS, DNS or public deployment changes were made.

## Gallery top-edge clipping — 16 October 2026

Ben reported clipped gallery tops. The gallery container retained `overflow: clip` on both axes while its scroll-momentum animation moved cards up to 100px above the container's layout edge. Measurements reproduced an 82.6px cut on the first lane during upward scrolling; settled Work-anchor positioning was correct. The Oliver override now clips only horizontal overflow and permits vertical overflow, preserving the existing motion and complete image edges without changing card sizes or anchor placement.

A new browser regression samples first-row top-edge hit tests throughout upward momentum at 1440, 768 and 390px. It first failed against the previous production build with 72 clipped-edge samples. After rebuilding, **all 16 targeted tests passed** across desktop/mobile Chromium and desktop/mobile WebKit, covering motion paint, no horizontal overflow, 16-tile/four-lane layout, Work navigation and browser Back. One initial WebKit run timed out waiting for unrelated page media to finish loading; the helper now waits for DOM readiness and the explicit gallery handoff state, and the complete rerun passed. Focused ESLint and whitespace checks passed.

Production preview **4330** includes the correction: **93 HTML pages / 981 files**, with **553 root/legacy routes** verified. Desktop/mobile anchor and motion captures plus the comparison were visually checked (`captures/gallery-unclipped-{anchor|motion}-{1440|390}.png`, `captures/gallery-unclipped-comparison.png`). All **1,110 original baseline files remain unchanged**. This update is local; no CMS, DNS or public deployment changes were made.


## Pre-launch desktop/mobile layout audit — 16 October 2026

Ben requested a broader clipping/layout audit after the gallery top-edge correction. Reviewed the production preview, including all 17 project pages, home/gallery, Contact and the branded 404 at 320, 390, 768, 1024, 1440 and 1920px. The automated scan covered **120 route/width combinations**; visual captures also covered a short 844×390 landscape viewport, phone menus, BTS, footer, related projects and the shared opening wordmark. Motion was checked separately from reduced-motion resting layouts.

Confirmed and fixed six related defects in the Oliver app only:

- At 320/390px, upward-moving gallery cards intersected the docked ticker. Compact home layouts now reserve space for the existing 100px momentum limit.
- The last gallery row could overlap the reel by roughly 57px during downward scrolling. The grid now reserves sufficient bottom clearance; reduced-motion layouts retain their static spacing.
- Lateral pointer movement pushed the first card about 5px beyond the desktop viewport. A CSS clamp limits the displayed offset to the existing gutters, retaining 4px of edge clearance without adding animation work in JavaScript.
- The Photography project title lost glyph pixels at the reveal-mask edge on narrow and wide displays. Titles now size against their actual column, keep ink overhangs inside an expanded reveal window, and wrap exceptionally long future words rather than clipping them. Pixel comparisons verify that removing the mask reveals no additional resting glyph ink.
- On direct project loads, Astro emitted the project stylesheet before the global stylesheet, establishing the component cascade layer ahead of reset/base. This made the All work button black-on-black on light pages. Both stylesheet entry points now declare the same layer ordering before their rules. Direct visits and ClientRouter navigation preserve readable button text.
- CMS image logos were forced black on dark project pages. They now invert with the page theme, matching the existing inline SVG behavior in header and footer.

Final verification: **86 applicable production browser checks passed**, with four documented touch/device exclusions: 21 new layout regressions, 14 existing project geometry/scroll-reveal cases, 24 production route/CMS cases, and 27 menu/shared-wordmark/accessibility cases. These cover Chromium and WebKit, desktop and mobile. Axe reported no serious/critical violations on the audited home/gallery, Contact and project routes. The 120-layout scan found no horizontal document overflow or clipped ordinary text after the changes. The new tests additionally verify complete decorative title ink and actual frame-by-frame gallery collisions, which the ordinary-text scan alone does not detect.

During exploratory production runs, the fixture-specific Olympics test expected the prototype's standard title treatment rather than the CMS's stacked treatment, and two no-JavaScript tests expected a prototype-only embedded-film block. These assertions were not weakened: the punctuation test and both embedded-film fallback tests passed against prototype 4327. Separate JavaScript-disabled Chromium/WebKit production checks passed for the gallery, decoded hero poster, readable return button, ordinary return navigation and horizontal containment.

Astro checked **180 files with zero errors/warnings/hints**; full ESLint plus focused post-edit ESLint passed; **164 unit tests passed**. Production packaging contains **93 HTML pages / 981 files**; **553 root/legacy routes** were verified. The preview at **4330** is rebuilt and development **4327** has the same fixes. Reviewed captures are saved as `captures/layout-audit-*.png`, including the final side-by-side comparison. All **1,110 original baseline files remain unchanged**, and whitespace checks passed. No source was committed/pushed, and no CMS, DNS or public deployment changes were made. Existing external launch setup remains as recorded in DEPLOYMENT.md.

## Footer board alignment — 16 October 2026

Ben requested the train board to the right of the footer logo, flush with its bottom edge. The signature now uses a single non-wrapping flex row with bottom alignment. The logo scales within the available column while the board retains readable cells; at 320px the logo is approximately 120px wide and the board 162px wide. This only changes the Oliver footer layout.

Verified **24 production layouts** in Chromium and WebKit across 320, 390, 768, 1024, 1440 and 1920px on Contact and a dark project page. All measured bottom edges match within 1px, the board remains beside the logo and inside its column, and no horizontal document overflow occurs. Visually inspected desktop/phone captures and both versions in the comparison (`captures/footer-aligned-*.png`). Production preview **4330** was rebuilt: **93 HTML pages / 981 files**, with **553 root/legacy routes** verified. All **1,110 baseline files remain intact**. No CMS or public deployment changes were made.


## Client handoff release — 16 October 2026

Ben authorized completing the CMS, committing all project changes and publishing to the existing GitHub Pages review address. The root-domain profile remains separate and DNS is unchanged. The review profile builds published CMS content at `/newwork`, retains noindex, and redirects previous V1/V2 bookmarks. A single publisher checks published CMS revisions every 15 minutes, skipping unchanged content; it does not require the previously missing webhook token. GitHub scheduling delays and inactivity limits are documented in DEPLOYMENT.md.

Studio now uses the supplied horizontal/compact artwork, custom light/dark theme, branded icons, an Overview dashboard with real content counts, direct editing links and plain publishing guidance. The status panel checks public release metadata. Obsolete About navigation creation is removed; a scoped, revision-guarded cleanup script removes only an already-hidden stored About link after checking drafts and saving a private backup. Contact placeholders remain editable and permitted.

Local release checks: Studio schema, TypeGen, typecheck, ESLint and build passed. Authenticated Chromium checks opened the Overview and all four settings editors, decoded the brand image, found no page errors and confirmed mobile containment. All **114 production documents** passed error-level validation. Website Astro check and ESLint passed; **174 unit tests** passed with statement/branch/function/line coverage **69.94% / 65.27% / 81.39% / 75.03%**, above existing thresholds. The previously uncovered gallery selection, BTS ordering, media rendition and preference fallback contracts now have meaningful coverage; no thresholds were lowered.

**10 publishing/packaging tests** passed. The review package verified **277 primary/legacy HTML routes**, 16 gallery tiles and base-contained local assets. **10 desktop/mobile production browser checks** passed for navigation, CMS artwork, Contact, noindex, 404 and V1/V2 bookmarks. Authenticated Studio captures are `captures/studio-overview-{desktop|mobile}.png`. All **1,110 baseline files** remain unchanged. Final deployment verification must match the pushed SHA, then compare live release metadata and authenticated hosted Studio; a local build alone is not release evidence.

Final publication evidence: the first website release and the CMS-change rebuild both deployed successfully. The final website release at commit `e33dd7b6e937e4604770f33d3dcda74c88ce5901` matches the current published-content fingerprint. Live checks passed at 1440px Chromium, 390px Chromium and 390px WebKit: gallery, all 16 destinations, project return, Contact/footer bottom alignment, old bookmarks, real 404 responses and no page/asset errors. An unchanged-content dispatch succeeded with build and deploy both skipped; the scheduled workflow is active. All 114 CMS documents remained valid after the backed-up hidden About-link cleanup.

Studio CI initially lacked dependencies for the cross-workspace gallery maintenance script. Installing the active website workspace fixed that failure, and Studio/schema deployment succeeded. The final dashboard also uses Sanity StateLink navigation and inline vector artwork so it is portable into Sanity's hosted workspace. The complete Studio gate and authenticated production-bundle browser checks passed, including a real dashboard shortcut, all four settings editors, live release status and mobile containment. The hosted address redirects through Sanity's account workspace/login; CLI tokens do not establish that account-login browser session. Hosted deployment/static assets were verified; authenticated app interaction was verified against the same production bundle locally. Oliver and Michael must accept their existing invitations to enter the hosted editor.


## Splash ticker visibility — 16 October 2026

The initial homepage board had no server-rendered hidden state, and its cleanup made it visible again. Both paths now remain hidden. A CSS gate excludes home and footer boards until the shared wordmark reports home/settled and the page handoff is active. It uses display rather than a visibility transition so the global reduced-motion duration cannot expose a frame during splash return. No extra animation loop or observer is added. Static boards remain available without JavaScript.

All **12 new browser regressions** passed across desktop/mobile Chromium and WebKit: delayed first-load scripts, normal/reduced motion, reload, splash entry and return, and frame-by-frame checks for either board appearing too early. Existing ticker floating/hover/focus, one-line styling, shared-wordmark and no-JavaScript cases passed. The clock test exposed its pre-existing race between its scroll-to-top and the Work hash's deferred gallery scroll; it now enters through the splash at the dock. All four desktop/mobile clock cases passed with the same message/time assertions. Combined relevant coverage: **30 passed**, with two intentional touch exclusions for mouse hover.

Astro check: **182 files, zero errors/warnings/hints**. ESLint and **174 unit tests** passed. The production CMS preview at port 4330 was rebuilt and validated: **93 HTML pages / 981 files**, **553 primary/legacy routes**. All **12 splash regressions** also passed against that production CMS package. The side-by-side splash was visually reviewed (`captures/ticker-splash-comparison.png`); all **1,110 preserved baseline files** remain intact. No CMS content, Studio, DNS or original-site source changes are part of this fix.


## Inline footer copyright — 16 October 2026

C10 follow-up: copyright now shares the information row beside Featured, occupying the rightmost column. The obsolete separate bottom row and its margin are removed. At tablet/phone widths the signature spans the first row and the directory/copyright share the second; phone project links use one column. The existing logo/train-board bottom alignment is preserved.

Checked **24 layouts on the prototype and 24 on the production CMS preview**, using Chromium/WebKit, Contact and a dark project page, at 320, 390, 768, 1024, 1440 and 1920px. Copyright and directory top edges align within 1px, their columns do not overlap, the logo/board bottom edges remain aligned within 1px, and there is no horizontal overflow. Inspected desktop/mobile captures and the comparison (`captures/footer-inline-copyright-*.png`). ESLint, diff checks, the 93-page/981-file production build and all 553 packaged routes passed. All 1,110 original baseline files remain intact. This is an Oliver stylesheet change; no CMS, Studio or DNS edits.


## BTS small caption removal — 16 October 2026

Removed “A closer look” from the Oliver frontend defaults and the Studio/migration defaults. A dry run found exactly one matching published field (`workPage.btsSubtitle`) and no matching draft; the scoped mutation backed up the document privately, required its current revision and unset only that field. A follow-up query confirmed no matching caption remains.

Studio deploy checks passed: schema validation, regenerated schema/query types (no generated diff), typecheck, lint and build. Website Astro check reported 182 files with zero errors/warnings/hints; ESLint and all 174 existing unit tests passed. Rebuilt the CMS preview at port 4330: 93 HTML pages, 981 files and 553 primary/legacy routes verified. Desktop/mobile browser checks against both prototype and CMS previews confirmed no small-caption element or matching text, with the heading and mosaic retained and no horizontal overflow. The original 1,110-file baseline remains intact.

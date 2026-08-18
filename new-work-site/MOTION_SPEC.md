# New Work motion specification

This document defines the shipped motion language for New Work. It is subordinate to `PRODUCT_SPEC.md`: motion supports the work, keeps native scrolling, and becomes static when a visitor requests reduced motion or reduced data.

## Character

The motion system behaves like a kinetic advertising contact sheet: direct, typographic, clipped, and responsive to input. It uses one consistent ease, short interface timings, restrained media travel, and decisive masks. It does not use scroll hijacking, perpetual parallax, rounded UI, gradients, glass, decorative WebGL, or animation that delays access to content.

## Runtime architecture

- `src/components/MotionRuntime.astro` installs the browser runtime once.
- `src/lib/motion/client.ts` is the public browser entry point.
- `src/lib/motion/lifecycle.ts` owns the lightweight Astro lifecycle, static fallbacks, preference observers, and route-generation guard.
- `src/lib/motion/route-runtime.ts` is dynamically imported only when the active route has a declarative motion hook and motion is allowed. It initializes one GSAP context and reverts it on `astro:before-swap`.
- `src/lib/motion/vendor.ts` is the only GSAP registration seam. It registers GSAP, ScrollTrigger, Flip, SplitText, and CustomEase.
- `src/lib/motion/effects.ts` owns declarative reveal, line/word split, small parallax, and bounded column effects.
- `src/lib/motion/gallery.ts` owns the fine-pointer gallery-plane response.
- `src/lib/motion/cursor-label.ts` owns the desktop card label and local media movement.
- `src/lib/motion/media-controller.ts` pauses and releases controlled media during route changes, visibility changes, and preference changes.
- `src/lib/motion/transitions.ts` creates stable, sanitized shared-transition names.

Every route initializer returns a cleanup function. Route cleanup runs before DOM replacement, removes listeners and observers, kills owned tweens/ScrollTriggers, reverts SplitText, clears temporary styles, and pauses media. New motion must use `registerRouteMotion()` or a declarative hook; it must not create an untracked global listener.

Routes without motion hooks remain on the lightweight lifecycle, and reduced-motion sessions use the static fallback without requesting the GSAP/plugin chunk. Dynamic-import generations are invalidated before swaps so a delayed chunk cannot initialize against detached route markup.

## Declarative hooks

| Hook | Behavior |
|---|---|
| `data-motion-reveal="fade\|up\|clip"` | One-time viewport reveal using opacity, translate, or a shallow inset mask. |
| `data-motion-delay="0.18"` | Optional delay, capped by the runtime. |
| `data-motion-split="lines\|words\|write-lines\|scroll-letters"` | Accessible SplitText treatment with responsive re-splitting and automatic revert. `scroll-letters` maps the count of visible characters directly to ScrollTrigger progress and reverses when the visitor scrolls upward. |
| `data-motion-parallax="4"` | ScrollTrigger media travel in percent, clamped to ±8. |
| `data-motion-column` | Marks a gallery card for lane-level first-order scroll filtering. Desktop uses its editorial `data-desktop-column`; tablet uses `data-tablet-column`; mobile applies no column transform. |
| `data-motion-column-response="0.095"` | Exposes the track's documented response coefficient for inspection. Runtime coefficients are the fixed left-to-right set `0.095`, `0.075`, `0.125`, `0.110`. |
| `data-cursor-label="View film"` | Fine-pointer cursor label; every image-only card retains a permanent programmatic project name. |
| `data-card-media` | Local pointer crop movement, capped at ±5px. |

The first project-media wrapper is reserved for Astro's shared view transition and must not receive a competing GSAP transform. Inner media may animate after the shared element settles.

## Opening composition

The first-session title stage is declared in `LogoIntro.astro`; its media-through-type sequence is isolated in the lazily imported `src/lib/motion/logo-intro.ts`. The owner-supplied `new-work-title-letter-kit` is active at 96% of the available measure on one uncropped line in normal page flow above the gallery, so it is slightly smaller and never blocks navigation or scrolling. Stage geometry is read from the active kit manifest rather than hard-coded. The sentence-clean and legacy uppercase kits remain named rollback options in the same component and use the identical animation contract. The accessible, static descriptor `film + photo production agency` sits directly below the decorative mask in small interface type. The title sequence:

1. composes up to eight real gallery posters into four masked media cells;
2. attaches at most one muted preview source inside the block-letter mask;
3. reveals the title laterally and flips selected cells on independent axes;
4. desaturates the collage before fading it away at five seconds;
5. reveals and retains the identical title mask in solid black.

Mobile uses two visible cells inside the same responsive single-line mask. A completed animation runs once per session; its versioned completion marker is committed only after the five-second sequence reaches the solid title. If navigation, a route swap, or a development refresh interrupts the sequence, its timeline/media are cancelled without recording a false completion, so the next Home visit retries the full animation. Returning after completion, reduced-motion, Save-Data, and no-JavaScript sessions receive the solid black resting state immediately. Final SVG artwork and licensed fonts can replace the present mask source without changing the session or lifecycle controller.

## Gallery behavior

- Desktop is four equal primary tracks, tablet is two, and mobile is one. The desktop plane deliberately bleeds beyond the gallery and clips both outer tracks without creating document-level overflow.
- The gallery composition rises into the title stage with irregular track starts and endings. Lane one remains lower than lane two, while the four-track silhouette retains the uneven editorial contact-sheet rhythm. The gallery has no visible section label, divider, or index counter.
- Source and keyboard order remain `homeOrder`; JavaScript enhances the CSS grid into a packed editorial grid without reordering DOM nodes.
- Explicit `homeColumn`, `homeOffset`, `homeCardSize`, and `homeTreatment` values tune composition. The rendered card offset is capped at 12px and the masonry rhythm at 8px so art direction cannot open holes inside the near-tessellated contact sheet; safe defaults remain useful when fields are absent.
- Fine-pointer horizontal response is capped at 36px and constrained by the gallery's clipped viewport.
- Every track reads the same raw `window.scrollY` target and covers the same underlying document distance. One delta-time-compensated first-order filter per track uses coefficients `0.095`, `0.075`, `0.125`, and `0.110`; both the filter's internal backlog and the rendered `target - filtered` lag are bounded to ±100px. Bounding the state itself prevents a fast wheel/trackpad burst from storing an invisible distance behind a saturated transform and releasing it as a second push after input stops. Faster tracks move farther in the opening frames, heavier tracks coast for several additional frames after input stops, and all filters converge monotonically to zero without bounce or overshoot. There are no per-track distance multipliers, starts/ends, delays, CSS transform transitions, GSAP scrub smoothing, springs, or global smooth scrolling. `/?motionDebug=1` shows target, filtered value, lag, and response per active track.
- Card media scales to 1.018 (never above 1.02) and local crop movement is capped at 5px.
- Muted motion previews start automatically at 70% visibility, pause and detach below that threshold, and never depend on hover.
- Desktop cursor labels and title-on-hover/focus overlays are additional feedback, never the only programmatic project identity.
- Mobile is an image-only one-column stack with accessible link names, no custom cursor, no hover dependency, no masonry scripting, and at most one active preview.

## Route and media transitions

Astro ClientRouter provides route navigation and a 160ms root fallback. Project cards and the destination's first media wrapper share `project-{slug}-media`. The header wordmark persists between routes. Unsupported browsers receive a normal navigation/fade, and reduced-motion mode receives an immediate swap.

Home scroll origin is stored when a card opens. That exact origin is authoritative on browser Back, with native history restoration disabled for the captured project hop so WebKit cannot overwrite the app's saved position. Preview sources remain poster-first and are detached or paused when their controller is disposed; a source is never attached to every card at page load.

## Project templates

- `cinematic`: compact/sticky context with a dominant film opening and supporting editorial stills.
- `photoEssay`: asymmetric width, alignment, pairing, and negative-space rhythm.
- `campaign`: campaign header, deliverable rail, and mixed modular media.
- `experimental`: explicit opt-in accent, title composition, and controlled geometric masks.

All four use the same safe content-block renderers. Missing content is omitted rather than replaced with an empty visual panel. `docs/PRESENTATION_MODEL.md` documents editable fields and defaults.

## Accessibility and performance contract

- `prefers-reduced-motion: reduce` removes transforms, split animations, preview autoplay, shared-image animation, pointer response, and parallax.
- Save-Data leaves previews poster-only, skips the GSAP route payload, and applies the complete static motion fallback.
- Touch and keyboard users always receive visible project identity and standard semantic links.
- Animation uses transforms, opacity, and clipping; images retain intrinsic dimensions and below-fold media stays lazy.
- Two preview videos may play on desktop and one on mobile. All are muted and pause offscreen.
- The HTML and CSS fallback remains complete with JavaScript disabled.

## Designer handoff

Brand color/type/time tokens live in `src/styles/brand.css`; motion constants live in `src/lib/motion/tokens.ts`. Replace the fallback wordmark through `Wordmark.astro` and supplied CMS brand assets. Licensed fonts should keep the existing family token names. Change timing, easing, limits, or reveal behavior centrally—never in individual project records or ad hoc page scripts.

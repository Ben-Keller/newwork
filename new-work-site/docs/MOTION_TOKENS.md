# Design and motion tokens

The CSS and TypeScript token layers intentionally mirror one another.

## Timing and easing

| Purpose | CSS | TypeScript | Value |
|---|---|---|---|
| Fast feedback | `--duration-fast` | `MOTION_DURATION.fast` | 160ms |
| Interface settle | `--duration-ui` | `MOTION_DURATION.ui` | 240ms |
| Viewport reveal | `--duration-reveal` | `MOTION_DURATION.reveal` | 560ms |
| Route fallback | — | `MOTION_DURATION.route` | 160ms |
| Editorial ease | `--ease-out` | `MOTION_EASE.customOut` | `cubic-bezier(.22, 1, .36, 1)` |

The first-session title stage uses the same custom ease across a five-second, non-blocking media-mask sequence. At its cap the media layer is detached and the identical solid black name remains; reduced-motion and Save-Data skip directly to that resting state.

## Motion limits

| Property | Limit |
|---|---|
| Card scale | 1.02 maximum; shipped value 1.018 |
| Card-local media response | ±5px |
| Column lag compensation | ±100px |
| Column response | `0.095`, `0.075`, `0.125`, `0.110` left to right; delta-time compensated first-order filtering |
| Internal media parallax | ±8% |
| Declarative delay | 0.8s maximum |

These are guardrails, not targets. Lower values are preferred when the media or composition is already visually active.

The work-index tracks read the same raw `window.scrollY` target. Each track filters that value once, then applies only the bounded difference between raw and filtered scroll as a temporary compensation transform. Open `/?motionDebug=1` during local review to display each track's target, filtered value, lag offset, and response coefficient; the panel is not created on ordinary routes.

## Presentation tokens

`src/styles/brand.css` owns the warm-white canvas, project gray, ink, muted ink, rules, focus color, font seams, safe-area gutter, and responsive type scales. `src/styles/project-templates.css` maps the project presentation fields onto local `--project-*` variables. `accentColor` accepts only a sanitized six-digit hex value.

## Replacement rules

1. Keep font and wordmark replacements behind the existing token/component seams.
2. Keep motion values in `src/lib/motion/tokens.ts` and their CSS mirrors; do not embed bespoke eases in project content.
3. Test 320, 390, 1024, and 1440 widths after any metric or timing change.
4. Re-run reduced-motion, keyboard, no-JavaScript, and visual regression checks after changing a motion token.

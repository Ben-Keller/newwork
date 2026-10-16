# About experience (archive)

The New Work About page: a scroll-driven WebGL film-reel narrative (three.js +
GSAP ScrollTrigger) with a complete no-WebGL / reduced-motion fallback. It was
taken off the site in review round 2 and kept here for deployment elsewhere.
Nothing in the live site imports this folder, and `/about` is no longer built.

| File | Role |
|---|---|
| `AboutPage.astro` | The page as it was routed at `/about` (move it into a `pages/` folder to route it again). |
| `AboutExperience.astro` | The experience: markup, fallback cards, copy slots, and the loader for the engine. |
| `about-experience.css` | All of its styles (imported by `AboutPage.astro`). |
| `lib/reel/engine.ts` | The WebGL reel: geometry, scroll timeline, asset streaming, lifecycle. |
| `lib/reel/shaders.ts` | Vertex/fragment shaders (the reel-warp unit test in `tests/unit` still covers these). |
| `lib/reel/reel-assets.ts` | The reel's media list and reduced-motion stills. |
| `tests/` | The page's archived Playwright specs and visual baselines (not run by this repo). |

## Deploying it elsewhere

- Dependencies: `three`, `gsap` (ScrollTrigger). The engine imports the site's
  GSAP registration from `src/lib/motion/client`; take that module along or
  register ScrollTrigger yourself.
- Shared site helpers it imports: `src/lib/responsive-images`, `src/lib/types`
  (`AboutPageView`), `src/lib/base-path`, `src/lib/content`, and
  `src/layouts/BaseLayout.astro`. Swap these for the new site's equivalents.
- Media: the reel atlas at `public/media/atlas-grid.webp` (optimised by
  `scripts/optimize-reel-atlas.mjs`) and the stills and clips listed in
  `lib/reel/reel-assets.ts`. They are still in this repo's `public/media`.
- Copy comes from the Sanity `aboutPage` settings, which remain in the
  dataset; the Studio schema was not changed.

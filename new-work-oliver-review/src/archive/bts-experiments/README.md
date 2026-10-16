# BTS experiments (archive)

Four interactive presentations for behind-the-scenes material, built for the
New Work home page in review round 2 and set aside for use on another site.
Nothing in the live site imports this folder.

View them in a local or preview build at `/archive/bts-experiments`. The
page is never generated in production builds.

| # | Experiment | What it does | Engine |
|---|---|---|---|
| 03 | Film reel | A continuous film strip bent round a helix. Scroll or drag winds it, hover lifts a frame, click opens it. | three.js |
| 04 | Video village | A monitor wall and vision mixer: pick a feed, then cut, auto or throw the T-bar (mix, wipe, dip). Tally lights, timecode, meters, auto-director. | DOM + CSS |
| 05 | Viewfinder | A cinema viewfinder: rack focus follows the cursor, focus peaking and a luma histogram come from the real pixels, aperture/zoom rings, iris shutter, contact roll. | DOM + canvas |
| 06 | Point cloud | Each photo as ~22k particles in relief (brightness is depth). The cursor parts them, drag turns the relief, frames blow apart and re-form. | three.js shaders |

## Using it elsewhere

1. Copy this folder. The only dependency outside it is `three` (for 03 and 06).
   It also expects a few CSS custom properties from the host site
   (`--page-gutter`, `--font-display`, `--font-body`, `--text-xs`,
   `--text-sm`, `--color-rule`, `--color-muted`, `--color-ink`,
   `--color-canvas`) and an `.sr-only` utility class; supply equivalents or
   replace them.
2. Build a list of `BtsItem` (see `types.ts`): image URLs at ~480px (`thumb`) and
   ~1200px (`large`), caption fields, and an optional muted `video`.
3. Render `<BtsExperiments items={items} />`, or a single experiment component
   and its mount function from `lib/` if only one is wanted. Each `mount*`
   function takes the experiment's root element and returns a cleanup function.

Every experiment honours `prefers-reduced-motion`, pauses when off screen,
and cleans up its listeners, animation frames and WebGL contexts on unmount.

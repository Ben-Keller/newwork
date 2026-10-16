# Logo source and placements

Oliver's chat image identifies the horizontal, stacked and compact arrangements. An existing supplied vector master was found at `/Users/ben/Downloads/_090326_new_work_logo (1).pdf`, page 5 (Logo 01 / headline).

Source SHA-256: `55733eb71f62f11be372a7ee3c9f6659e36b476b150c40a31feeb9eddebe35a1`.

Native filled vector paths were extracted from that PDF; the reference screenshot was not traced or cropped. Each SVG is under 4 KB and inherits its surrounding ink color.

| Asset in the revision's `public/media/brand/` | Placement | Path count |
|---|---|---|
| `oliver-horizontal.svg` | Shared splash/home wordmark (single instance) | 8 |
| `oliver-stacked.svg` | Footer signature | 8 |
| `oliver-compact.svg` | Header and mobile menu | 4 |

The compact selection is the supplied two-band n/w arrangement. The three-band N/W/A alternative is not used. This is a reviewable placement decision, not an assertion that Oliver explicitly selected one compact variant.

SVGs preserve the master's spacing, terminal period and proportions. No background, “Original” label, or PDF page furniture is included. Browser icons retain their existing artwork.

## One opening/home wordmark — 16 October 2026

Ben identified that the splash and home title had separate implementations: a font assembled from the PDF in the splash, and the exact SVG in the home title. The earlier −.086em w–o correction addressed one pair but left that underlying duplication. That font-based renderer and its spacing override have now been removed from the active title. Unused LogoMaskExperience and legacy logo-intro motion implementations were also removed from the revision.

`HomeIdentity.astro` contains one `LogoIntro.astro` instance. Its eight paths come directly from `oliver-horizontal.svg` through `src/lib/brand/wordmark-artwork.ts`; the same SVG node survives entry and return. The splash stacks the two words, with the supplied arrangement's small rightward offset on “work.” The home state places them horizontally at the source coordinates. Only whole-word translations change: every letter shape and every intraword spacing remains identical. `src/lib/brand/wordmark.ts` drives the arrangement and media from those same paths, including the hit targets. No browser font metrics, duplicated title, or separate kerning adjustment remains.

A single canvas overlays the artwork for the shared splash fill and the selected letter's media. Hover is individual in both states. Inactive videos pause, offscreen/hidden playback stops, and reduced-motion/Save-Data uses static letter images. Canvas resolution is bounded to a 4K pixel area and steady video painting is capped at 30 fps. The diagonal entrance, deliberate return gesture, ticker and gallery behavior remain in place.

The CMS horizontal wordmark feeds this same component. Its content-addressed URL identifies the exact approved SVG upload, allowing the matching local paths to render without a cross-origin mask request. If the client uploads different artwork, **one ordinary image** replaces the title in both states. Arbitrary replacement images have no individually addressable letters; enabling those effects for new artwork requires a new approved path map. The CMS never silently changes only the home title. Header/footer arrangements remain independently editable as before.

The old font-generation script is historical tooling for legacy branding components; it no longer supplies the splash/home title.

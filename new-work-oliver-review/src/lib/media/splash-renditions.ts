/**
 * Full-HD cuts of preview footage for the home splash.
 *
 * Gallery previews are encoded at 960px for their tiles. On the splash the
 * same clip fills the home title at several times that size, so where a
 * full-HD cut of the identical frames has been made from the source film it
 * is used there instead. Keys are the preview paths as they appear in content,
 * without the site base path.
 */
const SPLASH_RENDITIONS: Readonly<Record<string, { video: string; poster: string }>> = {
  // Same four 2-second samples as the gallery cut (48s, 72s, 120s, 156s of
  // the 1080p master), re-encoded from the master at 1920×1080.
  '/media/video-previews/oliver/mercury-helen-mayer/gallery-cut-08s.mp4': {
    video: '/media/video-previews/oliver/mercury-helen-mayer/splash-cut-08s.mp4',
    poster: '/media/video-previews/oliver/mercury-helen-mayer/splash-cut-08s-poster.webp',
  },
};

/**
 * Returns the splash rendition for a preview URL, keeping whatever base path
 * the preview URL already carries. Hosted (Sanity) media has no entry and
 * falls back to the preview itself.
 */
export const splashRendition = (
  previewSource: string | undefined,
): { video: string; poster: string } | undefined => {
  if (!previewSource) return undefined;
  const match = Object.entries(SPLASH_RENDITIONS)
    .find(([preview]) => previewSource.endsWith(preview));
  if (!match) return undefined;
  const [preview, rendition] = match;
  const base = previewSource.slice(0, previewSource.length - preview.length);
  return { video: `${base}${rendition.video}`, poster: `${base}${rendition.poster}` };
};

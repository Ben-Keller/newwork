const persistAttribute = 'data-astro-transition-persist';

export const supportsRouteMediaPersistence = (): boolean => (
  typeof document.startViewTransition === 'function'
);

export const routeMediaPersistKey = (slug: string): string => (
  `new-work-route-media-${slug}`
);

const sourceUrl = (video: HTMLVideoElement): string | undefined => {
  const value = video.currentSrc
    || video.getAttribute('src')
    || video.dataset.source
    || video.querySelector<HTMLSourceElement>('source')?.dataset.src
    || video.querySelector<HTMLSourceElement>('source')?.getAttribute('src');
  if (!value) return undefined;
  try {
    return new URL(value, window.location.href).href;
  } catch {
    return value;
  }
};

const copyResponsiveHints = (source: HTMLElement, target: HTMLElement): void => {
  const sourceImage = source.querySelector<HTMLImageElement>('img');
  const targetImage = target.querySelector<HTMLImageElement>('img');
  if (!sourceImage || !targetImage) return;

  const targetSizes = targetImage.getAttribute('sizes');
  if (targetSizes) sourceImage.setAttribute('sizes', targetSizes);
  const targetStyle = targetImage.getAttribute('style');
  if (targetStyle) sourceImage.setAttribute('style', targetStyle);
  sourceImage.loading = targetImage.loading;
  sourceImage.fetchPriority = targetImage.fetchPriority;
  [...sourceImage.attributes].forEach(({ name }) => {
    if (name.startsWith('data-') && name !== 'data-route-media-continuity') {
      sourceImage.removeAttribute(name);
    }
  });
  [...targetImage.attributes].forEach(({ name, value }) => {
    if (name.startsWith('data-')) sourceImage.setAttribute(name, value);
  });

  const targetSources = [...target.querySelectorAll<HTMLSourceElement>('source')];
  [...source.querySelectorAll<HTMLSourceElement>('source')].forEach((candidate, index) => {
    const targetSource = targetSources.find((item) => (
      item.media === candidate.media && item.type === candidate.type
    )) || targetSources[index];
    const sizes = targetSource?.getAttribute('sizes');
    if (sizes) candidate.setAttribute('sizes', sizes);
  });
};

export const persistResponsiveImage = (
  sourceScope: HTMLElement,
  targetScope: HTMLElement,
  slug: string,
): HTMLElement | undefined => {
  if (!supportsRouteMediaPersistence()) return undefined;
  const source = sourceScope.matches('.responsive-image')
    ? sourceScope
    : sourceScope.querySelector<HTMLElement>('.responsive-image');
  const target = targetScope.matches('.responsive-image')
    ? targetScope
    : targetScope.querySelector<HTMLElement>('.responsive-image');
  const sourceImage = source?.querySelector<HTMLImageElement>('img');
  const targetImage = target?.querySelector<HTMLImageElement>('img');
  if (!source || !target || !sourceImage || !targetImage) return undefined;
  if (sourceImage.getAttribute('src') !== targetImage.getAttribute('src')) return undefined;

  copyResponsiveHints(source, target);
  const key = routeMediaPersistKey(slug);
  source.setAttribute(persistAttribute, key);
  target.setAttribute(persistAttribute, key);
  source.dataset.routeMediaContinuity = slug;
  return source;
};

export const persistMatchingVideo = (
  source: HTMLVideoElement,
  target: HTMLVideoElement,
  slug: string,
): boolean => {
  if (!supportsRouteMediaPersistence()) return false;
  const outgoingSource = sourceUrl(source);
  const incomingSource = sourceUrl(target);
  if (!outgoingSource || !incomingSource || outgoingSource !== incomingSource) return false;

  const key = routeMediaPersistKey(`${slug}-video`);
  source.setAttribute(persistAttribute, key);
  target.setAttribute(persistAttribute, key);

  // The media resource itself stays attached. Only presentation semantics move
  // from the gallery preview to the hero (or back again), so currentTime and
  // the decoded frame are never reconstructed.
  const retainedSource = source.getAttribute('src');
  [...source.attributes].forEach(({ name }) => {
    if (
      name !== 'src'
      && name !== persistAttribute
      && name !== 'data-continuity-probe'
    ) source.removeAttribute(name);
  });
  [...target.attributes].forEach(({ name, value }) => {
    if (name !== 'src') source.setAttribute(name, value);
  });
  if (retainedSource) source.setAttribute('src', retainedSource);
  source.setAttribute(persistAttribute, key);
  source.dataset.routeMediaContinuity = slug;
  source.dataset.routeVideoPersisted = 'true';
  if (target.hasAttribute('data-preview-video')) {
    source.dataset.playing = 'true';
    // The gallery's normal visibility pool may recycle an entering preview on
    // its first refresh. Hold the same live node until scroll restoration and
    // the route transition have both settled, especially in WebKit.
    source.dataset.routeContinuityUntil = String(performance.now() + 1_800);
  }
  return true;
};

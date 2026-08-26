/* v8 ignore file -- route media persistence is exercised by Playwright. */

const persistAttribute = 'data-astro-transition-persist';
const snapshotDisabledAttribute = 'data-route-media-snapshot-disabled';
const routeMediaDuration = 900;

export const supportsRouteMediaPersistence = (): boolean => (
  Boolean(document.querySelector('meta[name="astro-view-transitions-enabled"]'))
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

type RouteMediaRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type RouteMediaHandoff = {
  rect: RouteMediaRect;
  backgroundColor: string;
  borderRadius: string;
  clipPath: string;
  objectFit?: string;
  objectPosition?: string;
  opacity?: string;
  visualTransform?: string;
};

const rectRecord = (rect: DOMRect): RouteMediaRect => ({
  left: rect.left,
  top: rect.top,
  width: rect.width,
  height: rect.height,
});

export const captureRouteMediaHandoff = (
  element: HTMLElement,
  frame: HTMLElement = element,
): RouteMediaHandoff | undefined => {
  const rect = frame.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return undefined;
  const frameStyles = getComputedStyle(frame);
  const visual = element.matches('img, video')
    ? element
    : element.querySelector<HTMLElement>('img, video');
  const visualStyles = visual ? getComputedStyle(visual) : undefined;
  const transformFrame = element.closest<HTMLElement>('[data-card-media]');
  return {
    rect: rectRecord(rect),
    backgroundColor: frameStyles.backgroundColor,
    borderRadius: frameStyles.borderRadius,
    clipPath: frameStyles.clipPath,
    objectFit: visualStyles?.objectFit === 'fill' ? 'cover' : visualStyles?.objectFit,
    objectPosition: visualStyles?.objectPosition,
    opacity: visualStyles?.opacity,
    visualTransform: transformFrame
      ? getComputedStyle(transformFrame).transform || 'none'
      : getComputedStyle(element).transform || 'none',
  };
};

const routeMediaSelectors = [
  '[data-project-grid] .project-card__media',
  '[data-project-hero-media]',
  '.related-projects__media',
].join(',');

export const disableRouteMediaSnapshots = (targetDocument: Document): void => {
  const elements = [
    targetDocument.documentElement,
    ...targetDocument.querySelectorAll<HTMLElement>(routeMediaSelectors),
  ];
  elements.forEach((element) => {
    if (!element.hasAttribute(snapshotDisabledAttribute)) {
      element.dataset.routeMediaSnapshotDisabled = element.style.viewTransitionName || 'unset';
    }
    element.style.viewTransitionName = 'none';
  });
};

export const restoreRouteMediaSnapshots = (targetDocument: Document = document): void => {
  targetDocument.querySelectorAll<HTMLElement>(`[${snapshotDisabledAttribute}]`).forEach((element) => {
    const previous = element.dataset.routeMediaSnapshotDisabled;
    if (previous && previous !== 'unset') element.style.viewTransitionName = previous;
    else element.style.removeProperty('view-transition-name');
    element.removeAttribute(snapshotDisabledAttribute);
  });
};

export const skipRouteSnapshotTransition = (event: Event): void => {
  const transition = (event as Event & { viewTransition?: ViewTransition }).viewTransition;
  try {
    // Native transitions reject `ready` when intentionally skipped. Consume
    // that expected abort before replacing the snapshot with our live-media
    // portal so it never surfaces as a page-level unhandled rejection.
    void transition?.ready.catch(() => undefined);
    void transition?.updateCallbackDone.catch(() => undefined);
    void transition?.finished.catch(() => undefined);
    transition?.skipTransition();
  } catch {
    // A superseding navigation may already have skipped this transition.
  }
};

export const routeVideoIsVisiblyPlaying = (video?: HTMLVideoElement | null): video is HTMLVideoElement => {
  if (!video || video.paused || video.ended || video.readyState < 2) return false;
  const styles = getComputedStyle(video);
  return styles.display !== 'none'
    && styles.visibility !== 'hidden'
    && Number.parseFloat(styles.opacity || '1') > .05;
};

const sampleCurve = (value: number, first: number, second: number): number => (
  ((1 - 3 * second + 3 * first) * value
    + (3 * second - 6 * first)) * value
    + 3 * first
) * value;

const sampleSlope = (value: number, first: number, second: number): number => (
  3 * (1 - 3 * second + 3 * first) * value * value
  + 2 * (3 * second - 6 * first) * value
  + 3 * first
);

const easeRouteMedia = (progress: number): number => {
  let parameter = progress;
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const slope = sampleSlope(parameter, .65, .35);
    if (Math.abs(slope) < .0001) break;
    parameter -= (sampleCurve(parameter, .65, .35) - progress) / slope;
    parameter = Math.min(1, Math.max(0, parameter));
  }
  return sampleCurve(parameter, 0, 1);
};

const restoreInlineStyle = (element: HTMLElement, value: string | null): void => {
  if (value === null) element.removeAttribute('style');
  else element.setAttribute('style', value);
};

export const animatePersistedRouteMedia = (
  element: HTMLElement,
  handoff: RouteMediaHandoff | undefined,
  slug: string,
  layer = 0,
): boolean => {
  if (!handoff || !element.isConnected) return false;
  const targetCardFrame = element.closest<HTMLElement>('.project-card__media');
  const targetGeometry = targetCardFrame || element;
  const targetRect = targetGeometry.getBoundingClientRect();
  if (targetRect.width <= 0 || targetRect.height <= 0) return false;

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    element.dataset.routeMediaHandoff = 'settled';
    return true;
  }

  const parent = element.parentNode;
  if (!parent) return false;
  const targetStyles = getComputedStyle(element);
  const targetElementRect = element.getBoundingClientRect();
  const targetTransformFrame = element.closest<HTMLElement>('[data-card-media]');
  const targetTransform = targetTransformFrame
    ? getComputedStyle(targetTransformFrame).transform || 'none'
    : targetStyles.transform || 'none';
  const targetVisual = element.matches('img, video')
    ? element
    : element.querySelector<HTMLElement>('img, video');
  const targetVisualStyles = targetVisual ? getComputedStyle(targetVisual) : undefined;
  const targetObjectFit = targetVisualStyles?.objectFit === 'fill'
    ? 'cover'
    : targetVisualStyles?.objectFit || 'cover';
  const targetObjectPosition = targetVisualStyles?.objectPosition || '50% 50%';
  const placeholder = document.createElement('span');
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.dataset.routeMediaTarget = slug;
  const absolutelyPositioned = targetStyles.position === 'absolute'
    || targetStyles.position === 'fixed';
  Object.assign(placeholder.style, {
    position: absolutelyPositioned ? 'absolute' : 'relative',
    display: 'block',
    width: absolutelyPositioned ? `${element.offsetWidth || targetElementRect.width}px` : '100%',
    height: `${element.offsetHeight || targetElementRect.height}px`,
    minWidth: '0',
    maxWidth: '100%',
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  if (absolutelyPositioned) {
    placeholder.style.left = `${element.offsetLeft}px`;
    placeholder.style.top = `${element.offsetTop}px`;
  }

  const elementInlineStyle = element.getAttribute('style');
  const styledDescendants = [...element.querySelectorAll<HTMLElement>('picture, img')]
    .map((candidate) => ({ candidate, style: candidate.getAttribute('style') }));
  element.replaceWith(placeholder);
  const liveTarget = targetCardFrame || placeholder;
  const portal = document.createElement('div');
  portal.setAttribute('aria-hidden', 'true');
  portal.dataset.routeMediaPortal = slug;
  Object.assign(portal.style, {
    position: 'fixed',
    zIndex: String(2_147_483_600 + layer),
    inset: 'auto',
    left: `${handoff.rect.left}px`,
    top: `${handoff.rect.top}px`,
    width: `${handoff.rect.width}px`,
    height: `${handoff.rect.height}px`,
    minWidth: '0',
    maxWidth: 'none',
    minHeight: '0',
    maxHeight: 'none',
    margin: '0',
    padding: '0',
    overflow: 'hidden',
    isolation: 'isolate',
    backgroundColor: handoff.backgroundColor,
    borderRadius: handoff.borderRadius,
    clipPath: handoff.clipPath,
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden',
    pointerEvents: 'none',
    contain: 'layout paint style',
    viewTransitionName: 'none',
    willChange: 'left, top, width, height',
  });
  document.body.append(portal);
  portal.append(element);

  element.dataset.routeMediaHandoff = 'animating';
  Object.assign(element.style, {
    position: 'absolute',
    zIndex: '1',
    inset: '0',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    minWidth: '0',
    maxWidth: 'none',
    minHeight: '0',
    maxHeight: 'none',
    margin: '0',
    padding: '0',
    overflow: 'visible',
    backgroundColor: 'transparent',
    borderRadius: '0',
    clipPath: 'none',
    transform: handoff.visualTransform || 'none',
    transformOrigin: 'center',
    pointerEvents: 'none',
    opacity: '1',
    transition: 'none',
    willChange: 'transform',
  });

  element.querySelectorAll<HTMLElement>('picture, img').forEach((candidate) => {
    Object.assign(candidate.style, {
      display: 'block',
      width: '100%',
      height: '100%',
      minWidth: '0',
      maxWidth: 'none',
      minHeight: '0',
      maxHeight: 'none',
    });
    if (candidate instanceof HTMLImageElement) {
      candidate.style.objectFit = handoff.objectFit || 'cover';
      candidate.style.objectPosition = handoff.objectPosition || '50% 50%';
      candidate.style.opacity = handoff.opacity || '1';
    }
  });
  if (element instanceof HTMLVideoElement) {
    element.style.objectFit = handoff.objectFit === 'fill' ? 'cover' : handoff.objectFit || 'cover';
    element.style.objectPosition = handoff.objectPosition || '50% 50%';
    element.style.opacity = '1';
  }

  const activeVisual = element.matches('img, video')
    ? element
    : element.querySelector<HTMLElement>('img, video');
  if (activeVisual) {
    activeVisual.style.objectFit = handoff.objectFit === 'fill'
      ? 'cover'
      : handoff.objectFit || 'cover';
    activeVisual.style.objectPosition = handoff.objectPosition || '50% 50%';
    activeVisual.style.opacity = '1';
    activeVisual.style.transition = 'none';
  }

  const presentationOptions: KeyframeAnimationOptions = {
    duration: routeMediaDuration,
    easing: 'cubic-bezier(.65, 0, .35, 1)',
    fill: 'forwards',
  };
  const transformAnimation = element.animate([
    { transform: handoff.visualTransform || 'none' },
    { transform: targetTransform },
  ], presentationOptions);
  const framingAnimation = activeVisual?.animate([
    {
      objectFit: handoff.objectFit === 'fill' ? 'cover' : handoff.objectFit || 'cover',
      objectPosition: handoff.objectPosition || '50% 50%',
    },
    { objectFit: targetObjectFit, objectPosition: targetObjectPosition },
  ], presentationOptions);

  let animationFrame = 0;
  let settledAt = 0;
  let cleaned = false;
  let detachNavigationGuards = (): void => undefined;
  const startedAt = performance.now();
  const applyRect = (progress: number): boolean => {
    if (!liveTarget.isConnected || !portal.isConnected || !element.isConnected) return false;
    const liveTargetRect = liveTarget.getBoundingClientRect();
    if (liveTargetRect.width <= 0 || liveTargetRect.height <= 0) return false;
    const interpolate = (start: number, end: number) => start + (end - start) * progress;
    portal.style.left = `${interpolate(handoff.rect.left, liveTargetRect.left)}px`;
    portal.style.top = `${interpolate(handoff.rect.top, liveTargetRect.top)}px`;
    portal.style.width = `${interpolate(handoff.rect.width, liveTargetRect.width)}px`;
    portal.style.height = `${interpolate(handoff.rect.height, liveTargetRect.height)}px`;
    return true;
  };
  const cleanup = (): void => {
    if (cleaned) return;
    cleaned = true;
    detachNavigationGuards();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    transformAnimation.cancel();
    framingAnimation?.cancel();
    if (placeholder.isConnected) placeholder.replaceWith(element);
    else element.remove();
    portal.remove();
    restoreInlineStyle(element, elementInlineStyle);
    styledDescendants.forEach(({ candidate, style }) => restoreInlineStyle(candidate, style));
    element.dataset.routeMediaHandoff = 'settled';
  };
  const onNavigationClick = (event: MouseEvent): void => {
    if ((event.target as Element | null)?.closest('a[href]')) cleanup();
  };
  const onPopState = (): void => cleanup();
  document.addEventListener('click', onNavigationClick, {capture: true});
  window.addEventListener('popstate', onPopState, {capture: true});
  detachNavigationGuards = () => {
    document.removeEventListener('click', onNavigationClick, {capture: true});
    window.removeEventListener('popstate', onPopState, {capture: true});
  };
  const trackDestination = (time: number): void => {
    const linearProgress = Math.min(1, Math.max(0, (time - startedAt) / routeMediaDuration));
    if (!applyRect(easeRouteMedia(linearProgress))) {
      cleanup();
      return;
    }
    if (linearProgress < 1) {
      animationFrame = requestAnimationFrame(trackDestination);
      return;
    }
    applyRect(1);
    if (!settledAt) settledAt = time;
    if (time - settledAt < 120) {
      animationFrame = requestAnimationFrame(trackDestination);
      return;
    }
    cleanup();
  };
  animationFrame = requestAnimationFrame(trackDestination);
  window.setTimeout(() => {
    if (element.dataset.routeMediaHandoff === 'animating') cleanup();
  }, 2_000);
  return true;
};

const copyResponsiveHints = (source: HTMLElement, target: HTMLElement): void => {
  const sourceImage = source.querySelector<HTMLImageElement>('img');
  const targetImage = target.querySelector<HTMLImageElement>('img');
  if (!sourceImage || !targetImage) return;

  // Preserve the already-painted <img> itself, but adopt the incoming page's
  // responsive candidates and semantics. Browsers retain the current decoded
  // bitmap while selecting the larger candidate, so a thumbnail-to-hero URL
  // change does not create an empty frame or require a reconstructed image.
  const targetAttributes = new Set([...targetImage.attributes].map(({ name }) => name));
  [...sourceImage.attributes].forEach(({ name }) => {
    if (!targetAttributes.has(name) && name !== 'data-route-media-continuity') {
      sourceImage.removeAttribute(name);
    }
  });
  [...targetImage.attributes].forEach(({ name, value }) => {
    sourceImage.setAttribute(name, value);
  });
  [...sourceImage.attributes].forEach(({ name }) => {
    if (name.startsWith('data-') && name !== 'data-route-media-continuity') {
      sourceImage.removeAttribute(name);
    }
  });
  [...targetImage.attributes].forEach(({ name, value }) => {
    if (name.startsWith('data-')) sourceImage.setAttribute(name, value);
  });

  const sourcePicture = sourceImage.closest('picture');
  const targetPicture = targetImage.closest('picture');
  if (sourcePicture && targetPicture) {
    sourcePicture.querySelectorAll('source').forEach((candidate) => candidate.remove());
    targetPicture.querySelectorAll('source').forEach((candidate) => {
      sourcePicture.insertBefore(candidate.cloneNode(true), sourceImage);
    });
  }
};

export const persistResponsiveImage = (
  sourceScope: HTMLElement,
  targetScope: HTMLElement,
  slug: string,
  swapEvent: RouteSwapEvent,
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
  if (typeof swapEvent.swap !== 'function') return undefined;

  const key = routeMediaPersistKey(`${slug}-image`);
  const originalSwap = swapEvent.swap;
  target.dataset.routeImagePersistTarget = key;
  source.dataset.routeMediaContinuity = slug;

  // Astro's normal persistence pass briefly nests the retained image in the
  // incoming layout before `astro:after-swap`. Transport the exact node around
  // that pass synchronously, just as we do for videos, so it is never painted
  // underneath the new page or reconstructed at a transient target size.
  swapEvent.swap = () => {
    if (!source.isConnected) {
      originalSwap();
      return;
    }
    source.removeAttribute(persistAttribute);
    document.documentElement.append(source);
    originalSwap();
    const liveTarget = document.querySelector<HTMLElement>(
      `[data-route-image-persist-target="${CSS.escape(key)}"]`,
    );
    if (!liveTarget) {
      document.body.append(source);
      return;
    }
    copyResponsiveHints(source, liveTarget);
    liveTarget.replaceWith(source);
    source.dataset.routeMediaContinuity = slug;
  };
  return source;
};

type RouteSwapEvent = Event & { swap?: () => void };

const applyVideoTargetSemantics = (
  source: HTMLVideoElement,
  target: HTMLVideoElement,
  slug: string,
  retainedSource: string | null,
  continuityProbe: string | null,
  wasPlaying: boolean,
): void => {
  [...source.attributes].forEach(({ name }) => {
    if (name !== 'src') source.removeAttribute(name);
  });
  [...target.attributes].forEach(({ name, value }) => {
    if (name !== 'src') source.setAttribute(name, value);
  });
  // Reassigning an unchanged `src` is enough to restart media selection in
  // WebKit and some Chromium builds. Keep the resource attribute untouched
  // when it already points at the live decoder we are transporting.
  if (retainedSource && source.getAttribute('src') !== retainedSource) {
    source.setAttribute('src', retainedSource);
  }
  if (continuityProbe) source.setAttribute('data-continuity-probe', continuityProbe);
  source.removeAttribute('data-route-video-persist-target');
  source.dataset.routeMediaContinuity = slug;
  source.dataset.routeVideoPersisted = 'true';
  source.dataset.routeMediaWasPlaying = wasPlaying ? 'true' : 'false';
  if (wasPlaying && target.hasAttribute('data-short-loop')) {
    source.dataset.mediaActive = 'true';
  }
  if (target.hasAttribute('data-preview-video')) {
    source.dataset.playing = 'true';
    // The gallery's normal visibility pool may recycle an entering preview on
    // its first refresh. Hold the same live node until scroll restoration and
    // the route transition have both settled, especially in WebKit.
    source.dataset.routeContinuityUntil = String(performance.now() + 1_800);
  }
};

export const persistMatchingVideo = (
  source: HTMLVideoElement,
  target: HTMLVideoElement,
  slug: string,
  swapEvent: RouteSwapEvent,
): boolean => {
  if (!supportsRouteMediaPersistence()) return false;
  const outgoingSource = sourceUrl(source);
  const incomingSource = sourceUrl(target);
  if (
    !outgoingSource
    || !incomingSource
    || outgoingSource !== incomingSource
    || typeof swapEvent.swap !== 'function'
  ) return false;

  const key = routeMediaPersistKey(`${slug}-video`);
  const retainedSource = source.getAttribute('src');
  const continuityProbe = source.getAttribute('data-continuity-probe');
  const wasPlaying = !source.paused && !source.ended;
  const originalSwap = swapEvent.swap;
  target.dataset.routeVideoPersistTarget = key;

  // Astro reconstructs every media element after its normal DOM persistence
  // pass. Move the live video outside the body for that one synchronous swap,
  // then insert the exact same node into the freshly rebuilt target.
  swapEvent.swap = () => {
    if (!source.isConnected) {
      originalSwap();
      return;
    }
    source.removeAttribute(persistAttribute);
    document.documentElement.append(source);
    originalSwap();
    const liveTarget = document.querySelector<HTMLVideoElement>(
      `[data-route-video-persist-target="${CSS.escape(key)}"]`,
    );
    if (!liveTarget) {
      document.body.append(source);
      return;
    }
    liveTarget.replaceWith(source);
    applyVideoTargetSemantics(
      source,
      liveTarget,
      slug,
      retainedSource,
      continuityProbe,
      wasPlaying,
    );
    if (wasPlaying && source.paused) void source.play().catch(() => undefined);
  };
  return true;
};

/* v8 ignore file -- the route coordinator is exercised by browser regression tests. */

import { navigate } from 'astro:transitions/client';
import {
  readStorageJson,
  removeStorageValue,
  writeStorageJson,
  writeStorageValue,
} from '../browser-storage';
import {
  cancelRouteVideo,
  captureRouteVideo,
  restoreRouteVideo,
} from './route-video-continuity';
import {
  animatePersistedRouteMedia,
  captureRouteMediaHandoff,
  disableRouteMediaSnapshots,
  persistMatchingVideo,
  persistResponsiveImage,
  restoreRouteMediaSnapshots,
  routeMediaPersistKey,
  routeVideoIsVisiblyPlaying,
  skipRouteSnapshotTransition,
  supportsRouteMediaPersistence,
  type RouteMediaAnimation,
  type RouteMediaHandoff,
  clearRouteMediaTransportStyles,
} from './route-media-persistence';

export interface WorkOrigin {
  slug?: string;
  scrollY?: number;
  historyIndex?: number;
}

type RouteDirection = 'to-project' | 'to-gallery';
type RoutePhase = 'prepared' | 'swapping' | 'settling';

type RouteSwapEvent = Event & {
  newDocument: Document;
  swap?: () => void;
  viewTransition?: ViewTransition;
};

type RoutePreparationEvent = Event & {
  from: URL;
  to: URL;
  navigationType: string;
  sourceElement?: Element;
  signal: AbortSignal;
};

interface RouteSession {
  id: number;
  direction: RouteDirection;
  phase: RoutePhase;
  slug?: string;
  origin: WorkOrigin;
  trigger?: HTMLAnchorElement;
  sourceMedia?: HTMLElement;
  sourceImage?: HTMLElement;
  sourceVideo?: HTMLVideoElement;
  handoff?: RouteMediaHandoff;
  persistedImage?: HTMLElement;
  persistedVideo: boolean;
  presentation?: RouteMediaAnimation;
  viewTransition?: ViewTransition;
  signal?: AbortSignal;
  detachAbort?: () => void;
  animateReturn?: boolean;
  releaseScrollLock?: () => void;
}

declare global {
  interface Window {
    __newWorkProjectRouter?: {
      dispose: () => void;
      version: number;
    };
    __newWorkPrepareGalleryReturn?: (origin: WorkOrigin) => void;
  }
}

const originStorageKey = 'new-work-origin';
const restoreRequestKey = 'new-work-restore-requested';
const persistedMediaAttribute = 'data-transition-persist-media';
const returnStyleAttribute = 'data-work-project-return-transition';
const sourceEmptyAttribute = 'data-route-media-source-empty';
const routerVersion = 7;
const projectLinkSelector = '[data-project-grid] :is([data-project-link], [data-gallery-link])';
const returnLinkSelector = '[data-project-overlay] [data-project-return]';
const galleryLayerSelector = '[data-route-gallery-layer]';
const galleryFlowHoldSelector = '[data-route-gallery-flow-hold]';
const galleryPersistAttribute = 'data-astro-transition-persist';

let sessionSequence = 0;
let activeSession: RouteSession | undefined;
let knownOrigin: WorkOrigin | undefined;
let pendingReturnTrigger: HTMLAnchorElement | undefined;

const readOrigin = (): WorkOrigin => {
  const value = readStorageJson('session', originStorageKey);
  if (!value || typeof value !== 'object') return {};
  const candidate = value as WorkOrigin;
  return {
    slug: typeof candidate.slug === 'string' ? candidate.slug : undefined,
    scrollY: typeof candidate.scrollY === 'number' ? candidate.scrollY : undefined,
    historyIndex: typeof candidate.historyIndex === 'number' ? candidate.historyIndex : undefined,
  };
};

const writeOrigin = (origin: WorkOrigin): void => {
  writeStorageJson('session', originStorageKey, origin);
};

const historyIndex = (): number | undefined => (
  typeof history.state?.index === 'number' ? history.state.index : undefined
);

const plainNavigation = (event: MouseEvent, link: HTMLAnchorElement): boolean => (
  !event.defaultPrevented
  && event.button === 0
  && !event.metaKey
  && !event.ctrlKey
  && !event.shiftKey
  && !event.altKey
  && link.target !== '_blank'
  && !link.hasAttribute('download')
);

const slugForLink = (link: HTMLAnchorElement): string | undefined => {
  const cardSlug = link.closest<HTMLElement>('[data-project-card]')?.dataset.galleryItemId;
  if (cardSlug) return cardSlug;
  if (link.dataset.projectSlug) return link.dataset.projectSlug;
  try {
    return new URL(link.href, window.location.href).pathname.split('/').filter(Boolean).at(-1);
  } catch {
    return undefined;
  }
};

const markGallerySettled = (
  targetDocument: Document,
  {preserveEntranceTransform = false}: {preserveEntranceTransform?: boolean} = {},
): void => {
  const gallery = targetDocument.querySelector<HTMLElement>('[data-work-gallery]');
  const entrance = gallery?.querySelector<HTMLElement>('[data-gallery-entrance]');
  if (gallery) {
    gallery.dataset.galleryRestore = 'true';
    gallery.dataset.galleryEntrancePlayed = 'true';
  }
  if (entrance) {
    entrance.dataset.galleryEntranceState = 'settled';
    if (!preserveEntranceTransform) {
      entrance.style.removeProperty('transform');
      entrance.style.removeProperty('will-change');
    }
  }
};

const liveGalleryLayer = (targetDocument: Document = document): HTMLElement | undefined => {
  const layer = targetDocument.querySelector<HTMLElement>(galleryLayerSelector);
  return layer?.querySelector('[data-work-gallery]') ? layer : undefined;
};

const removeGalleryFlowHold = (targetDocument: Document = document): void => {
  targetDocument.querySelectorAll<HTMLElement>(galleryFlowHoldSelector)
    .forEach((element) => element.remove());
};

const installGalleryFlowHold = (
  layer: HTMLElement,
  requestedHeight?: number,
): void => {
  removeGalleryFlowHold();
  const measuredHeight = requestedHeight || 0;
  const storedHeight = Number(layer.dataset.routeGalleryFlowHeight || 0);
  const height = measuredHeight > 0 ? measuredHeight : storedHeight;
  if (height <= 0) return;
  if (measuredHeight > 0) layer.dataset.routeGalleryFlowHeight = String(measuredHeight);
  const flowHold = document.createElement('div');
  flowHold.dataset.routeGalleryFlowHold = 'true';
  flowHold.setAttribute('aria-hidden', 'true');
  Object.assign(flowHold.style, {
    display: 'block',
    width: '100%',
    height: `${height}px`,
    minHeight: `${height}px`,
    visibility: 'hidden',
    pointerEvents: 'none',
  });
  layer.insertAdjacentElement('afterend', flowHold);
};

const retainGalleryLayer = (origin: WorkOrigin): void => {
  const layer = liveGalleryLayer();
  if (!layer) return;
  const scrollY = typeof origin.scrollY === 'number' ? origin.scrollY : window.scrollY;
  const layerRect = layer.getBoundingClientRect();
  const documentTop = layerRect.top + window.scrollY;
  installGalleryFlowHold(layer, layerRect.height);
  layer.dataset.galleryLayerState = 'background';
  // A fixed layer loses the normal-flow offset contributed by the site
  // header. Carry that document position into the fixed scene so every card
  // keeps the exact same viewport coordinate when the layer is later released.
  layer.style.setProperty('--route-gallery-offset', `${documentTop - scrollY}px`);
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  markGallerySettled(document, {preserveEntranceTransform: true});
};

const releaseGalleryLayer = (): void => {
  const layer = liveGalleryLayer();
  if (!layer) return;
  layer.removeAttribute('data-gallery-layer-state');
  layer.style.removeProperty('--route-gallery-offset');
  layer.removeAttribute('aria-hidden');
  layer.inert = false;
  delete layer.dataset.routeGalleryFlowHeight;
  document.querySelectorAll<HTMLElement>(`[${sourceEmptyAttribute}]`)
    .forEach((element) => element.removeAttribute(sourceEmptyAttribute));
  document.dispatchEvent(new Event('new-work:gallery-layer-released'));
};

const settleGallery = (origin: WorkOrigin): void => {
  // Rebuild masonry and establish the logical scroll while the retained
  // gallery is still a fixed, off-flow scene. Releasing it only after those
  // mutations makes the fixed-to-document handoff visually identical on the
  // next paint instead of exposing an intermediate top-of-page frame.
  window.__newWorkPrepareGalleryReturn?.(origin);
  markGallerySettled(document);
  if (typeof origin.scrollY === 'number') {
    window.scrollTo({ top: origin.scrollY, left: 0, behavior: 'auto' });
  }
  releaseGalleryLayer();
  removeGalleryFlowHold();
  if (typeof origin.scrollY === 'number') {
    window.scrollTo({ top: origin.scrollY, left: 0, behavior: 'auto' });
  }
};

const holdGalleryScroll = (routeSession: RouteSession): void => {
  const target = routeSession.origin.scrollY;
  if (typeof target !== 'number') return;
  let frame = 0;
  let active = true;
  const keepPosition = () => {
    if (!active) return;
    if (Math.abs(window.scrollY - target) > .5) {
      window.scrollTo({top: target, left: 0, behavior: 'auto'});
    }
    frame = window.requestAnimationFrame(keepPosition);
  };
  frame = window.requestAnimationFrame(keepPosition);
  routeSession.releaseScrollLock = () => {
    active = false;
    if (frame) window.cancelAnimationFrame(frame);
    routeSession.releaseScrollLock = undefined;
  };
};

const returnTransitionCss = `
  @media (prefers-reduced-motion: no-preference) {
    ::view-transition-group(root) {
      animation-duration: 320ms;
      animation-timing-function: cubic-bezier(.22, 1, .36, 1);
    }
    ::view-transition-old(root) {
      animation: new-work-gallery-return-out 220ms ease-in both;
    }
    ::view-transition-new(root) {
      animation: new-work-gallery-return-in 320ms cubic-bezier(.22, 1, .36, 1) both;
    }
    @keyframes new-work-gallery-return-out { to { opacity: 0; } }
    @keyframes new-work-gallery-return-in { from { opacity: 0; } }
  }
`;

const installReturnStyle = (targetDocument: Document): void => {
  targetDocument.head.querySelector(`[${returnStyleAttribute}]`)?.remove();
  const style = targetDocument.createElement('style');
  style.setAttribute(returnStyleAttribute, 'settled');
  // Retain the legacy diagnostic attribute while existing QA consumers move
  // to the centralized route marker.
  style.setAttribute('data-gallery-return-transition-style', 'settled');
  style.textContent = returnTransitionCss;
  targetDocument.head.append(style);
};

const restorePersistedVideo = (routeSession: RouteSession): void => {
  const { sourceVideo, slug } = routeSession;
  if (!sourceVideo || !slug) return;
  cancelRouteVideo(sourceVideo, slug);
  sourceVideo.dataset.routeVideoRestored = 'true';
  const resumePlayback = sourceVideo.dataset.routeMediaWasPlaying === 'true';
  sourceVideo.removeAttribute('data-route-media-was-playing');
  if (resumePlayback && sourceVideo.paused) void sourceVideo.play().catch(() => undefined);
};

const finishSession = (routeSession: RouteSession): void => {
  if (activeSession?.id !== routeSession.id) return;
  if (routeSession.phase === 'prepared' && routeSession.direction === 'to-project') {
    releaseGalleryLayer();
  }
  removeGalleryFlowHold();
  activeSession = undefined;
  routeSession.detachAbort?.();
  routeSession.releaseScrollLock?.();
  routeSession.presentation?.cancel();
  routeSession.sourceVideo?.removeAttribute(persistedMediaAttribute);
  if (routeSession.sourceVideo && routeSession.slug) {
    cancelRouteVideo(routeSession.sourceVideo, routeSession.slug);
  }
  routeSession.trigger?.removeAttribute('data-navigation-pending');
  pendingReturnTrigger?.removeAttribute('data-navigation-pending');
  pendingReturnTrigger = undefined;
  document.head.querySelector(`[${returnStyleAttribute}]`)?.remove();
  restoreRouteMediaSnapshots();
  document.querySelectorAll<HTMLElement>('[data-route-media-destination-empty]')
    .forEach((element) => element.removeAttribute('data-route-media-destination-empty'));
  delete document.documentElement.dataset.workProjectTransition;
  delete document.documentElement.dataset.workProjectMedia;
};

const bindAbort = (routeSession: RouteSession, signal?: AbortSignal): void => {
  if (!signal) return;
  const abort = () => finishSession(routeSession);
  routeSession.signal = signal;
  routeSession.detachAbort = () => signal.removeEventListener('abort', abort);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
};

const finishAfterPresentation = (routeSession: RouteSession): void => {
  if (routeSession.presentation) {
    void routeSession.presentation.finished.then(() => {
      if (routeSession.direction === 'to-gallery') settleGallery(routeSession.origin);
      routeSession.releaseScrollLock?.();
      finishSession(routeSession);
    });
    return;
  }
  const finished = routeSession.viewTransition?.finished;
  if (finished) {
    const resettleGallery = () => {
      if (
        routeSession.direction === 'to-gallery'
        && activeSession?.id === routeSession.id
      ) settleGallery(routeSession.origin);
    };
    const ready = routeSession.viewTransition?.ready;
    if (ready) void ready.then(resettleGallery, resettleGallery);
    void finished.catch(() => undefined).then(() => {
      resettleGallery();
      finishSession(routeSession);
    });
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => finishSession(routeSession)));
};

const beginProjectNavigation = (
  link: HTMLAnchorElement,
  preparation?: RoutePreparationEvent,
): RouteSession | undefined => {
  if (activeSession || link.dataset.navigationPending === 'true') return undefined;
  const slug = slugForLink(link);
  const sourceMedia = link.querySelector<HTMLElement>('.project-card__media') ?? undefined;
  const preview = sourceMedia?.querySelector<HTMLVideoElement>('[data-preview-video]');
  const sourceVideo = routeVideoIsVisiblyPlaying(preview) ? preview : undefined;
  // A video poster is only a loading surface, never the project medium. If the
  // preview is not ready to travel as a live node, use the normal page fade so
  // a poster cannot flash into a video-only destination and then disappear.
  const sourceImage = preview
    ? undefined
    : sourceMedia?.querySelector<HTMLElement>('.responsive-image') ?? undefined;
  const handoffElement = sourceVideo || sourceImage;
  const storedOrigin = readOrigin();
  const traversingToKnownProject = preparation?.navigationType === 'traverse'
    && storedOrigin.slug === slug;
  const origin: WorkOrigin = traversingToKnownProject
    ? storedOrigin
    : {
        slug,
        scrollY: window.scrollY,
        historyIndex: historyIndex(),
      };
  knownOrigin = origin;
  writeOrigin(origin);
  retainGalleryLayer(origin);
  history.scrollRestoration = 'manual';
  if (sourceVideo && slug) {
    sourceVideo.setAttribute(persistedMediaAttribute, '');
    sourceMedia?.setAttribute(sourceEmptyAttribute, 'true');
    captureRouteVideo(sourceVideo, slug);
  }

  const routeSession: RouteSession = {
    id: ++sessionSequence,
    direction: 'to-project',
    phase: 'prepared',
    slug,
    origin,
    trigger: link,
    sourceMedia,
    sourceImage,
    sourceVideo,
    handoff: handoffElement && sourceMedia
      ? captureRouteMediaHandoff(handoffElement, sourceMedia)
      : undefined,
    persistedVideo: false,
  };
  activeSession = routeSession;
  bindAbort(routeSession, preparation?.signal);
  link.dataset.navigationPending = 'true';
  document.documentElement.dataset.workProjectTransition = 'to-project';
  if (handoffElement && routeSession.handoff) {
    // Mark the old document before the browser can capture a root snapshot.
    // Live-media routes must never run the generic page fade underneath the
    // exact-node portal, otherwise the click frame can briefly double-flash.
    document.documentElement.dataset.workProjectMedia = 'live';
    disableRouteMediaSnapshots(document);
  }
  disableRouteMediaSnapshots(document, false);
  return routeSession;
};

const beginGalleryNavigation = (
  overlay: HTMLElement,
  trigger?: HTMLAnchorElement,
  signal?: AbortSignal,
  sourceElement?: Element,
): RouteSession | undefined => {
  if (activeSession) return activeSession.direction === 'to-gallery' ? activeSession : undefined;
  const slug = overlay.dataset.projectSlug;
  const storedOrigin = knownOrigin ?? readOrigin();
  const returnsToTop = Boolean(sourceElement?.closest('[data-work-navigation]'));
  const origin: WorkOrigin = storedOrigin.slug === slug
    ? {...storedOrigin, scrollY: returnsToTop ? 0 : storedOrigin.scrollY}
    : {slug, scrollY: 0};
  const sourceMedia = overlay.querySelector<HTMLElement>(
    '[data-project-hero-media][data-first-media="true"]',
  ) ?? undefined;
  const sourceVideo = sourceMedia?.querySelector<HTMLVideoElement>('video[data-short-loop]') ?? undefined;
  const sourceImage = sourceVideo
    ? undefined
    : sourceMedia?.querySelector<HTMLElement>('.responsive-image') ?? undefined;
  const handoffElement = sourceVideo || sourceImage;
  if (handoffElement) clearRouteMediaTransportStyles(handoffElement);
  if (!liveGalleryLayer()) {
    // A direct project visit has an intentionally empty persistence target.
    // Let the incoming home scene replace it instead of retaining that shell.
    document.querySelector<HTMLElement>(galleryLayerSelector)
      ?.removeAttribute(galleryPersistAttribute);
  }
  if (sourceVideo && slug) {
    sourceVideo.setAttribute(persistedMediaAttribute, '');
    captureRouteVideo(sourceVideo, slug);
  }

  const routeSession: RouteSession = {
    id: ++sessionSequence,
    direction: 'to-gallery',
    phase: 'prepared',
    slug,
    origin,
    trigger,
    sourceMedia,
    sourceImage,
    sourceVideo,
    handoff: handoffElement && sourceMedia
      ? captureRouteMediaHandoff(handoffElement, sourceMedia)
      : undefined,
    persistedVideo: false,
    animateReturn: !returnsToTop,
  };
  activeSession = routeSession;
  bindAbort(routeSession, signal);
  trigger?.setAttribute('data-navigation-pending', 'true');
  writeStorageValue('session', restoreRequestKey, 'true');
  document.documentElement.dataset.workProjectTransition = 'to-gallery';
  if (handoffElement && routeSession.handoff && liveGalleryLayer()) {
    document.documentElement.dataset.workProjectMedia = 'live';
    disableRouteMediaSnapshots(document);
  }
  disableRouteMediaSnapshots(document, false);
  return routeSession;
};

const persistToProject = (routeSession: RouteSession, event: RouteSwapEvent): void => {
  const { slug, sourceImage, sourceMedia, sourceVideo } = routeSession;
  if (!supportsRouteMediaPersistence() || !slug) return;
  const incomingOverlay = event.newDocument.querySelector<HTMLElement>('[data-project-overlay]');
  if (incomingOverlay && liveGalleryLayer()) {
    incomingOverlay.dataset.overlayBackdrop = 'retained';
    incomingOverlay.dataset.overlayReady = 'true';
  }
  const target = event.newDocument.querySelector<HTMLElement>(
    '[data-project-hero-media][data-first-media="true"]',
  );
  if (!target) return;
  target.dataset.routeMediaDestinationEmpty = 'true';
  if (sourceVideo) {
    const targetVideo = target.querySelector<HTMLVideoElement>('video[data-short-loop]');
    if (targetVideo) {
      routeSession.persistedVideo = persistMatchingVideo(
        sourceVideo,
        targetVideo,
        slug,
        event,
        {preserveOrigin: true},
      );
    }
  } else if (sourceImage && sourceMedia) {
    routeSession.persistedImage = persistResponsiveImage(
      sourceMedia,
      target,
      slug,
      event,
      {preserveOrigin: true},
    );
  }
  if (routeSession.persistedImage || routeSession.persistedVideo) {
    event.newDocument.documentElement.dataset.workProjectMedia = 'live';
    disableRouteMediaSnapshots(event.newDocument);
    skipRouteSnapshotTransition(event);
  }
};

const persistToGallery = (routeSession: RouteSession, event: RouteSwapEvent): void => {
  const { slug, origin, sourceImage, sourceVideo } = routeSession;
  const retainedTargetMedia = slug
    ? liveGalleryLayer()?.querySelector<HTMLElement>(
      `[data-gallery-item-id="${CSS.escape(slug)}"] .project-card__media`,
    )
    : null;
  const incomingTargetMedia = slug
    ? event.newDocument.querySelector<HTMLElement>(
      `[data-gallery-item-id="${CSS.escape(slug)}"] .project-card__media`,
    )
    : null;
  const targetMedia = retainedTargetMedia || incomingTargetMedia;
  const canPersist = Boolean(
    supportsRouteMediaPersistence()
    && slug
    && origin.slug === slug,
  );
  if (canPersist && slug && sourceImage && targetMedia) {
    const imageOrigin = targetMedia.querySelector<HTMLElement>(
      `[data-route-media-origin="${CSS.escape(routeMediaPersistKey(`${slug}-image`))}"]`,
    );
    routeSession.persistedImage = persistResponsiveImage(
      sourceImage,
      imageOrigin || targetMedia,
      slug,
      event,
    );
  }
  const targetVideo = targetMedia?.querySelector<HTMLVideoElement>(
    `[data-route-media-origin="${CSS.escape(routeMediaPersistKey(`${slug}-video`))}"], [data-preview-video]`,
  );
  if (canPersist && slug && sourceVideo && targetVideo) {
    routeSession.persistedVideo = persistMatchingVideo(sourceVideo, targetVideo, slug, event);
  }
  if (routeSession.animateReturn && (routeSession.persistedImage || routeSession.persistedVideo)) {
    targetMedia?.removeAttribute('data-route-media-destination-empty');
  }

  markGallerySettled(event.newDocument);
  disableRouteMediaSnapshots(event.newDocument, false);
  const hasLiveMedia = Boolean(routeSession.persistedImage || routeSession.persistedVideo);
  if (hasLiveMedia) {
    event.newDocument.documentElement.dataset.workProjectMedia = 'live';
    disableRouteMediaSnapshots(event.newDocument);
    skipRouteSnapshotTransition(event);
  } else {
    installReturnStyle(event.newDocument);
  }
  const preparedSwap = event.swap;
  if (typeof preparedSwap === 'function') {
    event.swap = () => {
      preparedSwap();
      const retainedGallery = liveGalleryLayer();
      if (hasLiveMedia && routeSession.animateReturn && retainedGallery) {
        document.documentElement.dataset.workProjectMedia = 'live';
        disableRouteMediaSnapshots(document);
        installGalleryFlowHold(retainedGallery);
      }
      if (!hasLiveMedia || !routeSession.animateReturn) {
        // Non-live returns still need final geometry before the incoming root
        // snapshot is captured. Live returns keep the retained gallery fixed
        // until the exact media node finishes moving back into it.
        settleGallery(origin);
      }
    };
  }
};

const handleBeforeSwap = (rawEvent: Event): void => {
  const routeSession = activeSession;
  if (!routeSession) return;
  const event = rawEvent as RouteSwapEvent;
  if (!event.newDocument) return;

  const targetsGallery = Boolean(event.newDocument.querySelector('[data-work-gallery]'));
  const targetsProject = Boolean(event.newDocument.querySelector('[data-project-overlay]'));
  if (
    (routeSession.direction === 'to-gallery' && !targetsGallery)
    || (routeSession.direction === 'to-project' && !targetsProject)
  ) {
    finishSession(routeSession);
    return;
  }

  routeSession.phase = 'swapping';
  routeSession.viewTransition = event.viewTransition;
  event.newDocument.documentElement.dataset.workProjectTransition = routeSession.direction;
  if (routeSession.direction === 'to-project') persistToProject(routeSession, event);
  else persistToGallery(routeSession, event);
};

const handleAfterSwap = (): void => {
  const routeSession = activeSession;
  if (!routeSession || routeSession.phase !== 'swapping') return;
  routeSession.phase = 'settling';
  if (routeSession.direction === 'to-project') removeGalleryFlowHold();

  if (routeSession.direction === 'to-gallery') {
    removeStorageValue('session', restoreRequestKey);
    if (routeSession.persistedImage) {
      if (routeSession.animateReturn && routeSession.slug) {
        routeSession.presentation = animatePersistedRouteMedia(
          routeSession.persistedImage,
          routeSession.handoff,
          routeSession.slug,
        );
      } else {
        routeSession.persistedImage.dataset.routeMediaHandoff = 'settled';
        routeSession.persistedImage.closest<HTMLElement>('[data-route-media-destination-empty]')
          ?.removeAttribute('data-route-media-destination-empty');
      }
    }
    if (routeSession.persistedVideo) {
      restorePersistedVideo(routeSession);
      if (routeSession.sourceVideo && routeSession.animateReturn && routeSession.slug) {
        routeSession.presentation = animatePersistedRouteMedia(
          routeSession.sourceVideo,
          routeSession.handoff,
          routeSession.slug,
        );
      } else if (routeSession.sourceVideo) {
        routeSession.sourceVideo.dataset.routeMediaHandoff = 'settled';
        routeSession.sourceVideo.closest<HTMLElement>('[data-route-media-destination-empty]')
          ?.removeAttribute('data-route-media-destination-empty');
      }
    } else if (routeSession.origin.slug) {
      const targetVideo = document.querySelector<HTMLVideoElement>(
        `[data-gallery-item-id="${CSS.escape(routeSession.origin.slug)}"] [data-preview-video]`,
      );
      if (targetVideo) void restoreRouteVideo(targetVideo, routeSession.origin.slug);
    }
    if (!routeSession.presentation) {
      settleGallery(routeSession.origin);
      holdGalleryScroll(routeSession);
    }
    finishAfterPresentation(routeSession);
    return;
  }

  if (routeSession.persistedImage && routeSession.slug) {
    routeSession.presentation = animatePersistedRouteMedia(
      routeSession.persistedImage,
      routeSession.handoff,
      routeSession.slug,
    );
  }
  if (routeSession.persistedVideo && routeSession.sourceVideo && routeSession.slug) {
    restorePersistedVideo(routeSession);
    routeSession.presentation = animatePersistedRouteMedia(
      routeSession.sourceVideo,
      routeSession.handoff,
      routeSession.slug,
    );
  } else if (routeSession.slug) {
    const targetVideo = document.querySelector<HTMLVideoElement>(
      '[data-project-hero-media][data-first-media="true"] video[data-short-loop]',
    );
    if (targetVideo) void restoreRouteVideo(targetVideo, routeSession.slug);
  }
  finishAfterPresentation(routeSession);
};

const samePath = (url: URL, href: string): boolean => {
  try {
    const candidate = new URL(href, window.location.href);
    return candidate.origin === url.origin && candidate.pathname === url.pathname;
  } catch {
    return false;
  }
};

const projectLinkForDestination = (
  destination: URL,
  sourceElement?: Element,
): HTMLAnchorElement | undefined => {
  const sourceLink = sourceElement?.closest<HTMLAnchorElement>(projectLinkSelector);
  if (sourceLink && samePath(destination, sourceLink.href)) return sourceLink;
  return [...document.querySelectorAll<HTMLAnchorElement>(projectLinkSelector)]
    .find((link) => samePath(destination, link.href));
};

const targetsGallery = (overlay: HTMLElement, destination: URL): boolean => (
  [...overlay.querySelectorAll<HTMLAnchorElement>('[data-project-return]')]
    .some((link) => samePath(destination, link.href))
);

const handleBeforePreparation = (rawEvent: Event): void => {
  const event = rawEvent as RoutePreparationEvent;
  if (!event.to) return;
  if (activeSession) finishSession(activeSession);

  const overlay = document.querySelector<HTMLElement>('[data-project-overlay]');
  if (overlay && targetsGallery(overlay, event.to)) {
    const sourceLink = event.sourceElement?.closest<HTMLAnchorElement>(returnLinkSelector)
      ?? pendingReturnTrigger;
    beginGalleryNavigation(overlay, sourceLink, event.signal, event.sourceElement);
    return;
  }

  const gallery = document.querySelector<HTMLElement>('[data-work-gallery]');
  if (gallery) {
    const link = projectLinkForDestination(event.to, event.sourceElement);
    if (link) beginProjectNavigation(link, event);
    return;
  }
};

const navigateToGallery = (link: HTMLAnchorElement): void => {
  const currentIndex = historyIndex();
  const origin = knownOrigin ?? readOrigin();
  const indexedTraversal = typeof origin.historyIndex === 'number'
    && typeof currentIndex === 'number'
    && currentIndex === origin.historyIndex + 1;
  const canTraverse = indexedTraversal;
  pendingReturnTrigger = link;
  link.dataset.navigationPending = 'true';
  if (canTraverse) {
    history.back();
    return;
  }
  void navigate(link.href, { history: 'replace', sourceElement: link }).catch(() => {
    link.removeAttribute('data-navigation-pending');
    pendingReturnTrigger = undefined;
    window.location.assign(link.href);
  });
};

const handleClick = (event: MouseEvent): void => {
  if (!(event.target instanceof Element)) return;
  const returnLink = event.target.closest<HTMLAnchorElement>(returnLinkSelector);
  if (returnLink && plainNavigation(event, returnLink)) {
    event.preventDefault();
    if (returnLink.dataset.navigationPending !== 'true') navigateToGallery(returnLink);
  }
};

export const installWorkProjectRouter = (): void => {
  if (window.__newWorkProjectRouter?.version === routerVersion) return;
  window.__newWorkProjectRouter?.dispose();
  const controller = new AbortController();
  const options = { signal: controller.signal };
  document.addEventListener('click', handleClick, { ...options, capture: true });
  document.addEventListener('astro:before-preparation', handleBeforePreparation, options);
  document.addEventListener('astro:before-swap', handleBeforeSwap, options);
  document.addEventListener('astro:after-swap', handleAfterSwap, options);
  window.__newWorkProjectRouter = {
    version: routerVersion,
    dispose: () => {
      controller.abort();
      if (activeSession) finishSession(activeSession);
    },
  };
};

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.__newWorkProjectRouter?.dispose();
    delete window.__newWorkProjectRouter;
  });
}

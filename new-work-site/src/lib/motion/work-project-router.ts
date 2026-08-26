/* v8 ignore file -- the route coordinator is exercised by browser regression tests. */

import { navigate } from 'astro:transitions/client';
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
  routeVideoIsVisiblyPlaying,
  skipRouteSnapshotTransition,
  supportsRouteMediaPersistence,
  type RouteMediaAnimation,
  type RouteMediaHandoff,
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
const routerVersion = 3;
const projectLinkSelector = '[data-project-grid] :is([data-project-link], [data-gallery-link])';
const returnLinkSelector = '[data-project-overlay] [data-project-return]';

let sessionSequence = 0;
let activeSession: RouteSession | undefined;
let knownOrigin: WorkOrigin | undefined;
let pendingReturnTrigger: HTMLAnchorElement | undefined;

const storageGet = (key: string): string | null => {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const storageSet = (key: string, value: string): void => {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Navigation remains functional in hardened browsing modes.
  }
};

const storageRemove = (key: string): void => {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Navigation remains functional in hardened browsing modes.
  }
};

const readOrigin = (): WorkOrigin => {
  try {
    const value = JSON.parse(storageGet(originStorageKey) || '{}') as WorkOrigin;
    return {
      slug: typeof value.slug === 'string' ? value.slug : undefined,
      scrollY: typeof value.scrollY === 'number' ? value.scrollY : undefined,
      historyIndex: typeof value.historyIndex === 'number' ? value.historyIndex : undefined,
    };
  } catch {
    return {};
  }
};

const writeOrigin = (origin: WorkOrigin): void => {
  storageSet(originStorageKey, JSON.stringify(origin));
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

const markGallerySettled = (targetDocument: Document): void => {
  const gallery = targetDocument.querySelector<HTMLElement>('[data-work-gallery]');
  const entrance = gallery?.querySelector<HTMLElement>('[data-gallery-entrance]');
  if (gallery) {
    gallery.dataset.galleryRestore = 'true';
    gallery.dataset.galleryEntrancePlayed = 'true';
    gallery.style.setProperty('--gallery-pointer-x', '0px');
  }
  if (entrance) {
    entrance.dataset.galleryEntranceState = 'settled';
    entrance.style.removeProperty('transform');
    entrance.style.removeProperty('will-change');
  }
};

const settleGallery = (origin: WorkOrigin): void => {
  window.__newWorkPrepareGalleryReturn?.(origin);
  markGallerySettled(document);
  if (typeof origin.scrollY === 'number') {
    window.scrollTo({ top: origin.scrollY, left: 0, behavior: 'auto' });
  }
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
  activeSession = undefined;
  routeSession.detachAbort?.();
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
    void routeSession.presentation.finished.then(() => finishSession(routeSession));
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
  const sourceImage = sourceVideo
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
  history.scrollRestoration = 'manual';
  if (sourceVideo && slug) {
    sourceVideo.setAttribute(persistedMediaAttribute, '');
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
  // Individual snapshots are never allowed to compete with the live media
  // transport. The root remains available as a fallback when persistence is
  // unsupported or the incoming project does not expose a matching target.
  disableRouteMediaSnapshots(document, false);
  return routeSession;
};

const beginGalleryNavigation = (
  overlay: HTMLElement,
  trigger?: HTMLAnchorElement,
  signal?: AbortSignal,
): RouteSession | undefined => {
  if (activeSession) return activeSession.direction === 'to-gallery' ? activeSession : undefined;
  const origin = knownOrigin ?? readOrigin();
  const slug = overlay.dataset.projectSlug;
  const sourceMedia = overlay.querySelector<HTMLElement>(
    '[data-project-hero-media][data-first-media="true"]',
  ) ?? undefined;
  const sourceVideo = sourceMedia?.querySelector<HTMLVideoElement>('video[data-short-loop]') ?? undefined;
  const sourceImage = sourceVideo
    ? undefined
    : sourceMedia?.querySelector<HTMLElement>('.responsive-image') ?? undefined;
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
    persistedVideo: false,
  };
  activeSession = routeSession;
  bindAbort(routeSession, signal);
  trigger?.setAttribute('data-navigation-pending', 'true');
  storageSet(restoreRequestKey, 'true');
  document.documentElement.dataset.workProjectTransition = 'to-gallery';
  disableRouteMediaSnapshots(document, false);
  installReturnStyle(document);
  return routeSession;
};

const persistToProject = (routeSession: RouteSession, event: RouteSwapEvent): void => {
  const { slug, sourceImage, sourceMedia, sourceVideo } = routeSession;
  if (!supportsRouteMediaPersistence() || !slug) return;
  const target = event.newDocument.querySelector<HTMLElement>(
    '[data-project-hero-media][data-first-media="true"]',
  );
  if (!target) return;
  if (sourceVideo) {
    const targetVideo = target.querySelector<HTMLVideoElement>('video[data-short-loop]');
    if (targetVideo) routeSession.persistedVideo = persistMatchingVideo(sourceVideo, targetVideo, slug, event);
  } else if (sourceImage && sourceMedia) {
    routeSession.persistedImage = persistResponsiveImage(sourceMedia, target, slug, event);
  }
  if (routeSession.persistedImage || routeSession.persistedVideo) {
    event.newDocument.documentElement.dataset.workProjectMedia = 'live';
    disableRouteMediaSnapshots(event.newDocument);
    skipRouteSnapshotTransition(event);
  }
};

const persistToGallery = (routeSession: RouteSession, event: RouteSwapEvent): void => {
  const { slug, origin, sourceImage, sourceVideo } = routeSession;
  const targetMedia = slug
    ? event.newDocument.querySelector<HTMLElement>(
      `[data-gallery-item-id="${CSS.escape(slug)}"] .project-card__media`,
    )
    : null;
  const canPersist = Boolean(
    supportsRouteMediaPersistence()
    && slug
    && origin.slug === slug,
  );
  if (canPersist && slug && sourceImage && targetMedia) {
    routeSession.persistedImage = persistResponsiveImage(sourceImage, targetMedia, slug, event);
  }
  const targetVideo = targetMedia?.querySelector<HTMLVideoElement>('[data-preview-video]');
  if (canPersist && slug && sourceVideo && targetVideo) {
    routeSession.persistedVideo = persistMatchingVideo(sourceVideo, targetVideo, slug, event);
  }

  markGallerySettled(event.newDocument);
  disableRouteMediaSnapshots(event.newDocument, false);
  installReturnStyle(event.newDocument);
  const preparedSwap = event.swap;
  if (typeof preparedSwap === 'function') {
    event.swap = () => {
      preparedSwap();
      // The incoming root snapshot is captured after this callback, so its
      // very first frame already has final masonry geometry and scroll.
      settleGallery(origin);
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

  if (routeSession.direction === 'to-gallery') {
    settleGallery(routeSession.origin);
    storageRemove(restoreRequestKey);
    if (routeSession.persistedImage) {
      routeSession.persistedImage.dataset.routeMediaHandoff = 'settled';
    }
    if (routeSession.persistedVideo) {
      restorePersistedVideo(routeSession);
      if (routeSession.sourceVideo) routeSession.sourceVideo.dataset.routeMediaHandoff = 'settled';
    } else if (routeSession.origin.slug) {
      const targetVideo = document.querySelector<HTMLVideoElement>(
        `[data-gallery-item-id="${CSS.escape(routeSession.origin.slug)}"] [data-preview-video]`,
      );
      if (targetVideo) void restoreRouteVideo(targetVideo, routeSession.origin.slug);
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
  // Native capture is complete by after-swap. Re-enable names immediately;
  // the live portal owns the remaining presentation and cleanup.
  restoreRouteMediaSnapshots();
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

  const gallery = document.querySelector<HTMLElement>('[data-work-gallery]');
  if (gallery) {
    const link = projectLinkForDestination(event.to, event.sourceElement);
    if (link) beginProjectNavigation(link, event);
    return;
  }

  const overlay = document.querySelector<HTMLElement>('[data-project-overlay]');
  if (!overlay) return;
  if (!targetsGallery(overlay, event.to)) return;
  const sourceLink = event.sourceElement?.closest<HTMLAnchorElement>(returnLinkSelector)
    ?? pendingReturnTrigger;
  beginGalleryNavigation(overlay, sourceLink, event.signal);
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

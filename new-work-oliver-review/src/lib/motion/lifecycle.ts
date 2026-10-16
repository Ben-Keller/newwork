/* v8 ignore file -- Astro route lifecycle behavior is covered by Playwright. */
import { disposeMediaControllers, pauseDocumentMedia, refreshMediaControllers } from './media-controller';
import { observePointerCapabilities, readPointerCapabilities } from './pointer-capability';
import type { PointerCapabilities } from './pointer-capability';
import { observeReducedMotion, prefersReducedMotion } from './reduced-motion';
import { observeReducedData, prefersReducedData } from './reduced-data';
import type { MotionCleanup, MotionEnvironment, RouteMotionInitializer } from './types';

export const MOTION_HOOK_SELECTOR = [
  '[data-work-gallery]',
  '[data-motion-reveal]',
  '[data-motion-parallax]',
  '[data-motion-column]',
  '[data-motion-split]',
  '[data-project-link]',
].join(',');

export const routeNeedsMotionRuntime = (
  root: Pick<ParentNode, 'querySelector'>,
  hasCustomInitializers = false,
): boolean => hasCustomInitializers || Boolean(
  (root as ParentNode).querySelectorAll
    ? [...(root as ParentNode).querySelectorAll<HTMLElement>(MOTION_HOOK_SELECTOR)]
        .some((element) => !element.closest('[data-gallery-layer-state="background"]'))
    : root.querySelector(MOTION_HOOK_SELECTOR),
);

interface MotionRuntimeState {
  activeMotionCleanup: MotionCleanup | null;
  activeEnvironment: MotionEnvironment | null;
  activeRoot: HTMLElement | null;
  activeRouteKey: string;
  installed: boolean;
  pointer: PointerCapabilities;
  reducedMotion: boolean;
  saveData: boolean;
  routeCleanups: MotionCleanup[];
  routeVersion: number;
  teardown: MotionCleanup[];
}

const initialPointer = readPointerCapabilities();
const runtime: MotionRuntimeState = {
  activeMotionCleanup: null,
  activeEnvironment: null,
  activeRoot: null,
  activeRouteKey: '',
  installed: false,
  pointer: initialPointer,
  reducedMotion: prefersReducedMotion(),
  saveData: prefersReducedData(),
  routeCleanups: [],
  routeVersion: 0,
  teardown: [],
};

const initializers = new Map<string, RouteMotionInitializer>();

const POINTER_MOTION_SELECTOR = [
  '[data-work-gallery]',
  '[data-project-link] [data-card-media]',
  '[data-gallery-link] [data-card-media]',
].join(',');

const routeKey = (): string => `${window.location.pathname}${window.location.search}`;
const activeRouteNeedsPointerMotion = (): boolean =>
  Boolean(runtime.activeRoot && [...runtime.activeRoot.querySelectorAll<HTMLElement>(POINTER_MOTION_SELECTOR)]
    .some((element) => !element.closest('[data-gallery-layer-state="background"]')));

const syncEnvironmentAttributes = (): void => {
  document.documentElement.dataset.motionPreference = runtime.reducedMotion ? 'reduced' : 'full';
  document.documentElement.dataset.motionDataPreference = runtime.saveData ? 'reduced' : 'full';
  document.documentElement.dataset.pointerCapability = runtime.pointer.desktopFine
    ? 'desktop-fine'
    : runtime.pointer.coarse
      ? 'coarse'
      : runtime.pointer.fine
        ? 'fine'
        : 'none';
};

const dispatchMotionReady = (environment: MotionEnvironment): void => {
  document.dispatchEvent(new CustomEvent('new-work:motion-ready', {
    detail: {
      pointer: environment.pointer,
      reducedMotion: environment.reducedMotion,
      saveData: environment.saveData,
      routeKey: environment.routeKey,
    },
  }));
};

const applyStaticMotionFallback = (environment: MotionEnvironment): MotionCleanup => {
  const active = <ElementType extends HTMLElement>(selector: string): ElementType[] => (
    [...environment.root.querySelectorAll<ElementType>(selector)]
      .filter((element) => !element.closest('[data-gallery-layer-state="background"]'))
  );
  const reveals = active<HTMLElement>('[data-motion-reveal]');
  const columns = active<HTMLElement>('[data-motion-column]');
  const splits = active<HTMLElement>('[data-motion-split]');
  const galleries = active<HTMLElement>('[data-work-gallery]');
  const galleryEntrances = Array.from(
    active<HTMLElement>('[data-gallery-entrance]'),
  );
  const media = active<HTMLElement>('[data-card-media]');

  reveals.forEach((element) => { element.dataset.motionReady = 'static'; });
  columns.forEach((element) => {
    element.style.removeProperty('transform');
    element.dataset.motionReady = 'static';
  });
  splits.forEach((element) => { element.dataset.motionSplitReady = 'static'; });
  galleries.forEach((gallery) => {
    gallery.removeAttribute('data-gallery-motion');
    gallery.removeAttribute('data-gallery-pointer');
    gallery.style.setProperty('--gallery-pointer-x', '0px');
  });
  galleryEntrances.forEach((entrance) => {
    entrance.dataset.galleryEntranceState = 'static';
    entrance.style.removeProperty('transform');
    entrance.style.removeProperty('will-change');
  });
  media.forEach((element) => {
    element.style.setProperty('--card-pan-x', '0px');
    element.style.setProperty('--card-pan-y', '0px');
  });

  return () => {
    reveals.forEach((element) => {
      if (element.dataset.motionReady === 'static') delete element.dataset.motionReady;
    });
    columns.forEach((element) => {
      if (element.dataset.motionReady === 'static') delete element.dataset.motionReady;
    });
    splits.forEach((element) => {
      if (element.dataset.motionSplitReady === 'static') delete element.dataset.motionSplitReady;
    });
    galleries.forEach((gallery) => gallery.style.removeProperty('--gallery-pointer-x'));
    galleryEntrances.forEach((entrance) => {
      if (entrance.dataset.galleryEntranceState === 'static') {
        delete entrance.dataset.galleryEntranceState;
      }
    });
    media.forEach((element) => {
      element.style.removeProperty('--card-pan-x');
      element.style.removeProperty('--card-pan-y');
    });
  };
};

const cleanupRoute = (): void => {
  runtime.routeVersion += 1;
  runtime.routeCleanups.reverse().forEach((cleanup) => cleanup());
  runtime.routeCleanups = [];
  runtime.activeMotionCleanup?.();
  runtime.activeMotionCleanup = null;
  runtime.activeEnvironment = null;
  runtime.activeRoot = null;
  runtime.activeRouteKey = '';
  document.documentElement.removeAttribute('data-motion-route');
  document.documentElement.removeAttribute('data-motion-runtime');
};

const runInitializer = (
  initializer: RouteMotionInitializer,
  environment: MotionEnvironment,
): void => {
  const cleanup = initializer(environment);
  if (cleanup) environment.addCleanup(cleanup);
};

const initializeRoute = (force = false): void => {
  const root = document.querySelector<HTMLElement>('[data-motion-root]') ?? document.body;
  const nextRouteKey = routeKey();
  if (
    !force &&
    runtime.activeEnvironment &&
    runtime.activeRoot === root &&
    runtime.activeRouteKey === nextRouteKey
  ) return;

  cleanupRoute();
  const routeVersion = runtime.routeVersion;
  const environment: MotionEnvironment = {
    addCleanup(cleanup) {
      runtime.routeCleanups.push(cleanup);
    },
    pointer: runtime.pointer,
    reducedMotion: runtime.reducedMotion,
    saveData: runtime.saveData,
    root,
    routeKey: nextRouteKey,
  };

  runtime.activeRoot = root;
  runtime.activeRouteKey = nextRouteKey;
  runtime.activeEnvironment = environment;
  document.documentElement.dataset.motionRoute = nextRouteKey;
  syncEnvironmentAttributes();

  refreshMediaControllers();
  if (runtime.reducedMotion || runtime.saveData) {
    document.documentElement.dataset.motionRuntime = 'static';
    runtime.activeMotionCleanup = applyStaticMotionFallback(environment);
    initializers.forEach((initializer) => runInitializer(initializer, environment));
    dispatchMotionReady(environment);
    return;
  }

  if (!routeNeedsMotionRuntime(root, initializers.size > 0)) {
    document.documentElement.dataset.motionRuntime = 'idle';
    dispatchMotionReady(environment);
    return;
  }

  document.documentElement.dataset.motionRuntime = 'loading';
  void import('./route-runtime')
    .then(({ initializeMotionRoute }) => {
      if (
        routeVersion !== runtime.routeVersion ||
        runtime.activeEnvironment !== environment ||
        !root.isConnected
      ) return;

      runtime.activeMotionCleanup = initializeMotionRoute(
        environment,
        Array.from(initializers.values()),
      );
      document.documentElement.dataset.motionRuntime = 'animated';
      dispatchMotionReady(environment);
    })
    .catch(() => {
      if (routeVersion !== runtime.routeVersion || runtime.activeEnvironment !== environment) return;
      runtime.activeMotionCleanup = applyStaticMotionFallback(environment);
      document.documentElement.dataset.motionRuntime = 'static';
      dispatchMotionReady(environment);
    });
};

const restartRoute = (): void => {
  if (!runtime.activeRoot) return;
  initializeRoute(true);
};

export const registerRouteMotion = (
  name: string,
  initializer: RouteMotionInitializer,
): MotionCleanup => {
  initializers.set(name, initializer);
  if (runtime.activeEnvironment) initializeRoute(true);

  return () => {
    if (initializers.get(name) === initializer) initializers.delete(name);
  };
};

export const getMotionEnvironment = (): Readonly<MotionEnvironment> | null =>
  runtime.activeEnvironment;

export const installMotionLifecycle = (): MotionCleanup => {
  if (runtime.installed) return () => undefined;
  runtime.installed = true;

  const onPageLoad = (): void => initializeRoute();
  const onBeforeSwap = (): void => {
    pauseDocumentMedia('route-swap');
    disposeMediaControllers('route-swap');
    cleanupRoute();
  };
  const onVisibilityChange = (): void => {
    if (document.hidden) pauseDocumentMedia('document-hidden');
  };
  const onPageShow = (event: PageTransitionEvent): void => {
    if (event.persisted) initializeRoute(true);
  };
  const onGalleryLayerReleased = (): void => {
    if (activeRouteNeedsPointerMotion()) restartRoute();
  };

  document.addEventListener('astro:page-load', onPageLoad);
  document.addEventListener('astro:before-swap', onBeforeSwap);
  document.addEventListener('new-work:gallery-layer-released', onGalleryLayerReleased);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('pageshow', onPageShow);

  runtime.teardown.push(
    observeReducedMotion((reducedMotion) => {
      if (runtime.reducedMotion === reducedMotion) return;
      runtime.reducedMotion = reducedMotion;
      syncEnvironmentAttributes();
      if (reducedMotion) pauseDocumentMedia('reduced-motion');
      restartRoute();
    }),
    observeReducedData((saveData) => {
      if (runtime.saveData === saveData) return;
      runtime.saveData = saveData;
      syncEnvironmentAttributes();
      if (saveData) pauseDocumentMedia('save-data');
      restartRoute();
    }),
    observePointerCapabilities((pointer) => {
      const changed = runtime.pointer.coarse !== pointer.coarse
        || runtime.pointer.desktopFine !== pointer.desktopFine
        || runtime.pointer.fine !== pointer.fine;
      runtime.pointer = pointer;
      syncEnvironmentAttributes();
      if (changed && activeRouteNeedsPointerMotion()) restartRoute();
    }),
  );

  syncEnvironmentAttributes();
  if (document.readyState === 'loading') {
    window.addEventListener('load', onPageLoad, { once: true });
  } else {
    window.queueMicrotask(onPageLoad);
  }

  return () => {
    document.removeEventListener('astro:page-load', onPageLoad);
    document.removeEventListener('astro:before-swap', onBeforeSwap);
    document.removeEventListener('new-work:gallery-layer-released', onGalleryLayerReleased);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('load', onPageLoad);
    runtime.teardown.reverse().forEach((cleanup) => cleanup());
    runtime.teardown = [];
    cleanupRoute();
    runtime.installed = false;
  };
};

/* v8 ignore file -- the dynamically loaded browser runtime is covered by Playwright. */
import { initializeCardPointer } from './card-pointer';
import { initializeDeclarativeMotion } from './effects';
import { initializeGalleryMotion } from './gallery';
import type { MotionCleanup, MotionEnvironment, RouteMotionInitializer } from './types';
import { ScrollTrigger, ensureGsapPlugins, gsap } from './vendor';

const builtInInitializers: RouteMotionInitializer[] = [
  initializeGalleryMotion,
  initializeDeclarativeMotion,
  initializeCardPointer,
];

export const initializeMotionRoute = (
  environment: MotionEnvironment,
  customInitializers: RouteMotionInitializer[] = [],
): MotionCleanup => {
  ensureGsapPlugins();
  const routeCleanups: MotionCleanup[] = [];
  const scopedEnvironment: MotionEnvironment = {
    ...environment,
    addCleanup: (cleanup) => routeCleanups.push(cleanup),
  };
  let refreshFrame = 0;
  let context: ReturnType<typeof gsap.context> | undefined;

  try {
    context = gsap.context(() => {
      [...builtInInitializers, ...customInitializers].forEach((initializer) => {
        const cleanup = initializer(scopedEnvironment);
        if (cleanup) scopedEnvironment.addCleanup(cleanup);
      });
    }, environment.root);
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = 0;
      ScrollTrigger.refresh();
    });
  } catch (error) {
    routeCleanups.reverse().forEach((cleanup) => cleanup());
    context?.revert();
    throw error;
  }

  return () => {
    if (refreshFrame) window.cancelAnimationFrame(refreshFrame);
    routeCleanups.reverse().forEach((cleanup) => cleanup());
    context?.revert();
  };
};

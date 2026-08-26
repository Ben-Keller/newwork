// This barrel remains safe to import from Astro frontmatter during SSR. Browser-
// only GSAP/runtime exports live in `./client` and `./vendor`.
export type { ManagedMediaController, MediaPauseReason } from './media-controller';
export type { PointerCapabilities } from './pointer-capability';
export { prefersReducedData } from './reduced-data';
export {
  COLUMN_SCROLL_RESPONSES,
  COMPACT_COLUMN_SCROLL_RESPONSES,
  columnLagOffset,
  filterColumnScroll,
  frameAdjustedColumnAlpha,
} from './column-filter';
export { projectMediaTransitionName, projectTitleTransitionName, projectTransitionNames } from './transitions';
export {
  MOTION_DURATION,
  MOTION_EASE,
  MOTION_LIMIT,
  MOTION_PHYSICS,
  clampMotionValue,
  parseMotionValue,
} from './tokens';
export type { MotionCleanup, MotionEnvironment, RouteMotionInitializer } from './types';

import { MOTION_LIMIT, MOTION_PHYSICS, clampMotionValue } from './tokens';

export const COLUMN_SCROLL_RESPONSES = Object.freeze([
  0.095,
  0.075,
  0.125,
  0.110,
] as const);

export const frameAdjustedColumnAlpha = (
  response: number,
  deltaSeconds: number,
): number => {
  const boundedResponse = clampMotionValue(response, 0, 1);
  const boundedDelta = clampMotionValue(deltaSeconds, 0, MOTION_PHYSICS.maximumFrameStep);
  return 1 - Math.pow(1 - boundedResponse, boundedDelta * 60);
};

export const filterColumnScroll = (
  filteredScroll: number,
  targetScroll: number,
  response: number,
  deltaSeconds: number,
): number => {
  // Bound the filter state as well as the rendered transform. Otherwise a
  // fast gesture can store a large hidden backlog while every lane is pinned
  // at the visual cap, then release it as an artificial second acceleration.
  const boundedLag = clampMotionValue(
    targetScroll - filteredScroll,
    -MOTION_LIMIT.columnLagOffset,
    MOTION_LIMIT.columnLagOffset,
  );
  const boundedFilteredScroll = targetScroll - boundedLag;
  return boundedFilteredScroll
    + (targetScroll - boundedFilteredScroll) * frameAdjustedColumnAlpha(response, deltaSeconds);
};

export const columnLagOffset = (
  targetScroll: number,
  filteredScroll: number,
): number => clampMotionValue(
  targetScroll - filteredScroll,
  -MOTION_LIMIT.columnLagOffset,
  MOTION_LIMIT.columnLagOffset,
);

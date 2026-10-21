/** Follow the hero's natural scroll, gently stopping at the viewport midpoint. */
export function boardPosition(dockTop: number, scroll: number, targetTop: number, reducedMotion = false): number {
  // A dock already above the midpoint is already at its sticky limit. Starting
  // there avoids a later downward move solely to reach the floating position.
  const initialGap = Math.max(0, dockTop + scroll - targetTop);
  const remaining = initialGap - scroll;
  if (remaining <= 0) return targetTop;
  const catchDistance = Math.min(96, initialGap);
  if (reducedMotion || remaining >= catchDistance) return targetTop + remaining;
  // Match natural scroll speed on entry, then reduce it to zero at the stop.
  // This curve is monotonic, reversible, and never overshoots the midpoint.
  const progress = remaining / catchDistance;
  return targetTop + catchDistance * progress * progress * (2 - progress);
}

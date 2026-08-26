export const MOTION_EASE = Object.freeze({
  cssOut: 'cubic-bezier(.22, 1, .36, 1)',
  customOut: 'new-work-out',
  customOutCurve: '0.22,1,0.36,1',
  linear: 'none',
  softInOut: 'power2.inOut',
});

export const MOTION_DURATION = Object.freeze({
  route: 0.16,
  fast: 0.16,
  ui: 0.24,
  reveal: 0.56,
  galleryEntranceDelay: 0.45,
  galleryEntrance: 1.8,
});

export const MOTION_LIMIT = Object.freeze({
  cardPan: 5,
  cardScale: 1.02,
  galleryEntranceScale: 1.12,
  columnLagOffset: 100,
  parallaxPercent: 8,
  revealDelay: 0.8,
});

export const MOTION_PHYSICS = Object.freeze({
  columnRestDistance: 0.05,
  maximumFrameStep: 0.05,
});

export const clampMotionValue = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const parseMotionValue = (
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number => {
  const parsed = Number.parseFloat(value ?? '');
  return clampMotionValue(Number.isFinite(parsed) ? parsed : fallback, minimum, maximum);
};

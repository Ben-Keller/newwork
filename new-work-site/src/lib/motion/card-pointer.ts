/* v8 ignore file -- fine-pointer card behavior is covered by Playwright. */
import type { MotionCleanup, MotionEnvironment } from './types';
import { MOTION_LIMIT, clampMotionValue } from './tokens';

export const initializeCardPointer = (environment: MotionEnvironment): MotionCleanup => {
  if (environment.reducedMotion || !environment.pointer.desktopFine) return () => undefined;

  const links = Array.from(
    environment.root.querySelectorAll<HTMLElement>('[data-project-link], [data-gallery-link]'),
  );
  const cleanups: MotionCleanup[] = [];

  links.forEach((link) => {
    const media = link.querySelector<HTMLElement>('[data-card-media]');
    if (!media) return;

    const resetMedia = (): void => {
      media.style.setProperty('--card-pan-x', '0px');
      media.style.setProperty('--card-pan-y', '0px');
    };
    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType === 'touch') return;
      const bounds = link.getBoundingClientRect();
      const normalizedX = bounds.width > 0
        ? clampMotionValue((event.clientX - bounds.left) / bounds.width * 2 - 1, -1, 1)
        : 0;
      const normalizedY = bounds.height > 0
        ? clampMotionValue((event.clientY - bounds.top) / bounds.height * 2 - 1, -1, 1)
        : 0;
      media.style.setProperty('--card-pan-x', `${(normalizedX * MOTION_LIMIT.cardPan).toFixed(2)}px`);
      media.style.setProperty('--card-pan-y', `${(normalizedY * MOTION_LIMIT.cardPan).toFixed(2)}px`);
    };

    link.addEventListener('pointermove', onPointerMove, { passive: true });
    link.addEventListener('pointerleave', resetMedia);
    link.addEventListener('pointercancel', resetMedia);
    link.addEventListener('focusin', resetMedia);
    link.addEventListener('focusout', resetMedia);
    cleanups.push(() => {
      link.removeEventListener('pointermove', onPointerMove);
      link.removeEventListener('pointerleave', resetMedia);
      link.removeEventListener('pointercancel', resetMedia);
      link.removeEventListener('focusin', resetMedia);
      link.removeEventListener('focusout', resetMedia);
      resetMedia();
    });
  });

  return () => cleanups.forEach((cleanup) => cleanup());
};

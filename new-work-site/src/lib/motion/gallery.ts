/* v8 ignore file -- pointer and ScrollTrigger integration is covered by Playwright. */
import type { MotionCleanup, MotionEnvironment } from './types';
import { MOTION_DURATION, MOTION_EASE, MOTION_LIMIT, clampMotionValue } from './tokens';
import { ScrollTrigger, gsap } from './vendor';

const galleryIsRetained = (gallery: HTMLElement): boolean => (
  Boolean(gallery.closest('[data-gallery-layer-state="background"]'))
);

const zeroGalleryMotion = (
  gallery: HTMLElement,
  {preservePointerOffset = false}: {preservePointerOffset?: boolean} = {},
): void => {
  gallery.removeAttribute('data-gallery-motion');
  gallery.removeAttribute('data-gallery-pointer');
  if (!preservePointerOffset) gallery.style.setProperty('--gallery-pointer-x', '0px');
};

const settleGalleryEntrance = (
  gallery: HTMLElement,
  {preserveTransform = false}: {preserveTransform?: boolean} = {},
): void => {
  const entrance = gallery.querySelector<HTMLElement>('[data-gallery-entrance]');
  if (!entrance) return;
  entrance.dataset.galleryEntranceState = 'settled';
  if (!preserveTransform) {
    entrance.style.removeProperty('transform');
    entrance.style.removeProperty('will-change');
  }
};

const initializeGalleryEntrance = (gallery: HTMLElement): MotionCleanup => {
  const entrance = gallery.querySelector<HTMLElement>('[data-gallery-entrance]');
  if (!entrance) return () => undefined;

  if (
    gallery.dataset.galleryRestore === 'true'
    || gallery.dataset.galleryEntrancePlayed === 'true'
  ) {
    settleGalleryEntrance(gallery);
    return () => undefined;
  }

  gallery.dataset.galleryEntrancePlayed = 'true';
  entrance.dataset.galleryEntranceState = 'animating';
  entrance.dataset.galleryEntranceDelay = String(MOTION_DURATION.galleryEntranceDelay);
  const tween = gsap.fromTo(
    entrance,
    {
      scale: MOTION_LIMIT.galleryEntranceScale,
      transformOrigin: '50% 0%',
      willChange: 'transform',
    },
    {
      scale: 1,
      delay: MOTION_DURATION.galleryEntranceDelay,
      duration: MOTION_DURATION.galleryEntrance,
      ease: MOTION_EASE.customOut,
      onComplete: () => settleGalleryEntrance(gallery),
    },
  );

  return () => {
    tween.kill();
    settleGalleryEntrance(gallery, {preserveTransform: galleryIsRetained(gallery)});
  };
};

const initializeGalleryScroll = (gallery: HTMLElement): MotionCleanup => {
  gallery.dataset.galleryMotion = 'true';
  ScrollTrigger.refresh();

  return () => {
    zeroGalleryMotion(gallery);
  };
};

const initializeGalleryPointer = (gallery: HTMLElement): MotionCleanup => {
  gallery.dataset.galleryPointer = 'true';
  let animationFrame = 0;
  let targetX = 0;
  let currentX = 0;
  let pointerInside = false;

  const apply = (): void => {
    animationFrame = 0;
    currentX += (targetX - currentX) * 0.18;
    if (Math.abs(currentX - targetX) < 0.05) currentX = targetX;
    gallery.style.setProperty('--gallery-pointer-x', `${currentX.toFixed(2)}px`);
    if (currentX !== targetX) animationFrame = requestAnimationFrame(apply);
  };

  const requestApply = (): void => {
    if (!animationFrame) animationFrame = requestAnimationFrame(apply);
  };

  const galleryIsVisible = (): boolean => {
    const bounds = gallery.getBoundingClientRect();
    return bounds.width > 0
      && bounds.height > 0
      && bounds.bottom > 0
      && bounds.top < window.innerHeight
      && !gallery.closest('[data-gallery-layer-state="background"]');
  };

  const setTarget = (value: number): void => {
    targetX = value;
    requestApply();
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || !galleryIsVisible()) return;
    pointerInside = true;
    const normalized = clampMotionValue((event.clientX / window.innerWidth) * 2 - 1, -1, 1);
    setTarget(normalized * MOTION_LIMIT.galleryPointerX);
  };

  const onPointerLeave = (): void => {
    pointerInside = false;
    setTarget(0);
  };

  const onScrollOrResize = (): void => {
    if (!pointerInside || galleryIsVisible()) return;
    setTarget(0);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });

  return () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('scroll', onScrollOrResize);
    window.removeEventListener('resize', onScrollOrResize);
    zeroGalleryMotion(gallery, {preservePointerOffset: galleryIsRetained(gallery)});
  };
};

export const initializeGalleryMotion = (environment: MotionEnvironment): MotionCleanup => {
  const galleries = Array.from(
    environment.root.querySelectorAll<HTMLElement>('[data-work-gallery]'),
  ).filter((gallery) => !gallery.closest('[data-gallery-layer-state="background"]'));
  const cleanups: MotionCleanup[] = [];

  galleries.forEach((gallery) => {
    const plane = gallery.querySelector<HTMLElement>('[data-gallery-plane]');
    if (!plane || environment.reducedMotion) {
      zeroGalleryMotion(gallery);
      gallery.dataset.galleryEntrancePlayed = 'true';
      settleGalleryEntrance(gallery);
      return;
    }
    cleanups.push(initializeGalleryEntrance(gallery));
    cleanups.push(initializeGalleryScroll(gallery));
    if (environment.pointer.desktopFine) cleanups.push(initializeGalleryPointer(gallery));
  });

  return () => cleanups.reverse().forEach((cleanup) => cleanup());
};

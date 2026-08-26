/* v8 ignore file -- pointer and ScrollTrigger integration is covered by Playwright. */
import type { MotionCleanup, MotionEnvironment } from './types';
import { MOTION_DURATION, MOTION_EASE, MOTION_LIMIT } from './tokens';
import { ScrollTrigger, gsap } from './vendor';

const zeroGalleryMotion = (gallery: HTMLElement): void => {
  gallery.removeAttribute('data-gallery-motion');
  gallery.removeAttribute('data-gallery-pointer');
  gallery.style.setProperty('--gallery-pointer-x', '0px');
};

const settleGalleryEntrance = (gallery: HTMLElement): void => {
  const entrance = gallery.querySelector<HTMLElement>('[data-gallery-entrance]');
  if (!entrance) return;
  entrance.dataset.galleryEntranceState = 'settled';
  entrance.style.removeProperty('transform');
  entrance.style.removeProperty('will-change');
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
    settleGalleryEntrance(gallery);
  };
};

const initializeGalleryScroll = (gallery: HTMLElement): MotionCleanup => {
  gallery.dataset.galleryMotion = 'true';
  ScrollTrigger.refresh();

  return () => {
    zeroGalleryMotion(gallery);
  };
};

export const initializeGalleryMotion = (environment: MotionEnvironment): MotionCleanup => {
  const galleries = Array.from(
    environment.root.querySelectorAll<HTMLElement>('[data-work-gallery]'),
  );
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
  });

  return () => cleanups.reverse().forEach((cleanup) => cleanup());
};

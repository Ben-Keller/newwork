/* v8 ignore file -- pointer and ScrollTrigger integration is covered by Playwright. */
import type { MotionCleanup, MotionEnvironment } from './types';
import { MOTION_DURATION, MOTION_EASE, MOTION_LIMIT, clampMotionValue } from './tokens';
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

const galleryPointerRoom = (gallery: HTMLElement): number => {
  const galleryStyles = getComputedStyle(gallery);
  const paddingRoom = Math.min(
    Number.parseFloat(galleryStyles.paddingLeft) || Number.POSITIVE_INFINITY,
    Number.parseFloat(galleryStyles.paddingRight) || Number.POSITIVE_INFINITY,
  );
  // The outer lanes deliberately bleed beyond the gallery before being
  // clipped. Its own inline padding is the safe pointer-follow allowance;
  // viewport containment is handled by the gallery's overflow clip.
  const available = paddingRoom - 6;
  return clampMotionValue(available, 0, MOTION_LIMIT.galleryPointerX);
};

const initializeGalleryScroll = (gallery: HTMLElement): MotionCleanup => {
  gallery.dataset.galleryMotion = 'true';
  ScrollTrigger.refresh();

  return () => {
    zeroGalleryMotion(gallery);
  };
};

const initializeGalleryPointer = (
  gallery: HTMLElement,
  environment: MotionEnvironment,
): MotionCleanup => {
  if (!environment.pointer.desktopFine || environment.reducedMotion) return () => undefined;

  const pointerPosition = { value: 0 };
  const moveX = gsap.quickTo(pointerPosition, 'value', {
    duration: MOTION_DURATION.pointerFollow,
    ease: MOTION_EASE.customOut,
    onUpdate: () => {
      gallery.style.setProperty('--gallery-pointer-x', `${pointerPosition.value.toFixed(2)}px`);
    },
  });

  const reset = (): void => {
    moveX(0);
    gallery.removeAttribute('data-gallery-pointer');
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' || document.hidden) {
      reset();
      return;
    }

    const bounds = gallery.getBoundingClientRect();
    if (bounds.width <= 0) return;
    const normalized = clampMotionValue(
      (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2),
      -1,
      1,
    );
    const limit = galleryPointerRoom(gallery);
    moveX(-normalized * limit);
    if (limit > 0.05 && Math.abs(normalized) > 0.01) gallery.dataset.galleryPointer = 'active';
    else gallery.removeAttribute('data-gallery-pointer');
  };
  const onVisibilityChange = (): void => {
    if (document.hidden) reset();
  };

  gallery.addEventListener('pointermove', onPointerMove, { passive: true });
  gallery.addEventListener('pointerleave', reset, { passive: true });
  gallery.addEventListener('pointercancel', reset, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  return () => {
    gallery.removeEventListener('pointermove', onPointerMove);
    gallery.removeEventListener('pointerleave', reset);
    gallery.removeEventListener('pointercancel', reset);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    reset();
    moveX.tween.kill();
    gallery.style.setProperty('--gallery-pointer-x', '0px');
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
    cleanups.push(initializeGalleryPointer(gallery, environment));
  });

  return () => cleanups.reverse().forEach((cleanup) => cleanup());
};

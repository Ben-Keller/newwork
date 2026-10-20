/* v8 ignore file -- browser animation vendor registration is covered by Playwright. */
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { MOTION_EASE } from './tokens';

let registered = false;

export const ensureGsapPlugins = (): void => {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger, Flip, SplitText, CustomEase);
  if (!CustomEase.get(MOTION_EASE.customOut)) {
    CustomEase.create(MOTION_EASE.customOut, MOTION_EASE.customOutCurve);
  }
  registered = true;
};

/** Preserve explicit navigation/restoration while a newly swapped route refreshes.
 * ScrollTrigger can still hold the previous route's cached zero scroll position.
 * These layouts have no pinned sections, so refreshing must not move the page.
 */
export const refreshMotionLayout = (): void => {
  const left = window.scrollX;
  const top = window.scrollY;
  ScrollTrigger.refresh();
  if (window.scrollX !== left || window.scrollY !== top) {
    window.scrollTo({ left, top, behavior: 'auto' });
  }
};

export { CustomEase, Flip, ScrollTrigger, SplitText, gsap };

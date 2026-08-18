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

export { CustomEase, Flip, ScrollTrigger, SplitText, gsap };


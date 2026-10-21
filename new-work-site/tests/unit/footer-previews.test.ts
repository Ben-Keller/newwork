// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {setupFooterPreviews} from '../../src/lib/footer-previews';

const media = new Map<string, EventTarget & {matches: boolean}>();
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function mediaQuery(query: string) {
  if (!media.has(query)) media.set(query, Object.assign(new EventTarget(), {matches: !query.includes('reduced-motion')}));
  return media.get(query)!;
}
beforeEach(() => {
  vi.useFakeTimers();
  media.clear();
  vi.stubGlobal('matchMedia', mediaQuery);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', window.clearTimeout.bind(window));
  document.body.innerHTML = '';
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({x: 40, y: 600, top: 600, bottom: 650, left: 40, right: 140, width: 100, height: 50, toJSON() {return {};}});
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});
describe('footer preview loading and cleanup', () => {
  it('loads only on deliberate hover, supports dismissal and removes listeners', () => {
    document.body.innerHTML = '<footer><a data-footer-project href="/work/example"><span data-footer-preview><img data-preview-src="/cover.webp" data-preview-srcset="/cover.webp 480w" /></span></a></footer>';
    const footer = query('footer');
    const link = query('a');
    const preview = query('[data-footer-preview]');
    const image = query<HTMLImageElement>('img');
    Object.defineProperties(preview, {offsetWidth: {value: 240}, offsetHeight: {value: 180}});
    Object.defineProperty(image, 'naturalWidth', {value: 480});
    const dispose = setupFooterPreviews(footer);
    const enter = (pointerType: string) => {
      const event = new Event('pointerenter');
      Object.defineProperty(event, 'pointerType', {value: pointerType});
      link.dispatchEvent(event);
    };
    enter('touch');
    expect(image.hasAttribute('src')).toBe(false);
    enter('mouse');
    expect(image.getAttribute('src')).toBe('/cover.webp');
    expect(image.getAttribute('srcset')).toBe('/cover.webp 480w');
    image.dispatchEvent(new Event('load'));
    expect(preview.hasAttribute('data-ready')).toBe(true);
    expect(preview.hasAttribute('data-active')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(preview.hasAttribute('data-active')).toBe(false);
    enter('mouse'); link.dispatchEvent(new Event('pointerleave'));
    expect(preview.hasAttribute('data-active')).toBe(false);
    enter('mouse'); window.dispatchEvent(new Event('scroll'));
    expect(preview.hasAttribute('data-active')).toBe(false);
    vi.spyOn(link, 'matches').mockReturnValue(true);
    link.dispatchEvent(new FocusEvent('focus'));
    expect(preview.hasAttribute('data-active')).toBe(true);
    link.dispatchEvent(new FocusEvent('blur'));
    expect(preview.hasAttribute('data-active')).toBe(false);
    enter('mouse'); image.dispatchEvent(new Event('error'));
    expect(preview.hasAttribute('data-ready')).toBe(false);
    dispose(); enter('mouse');
    expect(preview.hasAttribute('data-active')).toBe(false);
    expect(() => setupFooterPreviews(null)()).not.toThrow();
  });
});

// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {mountBoardMotionReview} from '../../src/lib/review/board-motion-review';
import {mountReelBackdropReview} from '../../src/lib/review/reel-backdrop-review';
import {setupFooterPreviews} from '../../src/lib/footer-previews';

const controllers: AbortController[] = [];
const media = new Map<string, EventTarget & {matches: boolean}>();
const scroll = vi.fn();
const query = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
function controller() {
  const value = new AbortController();
  controllers.push(value);
  return value;
}
function mediaQuery(query: string) {
  if (!media.has(query)) media.set(query, Object.assign(new EventTarget(), {matches: !query.includes('reduced-motion')}));
  return media.get(query)!;
}
function click(selector: string) { query<HTMLButtonElement>(selector).click(); }
beforeEach(() => {
  vi.useFakeTimers();
  media.clear();
  scroll.mockClear();
  vi.stubGlobal('matchMedia', mediaQuery);
  vi.stubGlobal('scrollTo', scroll);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 16));
  vi.stubGlobal('cancelAnimationFrame', window.clearTimeout.bind(window));
  history.replaceState({}, '', '/');
  document.body.innerHTML = '<main data-logo-work-page data-handoff="true" data-logo-page-ready="true"><div data-logo-intro data-title-motion="settled"></div><div id="board"></div><section id="gallery"></section><section class="reel"></section></main><header class="site-header"></header>';
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({x: 40, y: 600, top: 600, bottom: 650, left: 40, right: 140, width: 100, height: 50, toJSON() {return {};}});
});
afterEach(() => {
  controllers.splice(0).forEach(value => value.abort());
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});
function boardReview() {
  return mountBoardMotionReview({board: query('#board'), page: query('[data-logo-work-page]'), gallery: query('#gallery'), signal: controller().signal, requestUpdate: vi.fn()});
}
const geometry = {dockX: 100, dockY: 500, targetX: 900, targetY: 350, travelled: 100, reduced: false};

describe('temporary board comparison controls', () => {
  it.each(['handoff', 'edge', 'track'])('%s keeps opacity bounded and reaches the destination in both motion modes', option => {
    history.replaceState({}, '', `/?board-motion=${option}`);
    const review = boardReview();
    expect(query('#board').dataset.motionOption).toBe(option);
    for (const progress of [0, .2, .4, .7, 1]) {
      const position = review.position({...geometry, progress});
      expect(position.opacity).toBeGreaterThanOrEqual(0);
      expect(position.opacity).toBeLessThanOrEqual(1);
    }
    expect(review.position({...geometry, progress: 1})).toEqual({x: 900, y: 350, opacity: 1});
    expect(review.position({...geometry, progress: 0, reduced: true})).toEqual({x: 100, y: 500, opacity: 1});
    expect(review.position({...geometry, progress: .8, reduced: true})).toEqual({x: 900, y: 350, opacity: 1});
  });
  it('changes options, replays once, stops on interruption, and cleans up all controls', () => {
    boardReview();
    const panel = query('[data-board-motion-review]');
    click('[data-board-option="edge"]');
    expect(location.search).toBe('?board-motion=edge');
    expect(query('[data-board-option="edge"]').getAttribute('aria-pressed')).toBe('true');
    vi.advanceTimersByTime(800);
    expect(scroll).toHaveBeenLastCalledWith(expect.objectContaining({behavior: 'smooth'}));
    window.dispatchEvent(new Event('scrollend'));
    expect(panel.dataset.replaying).toBeUndefined();
    click('[data-review-replay]');
    window.dispatchEvent(new Event('wheel'));
    expect(panel.dataset.replaying).toBeUndefined();
    click('[data-review-collapse]');
    expect(query('[data-review-collapse]').getAttribute('aria-expanded')).toBe('false');
    click('[data-review-collapse]');
    expect(query('[data-review-collapse]').getAttribute('aria-expanded')).toBe('true');
    const outerKey = vi.fn();
    window.addEventListener('keydown', outerKey, {signal: controller().signal});
    panel.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true}));
    panel.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true}));
    expect(outerKey).not.toHaveBeenCalled();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    const fine = mediaQuery('(min-width: 1000px) and (hover: hover) and (pointer: fine)');
    fine.matches = false; fine.dispatchEvent(new Event('change'));
    expect(query<HTMLButtonElement>('[data-review-replay]').disabled).toBe(true);
    fine.matches = true; fine.dispatchEvent(new Event('change'));
    const reduced = mediaQuery('(prefers-reduced-motion: reduce)');
    reduced.matches = true; reduced.dispatchEvent(new Event('change'));
    click('[data-review-replay]');
    vi.advanceTimersByTime(800);
    expect(scroll).toHaveBeenLastCalledWith(expect.objectContaining({behavior: 'instant'}));
    controllers[0]!.abort();
    expect(document.querySelector('[data-board-motion-review]')).toBeNull();
    expect(query('#board').dataset.motionOption).toBeUndefined();
  });
  it('waits for splash handoff before replaying and cancels a pending replay on disposal', () => {
    query('[data-logo-work-page]').dataset.handoff = 'false';
    query('[data-logo-intro]').dataset.titleMotion = 'entering';
    const navigate = vi.fn();
    window.addEventListener('new-work:work-navigation', navigate, {signal: controller().signal});
    boardReview();
    click('[data-review-replay]');
    vi.advanceTimersByTime(32);
    expect(navigate).toHaveBeenCalledOnce();
    expect(scroll).not.toHaveBeenCalled();
    query('[data-logo-work-page]').dataset.handoff = 'true';
    query('[data-logo-intro]').dataset.titleMotion = 'settled';
    vi.advanceTimersByTime(800);
    expect(scroll).toHaveBeenCalled();
    controllers[1]!.abort();
    const calls = scroll.mock.calls.length;
    vi.advanceTimersByTime(3000);
    expect(scroll).toHaveBeenCalledTimes(calls);
  });
});

describe('temporary reel backdrop controls', () => {
  it('switches every design, restores the original, and removes decoration on disposal', () => {
    const owner = controller();
    mountReelBackdropReview(query('.reel'), owner.signal);
    vi.advanceTimersByTime(300);
    expect(scroll).toHaveBeenLastCalledWith(expect.objectContaining({behavior: 'instant'}));
    for (const option of ['grid', 'film', 'signal', 'paper', 'projection']) {
      click(`[data-reel-option="${option}"]`);
      expect(query('.reel').dataset.reelBackdrop).toBe(option);
      expect(location.search).toBe(`?reel-backdrop=${option}`);
      expect(query(`[data-reel-option="${option}"]`).getAttribute('aria-pressed')).toBe('true');
    }
    click('[data-reel-option="original"]');
    expect(query('.reel').dataset.reelBackdrop).toBeUndefined();
    expect(query('.reel-study').hidden).toBe(true);
    click('[data-reel-collapse]');
    expect(query('[data-reel-collapse]').getAttribute('aria-expanded')).toBe('false');
    click('[data-reel-collapse]');
    expect(query('[data-reel-collapse]').getAttribute('aria-expanded')).toBe('true');
    const panel = query('[data-reel-backdrop-review]');
    panel.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true}));
    panel.dispatchEvent(new KeyboardEvent('keyup', {bubbles: true}));
    click('[data-reel-jump]');
    vi.advanceTimersByTime(300);
    expect(scroll).toHaveBeenLastCalledWith(expect.objectContaining({behavior: 'smooth'}));
    owner.abort();
    expect(document.querySelector('.reel-study')).toBeNull();
    expect(document.querySelector('[data-reel-backdrop-review]')).toBeNull();
    expect(document.head.querySelector('style')).toBeNull();
  });
  it('does not interrupt the user with delayed scrolling, but allows an explicit jump', () => {
    query('[data-logo-work-page]').dataset.logoPageReady = 'false';
    query('[data-logo-work-page]').dataset.handoff = 'false';
    mountReelBackdropReview(query('.reel'), controller().signal);
    vi.advanceTimersByTime(32);
    window.dispatchEvent(new Event('wheel'));
    query('[data-logo-work-page]').dataset.logoPageReady = 'true';
    vi.advanceTimersByTime(1000);
    expect(scroll).not.toHaveBeenCalled();
    click('[data-reel-jump]');
    vi.advanceTimersByTime(300);
    expect(scroll).toHaveBeenCalledOnce();
  });
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

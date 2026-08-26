import { describe, expect, it, vi } from 'vitest';
import {
  MOTION_EASE,
  MOTION_DURATION,
  MOTION_LIMIT,
  MOTION_PHYSICS,
  COLUMN_SCROLL_RESPONSES,
  COMPACT_COLUMN_SCROLL_RESPONSES,
  clampMotionValue,
  columnLagOffset,
  filterColumnScroll,
  frameAdjustedColumnAlpha,
  parseMotionValue,
  projectTransitionNames,
} from '../../src/lib/motion';
import {
  disposeMediaControllers,
  pauseDocumentMedia,
  pauseMediaControllers,
  refreshMediaControllers,
  registerMediaController,
} from '../../src/lib/motion/media-controller';
import {
  COARSE_POINTER_QUERY,
  DESKTOP_POINTER_QUERY,
  FINE_POINTER_QUERY,
  observePointerCapabilities,
  readPointerCapabilities,
} from '../../src/lib/motion/pointer-capability';
import {
  REDUCED_MOTION_QUERY,
  observeReducedMotion,
  prefersReducedMotion,
} from '../../src/lib/motion/reduced-motion';
import {
  observeReducedData,
  prefersReducedData,
} from '../../src/lib/motion/reduced-data';
import {
  MOTION_HOOK_SELECTOR,
  routeNeedsMotionRuntime,
} from '../../src/lib/motion/lifecycle';

const mediaSource = (matches: Record<string, boolean>) => ({
  matchMedia: (query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList,
});

describe('motion tokens and transition names', () => {
  it('keeps authored values inside the interaction safety limits', () => {
    expect(MOTION_EASE.softInOut).toBe('power2.inOut');
    expect(MOTION_LIMIT.galleryEntranceScale).toBe(1.12);
    expect(MOTION_DURATION.galleryEntranceDelay).toBe(0.45);
    expect(clampMotionValue(32, -18, 18)).toBe(18);
    expect(parseMotionValue('not-a-number', 3, -8, 8)).toBe(3);
    expect(MOTION_LIMIT.columnLagOffset).toBe(100);
    expect(MOTION_PHYSICS.maximumFrameStep).toBe(0.05);
  });

  it('keeps the four column filters frame-rate independent and monotonic', () => {
    expect(COLUMN_SCROLL_RESPONSES).toEqual([0.095, 0.075, 0.125, 0.110]);
    expect(frameAdjustedColumnAlpha(COLUMN_SCROLL_RESPONSES[0], 1 / 60))
      .toBeCloseTo(COLUMN_SCROLL_RESPONSES[0], 8);

    const oneThirtyFpsStep = filterColumnScroll(0, 1_000, COLUMN_SCROLL_RESPONSES[2], 1 / 30);
    const firstSixtyFpsStep = filterColumnScroll(0, 1_000, COLUMN_SCROLL_RESPONSES[2], 1 / 60);
    const twoSixtyFpsSteps = filterColumnScroll(
      firstSixtyFpsStep,
      1_000,
      COLUMN_SCROLL_RESPONSES[2],
      1 / 60,
    );
    expect(oneThirtyFpsStep).toBeCloseTo(twoSixtyFpsSteps, 8);
    expect(oneThirtyFpsStep).toBeGreaterThan(0);
    expect(oneThirtyFpsStep).toBeLessThan(1_000);
    expect(1_000 - firstSixtyFpsStep).toBeLessThan(MOTION_LIMIT.columnLagOffset);
    expect(columnLagOffset(1_000, 0)).toBe(100);
    expect(columnLagOffset(0, 1_000)).toBe(-100);

    let fastFiltered = 0;
    for (const target of [600, 1_400, 2_600, 4_200]) {
      fastFiltered = filterColumnScroll(
        fastFiltered,
        target,
        COLUMN_SCROLL_RESPONSES[1],
        1 / 60,
      );
      expect(Math.abs(target - fastFiltered)).toBeLessThan(MOTION_LIMIT.columnLagOffset);
    }
  });

  it('gives two-column layouts a pronounced but fully damped response split', () => {
    expect(COMPACT_COLUMN_SCROLL_RESPONSES).toEqual([0.18, 0.05]);

    const target = 80;
    let quick = 0;
    let heavy = 0;
    for (let frame = 0; frame < 6; frame += 1) {
      quick = filterColumnScroll(
        quick,
        target,
        COMPACT_COLUMN_SCROLL_RESPONSES[0],
        1 / 60,
      );
      heavy = filterColumnScroll(
        heavy,
        target,
        COMPACT_COLUMN_SCROLL_RESPONSES[1],
        1 / 60,
      );
    }
    expect((target - heavy) - (target - quick)).toBeGreaterThan(30);

    for (let frame = 0; frame < 240; frame += 1) {
      quick = filterColumnScroll(quick, target, COMPACT_COLUMN_SCROLL_RESPONSES[0], 1 / 60);
      heavy = filterColumnScroll(heavy, target, COMPACT_COLUMN_SCROLL_RESPONSES[1], 1 / 60);
    }
    expect(Math.abs(target - quick)).toBeLessThan(MOTION_PHYSICS.columnRestDistance);
    expect(Math.abs(target - heavy)).toBeLessThan(MOTION_PHYSICS.columnRestDistance);
  });

  it('creates stable, project-specific shared transition names', () => {
    expect(projectTransitionNames(' Mercury / An Unexpected Life ')).toEqual({
      media: 'project-mercury-an-unexpected-life-media',
      title: 'project-mercury-an-unexpected-life-title',
    });
    expect(projectTransitionNames('')).toEqual({
      media: 'project-untitled-media',
      title: 'project-untitled-title',
    });
  });
});

describe('motion preferences', () => {
  it('reads reduced motion without assuming a browser global', () => {
    expect(prefersReducedMotion(mediaSource({ [REDUCED_MOTION_QUERY]: true }))).toBe(true);
    expect(prefersReducedMotion(mediaSource({ [REDUCED_MOTION_QUERY]: false }))).toBe(false);
  });

  it('reports pointer and desktop capabilities independently', () => {
    expect(readPointerCapabilities(mediaSource({
      [FINE_POINTER_QUERY]: true,
      [COARSE_POINTER_QUERY]: false,
      [DESKTOP_POINTER_QUERY]: true,
    }))).toEqual({ coarse: false, desktopFine: true, fine: true, hover: true });
  });

  it('observes pointer-query changes and removes every listener', () => {
    const matches = new Map([
      [FINE_POINTER_QUERY, true],
      [COARSE_POINTER_QUERY, false],
      [DESKTOP_POINTER_QUERY, true],
    ]);
    const listeners = new Map<string, Set<() => void>>();
    const source = {
      matchMedia: (query: string) => ({
        matches: matches.get(query) ?? false,
        addEventListener: (_type: string, listener: () => void) => {
          const queryListeners = listeners.get(query) ?? new Set();
          queryListeners.add(listener);
          listeners.set(query, queryListeners);
        },
        removeEventListener: (_type: string, listener: () => void) => listeners.get(query)?.delete(listener),
      }) as unknown as MediaQueryList,
    };
    const values: boolean[] = [];
    const cleanup = observePointerCapabilities((pointer) => values.push(pointer.desktopFine), source);
    matches.set(DESKTOP_POINTER_QUERY, false);
    listeners.get(DESKTOP_POINTER_QUERY)?.forEach((listener) => listener());
    cleanup();

    expect(values).toEqual([true, false]);
    expect([...listeners.values()].every((queryListeners) => queryListeners.size === 0)).toBe(true);
  });

  it('subscribes to the reduced-motion query and returns a cleanup', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const query = {
      matches: true,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => listeners.delete(listener),
    } as unknown as MediaQueryList;
    const values: boolean[] = [];
    const cleanup = observeReducedMotion((value) => values.push(value), { matchMedia: () => query });
    listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    cleanup();

    expect(values).toEqual([true, false]);
    expect(listeners.size).toBe(0);
  });

  it('reads and observes Save-Data without assuming Network Information support', () => {
    const listeners = new Set<() => void>();
    const connection = {
      saveData: true,
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    } as unknown as EventTarget & { saveData: boolean };
    const source = { connection };
    const values: boolean[] = [];

    expect(prefersReducedData(source)).toBe(true);
    expect(prefersReducedData({})).toBe(false);
    const cleanup = observeReducedData((value) => values.push(value), source);
    connection.saveData = false;
    listeners.forEach((listener) => listener());
    cleanup();

    expect(values).toEqual([true, false]);
    expect(listeners.size).toBe(0);
  });
});

describe('lazy route runtime selection', () => {
  it('loads the animation runtime only for declarative hooks or registered route motion', () => {
    const staticRoot = { querySelector: vi.fn(() => null) };
    const animatedRoot = { querySelector: vi.fn(() => ({ dataset: {} })) };

    expect(routeNeedsMotionRuntime(staticRoot)).toBe(false);
    expect(staticRoot.querySelector).toHaveBeenCalledWith(MOTION_HOOK_SELECTOR);
    expect(routeNeedsMotionRuntime(animatedRoot)).toBe(true);
    expect(routeNeedsMotionRuntime(staticRoot, true)).toBe(true);
  });
});

describe('media lifecycle registration', () => {
  it('refreshes, pauses, destroys, and unregisters route-owned controllers', () => {
    const refresh = vi.fn();
    const pause = vi.fn();
    const destroy = vi.fn();
    const unregister = registerMediaController({ destroy, pause, refresh });

    refreshMediaControllers();
    pauseMediaControllers('document-hidden');
    disposeMediaControllers('route-swap');
    unregister();

    expect(refresh).toHaveBeenCalledOnce();
    expect(pause).toHaveBeenNthCalledWith(1, 'document-hidden');
    expect(pause).toHaveBeenNthCalledWith(2, 'route-swap');
    expect(destroy).toHaveBeenCalledOnce();
  });

  it('pauses document media but leaves explicitly persisted media alone', () => {
    const regularPause = vi.fn();
    const persistedPause = vi.fn();
    const root = {
      querySelectorAll: () => [
        { hasAttribute: () => false, pause: regularPause },
        { hasAttribute: (name: string) => name === 'data-transition-persist-media', pause: persistedPause },
      ],
    } as unknown as ParentNode;

    pauseDocumentMedia('route-swap', root);

    expect(regularPause).toHaveBeenCalledOnce();
    expect(persistedPause).not.toHaveBeenCalled();
  });
});

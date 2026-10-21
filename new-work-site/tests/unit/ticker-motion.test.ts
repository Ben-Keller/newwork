import {afterEach, describe, expect, it, vi} from 'vitest';
import {createFlapMotion, flapSequence} from '../../src/lib/ticker-motion';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function motionHarness(initial = 'A ') {
  let now = 0;
  let nextId = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callbacks.set(++nextId, callback);
    return nextId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => callbacks.delete(id));
  const advance = (time: number) => {
    now = time;
    const frame = [...callbacks.values()];
    callbacks.clear();
    frame.forEach(callback => callback(time));
  };
  const parts = ['[data-flap-top]', '[data-flap-glyph]', '[data-flap-leaf-top]', '[data-flap-leaf-bottom]'];
  const cells = [...initial].map(glyph => {
    const nodes = Object.fromEntries(parts.map(selector => [selector, {
      textContent: glyph, parentElement: {style: {transform: ''}},
    }]));
    return {dataset: {} as Record<string, string>, nodes, querySelector: (selector: string) => nodes[selector]};
  });
  const ticker = {querySelectorAll: () => cells} as unknown as HTMLElement;
  const motion = createFlapMotion(ticker);
  const visible = () => cells.map(cell => cell.nodes['[data-flap-glyph]']!.textContent).join('');
  return {advance, cells, motion, visible, callbacks};
}

describe('bounded split-flap sequences', () => {
  it('settles on every supported glyph with a bounded number of steps', () => {
    const alphabet = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:+-/&.';
    for (const from of alphabet) for (const to of alphabet) {
      const steps = flapSequence(from, to);
      expect(steps[0]).toBe(from);
      expect(steps.at(-1)).toBe(to);
      expect(steps.length).toBeLessThanOrEqual(15);
    }
    expect(flapSequence('A', 'A')).toEqual(['A']);
    expect(flapSequence('A', 'É')).toEqual(['A', 'É']);
  });

  it('settles a full-width hover label within 110ms of the latest target without speeding up ambient messages', () => {
    const {advance, cells, motion, visible, callbacks} = motionHarness(' '.repeat(20));
    const first = 'ABCDEFGHIJKLMNOPQRST';
    const latest = 'ZYXWVUTSRQPONMLKJIHG';
    motion.render(first, true, 'interactive');
    advance(50);
    expect(visible()).not.toBe(first);
    expect(cells.some(cell => cell.dataset.flipping === 'true')).toBe(true);
    motion.render(latest, true, 'interactive');
    expect(callbacks.size).toBe(1);
    advance(158);
    expect(visible()).toBe(latest);
    expect(callbacks.size).toBe(0);
    expect(cells.every(cell => cell.dataset.flipping === undefined)).toBe(true);

    motion.render(first, true);
    advance(666);
    expect(visible()).not.toBe(first);
    advance(2166);
    expect(visible()).toBe(first);
    expect(callbacks.size).toBe(0);
  });

  it('replaces interrupted targets, settles when hidden and cancels all work on disposal', () => {
    const {advance, cells, motion, visible, callbacks} = motionHarness();
    motion.render('Z9', true);
    advance(180);
    expect(visible()).not.toBe('Z9');
    expect(cells.some(cell => cell.dataset.flipping === 'true')).toBe(true);
    motion.render('BC', true);
    expect(callbacks.size).toBe(1);
    advance(225);
    advance(2500);
    expect(visible()).toBe('BC');
    expect(callbacks.size).toBe(0);
    expect(cells.every(cell => cell.dataset.flipping === undefined)).toBe(true);

    motion.render('XY', true);
    motion.render('OK', false);
    expect(visible()).toBe('OK');
    expect(callbacks.size).toBe(0);
    motion.render('OK', true);
    advance(2700);
    expect(callbacks.size).toBe(0);
    motion.render('AB', true);
    motion.dispose();
    advance(5000);
    expect(callbacks.size).toBe(0);
    expect(visible()).toBe('OK');
  });
});

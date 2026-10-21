import {describe, expect, it} from 'vitest';
import {boardPosition} from '../../src/lib/board-position';

describe('board scroll position', () => {
  it('never moves downward or passes its center stop as the page scrolls forward', () => {
    for (const initialDock of [230, 400, 420, 550, 900]) {
      for (const reduced of [false, true]) {
        let previous = boardPosition(initialDock, 0, 400, reduced);
        expect(previous).toBe(Math.max(initialDock, 400));
        for (let scroll = 1; scroll <= 1000; scroll++) {
          const position = boardPosition(initialDock - scroll, scroll, 400, reduced);
          expect(position).toBeLessThanOrEqual(previous);
          expect(position).toBeGreaterThanOrEqual(400);
          previous = position;
        }
        expect(previous).toBe(400);
      }
    }
  });

  it('follows the natural dock before slowing to a smooth stop, with identical reverse positions', () => {
    const position = (scroll: number) => boardPosition(700 - scroll, scroll, 400);
    expect(position(100)).toBe(600);
    // No velocity jump when the easing begins, and no snap at the midpoint.
    expect(position(204) - position(204.01)).toBeCloseTo(.01, 4);
    expect(position(299.99) - position(300)).toBeLessThan(.0001);
    const samples = Array.from({length: 401}, (_, scroll) => position(scroll));
    expect(samples.toReversed()).toEqual(Array.from({length: 401}, (_, i) => position(400 - i)));
  });

  it('starts at the sticky limit when the hero dock is already higher, and uses a direct stop for reduced motion', () => {
    for (const scroll of [0, 30, 200]) expect(boardPosition(320 - scroll, scroll, 400)).toBe(400);
    expect(boardPosition(450, 250, 400, true)).toBe(450);
    expect(boardPosition(350, 350, 400, true)).toBe(400);
  });
});

import { describe, expect, it } from 'vitest';
import { BtsMomentum } from '../../src/lib/bts-momentum';

const flick = (direction = 1) => {
  const momentum = new BtsMomentum(0, 0);
  for (const at of [16, 32, 48, 64, 80, 96]) momentum.record(direction * at, at);
  return momentum;
};

describe('BTS pointer momentum', () => {
  for (const direction of [-1, 1]) {
    it(`preserves a ${direction} flick through duplicate events, lift-off drift, and a brief stop`, () => {
      const momentum = flick(direction);
      momentum.record(direction * 96, 120);
      momentum.record(direction * 97.5, 196);
      momentum.record(direction * 97.5, 226);
      expect(momentum.release(226)).toEqual({ velocity: direction * 1000, direction });
    });

    it(`does not mistake a small opposite release jitter for a ${-direction} turn`, () => {
      const momentum = flick(direction);
      momentum.record(direction * 94, 180);
      expect(momentum.release(220)).toEqual({ velocity: direction * 1000, direction });
    });

    it(`remembers the ${direction} direction after an intentional hold brakes the throw`, () => {
      const momentum = flick(direction);
      momentum.record(direction * 97, 450);
      const released = momentum.release(500);
      expect(Math.abs(released.velocity)).toBe(0);
      expect(released.direction).toBe(direction);
    });
  }

  it('takes its release direction and speed from a real reversal', () => {
    const momentum = flick();
    momentum.record(84, 112);
    momentum.record(72, 128);
    expect(momentum.release(230)).toEqual({ velocity: -750, direction: -1 });
  });

  it('responds to a deliberate slowdown rather than keeping the peak speed', () => {
    const momentum = flick();
    for (const [at, x] of [[120, 110], [144, 118], [168, 124], [192, 128], [216, 132], [240, 136]] as const) {
      momentum.record(x, at);
    }
    expect(momentum.release(260).velocity).toBeGreaterThan(80);
    expect(momentum.release(260).velocity).toBeLessThan(350);
  });

  it('fades a longer release gap gradually before an intentional hold stops it', () => {
    const momentum = flick();
    expect(momentum.release(300).velocity).toBeGreaterThan(700);
    expect(momentum.release(380).velocity).toBeLessThan(400);
    expect(momentum.release(460).velocity).toBe(0);
  });

  it('can start a new throw after holding the previous one still', () => {
    const momentum = flick();
    momentum.record(100, 600);
    momentum.record(112, 616);
    expect(momentum.release(630)).toEqual({ velocity: 750, direction: 1 });
  });

  it('ignores stale coalesced events and repeated timestamps', () => {
    const momentum = new BtsMomentum(0, 0);
    momentum.record(16, 16);
    momentum.record(16, 16);
    momentum.record(500, 8);
    momentum.record(32, 32);
    expect(momentum.release(40)).toEqual({ velocity: 1000, direction: 1 });
  });

  it('does not infer a throw from a click or subpixel noise', () => {
    const momentum = new BtsMomentum(0, 0);
    for (const [at, x] of [[16, .2], [32, -.3], [48, 1], [64, -.7]] as const) momentum.record(x, at);
    expect(momentum.release(80)).toEqual({ velocity: 0, direction: 0 });
  });
});

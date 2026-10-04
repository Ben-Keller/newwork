interface Sample {
  at: number;
  x: number;
}

const SAMPLE_WINDOW_MS = 120;
const INTENT_DISTANCE_PX = 4;
const RELEASE_GRACE_MS = 160;
const HELD_STOP_MS = 360;

/** Tracks deliberate pointer movement in screen pixels, independently of renders. */
export class BtsMomentum {
  private samples: Sample[];
  private intentX: number;
  private direction = 0;
  private motion: { at: number; velocity: number } | null = null;

  constructor(x: number, at: number) {
    this.samples = [{ x, at }];
    this.intentX = x;
  }

  record(x: number, at: number): void {
    const last = this.samples.at(-1)!;
    if (at < last.at || Math.abs(x - last.x) < .5) return;
    if (at === last.at) last.x = x;
    else this.samples.push({ x, at });
    while (this.samples.length > 2 && this.samples[1]!.at < at - SAMPLE_WINDOW_MS) this.samples.shift();

    // A lift-off can report a duplicate position or a pixel or two of drift.
    // Only a meaningful new displacement may replace the remembered motion.
    const displacement = x - this.intentX;
    if (Math.abs(displacement) < INTENT_DISTANCE_PX) return;
    this.intentX = x;
    this.direction = Math.sign(displacement);

    // Fit the latest run in the intended direction. A real reversal starts a
    // fresh estimate instead of averaging opposite movements into a stop.
    let start = this.samples.length - 1;
    while (start > 0) {
      const previous = this.samples[start - 1]!;
      const current = this.samples[start]!;
      if (previous.at < at - SAMPLE_WINDOW_MS || Math.sign(current.x - previous.x) !== this.direction) break;
      start -= 1;
    }
    const points = this.samples.slice(start);
    const first = points[0]!;
    if (points.length < 2 || at - first.at < 4 || Math.abs(x - first.x) < INTENT_DISTANCE_PX) return;
    const meanTime = points.reduce((sum, point) => sum + point.at - at, 0) / points.length;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    let variance = 0;
    let covariance = 0;
    for (const point of points) {
      const time = point.at - at - meanTime;
      variance += time * time;
      covariance += time * (point.x - meanX);
    }
    if (variance > 0) this.motion = { at, velocity: covariance / variance * 1000 };
  }

  release(at: number): { velocity: number; direction: number } {
    const age = Math.max(0, at - (this.motion?.at ?? at));
    // Preserve a brief trackpad lift-off delay. An intentional hold still
    // brakes the throw, without forgetting which way the user turned.
    const hold = Math.min(1, Math.max(0, (age - RELEASE_GRACE_MS) / (HELD_STOP_MS - RELEASE_GRACE_MS)));
    const fade = 1 - hold * hold * (3 - 2 * hold);
    const velocity = this.motion && Math.sign(this.motion.velocity) === this.direction
      ? this.motion.velocity * fade : 0;
    return { velocity, direction: this.direction };
  }
}

const ALPHABET = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:+-/&.';
const STEP_MS = 90;

/** Forward-only mechanical steps, bounded so long labels settle in under 1.8s. */
export function flapSequence(from: string, to: string): string[] {
  if (from === to) return [to];
  const start = Math.max(0, ALPHABET.indexOf(from));
  const end = ALPHABET.indexOf(to);
  if (end < 0) return [from, to];
  const distance = (end - start + ALPHABET.length) % ALPHABET.length || 1;
  const steps = Math.min(distance, 14);
  return [from, ...Array.from({ length: steps }, (_, i) =>
    i === steps - 1 ? to : ALPHABET[(start + Math.ceil(distance * (i + 1) / steps)) % ALPHABET.length]!)];
}

export function createFlapMotion(ticker: HTMLElement) {
  const cells = [...ticker.querySelectorAll<HTMLElement>('[data-flap]')].map(element => ({
    element,
    top: element.querySelector<HTMLElement>('[data-flap-top]')!,
    bottom: element.querySelector<HTMLElement>('[data-flap-glyph]')!,
    leafTop: element.querySelector<HTMLElement>('[data-flap-leaf-top]')!,
    leafBottom: element.querySelector<HTMLElement>('[data-flap-leaf-bottom]')!,
  }));
  let frame = 0;
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
  const settle = (cell: typeof cells[number], glyph: string) => {
    cell.top.textContent = cell.bottom.textContent = glyph;
    cell.leafTop.textContent = cell.leafBottom.textContent = glyph;
    delete cell.element.dataset.flipping;
  };
  return {
    render(target: string, animate: boolean) {
      cancel();
      if (!animate) {
        cells.forEach((cell, i) => settle(cell, target[i] || ' '));
        return;
      }
      // A new hover replaces the in-flight target, using the currently visible
      // lower half. One shared RAF owns all cells; no queued timers survive it.
      cells.forEach(cell => settle(cell, cell.bottom.textContent || ' '));
      const moves = cells.map((cell, i) => ({
        cell, delay: i * 24, step: -1,
        sequence: flapSequence(cell.bottom.textContent || ' ', target[i] || ' '),
      }));
      const started = performance.now();
      const tick = (now: number) => {
        let pending = false;
        for (const move of moves) {
          const { cell, sequence } = move;
          const elapsed = now - started - move.delay;
          const duration = (sequence.length - 1) * STEP_MS;
          if (elapsed >= duration || duration === 0) {
            if (move.step !== Infinity) settle(cell, sequence.at(-1)!);
            move.step = Infinity;
            continue;
          }
          pending = true;
          if (elapsed < 0) continue;
          const step = Math.floor(elapsed / STEP_MS);
          const progress = (elapsed % STEP_MS) / STEP_MS;
          if (step !== move.step) {
            cell.top.textContent = cell.leafBottom.textContent = sequence[step + 1]!;
            cell.bottom.textContent = cell.leafTop.textContent = sequence[step]!;
            cell.element.dataset.flipping = 'true';
            move.step = step;
          }
          cell.leafTop.parentElement!.style.transform = `rotateX(${-Math.min(1, progress * 2) * 90}deg)`;
          cell.leafBottom.parentElement!.style.transform = `rotateX(${(1 - Math.max(0, progress * 2 - 1)) * 90}deg)`;
        }
        frame = pending ? requestAnimationFrame(tick) : 0;
      };
      frame = requestAnimationFrame(tick);
    },
    dispose: cancel,
  };
}

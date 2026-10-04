/* v8 ignore file -- pointer-driven presentation, covered by Playwright. */
import { clamp, lerp, prefersReducedMotion, readBtsItems } from './data';
import type { BtsItem } from '../types';

const STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16] as const;
const ISO = [200, 400, 800, 800, 1600, 3200, 6400, 12800] as const;
const OVERSCAN = 1.04;
const IRIS_OPEN = 106;
const ANALYSIS_WIDTH = 480;

const pad = (value: number): string => String(Math.floor(value)).padStart(2, '0');
const easeInOut = (t: number): number => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Loads an image for pixel analysis; resolves null if it can't be read. */
const loadForAnalysis = (src: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

export const mountViewfinder = (root: HTMLElement): (() => void) => {
  const items = readBtsItems(root);
  const frame = root.querySelector<HTMLElement>('[data-vf-frame]');
  const plates = Array.from(root.querySelectorAll<HTMLImageElement>('[data-vf-plate]'));
  const peaking = root.querySelector<HTMLCanvasElement>('[data-vf-peaking]');
  const histogram = root.querySelector<HTMLCanvasElement>('[data-vf-histogram]');
  const reticle = root.querySelector<HTMLElement>('[data-vf-reticle]');
  const iris = root.querySelector<SVGSVGElement>('[data-vf-iris]');
  const irisBlades = root.querySelector<SVGPathElement>('[data-vf-iris-blades]');
  const irisSeams = root.querySelector<SVGGElement>('[data-vf-iris-seams]');
  const aperture = root.querySelector<HTMLInputElement>('[data-vf-aperture]');
  const zoom = root.querySelector<HTMLInputElement>('[data-vf-zoom]');
  const roll = root.querySelector<HTMLElement>('[data-vf-roll]');
  if (!frame || plates.length !== 2 || !items.length) return () => undefined;

  const reduced = prefersReducedMotion();
  const controller = new AbortController();
  const { signal } = controller;
  let index = 0;
  let target = { x: .5, y: .45 };
  let focus = { x: .5, y: .45 };
  let frameLoop = 0;
  let visible = false;
  let settleTimer = 0;
  let busy = false;
  let analysisToken = 0;
  const startedAt = performance.now();

  const setText = (selector: string, text: string): void => {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = text;
  };

  // --- Optics -------------------------------------------------------------
  const applyAperture = (): void => {
    const step = Number(aperture?.value ?? 1);
    const amount = step / (STOPS.length - 1);
    const width = frame.clientWidth || 800;
    // Wide open: shallow focus and a bright plate. Stopped down: deep focus.
    frame.style.setProperty('--defocus', `${lerp(11, .4, amount ** .8).toFixed(2)}px`);
    frame.style.setProperty('--dof', `${Math.round(width * lerp(.1, .75, amount ** 1.4))}px`);
    frame.style.setProperty('--exposure', lerp(1.1, .86, amount).toFixed(3));
    const stop = `T${STOPS[step]}`;
    setText('[data-vf-stop]', stop);
    setText('[data-vf-iso]', String(ISO[step]));
    aperture?.setAttribute('aria-valuetext', stop);
  };

  const applyZoom = (): void => {
    const focal = Number(zoom?.value ?? 35);
    const scale = 1 + ((focal - 24) / (135 - 24)) * 1.6;
    frame.style.setProperty('--zoom', scale.toFixed(3));
    setText('[data-vf-focal]', `${focal}mm`);
    zoom?.setAttribute('aria-valuetext', `${focal}mm`);
  };

  const renderFocus = (): void => {
    const x = focus.x * 100;
    const y = focus.y * 100;
    frame.style.setProperty('--fx', `${x.toFixed(2)}%`);
    frame.style.setProperty('--fy', `${y.toFixed(2)}%`);
    // The plates are overscanned about their centre; map the point into them.
    frame.style.setProperty('--mx', `${(50 + (x - 50) / OVERSCAN).toFixed(2)}%`);
    frame.style.setProperty('--my', `${(50 + (y - 50) / OVERSCAN).toFixed(2)}%`);
    if (reticle) {
      reticle.style.left = `${x}%`;
      reticle.style.top = `${y}%`;
    }
    // Top of frame is far, bottom is near.
    const metres = lerp(14, .6, focus.y ** 1.2);
    setText('[data-vf-distance]', metres > 10 ? '∞' : `${metres.toFixed(1)}m`);
  };

  const loop = (now: number): void => {
    frameLoop = 0;
    const ease = reduced ? 1 : .16;
    focus = { x: lerp(focus.x, target.x, ease), y: lerp(focus.y, target.y, ease) };
    renderFocus();
    const elapsed = (now - startedAt) / 1000 + 14 * 60 + 22;
    setText('[data-vf-timecode]', `00:${pad(elapsed / 60)}:${pad(elapsed % 60)}:${pad((elapsed % 1) * 24)}`);
    if (visible) frameLoop = window.requestAnimationFrame(loop);
  };

  const aim = (x: number, y: number): void => {
    target = { x: clamp(x, .03, .97), y: clamp(y, .05, .95) };
    reticle?.setAttribute('data-locked', 'false');
    window.clearTimeout(settleTimer);
    // Autofocus "locks" once the operator holds still.
    settleTimer = window.setTimeout(() => reticle?.setAttribute('data-locked', 'true'), 380);
  };

  // --- Focus peaking and histogram, from the actual pixels ----------------
  const analyse = async (item: BtsItem): Promise<void> => {
    const token = ++analysisToken;
    const image = await loadForAnalysis(item.thumb);
    if (!image || token !== analysisToken || signal.aborted) return;
    const width = ANALYSIS_WIDTH;
    const height = Math.round(width * 9 / 16);
    const work = document.createElement('canvas');
    work.width = width;
    work.height = height;
    const context = work.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * cover;
    const drawHeight = image.naturalHeight * cover;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    let pixels: ImageData;
    try {
      pixels = context.getImageData(0, 0, width, height);
    } catch {
      return; // Cross-origin image without CORS: skip the analysis.
    }
    const luma = new Float32Array(width * height);
    const bins = new Uint32Array(64);
    for (let i = 0; i < luma.length; i += 1) {
      const value = .2126 * pixels.data[i * 4]! + .7152 * pixels.data[i * 4 + 1]! + .0722 * pixels.data[i * 4 + 2]!;
      luma[i] = value;
      bins[Math.min(63, Math.floor(value / 4))]! += 1;
    }
    if (peaking) {
      const output = context.createImageData(width, height);
      for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
          const at = y * width + x;
          const gx = -luma[at - width - 1]! - 2 * luma[at - 1]! - luma[at + width - 1]!
            + luma[at - width + 1]! + 2 * luma[at + 1]! + luma[at + width + 1]!;
          const gy = -luma[at - width - 1]! - 2 * luma[at - width]! - luma[at - width + 1]!
            + luma[at + width - 1]! + 2 * luma[at + width]! + luma[at + width + 1]!;
          const magnitude = Math.hypot(gx, gy);
          if (magnitude < 150) continue;
          output.data[at * 4] = 255;
          output.data[at * 4 + 1] = 45;
          output.data[at * 4 + 2] = 45;
          output.data[at * 4 + 3] = Math.min(255, (magnitude - 150) * 1.4);
        }
      }
      peaking.width = width;
      peaking.height = height;
      peaking.getContext('2d')?.putImageData(output, 0, 0);
    }
    if (histogram) {
      const chart = histogram.getContext('2d');
      if (chart) {
        const peak = Math.max(...bins);
        chart.clearRect(0, 0, histogram.width, histogram.height);
        chart.fillStyle = 'rgba(255, 255, 255, .8)';
        const barWidth = histogram.width / bins.length;
        bins.forEach((count, bin) => {
          const barHeight = (count / peak) * histogram.height;
          chart.fillRect(bin * barWidth, histogram.height - barHeight, barWidth - .5, barHeight);
        });
      }
    }
  };

  // --- Iris ---------------------------------------------------------------
  const drawIris = (radius: number, rotation: number): void => {
    if (!iris || !irisBlades || !irisSeams) return;
    if (radius >= IRIS_OPEN) {
      iris.style.display = 'none';
      return;
    }
    iris.style.display = '';
    const cx = 80;
    const cy = 45;
    const vertices = Array.from({ length: 8 }, (_, i) => {
      const angle = rotation + (i * Math.PI) / 4;
      return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)] as const;
    });
    const hole = vertices.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join('') + 'Z';
    irisBlades.setAttribute('d', `M-40,-40H200V130H-40Z${hole}`);
    // Each blade edge is one side of the opening, carried on past its corner.
    irisSeams.innerHTML = vertices.map(([x1, y1], i) => {
      const [x2, y2] = vertices[(i + 1) % vertices.length]!;
      const length = Math.hypot(x2 - x1, y2 - y1) || 1;
      const ux = (x2 - x1) / length;
      const uy = (y2 - y1) / length;
      return `<line x1="${x2.toFixed(2)}" y1="${y2.toFixed(2)}" x2="${(x2 + ux * 220).toFixed(2)}" y2="${(y2 + uy * 220).toFixed(2)}"/>`;
    }).join('');
  };

  const animateIris = (from: number, to: number, duration: number): Promise<void> => new Promise((resolve) => {
    if (reduced) {
      drawIris(to, 0);
      resolve();
      return;
    }
    const started = performance.now();
    const step = (now: number): void => {
      const t = clamp((now - started) / duration, 0, 1);
      const eased = easeInOut(t);
      const radius = lerp(from, to, eased);
      drawIris(radius, (1 - radius / IRIS_OPEN) * .9);
      if (t < 1) window.requestAnimationFrame(step);
      else resolve();
    };
    window.requestAnimationFrame(step);
  });

  // --- Shots --------------------------------------------------------------
  const showShot = (next: number): void => {
    const item = items[next];
    if (!item) return;
    index = next;
    plates.forEach((plate, plateIndex) => {
      plate.src = item.large;
      if (plateIndex === 1) plate.alt = `${item.note}, ${item.project}`;
    });
    setText('[data-vf-counter]', String(next + 1).padStart(2, '0'));
    setText('[data-vf-note]', item.note);
    setText('[data-vf-time]', item.time);
    setText('[data-vf-department]', item.department);
    const link = root.querySelector<HTMLAnchorElement>('[data-vf-link]');
    if (link) {
      link.href = item.href;
      link.firstChild!.textContent = `${item.project} `;
    }
    void analyse(item);
  };

  const goTo = async (next: number, capture: boolean): Promise<void> => {
    if (busy) return;
    busy = true;
    const taken = items[index];
    if (capture && taken && roll) {
      const shotIndex = index;
      const entry = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `Shot ${shotIndex + 1}: ${taken.note}`);
      const image = document.createElement('img');
      image.src = taken.thumb;
      image.alt = '';
      button.append(image);
      button.addEventListener('click', () => void goTo(shotIndex, false), { signal });
      entry.append(button);
      roll.prepend(entry);
    }
    await animateIris(IRIS_OPEN, 0, 240);
    const wrapped = (next + items.length) % items.length;
    showShot(wrapped);
    // Hold the iris shut until the next plate has decoded (or a beat passes).
    await Promise.race([
      Promise.all(plates.map((plate) => plate.decode().catch(() => undefined))),
      new Promise((resolve) => window.setTimeout(resolve, 700)),
    ]);
    await animateIris(0, IRIS_OPEN, 380);
    busy = false;
  };

  // --- Input --------------------------------------------------------------
  frame.addEventListener('pointermove', (event) => {
    const box = frame.getBoundingClientRect();
    aim((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
  }, { signal });

  let downAt = { x: 0, y: 0 };
  frame.addEventListener('pointerdown', (event) => { downAt = { x: event.clientX, y: event.clientY }; }, { signal });
  frame.addEventListener('click', (event) => {
    // A tap on touch screens first moves focus; it only takes the shot if the
    // finger didn't travel (scrolling past must not fire the shutter).
    if (Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 8) return;
    const box = frame.getBoundingClientRect();
    aim((event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height);
    void goTo(index + 1, true);
  }, { signal });

  frame.addEventListener('keydown', (event) => {
    const nudge = event.shiftKey ? .1 : .03;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-nudge, 0], ArrowRight: [nudge, 0], ArrowUp: [0, -nudge], ArrowDown: [0, nudge],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      aim(target.x + move[0], target.y + move[1]);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void goTo(index + 1, true);
    }
  }, { signal });

  root.querySelector('[data-vf-take]')?.addEventListener('click', () => void goTo(index + 1, true), { signal });
  root.querySelector('[data-vf-next]')?.addEventListener('click', () => void goTo(index + 1, false), { signal });
  root.querySelector('[data-vf-prev]')?.addEventListener('click', () => void goTo(index - 1, false), { signal });
  root.querySelectorAll<HTMLButtonElement>('[data-vf-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.vfToggle!;
      const on = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(on));
      root.dataset[key] = String(on);
    }, { signal });
  });
  aperture?.addEventListener('input', applyAperture, { signal });
  zoom?.addEventListener('input', applyZoom, { signal });

  const resizeObserver = new ResizeObserver(applyAperture);
  resizeObserver.observe(frame);
  const observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    if (visible && !frameLoop) frameLoop = window.requestAnimationFrame(loop);
  });
  observer.observe(frame);

  applyAperture();
  applyZoom();
  renderFocus();
  drawIris(IRIS_OPEN, 0);
  void analyse(items[0]!);

  return () => {
    controller.abort();
    resizeObserver.disconnect();
    observer.disconnect();
    window.clearTimeout(settleTimer);
    if (frameLoop) window.cancelAnimationFrame(frameLoop);
    roll?.replaceChildren();
  };
};

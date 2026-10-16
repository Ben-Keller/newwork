/* v8 ignore file -- interactive presentation, covered by Playwright. */
import { clamp, prefersReducedMotion, readBtsItems } from './data';
import type { BtsItem } from '../types';

type TransitionType = 'mix' | 'wipe' | 'dip';

const AUTO_MS = 900;
const DIRECTOR_IDLE_MS = 9000;
const DIRECTOR_STEP_MS = 5200;
const TYPES: TransitionType[] = ['mix', 'wipe', 'dip'];

const camLabel = (index: number): string => `CAM ${String(index + 1).padStart(2, '0')}`;
const pad = (value: number): string => String(Math.floor(value)).padStart(2, '0');

export const mountVideoVillage = (root: HTMLElement): (() => void) => {
  const items = readBtsItems(root);
  const program = root.querySelector<HTMLElement>('[data-vv-program]');
  const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-vv-layer]'));
  const tbar = root.querySelector<HTMLInputElement>('[data-vv-tbar]');
  if (!program || layers.length !== 2 || !tbar || items.length < 2) return () => undefined;

  const reduced = prefersReducedMotion();
  const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
  const controller = new AbortController();
  const { signal } = controller;
  const sources = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-vv-source]'));
  const typeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-vv-type]'));
  const directorButton = root.querySelector<HTMLButtonElement>('[data-vv-director]');
  const flash = root.querySelector<HTMLElement>('[data-vv-flash]');
  const lowerThird = root.querySelector<HTMLElement>('[data-vv-lower]');
  const timecode = root.querySelector<HTMLElement>('[data-vv-timecode]');
  const meters = Array.from(root.querySelectorAll<HTMLElement>('[data-vv-meter]'));

  let programIndex = 0;
  let previewIndex = 1;
  let active = 0;
  let type: TransitionType = 'mix';
  // A real T-bar is not sprung: after a take it stays where it was thrown and
  // the next transition runs the other way.
  let direction: 1 | -1 = 1;
  let progress = 0;
  let autoFrame = 0;
  let clockFrame = 0;
  let visible = false;
  let director = !reduced;
  let directorTimer = 0;
  let lastInteraction = 0;
  let lastMeterAt = 0;
  const levels = [.1, .1];
  const startedAt = performance.now();

  const layerParts = (layer: HTMLElement) => ({
    image: layer.querySelector<HTMLImageElement>('[data-vv-image]')!,
    video: layer.querySelector<HTMLVideoElement>('[data-vv-video]')!,
  });

  const loadLayer = (layer: HTMLElement, item: BtsItem): void => {
    const { image, video } = layerParts(layer);
    if (image.getAttribute('src') !== item.large) image.src = item.large;
    video.pause();
    video.dataset.playing = 'false';
    video.dataset.src = item.video ?? '';
    if (!item.video) video.removeAttribute('src');
  };

  const playProgramVideo = (): void => {
    layers.forEach((layer, index) => {
      const { video } = layerParts(layer);
      const shouldPlay = index === active && visible && !reduced && !saveData && Boolean(video.dataset.src);
      if (!shouldPlay) {
        video.pause();
        return;
      }
      if (video.getAttribute('src') !== video.dataset.src) video.src = video.dataset.src!;
      void video.play().then(() => { video.dataset.playing = 'true'; }).catch(() => undefined);
    });
  };

  const renderStates = (): void => {
    sources.forEach((source, index) => {
      source.dataset.state = index === programIndex ? 'program' : index === previewIndex ? 'preview' : 'idle';
      source.setAttribute('aria-pressed', String(index === previewIndex));
    });
  };

  const setText = (selector: string, text: string): void => {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = text;
  };

  const setPreview = (index: number): void => {
    const item = items[index];
    if (!item || index === programIndex) return;
    previewIndex = index;
    renderStates();
    const previewImage = root.querySelector<HTMLImageElement>('[data-vv-preview-image]');
    if (previewImage) previewImage.src = item.thumb;
    setText('[data-vv-preview-cam]', camLabel(index));
    setText('[data-vv-preview-note]', item.note);
    loadLayer(layers[1 - active]!, item);
    applyProgress(progress);
  };

  const applyProgress = (value: number): void => {
    progress = clamp(value, 0, 1);
    const outgoing = layers[active]!;
    const incoming = layers[1 - active]!;
    incoming.dataset.active = 'false';
    outgoing.style.opacity = '1';
    incoming.style.clipPath = '';
    if (type === 'mix') {
      incoming.style.opacity = String(progress);
    } else if (type === 'wipe') {
      incoming.style.opacity = progress > 0 ? '1' : '0';
      incoming.style.clipPath = `inset(0 ${((1 - progress) * 100).toFixed(2)}% 0 0)`;
    } else {
      // Dip to black: out through black, then up into the new shot.
      outgoing.style.opacity = String(clamp(1 - progress * 2, 0, 1));
      incoming.style.opacity = String(clamp(progress * 2 - 1, 0, 1));
    }
    incoming.style.zIndex = '1';
    outgoing.style.zIndex = '0';
    if (lowerThird) lowerThird.dataset.leaving = String(progress > .05);
    tbar.value = String(Math.round((direction === 1 ? progress : 1 - progress) * 1000));
  };

  const commit = (): void => {
    const incoming = layers[1 - active]!;
    const outgoing = layers[active]!;
    active = 1 - active;
    programIndex = previewIndex;
    [incoming, outgoing].forEach((layer) => {
      layer.style.removeProperty('opacity');
      layer.style.removeProperty('clip-path');
      layer.style.removeProperty('z-index');
    });
    incoming.dataset.active = 'true';
    outgoing.dataset.active = 'false';
    direction = direction === 1 ? -1 : 1;
    progress = 0;
    const item = items[programIndex]!;
    setText('[data-vv-cam]', camLabel(programIndex));
    setText('[data-vv-time]', item.time);
    setText('[data-vv-department]', item.department);
    setText('[data-vv-note]', item.note);
    const link = root.querySelector<HTMLAnchorElement>('[data-vv-link]');
    if (link) {
      link.href = item.href;
      link.textContent = item.project;
    }
    if (lowerThird) lowerThird.dataset.leaving = 'false';
    playProgramVideo();
    // Queue the next camera so the desk is always one take away from air.
    previewIndex = (programIndex + 1) % items.length;
    setPreview(previewIndex);
    tbar.value = direction === 1 ? '0' : '1000';
  };

  const cut = (): void => {
    if (autoFrame) window.cancelAnimationFrame(autoFrame);
    autoFrame = 0;
    if (flash && !reduced) {
      flash.dataset.cut = 'false';
      void flash.offsetWidth;
      flash.dataset.cut = 'true';
    }
    applyProgress(1);
    commit();
  };

  const auto = (): void => {
    if (autoFrame) return;
    if (reduced) {
      cut();
      return;
    }
    const from = progress;
    const started = performance.now();
    const step = (now: number): void => {
      const t = clamp((now - started) / (AUTO_MS * (1 - from || 1)), 0, 1);
      const eased = t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      applyProgress(from + (1 - from) * eased);
      if (t < 1) {
        autoFrame = window.requestAnimationFrame(step);
        return;
      }
      autoFrame = 0;
      commit();
    };
    autoFrame = window.requestAnimationFrame(step);
  };

  const setType = (next: TransitionType): void => {
    type = next;
    typeButtons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.vvType === next)));
    applyProgress(progress);
  };

  const touch = (): void => {
    lastInteraction = performance.now();
  };

  // --- Clock and meters ---------------------------------------------------
  const tick = (now: number): void => {
    clockFrame = 0;
    if (timecode) {
      const elapsed = (now - startedAt) / 1000 + 3600;
      timecode.textContent = `${pad(elapsed / 3600)}:${pad((elapsed / 60) % 60)}:${pad(elapsed % 60)}:${pad((elapsed % 1) * 24)}`;
    }
    if (now - lastMeterAt > 80) {
      lastMeterAt = now;
      const live = Boolean(items[programIndex]?.video);
      levels.forEach((level, channel) => {
        const target = live ? .45 + Math.random() * .5 : .08 + Math.random() * .12;
        levels[channel] = level + (target - level) * (target > level ? .7 : .25);
        meters[channel]?.style.setProperty('--level', levels[channel]!.toFixed(3));
      });
    }
    if (visible) clockFrame = window.requestAnimationFrame(tick);
  };

  // --- Auto-director ------------------------------------------------------
  const scheduleDirector = (): void => {
    window.clearTimeout(directorTimer);
    if (!director || !visible) return;
    directorTimer = window.setTimeout(() => {
      if (director && visible && performance.now() - lastInteraction > DIRECTOR_IDLE_MS) {
        setType(TYPES[(TYPES.indexOf(type) + 1) % TYPES.length]!);
        auto();
      }
      scheduleDirector();
    }, DIRECTOR_STEP_MS);
  };

  // --- Wiring -------------------------------------------------------------
  sources.forEach((source) => {
    source.addEventListener('click', () => {
      touch();
      const index = Number(source.dataset.vvSource);
      if (index === previewIndex) auto();
      else setPreview(index);
    }, { signal });
  });
  typeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      touch();
      setType(button.dataset.vvType as TransitionType);
    }, { signal });
  });
  root.querySelector('[data-vv-cut]')?.addEventListener('click', () => { touch(); cut(); }, { signal });
  root.querySelector('[data-vv-auto]')?.addEventListener('click', () => { touch(); auto(); }, { signal });
  tbar.addEventListener('input', () => {
    touch();
    if (autoFrame) {
      window.cancelAnimationFrame(autoFrame);
      autoFrame = 0;
    }
    const value = Number(tbar.value) / 1000;
    applyProgress(direction === 1 ? value : 1 - value);
    if (progress >= .999) commit();
  }, { signal });
  directorButton?.setAttribute('aria-pressed', String(director));
  directorButton?.addEventListener('click', () => {
    director = !director;
    directorButton.setAttribute('aria-pressed', String(director));
    lastInteraction = 0;
    scheduleDirector();
  }, { signal });

  const observer = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    playProgramVideo();
    if (visible && !clockFrame) clockFrame = window.requestAnimationFrame(tick);
    scheduleDirector();
  }, { threshold: .25 });
  observer.observe(program);

  loadLayer(layers[0]!, items[0]!);
  setPreview(1);
  renderStates();

  return () => {
    controller.abort();
    observer.disconnect();
    window.clearTimeout(directorTimer);
    if (autoFrame) window.cancelAnimationFrame(autoFrame);
    if (clockFrame) window.cancelAnimationFrame(clockFrame);
    layers.forEach((layer) => layerParts(layer).video.pause());
  };
};

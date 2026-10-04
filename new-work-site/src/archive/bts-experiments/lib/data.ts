import type { BtsItem } from '../types';

export const readBtsItems = (root: HTMLElement): BtsItem[] => {
  const source = root.closest('[data-bts-experiments]')?.querySelector('script[data-bts-items]');
  if (!source?.textContent) return [];
  try {
    const parsed: unknown = JSON.parse(source.textContent);
    return Array.isArray(parsed) ? parsed as BtsItem[] : [];
  } catch {
    return [];
  }
};

export const prefersReducedMotion = (): boolean => (
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

export const lerp = (from: number, to: number, amount: number): number => (
  from + (to - from) * amount
);

/** A shared <dialog> presenter for a single BTS frame. */
export const fillViewer = (dialog: HTMLDialogElement, item: BtsItem, position: string): void => {
  const image = dialog.querySelector<HTMLImageElement>('[data-viewer-image]');
  if (image) {
    image.src = item.large;
    image.alt = item.image.alt || `${item.project}, behind the scenes`;
    image.width = item.image.width;
    image.height = item.image.height;
  }
  const set = (selector: string, text: string): void => {
    const element = dialog.querySelector<HTMLElement>(selector);
    if (element) element.textContent = text;
  };
  set('[data-viewer-time]', item.time);
  set('[data-viewer-department]', item.department);
  set('[data-viewer-note]', item.note);
  set('[data-viewer-project]', [item.project, item.client, item.year].filter(Boolean).join(' · '));
  set('[data-viewer-position]', position);
  const link = dialog.querySelector<HTMLAnchorElement>('[data-viewer-link]');
  if (link) link.href = item.href;
};

/** Wires prev/next/close/backdrop/arrow keys for a BTS viewer dialog. */
export const createViewer = (
  dialog: HTMLDialogElement,
  items: BtsItem[],
  signal: AbortSignal,
  options: { label?: (item: BtsItem, index: number) => string; onShow?: (index: number) => void } = {},
): { open: (index: number) => void; current: () => number } => {
  let currentIndex = 0;
  const open = (index: number): void => {
    const item = items[index];
    if (!item) return;
    currentIndex = index;
    fillViewer(dialog, item, options.label?.(item, index) ?? `${index + 1} / ${items.length}`);
    const image = dialog.querySelector<HTMLImageElement>('[data-viewer-image]');
    // Restart any entrance animation for every frame, not just the first.
    if (image) {
      image.style.animation = 'none';
      void image.offsetWidth;
      image.style.removeProperty('animation');
    }
    options.onShow?.(index);
    if (!dialog.open) dialog.showModal();
  };
  const step = (delta: number): void => open((currentIndex + delta + items.length) % items.length);
  dialog.querySelector('[data-viewer-prev]')?.addEventListener('click', () => step(-1), { signal });
  dialog.querySelector('[data-viewer-next]')?.addEventListener('click', () => step(1), { signal });
  dialog.querySelector('[data-viewer-close]')?.addEventListener('click', () => dialog.close(), { signal });
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); }, { signal });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') step(-1);
    if (event.key === 'ArrowRight') step(1);
  }, { signal });
  signal.addEventListener('abort', () => { if (dialog.open) dialog.close(); });
  return { open, current: () => currentIndex };
};

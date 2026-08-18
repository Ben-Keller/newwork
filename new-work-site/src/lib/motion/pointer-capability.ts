import type { MatchMediaSource } from './reduced-motion';

export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';
export const COARSE_POINTER_QUERY = '(pointer: coarse)';
export const DESKTOP_POINTER_QUERY = '(min-width: 75rem)';

export interface PointerCapabilities {
  coarse: boolean;
  desktopFine: boolean;
  fine: boolean;
  hover: boolean;
}

const resolveMatchMediaSource = (source?: MatchMediaSource): MatchMediaSource | undefined => {
  if (source) return source;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
  return window;
};

export const readPointerCapabilities = (source?: MatchMediaSource): PointerCapabilities => {
  const matchMediaSource = resolveMatchMediaSource(source);
  if (!matchMediaSource) return { coarse: false, desktopFine: false, fine: false, hover: false };

  const fine = matchMediaSource.matchMedia(FINE_POINTER_QUERY).matches;
  const coarse = matchMediaSource.matchMedia(COARSE_POINTER_QUERY).matches;
  const desktop = matchMediaSource.matchMedia(DESKTOP_POINTER_QUERY).matches;
  return { coarse, desktopFine: fine && desktop, fine, hover: fine };
};

export const observePointerCapabilities = (
  listener: (capabilities: PointerCapabilities) => void,
  source?: MatchMediaSource,
): (() => void) => {
  const matchMediaSource = resolveMatchMediaSource(source);
  if (!matchMediaSource) {
    listener(readPointerCapabilities());
    return () => undefined;
  }

  const queries = [FINE_POINTER_QUERY, COARSE_POINTER_QUERY, DESKTOP_POINTER_QUERY]
    .map((query) => matchMediaSource.matchMedia(query));
  const onChange = (): void => listener(readPointerCapabilities(matchMediaSource));
  queries.forEach((query) => query.addEventListener('change', onChange));
  listener(readPointerCapabilities(matchMediaSource));

  return () => queries.forEach((query) => query.removeEventListener('change', onChange));
};


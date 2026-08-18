export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface MatchMediaSource {
  matchMedia: (query: string) => MediaQueryList;
}

const resolveMatchMediaSource = (source?: MatchMediaSource): MatchMediaSource | undefined => {
  if (source) return source;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
  return window;
};

export const prefersReducedMotion = (source?: MatchMediaSource): boolean =>
  resolveMatchMediaSource(source)?.matchMedia(REDUCED_MOTION_QUERY).matches ?? false;

export const observeReducedMotion = (
  listener: (reduced: boolean) => void,
  source?: MatchMediaSource,
): (() => void) => {
  const matchMediaSource = resolveMatchMediaSource(source);
  if (!matchMediaSource) {
    listener(false);
    return () => undefined;
  }

  const query = matchMediaSource.matchMedia(REDUCED_MOTION_QUERY);
  const onChange = (event: MediaQueryListEvent): void => listener(event.matches);
  listener(query.matches);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};


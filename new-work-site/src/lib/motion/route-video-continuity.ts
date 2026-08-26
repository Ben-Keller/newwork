type RouteVideoState = {
  slug: string;
  currentTime: number;
  playbackRate: number;
  wasPlaying: boolean;
  muted: boolean;
  capturedAt: number;
};

declare global {
  interface Window {
    __newWorkRouteVideoState?: RouteVideoState;
  }
}

const validTime = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

export const captureRouteVideo = (video: HTMLVideoElement, slug: string): void => {
  video.dataset.routeTransitionActive = 'true';
  window.__newWorkRouteVideoState = {
    slug,
    currentTime: validTime(video.currentTime),
    playbackRate: Number.isFinite(video.playbackRate) ? video.playbackRate : 1,
    wasPlaying: !video.paused && !video.ended,
    muted: video.muted,
    capturedAt: performance.now(),
  };
};

export const cancelRouteVideo = (video: HTMLVideoElement, slug: string): void => {
  video.removeAttribute('data-route-transition-active');
  if (window.__newWorkRouteVideoState?.slug === slug) {
    delete window.__newWorkRouteVideoState;
  }
};

const attachRouteSource = (video: HTMLVideoElement): void => {
  if (video.currentSrc || video.hasAttribute('src')) return;

  const deferredSource = video.querySelector<HTMLSourceElement>('source[data-deferred-source]');
  if (deferredSource?.dataset.src && !deferredSource.hasAttribute('src')) {
    deferredSource.src = deferredSource.dataset.src;
    video.load();
    return;
  }

  if (video.dataset.source) {
    video.src = video.dataset.source;
    video.preload = 'auto';
    video.load();
  }
};

const waitForMetadata = async (video: HTMLVideoElement): Promise<void> => {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return;
  await Promise.race([
    new Promise<void>((resolve) => {
      const settle = () => {
        video.removeEventListener('loadedmetadata', settle);
        video.removeEventListener('error', settle);
        resolve();
      };
      video.addEventListener('loadedmetadata', settle, { once: true });
      video.addEventListener('error', settle, { once: true });
    }),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1_200)),
  ]);
};

export const restoreRouteVideo = async (
  video: HTMLVideoElement,
  slug: string,
): Promise<boolean> => {
  const state = window.__newWorkRouteVideoState;
  if (!state || state.slug !== slug) return false;

  attachRouteSource(video);
  await waitForMetadata(video);

  const elapsed = state.wasPlaying
    ? Math.max(0, (performance.now() - state.capturedAt) / 1_000)
    : 0;
  const continuousTime = state.currentTime + elapsed;
  const duration = video.duration;
  const restoredTime = Number.isFinite(duration) && duration > 0
    ? (video.loop ? continuousTime % duration : Math.min(continuousTime, Math.max(0, duration - 0.05)))
    : continuousTime;

  try {
    video.currentTime = restoredTime;
    video.playbackRate = state.playbackRate;
    video.muted = state.muted;
  } catch {
    return false;
  }

  if (state.wasPlaying) {
    try {
      await video.play();
      if (video.matches('[data-preview-video]')) {
        video.dataset.playing = 'true';
        // Let the route transition finish before the gallery's normal
        // visibility pool is allowed to recycle this just-restored preview.
        video.dataset.routeContinuityUntil = String(performance.now() + 1_200);
      }
      if (video.matches('[data-short-loop]')) video.dataset.mediaActive = 'true';
    } catch {
      // The preserved frame and timestamp remain correct if autoplay is denied.
    }
  } else {
    video.pause();
  }

  video.dataset.routeVideoRestored = 'true';
  video.dataset.routeVideoOriginTime = state.currentTime.toFixed(3);
  delete window.__newWorkRouteVideoState;
  return true;
};

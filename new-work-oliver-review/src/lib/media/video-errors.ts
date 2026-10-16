const managedVideoSelector = 'video[data-error-managed-video]:not([data-video-error-ready])';

export function setupManagedVideoErrors(): void {
  document.querySelectorAll<HTMLVideoElement>(managedVideoSelector).forEach((video) => {
    video.dataset.videoErrorReady = 'true';
    video.addEventListener('error', () => {
      video.pause();
      video.controls = false;
      const error = video.parentElement?.querySelector<HTMLElement>('[data-error-media]');
      if (error) error.hidden = false;
    }, {once: true});
  });
}

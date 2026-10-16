export type MediaPauseReason = 'document-hidden' | 'reduced-motion' | 'route-swap' | 'save-data';

export interface ManagedMediaController {
  destroy?: () => void;
  pause: (reason: MediaPauseReason) => void;
  refresh?: () => void;
}

const controllers = new Set<ManagedMediaController>();

export const registerMediaController = (controller: ManagedMediaController): (() => void) => {
  controllers.add(controller);
  return () => controllers.delete(controller);
};

export const refreshMediaControllers = (): void => {
  controllers.forEach((controller) => controller.refresh?.());
};

export const pauseMediaControllers = (reason: MediaPauseReason): void => {
  controllers.forEach((controller) => controller.pause(reason));
};

export const disposeMediaControllers = (reason: MediaPauseReason): void => {
  controllers.forEach((controller) => {
    controller.pause(reason);
    controller.destroy?.();
  });
  controllers.clear();
};

export const pauseDocumentMedia = (
  reason: MediaPauseReason,
  root: ParentNode = document,
): void => {
  pauseMediaControllers(reason);
  root.querySelectorAll<HTMLMediaElement>('video, audio').forEach((media) => {
    if (media.hasAttribute('data-transition-persist-media')) return;
    media.pause();
  });

  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('new-work:media-pause', { detail: { reason } }));
  }
};

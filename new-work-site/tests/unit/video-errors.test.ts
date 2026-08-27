import {afterEach, describe, expect, it, vi} from 'vitest';
import {setupManagedVideoErrors} from '../../src/lib/media/video-errors';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('managed video errors', () => {
  it('initializes each video once and reveals its fallback after an error', () => {
    const fallback = {hidden: true};
    const pause = vi.fn();
    let errorListener: (() => void) | undefined;
    const video = {
      controls: true,
      dataset: {} as DOMStringMap,
      parentElement: {
        querySelector: () => fallback,
      },
      pause,
      addEventListener: (
        type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        if (type === 'error' && typeof listener === 'function') {
          errorListener = () => listener(new Event('error'));
        }
      },
    } as unknown as HTMLVideoElement;
    const querySelectorAll = vi.fn(() => [video]);
    vi.stubGlobal('document', {querySelectorAll});

    setupManagedVideoErrors();

    expect(video.dataset.videoErrorReady).toBe('true');
    expect(errorListener).toBeTypeOf('function');
    errorListener?.();
    expect(pause).toHaveBeenCalledOnce();
    expect(video.controls).toBe(false);
    expect(fallback.hidden).toBe(false);
  });
});

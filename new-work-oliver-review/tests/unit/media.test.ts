import { describe, expect, it } from 'vitest';
import {
  inferVideoMimeType,
  selectDeferredVideoSource,
} from '../../src/components/media/video-mime';

describe('video source metadata', () => {
  it.each([
    ['/film.mp4', 'video/mp4'],
    ['/film.WEBM?revision=2', 'video/webm'],
    ['https://cdn.sanity.io/files/project/dataset/film.mov#clip', 'video/quicktime'],
    ['/extensionless-source', 'video/mp4'],
  ])('infers the correct MIME type for %s', (source, expected) => {
    expect(inferVideoMimeType(source)).toBe(expected);
  });

  it('uses an explicit approved MIME type when one is supplied', () => {
    expect(inferVideoMimeType('/signed-source', 'video/webm')).toBe('video/webm');
  });

  it('selects the mobile Reel source only at the narrow breakpoint', () => {
    const data = {
      desktopSrc: '/reel-desktop.mp4',
      desktopType: 'video/mp4',
      mobileSrc: '/reel-mobile.webm',
      mobileType: 'video/webm',
    };

    expect(selectDeferredVideoSource(data, false)).toEqual({
      sourceUrl: '/reel-desktop.mp4',
      sourceType: 'video/mp4',
    });
    expect(selectDeferredVideoSource(data, true)).toEqual({
      sourceUrl: '/reel-mobile.webm',
      sourceType: 'video/webm',
    });
  });

  it('falls back to the desktop or single deferred source', () => {
    expect(selectDeferredVideoSource({ desktopSrc: '/desktop.mp4' }, true).sourceUrl)
      .toBe('/desktop.mp4');
    expect(selectDeferredVideoSource({ src: '/loop.mp4', type: 'video/mp4' }, false)).toEqual({
      sourceUrl: '/loop.mp4',
      sourceType: 'video/mp4',
    });
  });
});

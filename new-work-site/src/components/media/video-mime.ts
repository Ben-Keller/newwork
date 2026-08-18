import type { VideoView } from '../../lib/types';

export type VideoMimeType = NonNullable<VideoView['mimeType']>;

interface DeferredSourceData {
  src?: string;
  type?: string;
  desktopSrc?: string;
  desktopType?: string;
  mobileSrc?: string;
  mobileType?: string;
}

export function selectDeferredVideoSource(data: DeferredSourceData, narrow: boolean) {
  return {
    sourceUrl: (narrow && data.mobileSrc) || data.desktopSrc || data.src,
    sourceType: (narrow && data.mobileType) || data.desktopType || data.type,
  };
}

export function inferVideoMimeType(
  source: string | undefined,
  declaredType?: VideoView['mimeType'],
): VideoMimeType {
  if (declaredType) return declaredType;

  const path = source?.split(/[?#]/u, 1)[0]?.toLowerCase() || '';
  if (path.endsWith('.webm')) return 'video/webm';
  if (path.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
}

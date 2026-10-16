export type UnknownRecord = Record<string, unknown>;

export const PUBLICATION_BLOCKING_FLAGS = [
  'needsReview',
  'doNotPublishWithoutExplicitApproval',
  'prototypeOnly',
  'previewIsPlaceholder',
  'altNeedsReview',
  'needsApprovedEmbed',
  'needsApprovedMaster',
] as const;

export const PUBLIC_MEDIA_BLOCK_TYPES = new Set([
  'heroImage',
  'heroVideo',
  'fullBleedImage',
  'containedImage',
  'imagePair',
  'imageGrid',
  'video',
  'shortLoop',
]);

export const VIMEO_ID_PATTERN = /^\d+$/u;
export const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/u;
export const PLAYABLE_VIDEO_PATH_PATTERN = /\.(?:m4v|mov|mp4|webm)$/iu;
export const WEBVTT_PATH_PATTERN = /\.vtt$/iu;

export const SANITY_CDN_HOSTS = ['cdn.sanity.io'] as const;
export const PLAYER_FRAME_HOSTS = ['player.vimeo.com', 'www.youtube-nocookie.com'] as const;

export function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function hostMatches(hostname: string, approvedHosts: readonly string[]): boolean {
  const normalized = hostname.toLowerCase();
  return approvedHosts.some((host) => normalized === host || normalized.endsWith(`.${host}`));
}

export function parsedHttpsUrl(value: unknown): URL | undefined {
  if (!isNonEmptyString(value)) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url : undefined;
  } catch {
    return undefined;
  }
}

export function parseApprovedWatchUrl(value: unknown): {
  href: string;
  provider: 'vimeo' | 'youtube';
  providerId: string;
} | undefined {
  const url = parsedHttpsUrl(value);
  if (!url) return undefined;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);

  if (hostMatches(host, ['vimeo.com'])) {
    const candidate = hostMatches(host, ['player.vimeo.com']) && segments[0] === 'video'
      ? segments[1]
      : segments[0];
    return candidate && VIMEO_ID_PATTERN.test(candidate)
      ? { href: url.href, provider: 'vimeo', providerId: candidate }
      : undefined;
  }

  if (hostMatches(host, ['youtu.be'])) {
    const candidate = segments[0];
    return candidate && YOUTUBE_ID_PATTERN.test(candidate)
      ? { href: url.href, provider: 'youtube', providerId: candidate }
      : undefined;
  }

  if (hostMatches(host, ['youtube.com', 'youtube-nocookie.com'])) {
    const candidate = url.pathname === '/watch'
      ? url.searchParams.get('v') || undefined
      : segments[0] === 'embed' || segments[0] === 'shorts'
        ? segments[1]
        : undefined;
    return candidate && YOUTUBE_ID_PATTERN.test(candidate)
      ? { href: url.href, provider: 'youtube', providerId: candidate }
      : undefined;
  }

  return undefined;
}

export function safeApprovedWatchUrl(value: unknown): string | undefined {
  return parseApprovedWatchUrl(value)?.href;
}

export function isApprovedWatchUrl(value: unknown): boolean {
  return Boolean(parseApprovedWatchUrl(value));
}

export function safeHostedVideoUrl(value: unknown): string | undefined {
  const url = parsedHttpsUrl(value);
  return url && hostMatches(url.hostname, SANITY_CDN_HOSTS) && PLAYABLE_VIDEO_PATH_PATTERN.test(url.pathname)
    ? url.href
    : undefined;
}

export function isApprovedHostedMediaUrl(value: unknown): boolean {
  return Boolean(safeHostedVideoUrl(value));
}

export function safeWebVttUrl(value: unknown): string | undefined {
  const url = parsedHttpsUrl(value);
  return url && hostMatches(url.hostname, SANITY_CDN_HOSTS) &&
    url.pathname.includes('/files/') && WEBVTT_PATH_PATTERN.test(url.pathname)
    ? url.href
    : undefined;
}

export function isSafeEmail(value: unknown): value is string {
  return isNonEmptyString(value) &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) &&
    !/[\r\n]/u.test(value);
}

export function safeEditorialLink(value: unknown): string | undefined {
  if (!isNonEmptyString(value)) return undefined;
  const trimmed = value.trim();
  if (/^\/(?!\/)/u.test(trimmed)) return trimmed;
  if (/^mailto:/iu.test(trimmed)) {
    const email = trimmed.slice('mailto:'.length).split('?')[0];
    return isSafeEmail(email) ? trimmed : undefined;
  }
  return parsedHttpsUrl(trimmed)?.href;
}

export function idsAgreeWithWatchUrl(
  watchUrl: unknown,
  vimeoId: unknown,
  youtubeId: unknown,
): boolean {
  const parsed = parseApprovedWatchUrl(watchUrl);
  if (!parsed) return watchUrl === undefined || watchUrl === null || watchUrl === '';
  if (parsed.provider === 'vimeo' && isNonEmptyString(vimeoId)) return parsed.providerId === vimeoId;
  if (parsed.provider === 'youtube' && isNonEmptyString(youtubeId)) return parsed.providerId === youtubeId;
  return true;
}

import {hostMatches, parsedHttpsUrl} from '../../../shared/content-policy';
import {withBase} from '../base-path';
import {optionalRecord, stringFrom} from './normalization';

export function localPublicPath(source: string): string {
  const publicPath = source.startsWith('assets/web-ready/')
    ? source.replace('assets/web-ready/', '/media/')
    : source;
  return publicPath.startsWith('/') ? withBase(publicPath) : publicPath;
}

export function sourceUrl(value: unknown): string | undefined {
  if (typeof value === 'string') return localPublicPath(value);
  const record = optionalRecord(value);
  if (!record) return undefined;
  const asset = optionalRecord(record.asset);
  const source = stringFrom(record.url)
    || stringFrom(asset?.url)
    || stringFrom(record.assetUrl)
    || stringFrom(record.file);
  return source ? localPublicPath(source) : undefined;
}

export function isApprovedSanityAsset(value: unknown, kind: 'image' | 'file'): boolean {
  const url = parsedHttpsUrl(sourceUrl(value));
  if (!url || !hostMatches(url.hostname, ['cdn.sanity.io'])) return false;
  return url.pathname.includes(`/${kind === 'image' ? 'images' : 'files'}/`);
}

export function safeHttpsUrl(value: unknown): string | undefined {
  return parsedHttpsUrl(value)?.href;
}

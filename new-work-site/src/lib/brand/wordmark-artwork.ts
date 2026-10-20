import { createHash } from 'node:crypto';
import horizontal from '../../../public/media/brand/oliver-horizontal.svg?raw';
import type { BrandAssetView } from '../types';

// The supplied SVG is the only glyph/kerning source, including the media mask.
// Its drawing order is different from reading order.
const paths = [...horizontal.matchAll(/<path\b[^>]*\sd="([^"]+)"/gu)].map(match => match[1]!);
if (paths.length !== 8) throw new Error('The approved New Work wordmark must contain eight glyph paths.');
export const wordmarkGlyphs = [3, 5, 0, 1, 4, 6, 2, 7].map((pathIndex, index) => ({
  glyph: 'newwork.'[index]!,
  word: index < 3 ? 'new' : 'work',
  path: paths[pathIndex]!,
}));
export const wordmarkViewBox = horizontal.match(/viewBox="([^"]+)"/u)![1]!;
const approvedHash = createHash('sha1').update(horizontal).digest('hex');

// Sanity file URLs are content addressed. The approved CMS upload can use
// these exact inline paths; a different editor-uploaded logo uses one image
// for BOTH states, rather than silently retaining an obsolete splash logo.
export const usesApprovedWordmark = (asset?: BrandAssetView): boolean => !asset
  || asset.src.split(/[?#]/u)[0]!.endsWith(`/${approvedHash}.svg`)
  || asset.src.split(/[?#]/u)[0]!.endsWith('/media/brand/oliver-horizontal.svg');

import type { ContentMode, ImageView, SeoFields } from './types';

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

interface PageSeoInput {
  siteName: string;
  title?: string;
  description?: string;
  mode: ContentMode;
  seo?: SeoFields;
  defaultSeo?: SeoFields;
}

export function resolvePageSeo({
  siteName,
  title,
  description,
  mode,
  seo,
  defaultSeo,
}: PageSeoInput) {
  const generatedTitle = title && title !== siteName ? `${title} — ${siteName}` : title;

  return {
    title: seo?.metaTitle || generatedTitle || defaultSeo?.metaTitle || siteName,
    description:
      seo?.metaDescription ||
      description ||
      defaultSeo?.metaDescription ||
      `${siteName} — selected work.`,
    noIndex: mode !== 'production' || Boolean(seo?.noIndex ?? defaultSeo?.noIndex),
    shareImage: seo?.shareImage || defaultSeo?.shareImage,
    shareImageAlt:
      seo?.shareImageAlt ||
      defaultSeo?.shareImageAlt ||
      seo?.shareImage?.alt ||
      defaultSeo?.shareImage?.alt ||
      undefined,
  };
}

export function socialImageUrl(image: ImageView | undefined, siteUrl: URL): string | undefined {
  if (!image?.src) return undefined;

  try {
    const url = new URL(image.src, siteUrl);
    const hostname = url.hostname.toLowerCase();
    const isSanityImage =
      (hostname === 'cdn.sanity.io' || hostname.endsWith('.cdn.sanity.io')) &&
      url.pathname.includes('/images/');

    if (isSanityImage) {
      url.searchParams.set('w', String(SOCIAL_IMAGE_WIDTH));
      url.searchParams.set('h', String(SOCIAL_IMAGE_HEIGHT));
      url.searchParams.set('fit', 'crop');
      url.searchParams.set('auto', 'format');

      const focalPoint = image.objectPosition?.match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/u);
      if (focalPoint) {
        url.searchParams.set('crop', 'focalpoint');
        url.searchParams.set('fp-x', String(Number(focalPoint[1]) / 100));
        url.searchParams.set('fp-y', String(Number(focalPoint[2]) / 100));
      }
    }

    return url.href;
  } catch {
    return undefined;
  }
}

function attributeValue(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'iu'));
  return match?.[2]?.replaceAll('&amp;', '&');
}

export function isIndexableCanonicalHtml(html: string, expectedUrl: string): boolean {
  const tags = html.match(/<(?:meta|link)\b[^>]*>/giu) || [];
  const robots = tags.find((tag) =>
    /^<meta\b/iu.test(tag) && attributeValue(tag, 'name')?.toLowerCase() === 'robots',
  );
  const robotsTokens = (robots ? attributeValue(robots, 'content') : undefined)
    ?.toLowerCase()
    .split(/[\s,]+/u)
    .filter(Boolean) || [];
  if (robotsTokens.includes('noindex') || robotsTokens.includes('none')) return false;

  const canonical = tags.find((tag) =>
    /^<link\b/iu.test(tag) &&
    attributeValue(tag, 'rel')?.toLowerCase().split(/\s+/u).includes('canonical'),
  );
  const canonicalUrl = canonical ? attributeValue(canonical, 'href') : undefined;
  if (!canonicalUrl) return false;

  try {
    return new URL(canonicalUrl).href === new URL(expectedUrl).href;
  } catch {
    return false;
  }
}

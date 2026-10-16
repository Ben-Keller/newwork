import { describe, expect, it } from 'vitest';
import {
  isIndexableCanonicalHtml,
  resolvePageSeo,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
  socialImageUrl,
} from '../../src/lib/seo';
import type { ImageView } from '../../src/lib/types';

const defaultShareImage: ImageView = {
  src: 'https://cdn.sanity.io/images/project/production/default-share.jpg',
  width: 2400,
  height: 1600,
  alt: '',
};

describe('page SEO fallbacks', () => {
  it('uses page copy first and fills missing fields from the site default', () => {
    const resolved = resolvePageSeo({
      siteName: 'New Work',
      title: 'Contact',
      mode: 'production',
      defaultSeo: {
        metaTitle: 'New Work default title',
        metaDescription: 'Default studio description.',
        shareImage: defaultShareImage,
        noIndex: true,
      },
    });

    expect(resolved).toMatchObject({
      title: 'Contact — New Work',
      description: 'Default studio description.',
      shareImage: defaultShareImage,
      noIndex: true,
    });
  });

  it('allows an explicit page setting to override the default indexing setting', () => {
    expect(resolvePageSeo({
      siteName: 'New Work',
      mode: 'production',
      seo: { noIndex: false },
      defaultSeo: { noIndex: true },
    }).noIndex).toBe(false);
  });

  it('forces every prototype page to remain noindex', () => {
    expect(resolvePageSeo({
      siteName: 'New Work',
      mode: 'prototype',
      seo: { noIndex: false },
      defaultSeo: { noIndex: false },
    }).noIndex).toBe(true);
  });
});

describe('social image output', () => {
  it('applies a 1200 by 630 focal-point crop to Sanity share images', () => {
    const result = socialImageUrl({
      ...defaultShareImage,
      src: `${defaultShareImage.src}?rect=0,100,2400,1260`,
      objectPosition: '25% 75%',
    }, new URL('https://example.com'));
    const url = new URL(result!);

    expect(url.searchParams.get('rect')).toBe('0,100,2400,1260');
    expect(url.searchParams.get('w')).toBe(String(SOCIAL_IMAGE_WIDTH));
    expect(url.searchParams.get('h')).toBe(String(SOCIAL_IMAGE_HEIGHT));
    expect(url.searchParams.get('fit')).toBe('crop');
    expect(url.searchParams.get('crop')).toBe('focalpoint');
    expect(url.searchParams.get('fp-x')).toBe('0.25');
    expect(url.searchParams.get('fp-y')).toBe('0.75');
    expect(SOCIAL_IMAGE_WIDTH / SOCIAL_IMAGE_HEIGHT).toBeGreaterThanOrEqual(1.9);
    expect(SOCIAL_IMAGE_WIDTH / SOCIAL_IMAGE_HEIGHT).toBeLessThan(1.92);
  });
});

describe('sitemap page filtering', () => {
  const canonical = 'https://example.com/work/approved';

  it('keeps an indexable page only when its canonical matches the sitemap URL', () => {
    const html = `<meta name="robots" content="index, follow"><link rel="canonical" href="${canonical}">`;
    expect(isIndexableCanonicalHtml(html, canonical)).toBe(true);
  });

  it('rejects noindex pages and alternate canonicals', () => {
    expect(isIndexableCanonicalHtml(
      `<meta name="robots" content="noindex, nofollow"><link rel="canonical" href="${canonical}">`,
      canonical,
    )).toBe(false);
    expect(isIndexableCanonicalHtml(
      '<meta name="robots" content="index, follow"><link rel="canonical" href="https://example.com/work/other">',
      canonical,
    )).toBe(false);
  });
});

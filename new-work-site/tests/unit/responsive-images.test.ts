import { describe, expect, it } from 'vitest';
import { buildResponsiveAvifSrcset, buildResponsiveSrcset } from '../../src/lib/responsive-images';
import type { ImageView } from '../../src/lib/types';

const image = (src: string, width = 1000): ImageView => ({
  src,
  width,
  height: 750,
  alt: '',
});

describe('responsive image source sets', () => {
  it('maps checked-in WebP media to generated derivatives and the original source', () => {
    expect(buildResponsiveSrcset(image('/media/images/work/frame.webp'))).toBe([
      '/media/images/work/frame.w320.webp 320w',
      '/media/images/work/frame.w480.webp 480w',
      '/media/images/work/frame.w720.webp 720w',
      '/media/images/work/frame.w960.webp 960w',
      '/media/images/work/frame.webp 1000w',
    ].join(', '));
  });

  it('offers local AVIF candidates before the WebP fallback', () => {
    expect(buildResponsiveAvifSrcset(image('/media/images/work/frame.webp'))).toBe([
      '/media/images/work/frame.w320.avif 320w',
      '/media/images/work/frame.w480.avif 480w',
      '/media/images/work/frame.w720.avif 720w',
      '/media/images/work/frame.w960.avif 960w',
      '/media/images/work/frame.avif 1000w',
    ].join(', '));
    expect(buildResponsiveAvifSrcset(image('https://images.example.invalid/frame.webp'))).toBeUndefined();
  });

  it('adds non-destructive Sanity width transforms while retaining crop parameters', () => {
    const src = 'https://cdn.sanity.io/images/project/dataset/frame.jpg?rect=10,20,800,600';
    const srcset = buildResponsiveSrcset(image(src, 800));

    expect(srcset).toContain(`${src}&w=320&fit=max&auto=format 320w`);
    expect(srcset).toContain(`${src}&w=800&fit=max&auto=format 800w`);
  });

  it('leaves unsupported remote and non-WebP sources without invented derivatives', () => {
    expect(buildResponsiveSrcset(image('https://images.example.invalid/frame.jpg'))).toBeUndefined();
    expect(buildResponsiveSrcset(image('/media/images/work/frame.jpg'))).toBeUndefined();
  });
});

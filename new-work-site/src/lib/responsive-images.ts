import type { ImageView } from './types';

export const RESPONSIVE_IMAGE_WIDTHS = [320, 480, 720, 960, 1200, 1800, 2400] as const;
export const LOCAL_RESPONSIVE_IMAGE_WIDTHS = [320, 480, 720, 960, 1200] as const;

const localWidths = (source: ImageView): number[] => [...new Set([
  ...LOCAL_RESPONSIVE_IMAGE_WIDTHS.filter((width) => width < source.width),
  source.width,
])].sort((left, right) => left - right);

export const buildResponsiveAvifSrcset = (source: ImageView): string | undefined => {
  if (!/\/media\/images\/.+\.webp$/iu.test(source.src)) return undefined;
  return localWidths(source)
    .map((width) => {
      const suffix = width === source.width ? '.avif' : `.w${width}.avif`;
      return `${source.src.replace(/\.webp$/iu, suffix)} ${width}w`;
    })
    .join(', ');
};

export const buildResponsiveSrcset = (source: ImageView): string | undefined => {
  const isSanityImage = source.src.includes('cdn.sanity.io/images/');
  const isLocalImage = /\/media\/images\/.+\.webp$/iu.test(source.src);
  if (!isSanityImage && !isLocalImage) return undefined;
  const candidates = isSanityImage ? RESPONSIVE_IMAGE_WIDTHS : LOCAL_RESPONSIVE_IMAGE_WIDTHS;
  const widths = isLocalImage
    ? localWidths(source)
    : [...new Set([
      ...candidates.filter((width) => width < source.width),
      source.width,
    ])].sort((left, right) => left - right);

  if (isSanityImage) {
    const separator = source.src.includes('?') ? '&' : '?';
    return widths
      .map((width) => `${source.src}${separator}w=${width}&fit=max&auto=format ${width}w`)
      .join(', ');
  }
  if (isLocalImage) {
    return widths.map((width) => width === source.width
      ? `${source.src} ${width}w`
      : `${source.src.replace(/\.webp$/iu, `.w${width}.webp`)} ${width}w`).join(', ');
  }
  return undefined;
};

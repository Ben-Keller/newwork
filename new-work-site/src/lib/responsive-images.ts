import type { ImageView } from './types';

export const RESPONSIVE_IMAGE_WIDTHS = [320, 480, 720, 960, 1200, 1800, 2400] as const;
export const LOCAL_RESPONSIVE_IMAGE_WIDTHS = [320, 480, 720, 960, 1200] as const;
// The desktop gallery bleeds beyond its content frame, so each of its four
// tracks is closer to 27vw than 25vw. Mobile and tablet layouts are always two
// tracks. Keeping this value shared prevents preload and rendered candidates
// from drifting apart.
export const GALLERY_IMAGE_SIZES = '(min-width: 1800px) 485px, (min-width: 1200px) 27vw, 50vw';
// Project layouts only reflow at 768px. Keep their source-size hints continuous
// above that real layout breakpoint so crossing 1200px cannot swap decoded
// image candidates while the visible composition itself is unchanged.
export const PROJECT_HERO_IMAGE_SIZES = '(min-width: 768px) 56vw, 100vw';
export const PROJECT_CONTAINED_IMAGE_SIZES = '(min-width: 768px) 90vw, 100vw';
export const GALLERY_PHOTO_PRIMARY_IMAGE_SIZES = '(min-width: 768px) 58vw, 100vw';
export const GALLERY_PHOTO_DETAIL_IMAGE_SIZES = '(min-width: 768px) 78vw, 100vw';

const galleryCoverWidthScale = (source: ImageView, cardAspect: number): number => {
  if (source.width <= 0 || source.height <= 0 || cardAspect <= 0) return 1;
  // `sizes` normally describes the CSS width of the <img>. Gallery images use
  // object-fit: cover, though, so a landscape source inside the 4:5 tile is
  // enlarged from the tile height and cropped horizontally. Report that wider
  // painted raster requirement or the browser will choose a candidate that is
  // technically wide enough for the element but too small for the cover crop.
  return Math.max(1, (source.width / source.height) / cardAspect);
};

const sizeValue = (value: number, unit: 'px' | 'vw'): string => (
  `${Number(value.toFixed(unit === 'px' ? 0 : 3))}${unit}`
);

export const buildGalleryImageSizes = (
  source: ImageView,
  options: {
    cardAspect?: number;
    mobileSource?: ImageView;
  } = {},
): string => {
  const cardAspect = options.cardAspect ?? 4 / 5;
  const desktopScale = galleryCoverWidthScale(source, cardAspect);
  const mobileScale = galleryCoverWidthScale(options.mobileSource ?? source, cardAspect);

  return [
    `(min-width: 1800px) ${sizeValue(485 * desktopScale, 'px')}`,
    `(min-width: 1200px) ${sizeValue(27 * desktopScale, 'vw')}`,
    `(min-width: 768px) ${sizeValue(50 * desktopScale, 'vw')}`,
    sizeValue(50 * mobileScale, 'vw'),
  ].join(', ');
};

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

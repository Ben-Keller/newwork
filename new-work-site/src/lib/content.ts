import {sanityClient} from 'sanity:client';
import fixtureProjects from '../content/local/projects.json';
import fixtureSettings from '../content/local/site-settings.json';
import attributionRecords from '../content/local/asset-attribution.json';
import { michaelPhotoWork } from '../content/local/michael-gallery';
import {
  notesQuery,
  previewNotesQuery,
  previewProjectsQuery,
  previewSiteSettingsQuery,
  projectsQuery,
  siteSettingsQuery,
} from './groq';
import {parseCmsPayload} from './cms-contract';
import {
  enumValue,
  inferredLayoutVariant,
  inferredWorkTemplate,
  optionalRecord,
  presentationAccent,
  presentationColumn,
  presentationOffset,
  recordOrEmpty,
  stringFrom,
} from './content/normalization';
import {
  adjacentProjects,
  applyWorkGallery,
  buildPrototypeWorkGallery,
  buildWorkGallery,
  preferUnifiedWorkDocuments,
  sortProjects,
  workGalleryEntryId,
} from './content/work-gallery';
import {isApprovedSanityAsset, safeHttpsUrl, sourceUrl} from './content/assets';
import {
  hasBlockedContent,
  hasEligibleEnabledReel,
  isProductionEligible,
  isProductionEligibleNote,
} from './content/publication';
import {
  VIMEO_ID_PATTERN,
  YOUTUBE_ID_PATTERN,
  parseApprovedWatchUrl,
  safeApprovedWatchUrl,
  safeEditorialLink,
  safeHostedVideoUrl,
  safeWebVttUrl,
  isSafeEmail,
  type UnknownRecord,
} from '../../shared/content-policy';
import type {
  AboutPageView,
  AttributionRecord,
  BrandAssetView,
  CaptionBlock,
  ContentBlockView,
  ContentMode,
  CoverView,
  Credit,
  ImageGridBlock,
  ImagePairBlock,
  ImageView,
  FooterSettingsView,
  NavigationDestination,
  NoteView,
  ProjectOwner,
  ProjectType,
  ProjectView,
  ReelView,
  RichTextBlockView,
  RichTextView,
  SeoFields,
  SiteContent,
  SiteSettingsView,
  VideoView,
  WorkAssetView,
  WorkGalleryPlacementView,
  WorkPhotoView,
} from './types';
import {SANITY_API_VERSION} from './sanity-config';

const attribution = attributionRecords as Record<string, AttributionRecord>;
const fixtureProjectRecords = fixtureProjects as UnknownRecord[];
const fixtureSiteSettings = fixtureSettings as UnknownRecord;

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;

export function getContentMode(
  value: string | undefined = import.meta.env.PUBLIC_CONTENT_MODE,
): ContentMode {
  return value === 'production' || value === 'preview' ? value : 'prototype';
}

export {
  adjacentProjects,
  buildWorkGallery,
  isProductionEligible,
  isProductionEligibleNote,
  sortProjects,
  workGalleryEntryId,
};

export {safeApprovedWatchUrl, safeHostedVideoUrl};

function clampPercentage(value: unknown): number {
  const numeric = typeof value === 'number' ? value : 0.5;
  return Math.round(Math.min(1, Math.max(0, numeric)) * 100);
}

function plainText(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined;
  if (!Array.isArray(value)) return undefined;
  const text = value
    .flatMap((block) => (Array.isArray(block?.children) ? block.children : []))
    .map((child) => (typeof child?.text === 'string' ? child.text : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
}


function normalizeRichText(value: unknown): RichTextView | undefined {
  if (typeof value === 'string') {
    const text = value.trim();
    return text
      ? [{ _key: 'text-0', style: 'normal', level: 1, spans: [{ text, marks: [] }] }]
      : undefined;
  }
  if (!Array.isArray(value)) return undefined;
  const blocks = value.flatMap((candidate, blockIndex): RichTextBlockView[] => {
    if (!candidate || typeof candidate !== 'object') return [];
    const block = candidate as UnknownRecord;
    if (block._type && block._type !== 'block') return [];
    const markDefinitions = new Map<string, { href: string; openInNewTab: boolean }>();
    if (Array.isArray(block.markDefs)) {
      block.markDefs.forEach((definition: UnknownRecord) => {
        const key = typeof definition._key === 'string' ? definition._key : '';
        const href = safeEditorialLink(definition.href);
        if (key && href) {
          markDefinitions.set(key, { href, openInNewTab: definition.openInNewTab === true });
        }
      });
    }
    const spans = Array.isArray(block.children)
      ? block.children.flatMap((child: UnknownRecord) => {
          if (child?._type && child._type !== 'span') return [];
          if (typeof child?.text !== 'string' || child.text.length === 0) return [];
          const marks = Array.isArray(child.marks) ? child.marks.filter((mark): mark is string => typeof mark === 'string') : [];
          const linkKey = marks.find((mark) => markDefinitions.has(mark));
          return [{
            text: child.text,
            marks: marks.filter((mark): mark is 'strong' | 'em' => mark === 'strong' || mark === 'em'),
            link: linkKey ? markDefinitions.get(linkKey) : undefined,
          }];
        })
      : [];
    if (!spans.length) return [];
    const style = enumValue(block.style, ['h2', 'h3', 'blockquote'] as const) || 'normal';
    const listItem = block.listItem === 'bullet' || block.listItem === 'number'
      ? block.listItem
      : undefined;
    return [{
      _key: typeof block._key === 'string' ? block._key : `block-${blockIndex}`,
      style,
      listItem,
      level: Math.max(1, Math.min(6, Number(block.level) || 1)),
      spans,
    }];
  });
  return blocks.length ? blocks : undefined;
}

function normalizeCredits(value: unknown): Credit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((credit: UnknownRecord) => {
    const label = typeof credit.label === 'string' ? credit.label.trim() : '';
    const plainValue = typeof credit.value === 'string' ? credit.value.trim() : '';
    const richValue = plainText(credit.richValue);
    const resolvedValue = plainValue || richValue;
    if (!label || !resolvedValue) return [];
    return [{
      _key: typeof credit._key === 'string' ? credit._key : undefined,
      label,
      value: resolvedValue,
      url: safeHttpsUrl(credit.url),
    }];
  });
}

function normalizeAspectRatio(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/u);
  if (!match) return undefined;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? `${width} / ${height}` : undefined;
}

function cropFraction(value: unknown): number {
  const numeric = typeof value === 'number' ? value : 0;
  return Math.min(1, Math.max(0, numeric));
}

function resolveImage(
  value: unknown,
  options: { alt?: unknown; focalPoint?: UnknownRecord; needsReview?: boolean; caption?: unknown; credit?: unknown } = {},
): ImageView {
  const originalPath = typeof value === 'string' ? value : '';
  const details = originalPath ? attribution[originalPath] : undefined;
  const record = recordOrEmpty(value);
  const asset = recordOrEmpty(record.asset);
  const metadata = recordOrEmpty(asset.metadata);
  const dimensions = recordOrEmpty(metadata.dimensions);
  const source = sourceUrl(value) || '';
  const sourceWidth = Number(
    record.width || asset.width || dimensions.width || details?.width,
  ) || DEFAULT_WIDTH;
  const sourceHeight = Number(
    record.height || asset.height || dimensions.height || details?.height,
  ) || DEFAULT_HEIGHT;
  const crop = record.crop && typeof record.crop === 'object' ? record.crop as UnknownRecord : undefined;
  const left = cropFraction(crop?.left);
  const right = cropFraction(crop?.right);
  const top = cropFraction(crop?.top);
  const bottom = cropFraction(crop?.bottom);
  const hasCrop = source.includes('cdn.sanity.io/images/') && left + right < 0.99 && top + bottom < 0.99 &&
    (left > 0 || right > 0 || top > 0 || bottom > 0);
  const cropX = hasCrop ? Math.round(sourceWidth * left) : 0;
  const cropY = hasCrop ? Math.round(sourceHeight * top) : 0;
  const width = hasCrop ? Math.max(1, Math.round(sourceWidth * (1 - left - right))) : sourceWidth;
  const height = hasCrop ? Math.max(1, Math.round(sourceHeight * (1 - top - bottom))) : sourceHeight;
  const src = hasCrop
    ? `${source}${source.includes('?') ? '&' : '?'}rect=${cropX},${cropY},${width},${height}`
    : source;
  // Once an asset is in Sanity its hotspot is authoritative. The fixture focal
  // point is only a pre-seed fallback and must not shadow later Studio edits.
  const focalPoint = optionalRecord(record.hotspot) || options.focalPoint;
  const focalX = focalPoint && hasCrop
    ? (Number(focalPoint.x) - left) / (1 - left - right)
    : focalPoint?.x;
  const focalY = focalPoint && hasCrop
    ? (Number(focalPoint.y) - top) / (1 - top - bottom)
    : focalPoint?.y;
  return {
    src,
    width,
    height,
    alt: typeof options.alt === 'string' && !options.needsReview ? options.alt : '',
    caption: typeof options.caption === 'string' ? options.caption : undefined,
    credit: typeof options.credit === 'string' ? options.credit : undefined,
    objectPosition: focalPoint
      ? `${clampPercentage(focalX)}% ${clampPercentage(focalY)}%`
      : undefined,
    needsReview: Boolean(options.needsReview),
  };
}

function normalizeVideo(raw: UnknownRecord, projectTitle: string): VideoView {
  const libraryAsset = recordOrEmpty(raw.mediaItem);
  raw = {
    ...libraryAsset,
    ...raw,
    poster: raw.poster || libraryAsset.poster,
    externalUrl: raw.externalUrl || libraryAsset.videoUrl,
    alt: raw.alt || libraryAsset.alt,
    caption: raw.caption || libraryAsset.caption,
    credit: raw.credit || libraryAsset.credit,
  };
  const watch = parseApprovedWatchUrl(raw.externalUrl);
  const explicitVimeoId = typeof raw.vimeoId === 'string' && VIMEO_ID_PATTERN.test(raw.vimeoId)
    ? raw.vimeoId
    : undefined;
  const explicitYoutubeId = typeof raw.youtubeId === 'string' && YOUTUBE_ID_PATTERN.test(raw.youtubeId)
    ? raw.youtubeId
    : undefined;
  const vimeoId = explicitVimeoId || (watch?.provider === 'vimeo' ? watch.providerId : undefined);
  const youtubeId = explicitYoutubeId || (watch?.provider === 'youtube' ? watch.providerId : undefined);
  const provider = vimeoId ? 'vimeo' : youtubeId ? 'youtube' : undefined;
  const providerId = vimeoId || youtubeId;
  const sourceRecord = optionalRecord(raw.source || raw.file);
  const sourceAsset = optionalRecord(sourceRecord?.asset);
  const declaredMime = sourceAsset?.mimeType || sourceRecord?.mimeType;
  const remoteSource = safeHostedVideoUrl(raw.remoteSource);
  const inferredMime = remoteSource?.toLowerCase().includes('.webm')
    ? 'video/webm'
    : remoteSource?.toLowerCase().match(/\.(?:mov|m4v)(?:\?|$)/u)
      ? 'video/quicktime'
      : remoteSource
        ? 'video/mp4'
        : undefined;
  const mimeType = typeof declaredMime === 'string' && ['video/mp4', 'video/webm', 'video/quicktime'].includes(declaredMime)
    ? declaredMime as VideoView['mimeType']
    : inferredMime;
  const poster = raw.poster
    ? resolveImage(raw.poster, {
        alt: raw.alt,
        needsReview: Boolean(raw.altNeedsReview || raw.needsApprovedEmbed),
        caption: raw.caption,
        credit: raw.credit,
      })
    : undefined;
  return {
    src: sourceUrl(raw.source || raw.file) || remoteSource,
    mimeType,
    poster,
    externalUrl: watch?.href,
    provider,
    providerId: typeof providerId === 'string' ? providerId : undefined,
    width: Number(raw.width) || undefined,
    height: Number(raw.height) || undefined,
    aspectRatio: normalizeAspectRatio(raw.aspectRatio),
    caption: typeof raw.caption === 'string' ? raw.caption : undefined,
    credit: typeof raw.credit === 'string' ? raw.credit : undefined,
    transcript: typeof raw.transcript === 'string' ? raw.transcript : undefined,
    captionsFile: safeWebVttUrl(sourceUrl(raw.captionsFile)),
    captionsLanguage:
      typeof raw.captionsLanguage === 'string' && /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/u.test(raw.captionsLanguage)
        ? raw.captionsLanguage
        : 'en',
    captionsLabel: stringFrom(raw.captionsLabel) || 'English',
    accessibleDescription:
      typeof raw.accessibleDescription === 'string'
        ? raw.accessibleDescription
        : typeof raw.alt === 'string' && raw.alt
          ? raw.alt
          : projectTitle,
    prototypeOnly: Boolean(raw.prototypeOnly),
    needsApprovedEmbed: Boolean(raw.needsApprovedEmbed),
    sourceDurationSeconds: Number(raw.sourceDurationSeconds || raw.durationSeconds) || undefined,
  };
}

function resolveBlockImage(
  value: unknown,
  block: UnknownRecord,
  alt?: unknown,
  parentNeedsReview = false,
): ImageView {
  const assetRecord = value && typeof value === 'object' ? (value as UnknownRecord) : {};
  return resolveImage(value, {
    alt: alt ?? assetRecord.alt ?? block.alt,
    needsReview: Boolean(parentNeedsReview || assetRecord.altNeedsReview || block.altNeedsReview),
    caption: assetRecord.caption ?? block.caption,
    credit: assetRecord.credit ?? block.credit,
  });
}

function normalizeBlock(raw: UnknownRecord, projectTitle: string): ContentBlockView | null {
  const libraryAsset = recordOrEmpty(raw.mediaItem);
  const editorialBlock = {
    ...libraryAsset,
    ...raw,
    image: raw.image || libraryAsset.image,
    alt: raw.alt || libraryAsset.alt,
    caption: raw.caption || libraryAsset.caption,
    credit: raw.credit || libraryAsset.credit,
  };
  const base = {
    _key: String(raw._key || `${projectTitle}-${raw._type || 'block'}`),
    caption: typeof editorialBlock.caption === 'string' ? editorialBlock.caption : undefined,
    credit: typeof editorialBlock.credit === 'string' ? editorialBlock.credit : undefined,
  };
  switch (raw._type) {
    case 'heroImage':
      return {
        ...base,
        _type: 'heroImage',
        image: resolveBlockImage(editorialBlock.image, editorialBlock, editorialBlock.alt),
        displayWidth: enumValue(raw.displayWidth, ['contained', 'wide', 'fullBleed'] as const),
      };
    case 'heroVideo':
      return { ...base, _type: 'heroVideo', video: normalizeVideo(raw, projectTitle) };
    case 'fullBleedImage':
      return { ...base, _type: 'fullBleedImage', image: resolveBlockImage(editorialBlock.image, editorialBlock, editorialBlock.alt) };
    case 'containedImage':
      return {
        ...base,
        _type: 'containedImage',
        image: resolveBlockImage(editorialBlock.image, editorialBlock, editorialBlock.alt),
        width: raw.width === 'small' || raw.width === 'narrow'
          ? 'narrow'
          : raw.width === 'medium'
            ? 'medium'
            : raw.width === 'large' || raw.width === 'wide'
              ? 'wide'
              : undefined,
        alignment: enumValue(raw.alignment, ['left', 'center', 'right'] as const),
      };
    case 'imagePair': {
      const sources = raw.images || [raw.left, raw.right];
      if (!Array.isArray(sources) || sources.length < 2) return null;
      const left = sources[0] as UnknownRecord;
      const right = sources[1] as UnknownRecord;
      const leftLibrary = recordOrEmpty(left.mediaItem);
      const rightLibrary = recordOrEmpty(right.mediaItem);
      return {
        ...base,
        _type: 'imagePair',
        caption: typeof raw.sharedCaption === 'string' ? raw.sharedCaption : base.caption,
        images: [
          resolveBlockImage(left.image || leftLibrary.image || left, {...leftLibrary, ...left}, left.alt || leftLibrary.alt, Boolean(raw.altNeedsReview)),
          resolveBlockImage(right.image || rightLibrary.image || right, {...rightLibrary, ...right}, right.alt || rightLibrary.alt, Boolean(raw.altNeedsReview)),
        ],
        ratioHandling: enumValue(raw.ratioHandling, ['natural', 'matched', 'crop'] as const),
      } satisfies ImagePairBlock;
    }
    case 'imageGrid':
      return {
        ...base,
        _type: 'imageGrid',
        images: Array.isArray(raw.images)
          ? raw.images.map((value: unknown) => {
              const item = value && typeof value === 'object' ? value as UnknownRecord : {};
              const itemLibrary = recordOrEmpty(item.mediaItem);
              return resolveBlockImage(item.image || itemLibrary.image || value, {...itemLibrary, ...item}, item.alt || itemLibrary.alt, Boolean(raw.altNeedsReview));
            })
          : [],
        columns: (raw.desktopColumns ?? raw.columns) === 2 ? 2 : 3,
      } satisfies ImageGridBlock;
    case 'video':
      return { ...base, _type: 'video', video: normalizeVideo(raw, projectTitle) };
    case 'shortLoop':
      return {
        ...base,
        _type: 'shortLoop',
        video: normalizeVideo(raw, projectTitle),
        autoplayPolicy: raw.autoplayPolicy === 'inViewMuted' ? 'inViewMuted' : 'never',
      };
    case 'textNote':
      return {
        ...base,
        _type: 'textNote',
        text: plainText(raw.text || raw.body) || '',
        richText: normalizeRichText(raw.body || raw.text),
        alignment: enumValue(raw.alignment, ['left', 'center', 'right'] as const),
        maxWidth: enumValue(raw.maxWidth, ['narrow', 'medium', 'wide'] as const),
      };
    case 'caption':
      return {
        ...base,
        _type: 'caption',
        text: plainText(raw.text) || '',
        association: raw.association === 'next' ? 'next' : 'previous',
      } satisfies CaptionBlock;
    default:
      return null;
  }
}

function normalizeCover(raw: UnknownRecord): CoverView {
  const focalPoint = raw.focalPoint as UnknownRecord | undefined;
  const draftAlt = typeof raw.alt === 'string' && raw.alt.trim().toLowerCase().startsWith('draft:');
  return {
    poster: resolveImage(raw.poster, {
      alt: raw.alt,
      needsReview: Boolean(raw.altNeedsReview || draftAlt),
      focalPoint,
    }),
    previewVideo: sourceUrl(raw.previewVideo) || safeHostedVideoUrl(raw.previewVideoUrl),
    previewPosterOverride: raw.previewPosterOverride
      ? resolveImage(raw.previewPosterOverride, { alt: '', needsReview: true, focalPoint })
      : undefined,
    mobilePoster: raw.mobilePoster
      ? resolveImage(raw.mobilePoster, { alt: raw.alt, needsReview: Boolean(raw.altNeedsReview || draftAlt), focalPoint })
      : undefined,
    mediaType: raw.mediaType === 'motion' ? 'motion' : 'still',
    cardRatio: raw.cardRatio === 'wideFeature' ? 'wideFeature' : 'portrait',
    previewIsPlaceholder: Boolean(raw.previewIsPlaceholder),
    focalPoint: focalPoint
      ? {
          x: Number.isFinite(Number(focalPoint.x)) ? Number(focalPoint.x) : 0.5,
          y: Number.isFinite(Number(focalPoint.y)) ? Number(focalPoint.y) : 0.5,
          needsReview: Boolean(focalPoint.needsReview),
        }
      : undefined,
  };
}

function normalizeWorkPhoto(value: unknown, index: number): WorkPhotoView | undefined {
  const raw = optionalRecord(value);
  if (!raw) return undefined;
  const id = stringFrom(raw._id) || stringFrom(raw.id) || stringFrom(raw._key);
  const source = raw.image || raw.poster;
  if (!id || !source) return undefined;
  const image = resolveImage(source, {
    alt: raw.alt,
    needsReview: Boolean(raw.needsReview || raw.altNeedsReview),
    caption: raw.caption,
    credit: raw.credit,
  });
  if (!image.src) return undefined;
  return {
    id: id.replace(/^drafts\./u, ''),
    title: stringFrom(raw.title) || `Photo ${index + 1}`,
    image,
  };
}

function normalizeWorkAsset(value: unknown, index: number): WorkAssetView | undefined {
  const raw = optionalRecord(value);
  if (!raw) return undefined;
  const id = (stringFrom(raw._id) || stringFrom(raw.id) || stringFrom(raw._key))
    ?.replace(/^drafts\./u, '');
  const kind = enumValue(raw.kind, ['image', 'video', 'file'] as const);
  if (!id || !kind) return undefined;
  const title = stringFrom(raw.title) || `Asset ${index + 1}`;
  const slug = stringFrom(raw.slug) || stringFrom(optionalRecord(raw.slug)?.current) || id;
  if (kind === 'image') {
    const poster = resolveImage(raw.image, {
      alt: raw.alt,
      needsReview: Boolean(raw.needsReview || raw.altNeedsReview),
      caption: raw.caption,
      credit: raw.credit,
    });
    return poster.src ? {id, slug, title, kind, poster} : undefined;
  }
  if (kind === 'video') {
    const video = normalizeVideo(raw, title);
    return video.poster ? {id, slug, title, kind, poster: video.poster, video} : undefined;
  }
  const fileUrl = sourceUrl(raw.file);
  return fileUrl ? {id, slug, title, kind, fileUrl} : undefined;
}

function normalizeSeo(value: unknown): SeoFields | undefined {
  const raw = optionalRecord(value);
  if (!raw) return undefined;
  return {
    metaTitle: typeof raw.metaTitle === 'string' ? raw.metaTitle : undefined,
    metaDescription: typeof raw.metaDescription === 'string' ? raw.metaDescription : undefined,
    shareImage: raw.shareImage ? resolveImage(raw.shareImage, { alt: '' }) : undefined,
    shareImageAlt: stringFrom(raw.shareImageAlt),
    noIndex: typeof raw.noIndex === 'boolean' ? raw.noIndex : undefined,
  };
}

function normalizeBrandAsset(value: unknown): BrandAssetView | undefined {
  const raw = optionalRecord(value);
  if (!raw) return undefined;
  const asset = raw.format === 'file' ? raw.file : raw.image;
  const src = sourceUrl(asset);
  if (!src) return undefined;
  if (!src.startsWith('/') && !isApprovedSanityAsset(asset, raw.format === 'file' ? 'file' : 'image')) {
    return undefined;
  }
  if (raw.format === 'file' && !/\.(?:png|svg)(?:\?|$)/iu.test(src)) return undefined;
  const record = recordOrEmpty(asset);
  const assetRecord = recordOrEmpty(record.asset);
  const metadata = recordOrEmpty(assetRecord.metadata);
  const dimensions = recordOrEmpty(metadata.dimensions);
  const width = Number(raw.width || record.width || assetRecord.width || dimensions.width) || undefined;
  const height = Number(raw.height || record.height || assetRecord.height || dimensions.height) || undefined;
  return { src, width, height };
}

export function normalizeProject(raw: UnknownRecord): ProjectView {
  const slug = typeof raw.slug === 'string' ? raw.slug : recordOrEmpty(raw.slug).current;
  const owner = enumValue(raw.owner, ['oliver', 'michael', 'collective', 'other'] as const) || 'other';
  const types = Array.isArray(raw.types)
    ? raw.types.flatMap((type) => {
        const value = enumValue(type, ['Film', 'Photography', 'Campaign', 'Animation', 'BTS'] as const);
        return value ? [value] : [];
      })
    : [];
  const contributors = Array.isArray(raw.contributors)
    ? raw.contributors.flatMap((candidate) => {
        const contributor = optionalRecord(candidate);
        const name = stringFrom(contributor?.name);
        const role = stringFrom(contributor?.role);
        return name && role
          ? [{ _key: stringFrom(contributor?._key), name, role }]
          : [];
      })
    : [];
  const legacyLayout = enumValue(
    raw.layoutVariant,
    ['cinematic', 'photoEssay', 'campaign', 'experimental'] as const,
  );
  const template = enumValue(raw.template, ['photo', 'video', 'featured'] as const)
    || inferredWorkTemplate(types, legacyLayout);
  const assets = (Array.isArray(raw.assets) ? raw.assets : [])
    .map(normalizeWorkAsset)
    .filter((asset): asset is WorkAssetView => Boolean(asset));
  const photos = (Array.isArray(raw.photos) ? raw.photos : [])
    .map(normalizeWorkPhoto)
    .filter((photo): photo is WorkPhotoView => Boolean(photo));
  const defaultPhotoRecord = optionalRecord(raw.defaultPhoto);
  const defaultPhotoId = (stringFrom(defaultPhotoRecord?._id)
    || stringFrom(defaultPhotoRecord?._ref)
    || stringFrom(raw.defaultPhotoId))?.replace(/^drafts\./u, '');
  const defaultPhoto = photos.find((photo) => photo.id === defaultPhotoId) || photos[0];
  const normalizedCover = normalizeCover(recordOrEmpty(raw.cover));
  const cover = template === 'photo' && defaultPhoto
    ? {...normalizedCover, poster: defaultPhoto.image, mediaType: 'still' as const, previewVideo: undefined}
    : normalizedCover;
  return {
    id: String(raw.id || raw._id),
    title: String(raw.title || 'Untitled project'),
    slug: String(slug || raw._id),
    owner: owner satisfies ProjectOwner,
    client: typeof raw.client === 'string' && raw.client ? raw.client : undefined,
    year: Number(raw.year) || undefined,
    types: types satisfies ProjectType[],
    role: typeof raw.role === 'string' && raw.role ? raw.role : undefined,
    contributors,
    shortDescription:
      typeof raw.shortDescription === 'string' && raw.shortDescription
        ? raw.shortDescription
        : undefined,
    template,
    assets,
    photos,
    defaultPhotoId: defaultPhoto?.id,
    cover,
    contentBlocks: (Array.isArray(raw.contentBlocks) ? raw.contentBlocks : [])
      .map((block: UnknownRecord) => normalizeBlock(block, String(raw.title)))
      .filter((block): block is ContentBlockView => Boolean(block)),
    credits: normalizeCredits(raw.credits),
    whatWeDid: Array.isArray(raw.whatWeDid)
      ? raw.whatWeDid.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      : [],
    featuredOnHome: Boolean(raw.featuredOnHome),
    homeOrder: Number.isFinite(Number(raw.homeOrder))
      ? Number(raw.homeOrder)
      : Number.MAX_SAFE_INTEGER,
    homeCardSize: enumValue(raw.homeCardSize, ['standard', 'tall', 'large', 'wide'] as const) || 'standard',
    homeColumn: presentationColumn(raw.homeColumn),
    homeOffset: presentationOffset(raw.homeOffset),
    homeTreatment: enumValue(raw.homeTreatment, ['standard', 'masked', 'framed', 'poster'] as const) || 'standard',
    projectTheme: enumValue(raw.projectTheme, ['light', 'warm', 'dark', 'accent'] as const) || 'light',
    accentColor: presentationAccent(raw.accentColor),
    titleTreatment: enumValue(raw.titleTreatment, ['standard', 'stacked', 'oversized', 'split'] as const) || 'standard',
    heroTreatment: enumValue(raw.heroTreatment, ['contained', 'fullViewport', 'split', 'masked'] as const) || 'contained',
    layoutVariant: legacyLayout || inferredLayoutVariant(types),
    motionIntensity: enumValue(raw.motionIntensity, ['low', 'medium', 'high'] as const) || 'medium',
    editorialStatus: raw.editorialStatus === 'approved' || (
      raw.editorialStatus === undefined && raw.visible === true
    ) ? 'approved' : 'draft',
    visible: Boolean(raw.visible),
    publishAt: typeof raw.publishAt === 'string' ? raw.publishAt : undefined,
    needsReview: Boolean(raw.needsReview),
    doNotPublishWithoutExplicitApproval: Boolean(raw.doNotPublishWithoutExplicitApproval),
    seo: normalizeSeo(raw.seo),
  };
}

function normalizeReel(value: unknown): ReelView {
  const reel = recordOrEmpty(value);
  const structuredCredits = normalizeCredits(reel.credits);
  const reelCredits = structuredCredits.length
    ? structuredCredits.map((credit) => `${credit.label}: ${credit.value}`).join(' · ')
    : reel.credits;
  return {
    enabled: Boolean(reel.enabled),
    poster: reel.poster ? resolveImage(reel.poster, { alt: '' }) : undefined,
    desktopSource: sourceUrl(reel.desktopSource) || safeHostedVideoUrl(reel.desktopSourceUrl),
    mobileSource: sourceUrl(reel.mobileSource) || safeHostedVideoUrl(reel.mobileSourceUrl),
    caption: typeof reel.caption === 'string' ? reel.caption : undefined,
    credits: typeof reelCredits === 'string' && reelCredits ? reelCredits : undefined,
    ctaLabel: typeof reel.ctaLabel === 'string' ? reel.ctaLabel : undefined,
    ctaUrl: safeHttpsUrl(reel.ctaUrl),
    aspectRatio: normalizeAspectRatio(reel.aspectRatio) || '16 / 9',
  };
}

const DEFAULT_NAVIGATION: SiteSettingsView['navigation'] = [
  {label: 'Work', destination: 'work', visible: true},
  {label: 'About', destination: 'about', visible: true},
  {label: 'Contact', destination: 'contact', visible: true},
];

function normalizeNavigation(value: unknown): SiteSettingsView['navigation'] {
  if (!Array.isArray(value)) return DEFAULT_NAVIGATION;
  const navigation = value.flatMap((candidate): SiteSettingsView['navigation'] => {
    const item = optionalRecord(candidate);
    const label = stringFrom(item?.label);
    const destination = enumValue(
      item?.destination,
      ['work', 'about', 'notes', 'contact'] as const,
    );
    if (!label || !destination) return [];
    return [{
      _key: stringFrom(item?._key),
      label,
      destination: destination satisfies NavigationDestination,
      visible: item?.visible !== false,
    }];
  });
  return navigation.length ? navigation : DEFAULT_NAVIGATION;
}

function normalizeAboutPage(value: unknown): AboutPageView {
  const page = optionalRecord(value);
  return {
    openingLabel: stringFrom(page?.openingLabel) || 'Lorem ipsum dolor',
    openingHeadline: stringFrom(page?.openingHeadline)
      || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    openingNote: stringFrom(page?.openingNote) || 'Consectetur adipiscing',
    windingHeadline: stringFrom(page?.windingHeadline) || 'Consectetur adipiscing elit.',
    orbitHeadline: stringFrom(page?.orbitHeadline) || 'Sed do eiusmod tempor incididunt.',
    indexHeadline: stringFrom(page?.indexHeadline) || 'Ut enim ad minim veniam.',
    chaptersHeadline: stringFrom(page?.chaptersHeadline) || 'Duis aute irure dolor.',
    apertureHeadline: stringFrom(page?.apertureHeadline)
      || 'Excepteur sint occaecat cupidatat.',
    fallbackLabel: stringFrom(page?.fallbackLabel) || 'Lorem ipsum dolor',
    fallbackHeadline: stringFrom(page?.fallbackHeadline)
      || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    fallbackDescription: stringFrom(page?.fallbackDescription)
      || 'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    closingLabel: stringFrom(page?.closingLabel) || 'Lorem ipsum dolor',
    closingHeadline: stringFrom(page?.closingHeadline) || 'What should we make next?',
    ctaLabel: stringFrom(page?.ctaLabel) || 'Lorem ipsum',
    ctaDestination: enumValue(page?.ctaDestination, ['work', 'contact'] as const) || 'contact',
    seo: normalizeSeo(page?.seo) || {noIndex: true},
  };
}

function normalizeWorkGallery(value: unknown): WorkGalleryPlacementView[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((candidate, index): WorkGalleryPlacementView[] => {
    const placement = optionalRecord(candidate);
    const workId = stringFrom(placement?.workId) || stringFrom(placement?.projectId);
    if (!workId) return [];
    return [{
      _key: stringFrom(placement?._key) || `gallery-${index + 1}`,
      workId: workId.replace(/^drafts\./u, ''),
      assetId: stringFrom(placement?.assetId)?.replace(/^drafts\./u, ''),
      photoId: stringFrom(placement?.photoId)?.replace(/^drafts\./u, ''),
      cardSize: enumValue(placement?.cardSize, ['standard', 'tall', 'large', 'wide'] as const) || 'standard',
      treatment: enumValue(placement?.treatment, ['standard', 'masked', 'framed', 'poster'] as const) || 'standard',
    }];
  });
}

function normalizeFooter(value: unknown): FooterSettingsView {
  const footer = recordOrEmpty(value);
  const strapline = Array.isArray(footer.strapline)
    ? footer.strapline.flatMap((candidate, index) => {
        const line = optionalRecord(candidate);
        const text = stringFrom(line?.text);
        return text ? [{
          _key: stringFrom(line?._key) || `footer-line-${index + 1}`,
          text,
          emphasis: stringFrom(line?.emphasis),
        }] : [];
      })
    : [];
  const exploreLinks = Array.isArray(footer.exploreLinks)
    ? footer.exploreLinks.flatMap((candidate) => {
        const link = optionalRecord(candidate);
        const label = stringFrom(link?.label);
        const destination = enumValue(
          link?.destination,
          ['work', 'about', 'notes', 'contact', 'external'] as const,
        );
        const url = destination === 'external' ? safeHttpsUrl(link?.url) : undefined;
        if (!label || !destination || (destination === 'external' && !url)) return [];
        return [{_key: stringFrom(link?._key), label, destination, url}];
      })
    : [];

  return {
    strapline: strapline.length ? strapline : [
      {text: 'New Work is film.', emphasis: 'New Work'},
      {text: 'New Work is photography.', emphasis: 'New Work'},
      {text: 'We make beautiful work.', emphasis: 'beautiful'},
      {text: 'Come create with us.', emphasis: 'create'},
    ],
    peopleHeading: stringFrom(footer.peopleHeading) || 'People',
    exploreHeading: stringFrom(footer.exploreHeading) || 'Explore',
    connectHeading: stringFrom(footer.connectHeading) || 'Connect',
    exploreLinks: exploreLinks.length ? exploreLinks : [
      {label: 'Work', destination: 'work'},
      {label: 'About', destination: 'about'},
      {label: 'Contact', destination: 'contact'},
    ],
    contactLabel: stringFrom(footer.contactLabel),
    copyrightLine: stringFrom(footer.copyrightLine) || 'All rights reserved.',
    showYear: footer.showYear !== false,
  };
}

export function normalizeSiteSettings(
  raw: UnknownRecord,
  mode: ContentMode,
): SiteSettingsView {
  const contactOverride = import.meta.env.PUBLIC_CONTACT_EMAIL?.trim();
  const approvedContactOverride = isSafeEmail(contactOverride) ? contactOverride : undefined;
  const workPage = optionalRecord(raw.workPage);
  const aboutPage = optionalRecord(raw.aboutPage);
  const contactPage = optionalRecord(raw.contactPage);
  const fixtureFallback = mode === 'prototype' ? raw : {};
  const socialLinks = contactPage?.socialLinks ?? fixtureFallback.socialLinks;
  return {
    siteName: typeof raw.siteName === 'string' && raw.siteName ? raw.siteName : 'New Work Agency',
    navigation: normalizeNavigation(raw.navigation),
    workIntroName: stringFrom(workPage?.introName) || 'New Work',
    workGallery: normalizeWorkGallery(workPage?.gallery),
    wordmark: normalizeBrandAsset(raw.wordmark),
    compactMark: normalizeBrandAsset(raw.compactMark),
    manifesto: stringFrom(workPage?.manifesto) || stringFrom(fixtureFallback.manifesto),
    manifestoNeedsReview: !workPage && Boolean(fixtureFallback.manifestoNeedsReview),
    aboutPage: normalizeAboutPage(aboutPage || fixtureFallback.aboutPage),
    contactSeo: normalizeSeo(contactPage?.seo || fixtureFallback.contactSeo),
    contactHeading: stringFrom(contactPage?.heading) || 'Contact',
    contactIntroduction: normalizeRichText(contactPage?.introduction),
    contactEmail:
      approvedContactOverride || (isSafeEmail(contactPage?.email) ? contactPage.email : isSafeEmail(fixtureFallback.contactEmail) ? fixtureFallback.contactEmail : undefined),
    location: stringFrom(contactPage?.location) || stringFrom(fixtureFallback.location),
    socialLinks: Array.isArray(socialLinks)
      ? socialLinks.flatMap((item: UnknownRecord) => {
          const url = safeHttpsUrl(item.url);
          const label = typeof item.label === 'string' ? item.label.trim() : '';
          return url && label ? [{ _key: typeof item._key === 'string' ? item._key : undefined, label, url }] : [];
        })
      : [],
    reel: normalizeReel(workPage?.reel || fixtureFallback.reel),
    notesEnabled: Boolean(workPage ? workPage.notesEnabled : fixtureFallback.notesEnabled),
    defaultSeo: normalizeSeo(raw.defaultSeo) || { noIndex: true },
    footer: normalizeFooter(raw.footer),
  };
}

function normalizeNote(raw: UnknownRecord): NoteView {
  const slug = typeof raw.slug === 'string' ? raw.slug : recordOrEmpty(raw.slug).current;
  const mediaRaw = recordOrEmpty(raw.media);
  let media: ImageView | VideoView;
  if (mediaRaw.kind === 'image' || mediaRaw.image) {
    media = resolveImage(mediaRaw.image, {
      alt: mediaRaw.alt,
      needsReview: Boolean(mediaRaw.altNeedsReview),
      caption: mediaRaw.caption,
      credit: mediaRaw.credit,
    });
  } else {
    const parsedWatch = parseApprovedWatchUrl(mediaRaw.remoteUrl);
    const remoteUrl = parsedWatch?.href;
    const provider = parsedWatch?.provider;
    media = normalizeVideo({
      source: mediaRaw.file,
      poster: mediaRaw.poster,
      alt: mediaRaw.alt,
      externalUrl: remoteUrl,
      vimeoId: provider === 'vimeo' ? mediaRaw.remotePlayerId : undefined,
      youtubeId: provider === 'youtube' ? mediaRaw.remotePlayerId : undefined,
      width: mediaRaw.intrinsicWidth,
      height: mediaRaw.intrinsicHeight,
      aspectRatio: mediaRaw.intrinsicWidth && mediaRaw.intrinsicHeight
        ? `${mediaRaw.intrinsicWidth}:${mediaRaw.intrinsicHeight}`
        : undefined,
      caption: mediaRaw.caption,
      credit: mediaRaw.credit,
      transcript: mediaRaw.transcript,
      captionsFile: mediaRaw.captionsFile,
      captionsLanguage: mediaRaw.captionsLanguage,
      captionsLabel: mediaRaw.captionsLabel,
      accessibleDescription: mediaRaw.alt,
    }, String(raw.title));
  }
  return {
    id: String(raw.id || raw._id),
    title: String(raw.title),
    slug: String(slug),
    date: String(raw.date),
    summary: String(raw.summary || ''),
    media,
    body: normalizeRichText(raw.body),
    seo: normalizeSeo(raw.seo),
  };
}

export function getFixtureProjects(): ProjectView[] {
  return sortProjects(fixtureProjectRecords.map(normalizeProject));
}

function prototypeContent(): SiteContent {
  const projects = sortProjects([...getFixtureProjects(), michaelPhotoWork]);
  return {
    mode: 'prototype',
    settings: normalizeSiteSettings(fixtureSiteSettings, 'prototype'),
    projects,
    galleryEntries: buildPrototypeWorkGallery(projects, michaelPhotoWork.id),
    notes: [],
  };
}

async function sanityContent(mode: 'preview' | 'production'): Promise<SiteContent> {
  const previewToken = mode === 'preview' ? import.meta.env.SANITY_PREVIEW_TOKEN : undefined;
  if (mode === 'preview' && !previewToken) {
    throw new Error('Preview mode requires the server-only SANITY_PREVIEW_TOKEN.');
  }

  const client = sanityClient.withConfig({
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    token: previewToken,
    perspective: mode === 'preview' ? 'previewDrafts' : 'published',
  });

  try {
    const [settingsRaw, projectsRaw] = mode === 'preview' ? await Promise.all([
      client.fetch(previewSiteSettingsQuery),
      client.fetch(previewProjectsQuery),
    ]) : await Promise.all([
      client.fetch(siteSettingsQuery),
      client.fetch(projectsQuery),
    ]);
    if (!settingsRaw) {
      throw new Error('The approved siteSettings singleton is missing or contains blocked public assets.');
    }
    if (mode === 'production') {
      const rawSettings = settingsRaw as UnknownRecord;
      const workPage = recordOrEmpty(rawSettings.workPage);
      const reel = recordOrEmpty(workPage.reel);
      const publicSingletonContent = {
        brand: {
          wordmark: rawSettings.wordmark,
          compactMark: rawSettings.compactMark,
          defaultSeo: rawSettings.defaultSeo,
        },
        workSeo: workPage.seo,
        activeReel: reel.enabled === true ? reel : undefined,
        aboutPage: rawSettings.aboutPage,
        contactPage: rawSettings.contactPage,
      };
      if (hasBlockedContent(publicSingletonContent)) {
        throw new Error('A public page singleton still contains a blocking review or approval flag.');
      }
    }
    const preliminarySettings = normalizeSiteSettings(settingsRaw as UnknownRecord, mode);
    const notesRaw = preliminarySettings.notesEnabled
      ? await client.fetch(mode === 'preview' ? previewNotesQuery : notesQuery)
      : [];
    const parsed = parseCmsPayload({settings: settingsRaw, projects: projectsRaw, notes: notesRaw});
    const settings = normalizeSiteSettings(parsed.settings, mode);
    if (mode === 'production' && !hasEligibleEnabledReel(settings.reel)) {
      throw new Error('The enabled Reel is missing an approved poster or hosted source.');
    }
    const eligibleProjects = mode === 'production'
      ? parsed.projects.filter((project) => isProductionEligible(project))
      : parsed.projects;
    const projects = applyWorkGallery(
      preferUnifiedWorkDocuments(eligibleProjects).map(normalizeProject),
      settings.workGallery,
    );
    if (mode === 'production' && (projects.length === 0 || !projects.some((project) => project.featuredOnHome))) {
      throw new Error('Production requires at least one approved project featured on the home page.');
    }
    if (mode === 'production' && settings.manifestoNeedsReview) settings.manifesto = undefined;
    const notes = settings.notesEnabled || mode === 'preview'
      ? (mode === 'production' ? parsed.notes.filter(isProductionEligibleNote) : parsed.notes).map(normalizeNote)
      : [];
    const galleryEntries = buildWorkGallery(
      projects.filter((project) => mode !== 'production' || project.featuredOnHome),
      settings.workGallery,
    );
    return { mode, settings, projects, galleryEntries, notes };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Sanity ${mode} content could not be loaded; fixture fallback is disabled. ${message}`);
  }
}

let contentPromise: Promise<SiteContent> | undefined;

export function getSiteContent(): Promise<SiteContent> {
  if (!contentPromise) {
    const mode = getContentMode();
    contentPromise = mode === 'prototype'
      ? Promise.resolve(prototypeContent())
      : sanityContent(mode);
  }
  return contentPromise;
}

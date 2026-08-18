import { createClient } from '@sanity/client';
import fixtureProjects from '../content/local/projects.json';
import fixtureSettings from '../content/local/site-settings.json';
import attributionRecords from '../content/local/asset-attribution.json';
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
  PUBLICATION_BLOCKING_FLAGS,
  PUBLIC_MEDIA_BLOCK_TYPES,
  VIMEO_ID_PATTERN,
  YOUTUBE_ID_PATTERN,
  hostMatches,
  idsAgreeWithWatchUrl,
  isNonEmptyString,
  isRecord,
  parseApprovedWatchUrl,
  parsedHttpsUrl,
  safeApprovedWatchUrl,
  safeEditorialLink,
  safeHostedVideoUrl,
  safeWebVttUrl,
  isSafeEmail,
  type UnknownRecord,
} from '../../shared/content-policy';
import type {
  AboutPersonView,
  AboutWorkView,
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
  ProjectLayoutVariant,
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
} from './types';
import { withBase } from './base-path';

const attribution = attributionRecords as Record<string, AttributionRecord>;
const fixtureProjectRecords = fixtureProjects as UnknownRecord[];
const fixtureSiteSettings = fixtureSettings as UnknownRecord;

const DEFAULT_WIDTH = 1600;
const DEFAULT_HEIGHT = 900;

function recordOrEmpty(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function optionalRecord(value: unknown): UnknownRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function stringFrom(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T): T[number] | undefined {
  return typeof value === 'string' && values.includes(value) ? value as T[number] : undefined;
}

function presentationOffset(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(Math.min(320, Math.max(-240, value)));
}

function presentationColumn(value: unknown): 1 | 2 | 3 | 4 | undefined {
  return value === 1 || value === 2 || value === 3 || value === 4
    ? value
    : undefined;
}

function presentationAccent(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/iu.test(normalized) ? normalized.toUpperCase() : undefined;
}

function inferredLayoutVariant(types: ProjectType[]): ProjectLayoutVariant {
  if (types.includes('Campaign')) return 'campaign';
  if (types.includes('Film')) return 'cinematic';
  if (types.includes('Photography') && !types.includes('Animation')) return 'photoEssay';
  return types.includes('Animation') ? 'experimental' : 'cinematic';
}

export function getContentMode(
  value: string | undefined = import.meta.env.PUBLIC_CONTENT_MODE,
): ContentMode {
  return value === 'production' || value === 'preview' ? value : 'prototype';
}

export function sortProjects<T extends { homeOrder: number; title: string }>(projects: T[]): T[] {
  return [...projects].sort((left, right) =>
    left.homeOrder - right.homeOrder || left.title.localeCompare(right.title),
  );
}

export function aboutProjectsForPerson(
  projects: ProjectView[],
  projectOwner: ProjectOwner,
  limit = 3,
): ProjectView[] {
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 3;
  return sortProjects(projects)
    .filter((project) => project.owner === projectOwner && Boolean(project.cover.poster.src))
    .slice(0, safeLimit);
}

function hasBlockedBlock(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasBlockedBlock);
  if (!value || typeof value !== 'object') return false;
  const record = value as UnknownRecord;
  if (PUBLICATION_BLOCKING_FLAGS.some((field) => record[field] === true)) return true;
  return Object.values(record).some(hasBlockedBlock);
}

const hasMeaningfulAlt = isNonEmptyString;

export {safeApprovedWatchUrl, safeHostedVideoUrl};

function isApprovedSanityAsset(value: unknown, kind: 'image' | 'file'): boolean {
  const url = parsedHttpsUrl(sourceUrl(value));
  if (!url || !hostMatches(url.hostname, ['cdn.sanity.io'])) return false;
  return url.pathname.includes(`/${kind === 'image' ? 'images' : 'files'}/`);
}

function videoBlockHasApprovedSource(block: UnknownRecord): boolean {
  const vimeoId = typeof block.vimeoId === 'string' && VIMEO_ID_PATTERN.test(block.vimeoId);
  const youtubeId = typeof block.youtubeId === 'string' && YOUTUBE_ID_PATTERN.test(block.youtubeId);
  const uploaded = Boolean(safeHostedVideoUrl(sourceUrl(block.source || block.file)));
  const remote = Boolean(safeHostedVideoUrl(block.remoteSource));
  const external = Boolean(safeApprovedWatchUrl(block.externalUrl));
  return uploaded || remote || external || vimeoId || youtubeId;
}

function blockHasAccessibleMedia(block: UnknownRecord): boolean {
  if (['heroVideo', 'video', 'shortLoop'].includes(String(block._type))) {
    if (!isApprovedSanityAsset(block.poster, 'image') || !videoBlockHasApprovedSource(block)) return false;
    if (block.remoteSource && !safeHostedVideoUrl(block.remoteSource)) return false;
    if (block.externalUrl && !safeApprovedWatchUrl(block.externalUrl)) return false;
    if (block.vimeoId && !(typeof block.vimeoId === 'string' && VIMEO_ID_PATTERN.test(block.vimeoId))) return false;
    if (block.youtubeId && !(typeof block.youtubeId === 'string' && YOUTUBE_ID_PATTERN.test(block.youtubeId))) return false;
    if (!idsAgreeWithWatchUrl(block.externalUrl, block.vimeoId, block.youtubeId)) return false;
    if (block.captionsFile && !safeWebVttUrl(sourceUrl(block.captionsFile))) return false;
    return block._type !== 'shortLoop' || Boolean(block.decorative || hasMeaningfulAlt(block.alt));
  }
  if (['heroImage', 'fullBleedImage', 'containedImage'].includes(String(block._type))) {
    const image = recordOrEmpty(block.image);
    return isApprovedSanityAsset(block.image, 'image') &&
      Boolean(block.decorative || image.decorative || hasMeaningfulAlt(block.alt || image.alt));
  }
  if (block._type === 'imagePair' || block._type === 'imageGrid') {
    const images = Array.isArray(block.images) ? block.images : [block.left, block.right].filter(Boolean);
    return images.length > 0 && images.every((image: unknown, index: number) => {
      if (image && typeof image === 'object') {
        const record = image as UnknownRecord;
        return isApprovedSanityAsset(record.image || record, 'image') &&
          Boolean(record.decorative || hasMeaningfulAlt(record.alt));
      }
      const alt = Array.isArray(block.alt) ? block.alt[index] : undefined;
      return hasMeaningfulAlt(alt);
    });
  }
  return true;
}

export function isProductionEligible(project: UnknownRecord, now = new Date()): boolean {
  if (!project.visible || project.needsReview || project.doNotPublishWithoutExplicitApproval) return false;
  if (project.rightsApprovalStatus !== 'approved' || !hasMeaningfulAlt(project.rightsApprovalEvidence)) return false;
  if (typeof project.rightsExpiresAt === 'string' && new Date(project.rightsExpiresAt) <= now) return false;
  const slugRecord = recordOrEmpty(project.slug);
  const slug = typeof project.slug === 'string' ? project.slug : slugRecord.current;
  const cover = recordOrEmpty(project.cover);
  const coverPoster = recordOrEmpty(cover.poster);
  if (!hasMeaningfulAlt(project.title) || !hasMeaningfulAlt(slug) || !isApprovedSanityAsset(cover.poster, 'image')) return false;
  if (!Array.isArray(project.types) || project.types.length === 0) return false;
  if (project.featuredOnHome && !Number.isFinite(Number(project.homeOrder))) return false;
  if (hasBlockedBlock(cover)) return false;
  if (!cover.decorative && !hasMeaningfulAlt(cover.alt || coverPoster.alt)) return false;
  if (cover.previewIsPlaceholder) return false;
  if (cover.previewVideo && !safeHostedVideoUrl(sourceUrl(cover.previewVideo))) return false;
  if (cover.previewVideoUrl && !safeHostedVideoUrl(cover.previewVideoUrl)) return false;
  if (cover.previewPosterOverride && !isApprovedSanityAsset(cover.previewPosterOverride, 'image')) return false;
  if (cover.mobilePoster && !isApprovedSanityAsset(cover.mobilePoster, 'image')) return false;
  if (typeof project.publishAt === 'string' && new Date(project.publishAt) > now) return false;
  if (!Array.isArray(project.contentBlocks) || project.contentBlocks.length === 0) return false;
  if (!project.contentBlocks.some((block: UnknownRecord) =>
    PUBLIC_MEDIA_BLOCK_TYPES.has(String(block._type)),
  )) return false;
  return !project.contentBlocks.some((block: UnknownRecord) => hasBlockedBlock(block) || !blockHasAccessibleMedia(block));
}

function localPublicPath(source: string): string {
  const publicPath = source.startsWith('assets/web-ready/')
    ? source.replace('assets/web-ready/', '/media/')
    : source;
  return publicPath.startsWith('/') ? withBase(publicPath) : publicPath;
}

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

function safeHttpsUrl(value: unknown): string | undefined {
  return parsedHttpsUrl(value)?.href;
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

function sourceUrl(value: unknown): string | undefined {
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
  const base = {
    _key: String(raw._key || `${projectTitle}-${raw._type || 'block'}`),
    caption: typeof raw.caption === 'string' ? raw.caption : undefined,
    credit: typeof raw.credit === 'string' ? raw.credit : undefined,
  };
  switch (raw._type) {
    case 'heroImage':
      return {
        ...base,
        _type: 'heroImage',
        image: resolveBlockImage(raw.image, raw),
        displayWidth: enumValue(raw.displayWidth, ['contained', 'wide', 'fullBleed'] as const),
      };
    case 'heroVideo':
      return { ...base, _type: 'heroVideo', video: normalizeVideo(raw, projectTitle) };
    case 'fullBleedImage':
      return { ...base, _type: 'fullBleedImage', image: resolveBlockImage(raw.image, raw) };
    case 'containedImage':
      return {
        ...base,
        _type: 'containedImage',
        image: resolveBlockImage(raw.image, raw),
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
      return {
        ...base,
        _type: 'imagePair',
        caption: typeof raw.sharedCaption === 'string' ? raw.sharedCaption : base.caption,
        images: [
          resolveBlockImage(left.image || left, left, left.alt, Boolean(raw.altNeedsReview)),
          resolveBlockImage(right.image || right, right, right.alt, Boolean(raw.altNeedsReview)),
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
              return resolveBlockImage(item.image || value, item, item.alt, Boolean(raw.altNeedsReview));
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
  const owner = enumValue(raw.owner, ['oliver', 'michael', 'anjali', 'collective', 'other'] as const) || 'other';
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
    cover: normalizeCover(recordOrEmpty(raw.cover)),
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
    layoutVariant: enumValue(
      raw.layoutVariant,
      ['cinematic', 'photoEssay', 'campaign', 'experimental'] as const,
    ) || inferredLayoutVariant(types),
    motionIntensity: enumValue(raw.motionIntensity, ['low', 'medium', 'high'] as const) || 'medium',
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

function normalizeAboutPeople(value: unknown, mode: ContentMode): AboutPersonView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index): AboutPersonView[] => {
    const person = optionalRecord(candidate);
    const name = stringFrom(person?.name);
    const projectOwner = enumValue(
      person?.projectOwner,
      ['oliver', 'michael', 'anjali', 'collective', 'other'] as const,
    );
    const bio = normalizeRichText(person?.bio);
    if (!name || !projectOwner || !bio) return [];

    const needsReview = person?.needsReview === true;
    const prototypeOnly = person?.prototypeOnly === true;
    const doNotPublishWithoutExplicitApproval =
      person?.doNotPublishWithoutExplicitApproval === true;
    if (
      mode === 'production' &&
      (needsReview || prototypeOnly || doNotPublishWithoutExplicitApproval)
    ) return [];

    return [{
      _key: stringFrom(person?._key) || `about-person-${index + 1}`,
      name,
      projectOwner,
      roleLabel: stringFrom(person?.roleLabel),
      bio,
      selectedWork: normalizeAboutSelectedWork(person?.selectedWork, mode),
      needsReview,
      prototypeOnly,
      doNotPublishWithoutExplicitApproval,
    }];
  });
}

function normalizeAboutSelectedWork(value: unknown, mode: ContentMode): AboutWorkView[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate, index): AboutWorkView[] => {
    const work = optionalRecord(candidate);
    const title = stringFrom(work?.title);
    const imageValue = work?.image;
    if (!title || !imageValue) return [];

    const needsReview = work?.needsReview === true;
    const prototypeOnly = work?.prototypeOnly === true;
    const doNotPublishWithoutExplicitApproval =
      work?.doNotPublishWithoutExplicitApproval === true;
    if (
      mode === 'production' &&
      (
        needsReview ||
        prototypeOnly ||
        doNotPublishWithoutExplicitApproval ||
        !isApprovedSanityAsset(imageValue, 'image')
      )
    ) return [];

    const image = resolveImage(imageValue, {
      alt: stringFrom(work?.alt) || '',
      needsReview,
    });
    if (!image.src) return [];

    return [{
      _key: stringFrom(work?._key) || `about-work-${index + 1}`,
      title,
      client: stringFrom(work?.client),
      href: safeHttpsUrl(work?.url),
      image,
      needsReview,
      prototypeOnly,
      doNotPublishWithoutExplicitApproval,
    }];
  });
}

export function normalizeSiteSettings(
  raw: UnknownRecord,
  mode: ContentMode,
): SiteSettingsView {
  const contactOverride = import.meta.env.PUBLIC_CONTACT_EMAIL?.trim();
  const approvedContactOverride = isSafeEmail(contactOverride) ? contactOverride : undefined;
  return {
    siteName: typeof raw.siteName === 'string' && raw.siteName ? raw.siteName : 'New Work Agency',
    wordmark: normalizeBrandAsset(raw.wordmark),
    compactMark: normalizeBrandAsset(raw.compactMark),
    manifesto: typeof raw.manifesto === 'string' && raw.manifesto ? raw.manifesto : undefined,
    manifestoNeedsReview: Boolean(raw.manifestoNeedsReview),
    about: normalizeRichText(raw.about),
    aboutImage: raw.aboutImage
      ? resolveImage(raw.aboutImage, {
          alt: raw.aboutImageDecorative === true ? '' : raw.aboutImageAlt,
          needsReview: Boolean(recordOrEmpty(raw.aboutImage).altNeedsReview),
        })
      : undefined,
    aboutPeople: normalizeAboutPeople(raw.aboutPeople, mode),
    aboutSeo: normalizeSeo(raw.aboutSeo),
    contactSeo: normalizeSeo(raw.contactSeo),
    capabilities: Array.isArray(raw.capabilities)
      ? raw.capabilities.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      : [],
    contactEmail:
      approvedContactOverride || (isSafeEmail(raw.contactEmail) ? raw.contactEmail : undefined),
    location: typeof raw.location === 'string' && raw.location ? raw.location : undefined,
    socialLinks: Array.isArray(raw.socialLinks)
      ? raw.socialLinks.flatMap((item: UnknownRecord) => {
          const url = safeHttpsUrl(item.url);
          const label = typeof item.label === 'string' ? item.label.trim() : '';
          return url && label ? [{ _key: typeof item._key === 'string' ? item._key : undefined, label, url }] : [];
        })
      : [],
    reel: normalizeReel(raw.reel),
    notesEnabled: Boolean(raw.notesEnabled),
    analyticsEnabled: Boolean(raw.analyticsEnabled),
    defaultSeo: normalizeSeo(raw.defaultSeo) || { noIndex: true },
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

export function isProductionEligibleNote(raw: UnknownRecord): boolean {
  if (raw.rightsApprovalStatus !== 'approved' || !hasMeaningfulAlt(raw.rightsApprovalEvidence)) return false;
  if (typeof raw.rightsExpiresAt === 'string' && new Date(raw.rightsExpiresAt) <= new Date()) return false;
  const slug = typeof raw.slug === 'string' ? raw.slug : recordOrEmpty(raw.slug).current;
  if (!hasMeaningfulAlt(raw.title) || !hasMeaningfulAlt(slug) || !hasMeaningfulAlt(raw.date)) return false;
  if (!hasMeaningfulAlt(raw.summary) || String(raw.summary).length > 220) return false;
  const media = raw.media && typeof raw.media === 'object' ? raw.media as UnknownRecord : undefined;
  if (!media) return false;
  if (media.kind === 'image' || media.image) {
    return isApprovedSanityAsset(media.image, 'image') &&
      Boolean(media.decorative || hasMeaningfulAlt(media.alt));
  }
  if (!isApprovedSanityAsset(media.poster, 'image')) return false;
  if (media.remoteUrl && !safeApprovedWatchUrl(media.remoteUrl)) return false;
  if (media.file && !safeHostedVideoUrl(sourceUrl(media.file))) return false;
  if (media.captionsFile) {
    if (!safeWebVttUrl(sourceUrl(media.captionsFile))) return false;
  }
  const hasHostedFile = Boolean(safeHostedVideoUrl(sourceUrl(media.file)));
  const remoteUrl = safeApprovedWatchUrl(media.remoteUrl);
  if (!hasHostedFile && !remoteUrl) return false;
  if (media.remotePlayerId) {
    if (!remoteUrl || typeof media.remotePlayerId !== 'string') return false;
    const parsed = parseApprovedWatchUrl(remoteUrl);
    if (!parsed || parsed.providerId !== media.remotePlayerId) return false;
  }
  return true;
}

function hasEligibleEnabledReel(raw: UnknownRecord): boolean {
  const reel = raw.reel && typeof raw.reel === 'object' ? raw.reel as UnknownRecord : undefined;
  if (!reel || reel.enabled !== true) return true;
  if (!isApprovedSanityAsset(reel.poster, 'image')) return false;
  if (reel.desktopSource && !safeHostedVideoUrl(sourceUrl(reel.desktopSource))) return false;
  if (reel.desktopSourceUrl && !safeHostedVideoUrl(reel.desktopSourceUrl)) return false;
  if (!safeHostedVideoUrl(sourceUrl(reel.desktopSource)) && !safeHostedVideoUrl(reel.desktopSourceUrl)) return false;
  if (reel.mobileSource && !safeHostedVideoUrl(sourceUrl(reel.mobileSource))) return false;
  if (reel.mobileSourceUrl && !safeHostedVideoUrl(reel.mobileSourceUrl)) return false;
  return true;
}

export function getFixtureProjects(): ProjectView[] {
  return sortProjects(fixtureProjectRecords.map(normalizeProject));
}

function prototypeContent(): SiteContent {
  return {
    mode: 'prototype',
    settings: normalizeSiteSettings(fixtureSiteSettings, 'prototype'),
    projects: getFixtureProjects(),
    notes: [],
  };
}

async function sanityContent(mode: 'preview' | 'production'): Promise<SiteContent> {
  const projectId = import.meta.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = import.meta.env.PUBLIC_SANITY_DATASET;
  if (!projectId || !dataset) {
    throw new Error(
      `PUBLIC_CONTENT_MODE=${mode} requires PUBLIC_SANITY_PROJECT_ID and PUBLIC_SANITY_DATASET. Fixture content was not used.`,
    );
  }
  const previewToken = mode === 'preview' ? import.meta.env.SANITY_PREVIEW_TOKEN : undefined;
  if (mode === 'preview' && !previewToken) {
    throw new Error('Preview mode requires the server-only SANITY_PREVIEW_TOKEN.');
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: import.meta.env.SANITY_API_VERSION || '2026-08-01',
    useCdn: false,
    token: previewToken,
    perspective: mode === 'preview' ? 'previewDrafts' : 'published',
  });

  try {
    const [settingsRaw, projectsRaw, notesRaw] = mode === 'preview' ? await Promise.all([
      client.fetch<UnknownRecord | null>(previewSiteSettingsQuery),
      client.fetch<UnknownRecord[]>(previewProjectsQuery),
      client.fetch<UnknownRecord[]>(previewNotesQuery),
    ]) : await Promise.all([
      client.fetch<UnknownRecord | null>(siteSettingsQuery),
      client.fetch<UnknownRecord[]>(projectsQuery),
      client.fetch<UnknownRecord[]>(notesQuery),
    ]);
    if (!settingsRaw) {
      throw new Error('The approved siteSettings singleton is missing or contains blocked public assets.');
    }
    const parsed = parseCmsPayload({settings: settingsRaw, projects: projectsRaw, notes: notesRaw});
    if (mode === 'production' && !hasEligibleEnabledReel(parsed.settings)) {
      throw new Error('The enabled Reel is missing an approved poster or hosted source.');
    }
    const projects = sortProjects((mode === 'production'
      ? parsed.projects.filter((project) => isProductionEligible(project))
      : parsed.projects).map(normalizeProject));
    if (mode === 'production' && (projects.length === 0 || !projects.some((project) => project.featuredOnHome))) {
      throw new Error('Production requires at least one approved project featured on the home page.');
    }
    const settings = normalizeSiteSettings(parsed.settings, mode);
    if (mode === 'production' && settings.manifestoNeedsReview) settings.manifesto = undefined;
    const notes = settings.notesEnabled || mode === 'preview'
      ? (mode === 'production' ? parsed.notes.filter(isProductionEligibleNote) : parsed.notes).map(normalizeNote)
      : [];
    return { mode, settings, projects, notes };
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

export function adjacentProjects(projects: ProjectView[], slug: string) {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0) return { previous: undefined, next: undefined };
  return {
    previous: index > 0 ? projects[index - 1] : undefined,
    next: index < projects.length - 1 ? projects[index + 1] : undefined,
  };
}

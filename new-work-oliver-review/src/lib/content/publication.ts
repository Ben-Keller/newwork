import {
  PUBLICATION_BLOCKING_FLAGS,
  PUBLIC_MEDIA_BLOCK_TYPES,
  VIMEO_ID_PATTERN,
  YOUTUBE_ID_PATTERN,
  idsAgreeWithWatchUrl,
  isNonEmptyString,
  parseApprovedWatchUrl,
  safeApprovedWatchUrl,
  safeHostedVideoUrl,
  safeWebVttUrl,
  type UnknownRecord,
} from '../../../shared/content-policy';
import type {ReelView} from '../types';
import {isApprovedSanityAsset, sourceUrl} from './assets';
import {recordOrEmpty} from './normalization';

export function hasBlockedContent(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasBlockedContent);
  if (!value || typeof value !== 'object') return false;
  const record = value as UnknownRecord;
  if (PUBLICATION_BLOCKING_FLAGS.some((field) => record[field] === true)) return true;
  return Object.values(record).some(hasBlockedContent);
}

function videoBlockHasApprovedSource(block: UnknownRecord): boolean {
  const libraryAsset = recordOrEmpty(block.mediaItem);
  const resolvedBlock: UnknownRecord = {
    ...libraryAsset,
    ...block,
    externalUrl: block.externalUrl || libraryAsset.videoUrl,
  };
  const vimeoId = typeof resolvedBlock.vimeoId === 'string'
    && VIMEO_ID_PATTERN.test(resolvedBlock.vimeoId);
  const youtubeId = typeof resolvedBlock.youtubeId === 'string'
    && YOUTUBE_ID_PATTERN.test(resolvedBlock.youtubeId);
  const uploaded = Boolean(safeHostedVideoUrl(sourceUrl(resolvedBlock.source || resolvedBlock.file)));
  const remote = Boolean(safeHostedVideoUrl(resolvedBlock.remoteSource));
  const external = Boolean(safeApprovedWatchUrl(resolvedBlock.externalUrl));
  return uploaded || remote || external || vimeoId || youtubeId;
}

function blockHasAccessibleMedia(block: UnknownRecord): boolean {
  const libraryAsset = recordOrEmpty(block.mediaItem);
  const resolvedBlock: UnknownRecord = {
    ...libraryAsset,
    ...block,
    image: block.image || libraryAsset.image,
    poster: block.poster || libraryAsset.poster,
    alt: block.alt || libraryAsset.alt,
    decorative: block.decorative ?? libraryAsset.decorative,
    externalUrl: block.externalUrl || libraryAsset.videoUrl,
  };
  if (['heroVideo', 'video', 'shortLoop'].includes(String(resolvedBlock._type))) {
    if (
      !isApprovedSanityAsset(resolvedBlock.poster, 'image')
      || !videoBlockHasApprovedSource(resolvedBlock)
    ) return false;
    if (resolvedBlock.remoteSource && !safeHostedVideoUrl(resolvedBlock.remoteSource)) return false;
    if (resolvedBlock.externalUrl && !safeApprovedWatchUrl(resolvedBlock.externalUrl)) return false;
    if (
      resolvedBlock.vimeoId
      && !(typeof resolvedBlock.vimeoId === 'string' && VIMEO_ID_PATTERN.test(resolvedBlock.vimeoId))
    ) return false;
    if (
      resolvedBlock.youtubeId
      && !(typeof resolvedBlock.youtubeId === 'string' && YOUTUBE_ID_PATTERN.test(resolvedBlock.youtubeId))
    ) return false;
    if (!idsAgreeWithWatchUrl(
      resolvedBlock.externalUrl,
      resolvedBlock.vimeoId,
      resolvedBlock.youtubeId,
    )) return false;
    if (resolvedBlock.captionsFile && !safeWebVttUrl(sourceUrl(resolvedBlock.captionsFile))) return false;
    return resolvedBlock._type !== 'shortLoop'
      || Boolean(resolvedBlock.decorative || isNonEmptyString(resolvedBlock.alt));
  }
  if (['heroImage', 'fullBleedImage', 'containedImage'].includes(String(resolvedBlock._type))) {
    const image = recordOrEmpty(resolvedBlock.image);
    return isApprovedSanityAsset(resolvedBlock.image, 'image')
      && Boolean(
        resolvedBlock.decorative
        || image.decorative
        || isNonEmptyString(resolvedBlock.alt || image.alt),
      );
  }
  if (resolvedBlock._type === 'imagePair' || resolvedBlock._type === 'imageGrid') {
    const images = Array.isArray(resolvedBlock.images)
      ? resolvedBlock.images
      : [resolvedBlock.left, resolvedBlock.right].filter(Boolean);
    return images.length > 0 && images.every((image: unknown, index: number) => {
      if (image && typeof image === 'object') {
        const record = image as UnknownRecord;
        const libraryImage = recordOrEmpty(record.mediaItem);
        return isApprovedSanityAsset(record.image || libraryImage.image || record, 'image')
          && Boolean(
            record.decorative
            || libraryImage.decorative
            || isNonEmptyString(record.alt || libraryImage.alt),
          );
      }
      const alt = Array.isArray(resolvedBlock.alt) ? resolvedBlock.alt[index] : undefined;
      return isNonEmptyString(alt);
    });
  }
  return true;
}

export function isProductionEligible(project: UnknownRecord, now = new Date()): boolean {
  const approvedForWebsite = project.editorialStatus === 'approved'
    || (project.editorialStatus === undefined && project.visible === true);
  if (!approvedForWebsite || project.doNotPublishWithoutExplicitApproval) return false;
  if (project.editorialStatus === undefined && project.needsReview) return false;
  const slugRecord = recordOrEmpty(project.slug);
  const slug = typeof project.slug === 'string' ? project.slug : slugRecord.current;
  const assets = Array.isArray(project.assets) ? project.assets : [];
  const cover = recordOrEmpty(project.cover);
  const coverPoster = recordOrEmpty(cover.poster);
  if (!isNonEmptyString(project.title) || !isNonEmptyString(slug)) return false;
  if (assets.length === 0 || !isApprovedSanityAsset(cover.poster, 'image')) return false;
  if (assets.some((asset) => {
    const item = recordOrEmpty(asset);
    if (hasBlockedContent(item)) return true;
    if (item.kind === 'image') {
      return !isApprovedSanityAsset(item.image, 'image')
        || (!item.decorative && !isNonEmptyString(item.alt));
    }
    if (item.kind === 'video') {
      return !isApprovedSanityAsset(item.poster, 'image')
        || (!item.decorative && !isNonEmptyString(item.alt));
    }
    return item.kind !== 'file' || !sourceUrl(item.file);
  })) return false;
  if (!Array.isArray(project.types) || project.types.length === 0) return false;
  if (project.featuredOnHome && !Number.isFinite(Number(project.homeOrder))) return false;
  if (hasBlockedContent(cover)) return false;
  if (!cover.decorative && !isNonEmptyString(cover.alt || coverPoster.alt)) return false;
  if (cover.previewIsPlaceholder) return false;
  if (cover.previewVideo && !safeHostedVideoUrl(sourceUrl(cover.previewVideo))) return false;
  if (cover.previewVideoUrl && !safeHostedVideoUrl(cover.previewVideoUrl)) return false;
  if (cover.previewPosterOverride && !isApprovedSanityAsset(cover.previewPosterOverride, 'image')) return false;
  if (cover.mobilePoster && !isApprovedSanityAsset(cover.mobilePoster, 'image')) return false;
  if (typeof project.publishAt === 'string' && new Date(project.publishAt) > now) return false;
  const contentBlocks = Array.isArray(project.contentBlocks) ? project.contentBlocks : [];
  if (contentBlocks.length === 0) return false;
  if (!contentBlocks.some((block: UnknownRecord) => (
    PUBLIC_MEDIA_BLOCK_TYPES.has(String(block._type))
  ))) return false;
  return !contentBlocks.some((block: UnknownRecord) => (
    hasBlockedContent(block) || !blockHasAccessibleMedia(block)
  ));
}

export function isProductionEligibleNote(raw: UnknownRecord): boolean {
  const slug = typeof raw.slug === 'string' ? raw.slug : recordOrEmpty(raw.slug).current;
  if (!isNonEmptyString(raw.title) || !isNonEmptyString(slug) || !isNonEmptyString(raw.date)) return false;
  if (!isNonEmptyString(raw.summary) || String(raw.summary).length > 220) return false;
  const media = raw.media && typeof raw.media === 'object' ? raw.media as UnknownRecord : undefined;
  if (!media) return false;
  if (media.kind === 'image' || media.image) {
    return isApprovedSanityAsset(media.image, 'image')
      && Boolean(media.decorative || isNonEmptyString(media.alt));
  }
  if (!isApprovedSanityAsset(media.poster, 'image')) return false;
  if (media.remoteUrl && !safeApprovedWatchUrl(media.remoteUrl)) return false;
  if (media.file && !safeHostedVideoUrl(sourceUrl(media.file))) return false;
  if (media.captionsFile && !safeWebVttUrl(sourceUrl(media.captionsFile))) return false;
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

export function hasEligibleEnabledReel(reel: ReelView): boolean {
  if (!reel.enabled) return true;
  if (!reel.poster?.src || !isApprovedSanityAsset({asset: {url: reel.poster.src}}, 'image')) return false;
  if (!safeHostedVideoUrl(reel.desktopSource)) return false;
  if (reel.mobileSource && !safeHostedVideoUrl(reel.mobileSource)) return false;
  return true;
}

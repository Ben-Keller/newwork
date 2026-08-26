import {
  PUBLICATION_BLOCKING_FLAGS,
  PUBLIC_MEDIA_BLOCK_TYPES,
  VIMEO_ID_PATTERN,
  YOUTUBE_ID_PATTERN,
  idsAgreeWithWatchUrl,
  isApprovedHostedMediaUrl,
  isApprovedWatchUrl,
  isNonEmptyString,
  isRecord,
  parsedHttpsUrl,
  type UnknownRecord,
} from '../shared/content-policy'

export {
  PUBLICATION_BLOCKING_FLAGS,
  PUBLIC_MEDIA_BLOCK_TYPES,
  isApprovedHostedMediaUrl,
  isApprovedWatchUrl,
  isNonEmptyString,
  isRecord,
}
export type {UnknownRecord}

export function wordCount(value: unknown): number {
  if (!isNonEmptyString(value)) return 0
  return value.trim().split(/\s+/u).length
}

export function isHttpsUrl(value: unknown): boolean {
  return Boolean(parsedHttpsUrl(value))
}

/** Backwards-compatible union for generic media fields. Prefer the specific validators above. */
export function isApprovedMediaUrl(value: unknown): boolean {
  return isApprovedWatchUrl(value) || isApprovedHostedMediaUrl(value)
}

export function isWebVttAssetReference(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.asset) || !isNonEmptyString(value.asset._ref)) return false
  return /-vtt$/iu.test(value.asset._ref)
}

export function isPlayableVideoAssetReference(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.asset) || !isNonEmptyString(value.asset._ref)) return false
  return /-(?:mp4|webm)$/iu.test(value.asset._ref)
}

export function isBrandFileAssetReference(value: unknown): boolean {
  if (!isRecord(value) || !isRecord(value.asset) || !isNonEmptyString(value.asset._ref)) return false
  return /-(?:png|svg)$/iu.test(value.asset._ref)
}

export function hasAssetReference(value: unknown): boolean {
  if (!isRecord(value)) return false
  const asset = value.asset
  return isRecord(asset) && isNonEmptyString(asset._ref)
}

export function hasDocumentReference(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value._ref)
}

export function hasMediaSource(value: unknown): boolean {
  if (!isRecord(value)) return false
  return (
    hasAssetReference(value.image) ||
    hasAssetReference(value.file) ||
    hasAssetReference(value) ||
    isNonEmptyString(value.remoteUrl) ||
    isNonEmptyString(value.remotePlayerId)
  )
}

export function documentIsVisible(context: {document?: unknown}): boolean {
  if (!isRecord(context.document)) return false
  return context.document.editorialStatus === 'approved' ||
    (context.document.editorialStatus === undefined && context.document.visible === true)
}

export function collectBlockingSafetyFlags(
  value: unknown,
  path = '',
  visited = new Set<unknown>(),
): string[] {
  if (!value || typeof value !== 'object' || visited.has(value)) return []
  visited.add(value)

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectBlockingSafetyFlags(item, `${path}[${index}]`, visited),
    )
  }

  const record = value as UnknownRecord
  const issues: string[] = []

  for (const flag of PUBLICATION_BLOCKING_FLAGS) {
    if (record[flag] === true) issues.push(path ? `${path}.${flag}` : flag)
  }

  for (const [key, child] of Object.entries(record)) {
    if (PUBLICATION_BLOCKING_FLAGS.includes(key as (typeof PUBLICATION_BLOCKING_FLAGS)[number])) {
      continue
    }
    issues.push(...collectBlockingSafetyFlags(child, path ? `${path}.${key}` : key, visited))
  }

  return issues
}

export function projectPublicationError(value: unknown): true | string {
  if (!isRecord(value)) return true
  const approvedForWebsite = value.editorialStatus === 'approved' ||
    (value.editorialStatus === undefined && value.visible === true)
  if (!approvedForWebsite) return true

  const problems: string[] = []
  const cover = isRecord(value.cover) ? value.cover : undefined
  const blocks = Array.isArray(value.contentBlocks) ? value.contentBlocks : []

  if (value.rightsApprovalStatus !== 'approved') {
    problems.push('record approved portfolio rights')
  }
  if (!isNonEmptyString(value.rightsApprovalEvidence)) {
    problems.push('record rights approval evidence')
  }
  if (isNonEmptyString(value.rightsExpiresAt) && new Date(value.rightsExpiresAt) <= new Date()) {
    problems.push('renew expired portfolio rights')
  }

  const safetyFlags = collectBlockingSafetyFlags({...value, needsReview: false})
  if (safetyFlags.length > 0) {
    problems.push(`clear publication safety flags: ${safetyFlags.join(', ')}`)
  }

  if (!cover || !hasAssetReference(cover.poster)) {
    problems.push('add a Sanity cover poster')
  }

  if (
    cover &&
    !isNonEmptyString(cover.alt) &&
    cover.decorative !== true
  ) {
    problems.push('add cover alt text or deliberately mark the poster decorative')
  }

  if (!blocks.some((block) => isRecord(block) && PUBLIC_MEDIA_BLOCK_TYPES.has(String(block._type)))) {
    problems.push('add at least one public media block')
  }

  blocks.forEach((block, index) => {
    if (!isRecord(block)) return
    const label = `${String(block._type ?? 'media')} block ${index + 1}`

    if (['heroImage', 'fullBleedImage', 'containedImage'].includes(String(block._type))) {
      if (!hasAssetReference(block.image) && !hasDocumentReference(block.mediaItem)) problems.push(`${label} needs an image`)
      if (!hasDocumentReference(block.mediaItem) && !isNonEmptyString(block.alt) && block.decorative !== true) {
        problems.push(`${label} needs alt text or an explicit decorative setting`)
      }
    }

    if (block._type === 'imagePair') {
      ;['left', 'right'].forEach((side) => {
        const item = isRecord(block[side]) ? block[side] : undefined
        if (!item || (!hasAssetReference(item.image) && !hasDocumentReference(item.mediaItem))) problems.push(`${label} needs its ${side} image`)
        if (item && !hasDocumentReference(item.mediaItem) && !isNonEmptyString(item.alt) && item.decorative !== true) {
          problems.push(`${label} ${side} image needs alt text or an explicit decorative setting`)
        }
      })
    }

    if (block._type === 'imageGrid') {
      const images = Array.isArray(block.images) ? block.images : []
      images.forEach((item, imageIndex) => {
        if (!isRecord(item) || (!hasAssetReference(item.image) && !hasDocumentReference(item.mediaItem))) {
          problems.push(`${label} image ${imageIndex + 1} is missing`)
          return
        }
        if (!hasDocumentReference(item.mediaItem) && !isNonEmptyString(item.alt) && item.decorative !== true) {
          problems.push(`${label} image ${imageIndex + 1} needs alt text or an explicit decorative setting`)
        }
      })
    }

    if (['heroVideo', 'video', 'shortLoop'].includes(String(block._type))) {
      if (!hasAssetReference(block.poster) && !hasDocumentReference(block.mediaItem)) problems.push(`${label} needs a poster`)
      const hasHostedSource = isPlayableVideoAssetReference(block.source)
      const hasRemoteSource =
        isApprovedWatchUrl(block.externalUrl) ||
        isApprovedHostedMediaUrl(block.remoteSource) ||
        isNonEmptyString(block.vimeoId) ||
        isNonEmptyString(block.youtubeId)
      if (!hasDocumentReference(block.mediaItem) && !hasHostedSource && !hasRemoteSource) problems.push(`${label} needs a hosted or approved remote source`)
      if (isNonEmptyString(block.remoteSource) && !isApprovedHostedMediaUrl(block.remoteSource)) {
        problems.push(`${label} has an unapproved hosted source URL`)
      }
      if (isNonEmptyString(block.externalUrl) && !isApprovedWatchUrl(block.externalUrl)) {
        problems.push(`${label} has an unapproved watch URL`)
      }
      if (isNonEmptyString(block.vimeoId) && !VIMEO_ID_PATTERN.test(block.vimeoId)) {
        problems.push(`${label} has an invalid Vimeo ID`)
      }
      if (isNonEmptyString(block.youtubeId) && !YOUTUBE_ID_PATTERN.test(block.youtubeId)) {
        problems.push(`${label} has an invalid YouTube ID`)
      }
      if (!idsAgreeWithWatchUrl(block.externalUrl, block.vimeoId, block.youtubeId)) {
        problems.push(`${label} watch URL and provider ID do not match`)
      }
      if (block.captionsFile !== undefined && !isWebVttAssetReference(block.captionsFile)) {
        problems.push(`${label} captions must be a WebVTT file`)
      }
    }

    if (block._type === 'shortLoop' && !isNonEmptyString(block.alt) && block.decorative !== true) {
      problems.push(`${label} needs an accessible description or an explicit decorative setting`)
    }
  })

  return problems.length === 0
    ? true
    : `This project cannot be public yet: ${problems.join('; ')}.`
}

export function notePublicationError(value: unknown): true | string {
  if (!isRecord(value) || value.visible !== true) return true
  const problems: string[] = []
  const flags = collectBlockingSafetyFlags(value)
  const media = isRecord(value.media) ? value.media : undefined

  if (value.rightsApprovalStatus !== 'approved') problems.push('record approved portfolio rights')
  if (!isNonEmptyString(value.rightsApprovalEvidence)) problems.push('record rights approval evidence')
  if (isNonEmptyString(value.rightsExpiresAt) && new Date(value.rightsExpiresAt) <= new Date()) {
    problems.push('renew expired portfolio rights')
  }

  if (flags.length > 0) problems.push(`clear publication safety flags: ${flags.join(', ')}`)
  if (!media || !hasMediaSource(media)) problems.push('add note media')
  if (media?.kind === 'image' && !isNonEmptyString(media.alt) && media.decorative !== true) {
    problems.push('add media alt text or deliberately mark the image decorative')
  }
  if (media?.kind === 'video' && !hasAssetReference(media.poster)) {
    problems.push('add a video poster')
  }
  if (media?.kind === 'video' && hasAssetReference(media.file) && !isPlayableVideoAssetReference(media.file)) {
    problems.push('use an MP4 or WebM hosted video')
  }
  if (media?.kind === 'video' && isNonEmptyString(media.remoteUrl) && !isApprovedWatchUrl(media.remoteUrl)) {
    problems.push('use an approved Vimeo or YouTube player URL')
  }
  if (
    media?.kind === 'video' &&
    isNonEmptyString(media.remotePlayerId) &&
    !isApprovedWatchUrl(media.remoteUrl)
  ) {
    problems.push('pair the remote player ID with its approved player URL')
  }

  return problems.length === 0 ? true : `This note cannot be public yet: ${problems.join('; ')}.`
}

export function warningForMissing(value: unknown, label: string): true | string {
  if (Array.isArray(value)) return value.length > 0 ? true : `${label} is recommended before publication.`
  return isNonEmptyString(value) ? true : `${label} is recommended before publication.`
}

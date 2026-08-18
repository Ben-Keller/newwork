import {createHash} from 'node:crypto'
import {
  createReadStream,
  existsSync,
  readFileSync,
} from 'node:fs'
import {basename, dirname, extname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createClient, type SanityClient, type SanityDocumentStub} from '@sanity/client'

export type JsonRecord = Record<string, unknown>
export type SeedUpdateMode = 'preserve' | 'force'

/**
 * These flags represent a specific unresolved publication hazard, rather than
 * the ordinary review workflow. In preservation mode a true fixture value is
 * sticky: rerunning the importer must not silently turn it back into an
 * editor-cleared false value.
 *
 * `needsReview` is intentionally not in this list. New seed records still
 * start with needsReview=true, but an editor's completed review is preserved on
 * rerun unless force mode is explicitly selected.
 */
export const HEIGHTENED_SAFETY_BLOCKERS = [
  'doNotPublishWithoutExplicitApproval',
  'prototypeOnly',
  'previewIsPlaceholder',
  'altNeedsReview',
  'needsApprovedEmbed',
  'needsApprovedMaster',
] as const

const MANIFEST_COLUMNS = [
  'asset_id',
  'person',
  'project',
  'asset_layer',
  'kind',
  'local_path',
  'derived_from',
  'format_or_codec',
  'width_px',
  'height_px',
  'duration_seconds',
  'source_reported_dimensions_or_duration',
  'source_page',
  'source_media_url',
  'derivation',
  'rights_status',
  'publish_status',
  'notes',
  'sha256',
] as const

type ManifestColumn = (typeof MANIFEST_COLUMNS)[number]
type ManifestRow = Record<ManifestColumn, string>
type AssetKind = 'image' | 'file'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(scriptDirectory, '..')
const packageRoot = resolve(appRoot, '..')

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function loadEnvironmentFiles(): void {
  const loaded: Record<string, string> = {}

  for (const filename of ['.env', '.env.local']) {
    const path = resolve(appRoot, filename)
    if (!existsSync(path)) continue

    for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/u)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const separator = line.indexOf('=')
      if (separator < 1) continue
      const key = line.slice(0, separator).trim().replace(/^export\s+/u, '')
      loaded[key] = stripOuterQuotes(line.slice(separator + 1))
    }
  }

  for (const [key, value] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function fixturePath(filename: string): string {
  const canonical = resolve(packageRoot, 'content', filename)
  if (existsSync(canonical)) return canonical

  const bundled = resolve(appRoot, 'src', 'content', 'local', filename)
  if (existsSync(bundled)) return bundled

  throw new Error(`Could not find ${filename} in the package fixtures or app-local fixtures.`)
}

function manifestPath(): string {
  const canonical = resolve(packageRoot, 'metadata', 'asset-manifest.csv')
  if (existsSync(canonical)) return canonical

  const bundled = resolve(appRoot, 'src', 'content', 'local', 'asset-manifest.csv')
  if (existsSync(bundled)) return bundled

  throw new Error('Could not find metadata/asset-manifest.csv or its app-local copy.')
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
      continue
    }

    if (character === '"') {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field.replace(/\r$/u, ''))
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (quoted) throw new Error('The asset manifest contains an unterminated quoted field.')
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ''))
    if (row.some((cell) => cell.length > 0)) rows.push(row)
  }

  return rows
}

function readManifest(): ManifestRow[] {
  const rows = parseCsv(readFileSync(manifestPath(), 'utf8'))
  const header = rows.shift()?.map((column, index) =>
    index === 0 ? column.replace(/^\uFEFF/u, '') : column,
  )

  if (!header || header.join('|') !== MANIFEST_COLUMNS.join('|')) {
    throw new Error('The asset manifest columns do not match the binding metadata contract.')
  }

  return rows.map((cells, rowIndex) => {
    if (cells.length !== MANIFEST_COLUMNS.length) {
      throw new Error(
        `Manifest row ${rowIndex + 2} has ${cells.length} columns; expected ${MANIFEST_COLUMNS.length}.`,
      )
    }
    return Object.fromEntries(
      MANIFEST_COLUMNS.map((column, index) => [column, cells[index] ?? '']),
    ) as ManifestRow
  })
}

function collectLocalAssetPaths(value: unknown, paths = new Set<string>()): Set<string> {
  if (typeof value === 'string' && value.startsWith('assets/web-ready/')) {
    paths.add(value)
    return paths
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectLocalAssetPaths(item, paths))
    return paths
  }
  if (isRecord(value)) {
    Object.values(value).forEach((item) => collectLocalAssetPaths(item, paths))
  }
  return paths
}

function resolveLocalAsset(localPath: string): string {
  if (!localPath.startsWith('assets/web-ready/')) {
    throw new Error(`Refusing to import non-web-ready asset: ${localPath}`)
  }

  const canonical = resolve(packageRoot, localPath)
  if (existsSync(canonical)) return canonical

  const relativePublicPath = localPath.replace(/^assets\/web-ready\//u, '')
  const bundled = resolve(appRoot, 'public', 'media', relativePublicPath)
  if (existsSync(bundled)) return bundled

  throw new Error(`Referenced asset does not exist: ${localPath}`)
}

function assetKindForPath(path: string): AssetKind {
  return ['.avif', '.gif', '.jpeg', '.jpg', '.png', '.webp'].includes(extname(path).toLowerCase())
    ? 'image'
    : 'file'
}

async function digestsForFile(path: string): Promise<{sha1: string; sha256: string}> {
  const sha1 = createHash('sha1')
  const sha256 = createHash('sha256')
  for await (const chunk of createReadStream(path)) {
    sha1.update(chunk)
    sha256.update(chunk)
  }
  return {sha1: sha1.digest('hex'), sha256: sha256.digest('hex')}
}

async function uploadAsset(
  client: SanityClient,
  localPath: string,
  row: ManifestRow,
): Promise<string> {
  const absolutePath = resolveLocalAsset(localPath)
  const kind = assetKindForPath(localPath)
  const assetType = kind === 'image' ? 'sanity.imageAsset' : 'sanity.fileAsset'
  const digests = await digestsForFile(absolutePath)

  if (row.sha256 && digests.sha256 !== row.sha256) {
    throw new Error(
      `Checksum mismatch for ${localPath}: manifest ${row.sha256}, file ${digests.sha256}.`,
    )
  }

  const existingId = await client.fetch<string | null>(
    `*[_type == $assetType && sha1hash == $sha1][0]._id`,
    {assetType, sha1: digests.sha1},
  )
  if (existingId) {
    console.log(`Reusing ${localPath}`)
    return existingId
  }

  const uploaded = await client.assets.upload(kind, createReadStream(absolutePath), {
    filename: basename(localPath),
    title: [row.project, row.kind].filter(Boolean).join(' — '),
    source: {
      id: row.asset_id,
      name: 'New Work asset manifest',
      url: row.source_media_url || row.source_page,
    },
  })
  console.log(`Uploaded ${localPath}`)
  return uploaded._id
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function statusIncludes(value: string, token: string): boolean {
  return value.split(';').map((item) => item.trim()).includes(token)
}

function manifestProvenance(row: ManifestRow): JsonRecord {
  const rightsNeedsReview = statusIncludes(row.rights_status, 'owner-review')
  const needsApprovedMaster = statusIncludes(row.rights_status, 'replace-with-approved-master')
  const prototypeOnly = statusIncludes(row.publish_status, 'prototype-only')
  const previewIsPlaceholder = statusIncludes(row.publish_status, 'not-source-film')
  const doNotPublishWithoutExplicitApproval = statusIncludes(
    row.publish_status,
    'do-not-publish-without-explicit-approval',
  )

  return withoutUndefined({
    manifestAssetId: row.asset_id,
    manifestPerson: row.person,
    manifestProject: row.project,
    assetLayer: row.asset_layer,
    assetKind: row.kind,
    sourcePath: row.local_path,
    derivedFrom: row.derived_from,
    formatOrCodec: row.format_or_codec,
    intrinsicWidth: optionalNumber(row.width_px),
    intrinsicHeight: optionalNumber(row.height_px),
    sourceDurationSeconds: optionalNumber(row.duration_seconds),
    sourceReportedDimensionsOrDuration: row.source_reported_dimensions_or_duration,
    sourcePage: row.source_page,
    sourceUrl: row.source_media_url,
    derivation: row.derivation,
    rightsStatus: row.rights_status,
    publishStatus: row.publish_status,
    manifestNotes: row.notes,
    sha256: row.sha256,
    needsReview: rightsNeedsReview,
    prototypeOnly,
    needsApprovedMaster,
    previewIsPlaceholder,
    doNotPublishWithoutExplicitApproval,
  })
}

function withoutUndefined<T extends JsonRecord>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T
}

function deterministicKey(prefix: string, ...parts: unknown[]): string {
  const identity = parts.map((part) =>
    typeof part === 'string' ? part : JSON.stringify(part),
  ).join('|')
  return `${prefix}-${createHash('sha1').update(identity).digest('hex').slice(0, 16)}`
}

function portableTextFromString(value: string, identity: string): JsonRecord[] {
  return [
    {
      _type: 'block',
      _key: deterministicKey('pt', identity, value),
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: deterministicKey('span', identity, value),
          text: value,
          marks: [],
        },
      ],
    },
  ]
}

export function aboutPeopleSeedItems(value: unknown): unknown {
  if (!Array.isArray(value)) return value
  return value.map((raw, index) => {
    const person: JsonRecord = isRecord(raw) ? {...raw} : {}
    const identity = `siteSettings:aboutPerson:${String(person.projectOwner ?? index)}`
    return withoutUndefined({
      ...person,
      _type: 'aboutPerson',
      _key: typeof person._key === 'string'
        ? person._key
        : deterministicKey('about-person', identity, person.name),
      bio: typeof person.bio === 'string' && person.bio.trim()
        ? portableTextFromString(person.bio, identity)
        : person.bio,
    })
  })
}

function createMapper(
  manifestByPath: Map<string, ManifestRow>,
  uploadedAssetIds: Map<string, string>,
) {
  function manifestFor(localPath: string): ManifestRow {
    const row = manifestByPath.get(localPath)
    if (!row) throw new Error(`No exact manifest row for ${localPath}`)
    if (row.asset_layer !== 'web-ready') {
      throw new Error(`Refusing to seed non-web-ready manifest row ${localPath}`)
    }
    return row
  }

  function assetIdFor(localPath: string): string {
    const assetId = uploadedAssetIds.get(localPath)
    if (!assetId) throw new Error(`No uploaded asset reference for ${localPath}`)
    return assetId
  }

  function localPathFrom(value: unknown): string | undefined {
    if (typeof value === 'string' && value.startsWith('assets/web-ready/')) return value
    if (isRecord(value) && typeof value.path === 'string' && value.path.startsWith('assets/web-ready/')) {
      return value.path
    }
    return undefined
  }

  function image(value: unknown, focalPoint?: JsonRecord): unknown {
    const localPath = localPathFrom(value)
    if (!localPath) return value
    const x = typeof focalPoint?.x === 'number' ? focalPoint.x : 0.5
    const y = typeof focalPoint?.y === 'number' ? focalPoint.y : 0.5

    return {
      _type: 'image',
      asset: {_type: 'reference', _ref: assetIdFor(localPath)},
      ...(focalPoint
        ? {
            crop: {_type: 'sanity.imageCrop', top: 0, right: 0, bottom: 0, left: 0},
            hotspot: {_type: 'sanity.imageHotspot', x, y, width: 1, height: 1},
          }
        : {}),
      ...manifestProvenance(manifestFor(localPath)),
    }
  }

  function file(value: unknown): unknown {
    const localPath = localPathFrom(value)
    if (!localPath) return value
    return {
      _type: 'file',
      asset: {_type: 'reference', _ref: assetIdFor(localPath)},
      ...manifestProvenance(manifestFor(localPath)),
    }
  }

  function focalPoint(value: unknown): unknown {
    if (!isRecord(value)) return value
    return {
      _type: 'focalPoint',
      x: value.x,
      y: value.y,
      needsReview: value.needsReview,
    }
  }

  function imageItem(
    value: unknown,
    keyIdentity: string,
    inheritedAltNeedsReview = false,
  ): JsonRecord {
    if (typeof value === 'string') {
      return {
        _type: 'imageItem',
        _key: deterministicKey('image', keyIdentity, value),
        image: image(value),
        altNeedsReview: inheritedAltNeedsReview,
      }
    }

    const item = isRecord(value) ? value : {}
    const itemImage = item.image ?? item.asset ?? item.path
    return withoutUndefined({
      ...item,
      _type: 'imageItem',
      _key: typeof item._key === 'string'
        ? item._key
        : deterministicKey('image', keyIdentity, itemImage),
      image: image(itemImage),
      altNeedsReview: item.altNeedsReview ?? inheritedAltNeedsReview,
    })
  }

  function mediaAsset(value: unknown, identity: string): unknown {
    if (typeof value === 'string') {
      if (/^https:\/\//u.test(value)) {
        return {
          _type: 'mediaAsset',
          kind: 'video',
          remoteUrl: value,
          needsReview: true,
          needsApprovedEmbed: true,
        }
      }
      if (assetKindForPath(value) === 'image') {
        return {
          _type: 'mediaAsset',
          kind: 'image',
          image: image(value),
          needsReview: true,
        }
      }
      return {
        _type: 'mediaAsset',
        kind: 'video',
        file: file(value),
        needsReview: true,
      }
    }
    if (!isRecord(value)) return value

    const mapped: JsonRecord = {...value, _type: 'mediaAsset'}
    if (value.image) mapped.image = image(value.image)
    if (value.file) mapped.file = file(value.file)
    if (value.source) mapped.file = file(value.source)
    if (value.poster) mapped.poster = image(value.poster)
    if (value.captionsFile) mapped.captionsFile = file(value.captionsFile)
    if (!mapped.kind) mapped.kind = mapped.image ? 'image' : 'video'
    if ((mapped.remoteUrl || mapped.remotePlayerId) && mapped.needsApprovedEmbed === undefined) {
      mapped.needsApprovedEmbed = true
    }
    if (!mapped._key && value._key) mapped._key = value._key
    if (!mapped._key && identity) mapped._key = deterministicKey('media', identity)
    return mapped
  }

  function creditItems(value: unknown, identity: string): unknown {
    if (!Array.isArray(value)) return value
    return value.map((raw, index) => {
      const item: JsonRecord = isRecord(raw) ? {...raw} : {value: String(raw)}
      if (Array.isArray(item.value)) {
        item.richValue = item.value
        delete item.value
      }
      return {
        ...item,
        _type: 'credit',
        _key: typeof item._key === 'string'
          ? item._key
          : deterministicKey('credit', identity, item.label, item.value, index),
      }
    })
  }

  function keyedObjects(value: unknown, type: string, identity: string): unknown {
    if (!Array.isArray(value)) return value
    return value.map((raw, index) => {
      const item: JsonRecord = isRecord(raw) ? raw : {value: raw}
      return {
        ...item,
        _type: type,
        _key: typeof item._key === 'string'
          ? item._key
          : deterministicKey(type, identity, item.name, item.label, item.url, index),
      }
    })
  }

  function cover(value: unknown): unknown {
    if (!isRecord(value)) return value
    const mapped: JsonRecord = {...value, _type: 'coverMedia'}
    mapped.focalPoint = focalPoint(value.focalPoint)
    mapped.poster = image(value.poster, isRecord(value.focalPoint) ? value.focalPoint : undefined)
    if (typeof value.previewVideo === 'string' && /^https:\/\//u.test(value.previewVideo)) {
      mapped.previewVideoUrl = value.previewVideo
      delete mapped.previewVideo
      mapped.needsReview ??= true
    } else if (value.previewVideo) {
      mapped.previewVideo = file(value.previewVideo)
    }
    if (value.previewPosterOverride) mapped.previewPosterOverride = image(value.previewPosterOverride)
    if (value.mobilePoster) mapped.mobilePoster = image(value.mobilePoster)
    return mapped
  }

  function contentBlock(value: unknown, projectId: string, index: number): JsonRecord {
    if (!isRecord(value)) throw new Error(`Project ${projectId} contains a non-object content block.`)
    const blockType = String(value._type ?? '')
    const blockIdentity =
      value.image ?? value.source ?? value.vimeoId ?? value.youtubeId ?? value.text ?? value.body ?? index
    const blockKey = typeof value._key === 'string'
      ? value._key
      : deterministicKey('block', projectId, blockType, blockIdentity, index)
    const mapped: JsonRecord = {...value, _key: blockKey, _type: blockType}

    if (['heroImage', 'fullBleedImage', 'containedImage'].includes(blockType)) {
      mapped.image = image(value.image)
    }

    if (blockType === 'containedImage') {
      mapped.width ??= 'wide'
      mapped.alignment ??= 'center'
    }

    if (['heroVideo', 'video', 'shortLoop'].includes(blockType)) {
      if (value.source) {
        const localSource = localPathFrom(value.source)
        if (localSource) {
          mapped.source = file(localSource)
        } else if (typeof value.source === 'string' && /^https:\/\//u.test(value.source)) {
          mapped.remoteSource = value.source
          delete mapped.source
          mapped.needsApprovedEmbed ??= true
        }
      }
      if (value.poster) mapped.poster = image(value.poster)
      if (value.captionsFile) mapped.captionsFile = file(value.captionsFile)
    }

    if (blockType === 'heroVideo' || blockType === 'video') {
      mapped.aspectRatio ??= '16:9'
    }
    if (blockType === 'video') mapped.autoplay ??= false
    if (blockType === 'shortLoop') {
      mapped.autoplayPolicy ??= 'never'
      mapped.startMuted = true
      mapped.loop = true
    }

    if (blockType === 'imageGrid') {
      const rawImages = Array.isArray(value.images) ? value.images : []
      mapped.images = rawImages.map((item, imageIndex) =>
        imageItem(item, `${projectId}:${blockKey}:${imageIndex}`, value.altNeedsReview === true),
      )
      mapped.desktopColumns ??= 3
      mapped.mobileLayout = 'stack'
    }

    if (blockType === 'imagePair') {
      const fallbackImages = Array.isArray(value.images) ? value.images : []
      mapped.left = imageItem(
        value.left ?? fallbackImages[0],
        `${projectId}:${blockKey}:left`,
        value.altNeedsReview === true,
      )
      mapped.right = imageItem(
        value.right ?? fallbackImages[1],
        `${projectId}:${blockKey}:right`,
        value.altNeedsReview === true,
      )
      delete mapped.images
      mapped.ratioHandling ??= 'natural'
    }

    if (blockType === 'textNote' && typeof value.body === 'string') {
      mapped.body = portableTextFromString(value.body, `${projectId}:${blockKey}`)
    }

    return mapped
  }

  function seo(value: unknown): unknown {
    if (!isRecord(value)) return value
    return {
      ...value,
      _type: 'seoFields',
      ...(value.shareImage ? {shareImage: image(value.shareImage)} : {}),
    }
  }

  function brandAsset(value: unknown): unknown {
    const record = isRecord(value) ? value : undefined
    const localPath = localPathFrom(record?.file ?? record?.image ?? value)
    if (!localPath) return value
    return assetKindForPath(localPath) === 'image'
      ? {_type: 'brandAsset', format: 'image', image: image(localPath)}
      : {_type: 'brandAsset', format: 'file', file: file(localPath)}
  }

  function settings(value: JsonRecord): JsonRecord {
    const reel = isRecord(value.reel) ? value.reel : {enabled: false}
    const mappedReel: JsonRecord = {
      ...reel,
      _type: 'reelSettings',
      enabled: reel.enabled === true,
      startMuted: true,
      aspectRatio: reel.aspectRatio ?? '16:9',
    }
    if (reel.poster) mappedReel.poster = image(reel.poster)
    if (typeof reel.desktopSource === 'string' && /^https:\/\//u.test(reel.desktopSource)) {
      mappedReel.desktopSourceUrl = reel.desktopSource
      delete mappedReel.desktopSource
    } else if (reel.desktopSource) {
      mappedReel.desktopSource = file(reel.desktopSource)
    }
    if (typeof reel.mobileSource === 'string' && /^https:\/\//u.test(reel.mobileSource)) {
      mappedReel.mobileSourceUrl = reel.mobileSource
      delete mappedReel.mobileSource
    } else if (reel.mobileSource) {
      mappedReel.mobileSource = file(reel.mobileSource)
    }
    if (reel.credits) mappedReel.credits = creditItems(reel.credits, 'siteSettings:reel')

    const about = typeof value.about === 'string' && value.about.trim()
      ? portableTextFromString(value.about, 'siteSettings:about')
      : value.about
    const seededAboutPeople = aboutPeopleSeedItems(value.aboutPeople)
    const mappedAboutPeople = Array.isArray(seededAboutPeople)
      ? seededAboutPeople.map((rawPerson, personIndex) => {
          const person = isRecord(rawPerson) ? rawPerson : {}
          const selectedWork = Array.isArray(person.selectedWork)
            ? person.selectedWork.map((rawWork, workIndex) => {
                const work = isRecord(rawWork) ? rawWork : {}
                return withoutUndefined({
                  ...work,
                  _type: 'aboutWork',
                  _key: typeof work._key === 'string'
                    ? work._key
                    : deterministicKey(
                        'about-work',
                        person.projectOwner ?? personIndex,
                        work.title ?? workIndex,
                      ),
                  image: work.image ? image(work.image) : undefined,
                })
              })
            : person.selectedWork
          return {...person, selectedWork}
        })
      : seededAboutPeople

    return withoutUndefined({
      ...value,
      _id: 'siteSettings',
      _type: 'siteSettings',
      siteName: value.siteName ?? 'New Work Agency',
      wordmark: brandAsset(value.wordmark),
      compactMark: brandAsset(value.compactMark),
      about,
      aboutPeople: mappedAboutPeople,
      socialLinks: keyedObjects(value.socialLinks ?? [], 'socialLink', 'siteSettings'),
      reel: mappedReel,
      notesEnabled: value.notesEnabled === true,
      analyticsEnabled: value.analyticsEnabled === true,
      defaultSeo: seo(value.defaultSeo ?? {noIndex: true}),
    })
  }

  function project(value: JsonRecord): JsonRecord {
    const slug = typeof value.slug === 'string'
      ? {_type: 'slug', current: value.slug}
      : value.slug
    const slugCurrent = isRecord(slug) && typeof slug.current === 'string'
      ? slug.current
      : undefined
    if (!slugCurrent) throw new Error('Every seed project requires a confirmed fixture slug.')
    const projectId = typeof value._id === 'string' && value._id
      ? value._id
      : `project.seed.${deterministicKey('id', slugCurrent)}`
    const blocks = Array.isArray(value.contentBlocks)
      ? value.contentBlocks.map((block, index) => contentBlock(block, projectId, index))
      : []

    return withoutUndefined({
      ...value,
      _id: projectId,
      _type: 'project',
      slug,
      contributors: keyedObjects(value.contributors, 'contributor', projectId),
      cover: cover(value.cover),
      contentBlocks: blocks,
      credits: creditItems(value.credits, projectId),
      visible: false,
      needsReview: true,
      featuredOnHome: value.featuredOnHome === true,
      doNotPublishWithoutExplicitApproval:
        value.doNotPublishWithoutExplicitApproval === true,
      rightsApprovalStatus: 'pending',
      seo: seo(value.seo ?? {noIndex: true}),
    })
  }

  function note(value: JsonRecord): JsonRecord {
    const slugValue = typeof value.slug === 'string' ? value.slug : undefined
    const noteId = typeof value._id === 'string'
      ? value._id
      : `note.${slugValue ?? deterministicKey('note', value.title)}`
    const body = typeof value.body === 'string'
      ? portableTextFromString(value.body, `${noteId}:body`)
      : value.body

    return withoutUndefined({
      ...value,
      _id: noteId,
      _type: 'note',
      slug: slugValue ? {_type: 'slug', current: slugValue} : value.slug,
      media: mediaAsset(value.media, `${noteId}:media`),
      body,
      visible: false,
      needsReview: true,
      doNotPublishWithoutExplicitApproval:
        value.doNotPublishWithoutExplicitApproval === true,
      rightsApprovalStatus: 'pending',
      seo: seo(value.seo ?? {noIndex: true}),
    })
  }

  return {settings, project, note}
}

function assertUnique(values: string[], label: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Duplicate ${label}: ${value}`)
    seen.add(value)
  }
}

function assetReferenceId(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.asset) || typeof value.asset._ref !== 'string') {
    return undefined
  }
  return value.asset._ref
}

function isEditorialAsset(value: JsonRecord): boolean {
  return (value._type === 'image' || value._type === 'file') && Boolean(assetReferenceId(value))
}

function fixtureAuthoritativeMerge(seed: unknown, existing: unknown): unknown {
  if (existing === undefined) return seed

  if (Array.isArray(seed)) {
    // Arrays are ordered editorial structures. Force mode deliberately takes
    // the fixture order and membership exactly, including block removals.
    return seed
  }

  if (isRecord(seed) && isRecord(existing)) {
    const merged: JsonRecord = {...existing}
    for (const [key, seedValue] of Object.entries(seed)) {
      if (['_rev', '_createdAt', '_updatedAt'].includes(key)) continue
      merged[key] = fixtureAuthoritativeMerge(seedValue, existing[key])
    }
    return merged
  }

  return seed
}

/**
 * Merge an imported seed document with an existing deterministic document.
 *
 * Preservation mode (default): existing editorial values and existing-only
 * keyed array items win, new fixture fields/items are added, and any specific
 * heightened blocker that is true in the fixture is reasserted. If an editor
 * has replaced an image/file asset reference, the replacement object is kept
 * intact so blockers belonging to the old fixture asset are not transferred to
 * the approved replacement.
 *
 * Force mode: fixture values win for every fixture-owned field, and fixture
 * arrays replace existing arrays exactly. Existing object fields that the
 * fixture does not model are retained. The generated fixture still resets
 * imported project/note publication state to visible=false and
 * needsReview=true, so force mode cannot promote content.
 */
export function mergeSeedWithExisting(
  seed: unknown,
  existing: unknown,
  mode: SeedUpdateMode = 'preserve',
): unknown {
  if (existing === undefined) return seed

  if (mode === 'force') return fixtureAuthoritativeMerge(seed, existing)

  if (Array.isArray(seed) && Array.isArray(existing)) {
    const keyedSeed = seed.every((item) => isRecord(item) && typeof item._key === 'string')
    const keyedExisting = existing.every((item) => isRecord(item) && typeof item._key === 'string')
    if (!keyedSeed || !keyedExisting) return existing

    const seedByKey = new Map(
      seed
        .filter((item): item is JsonRecord => isRecord(item) && typeof item._key === 'string')
        .map((item) => [String(item._key), item]),
    )
    const existingKeys = new Set(
      existing
        .filter((item): item is JsonRecord => isRecord(item) && typeof item._key === 'string')
        .map((item) => String(item._key)),
    )

    return [
      ...existing.map((item) => {
        if (!isRecord(item) || typeof item._key !== 'string') return item
        const seededItem = seedByKey.get(item._key)
        return seededItem === undefined
          ? item
          : mergeSeedWithExisting(seededItem, item, mode)
      }),
      ...seed.filter(
        (item) => isRecord(item) && typeof item._key === 'string' && !existingKeys.has(item._key),
      ),
    ]
  }

  if (isRecord(seed) && isRecord(existing)) {
    const seedAssetReference = assetReferenceId(seed)
    const existingAssetReference = assetReferenceId(existing)
    if (
      isEditorialAsset(seed) &&
      isEditorialAsset(existing) &&
      seedAssetReference !== existingAssetReference
    ) {
      return existing
    }

    const merged: JsonRecord = {...seed}
    for (const [key, existingValue] of Object.entries(existing)) {
      if (['_rev', '_createdAt', '_updatedAt'].includes(key)) continue
      merged[key] = key in seed
        ? mergeSeedWithExisting(seed[key], existingValue, mode)
        : existingValue
    }

    for (const blocker of HEIGHTENED_SAFETY_BLOCKERS) {
      if (seed[blocker] === true) merged[blocker] = true
    }

    return merged
  }

  return existing
}

export function resolveSeedUpdateMode(
  args: readonly string[] = process.argv.slice(2),
  environment: NodeJS.ProcessEnv = process.env,
): SeedUpdateMode {
  const meaningfulArgs = args.filter((argument) => argument !== '--')
  const unknownOption = meaningfulArgs.find(
    (argument) => argument.startsWith('--') && !['--force-update', '--dry-run'].includes(argument),
  )
  if (unknownOption) {
    throw new Error(`Unknown seed option: ${unknownOption}. Supported options are --dry-run and --force-update.`)
  }

  if (meaningfulArgs.includes('--force-update')) return 'force'

  const configuredMode = environment.SANITY_SEED_UPDATE_MODE?.trim().toLowerCase()
  if (!configuredMode || configuredMode === 'preserve') return 'preserve'
  if (configuredMode === 'force') return 'force'
  throw new Error('SANITY_SEED_UPDATE_MODE must be either preserve or force.')
}

export function seedIsDryRun(args: readonly string[] = process.argv.slice(2)): boolean {
  return args.filter((argument) => argument !== '--').includes('--dry-run')
}

function changedDocumentPaths(left: unknown, right: unknown, path = ''): string[] {
  if (Object.is(left, right)) return []
  if (Array.isArray(left) || Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right) ? [] : [path || '(document)']
  }
  if (isRecord(left) && isRecord(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    return [...keys].flatMap((key) => changedDocumentPaths(
      left[key],
      right[key],
      path ? `${path}.${key}` : key,
    ))
  }
  return [path || '(document)']
}

function optionalNotes(): JsonRecord[] {
  const canonical = resolve(packageRoot, 'content', 'notes.json')
  const bundled = resolve(appRoot, 'src', 'content', 'local', 'notes.json')
  const path = existsSync(canonical) ? canonical : existsSync(bundled) ? bundled : undefined
  return path ? readJson<JsonRecord[]>(path) : []
}

async function main(): Promise<void> {
  loadEnvironmentFiles()

  const updateMode = resolveSeedUpdateMode()
  const dryRun = seedIsDryRun()
  if (updateMode === 'force') {
    console.warn(
      'Force update enabled: fixture-owned fields and ordered arrays will overwrite existing editorial values; imported publication state will be reset to hidden and needs-review.',
    )
  } else {
    console.log(
      'Preservation update enabled: existing editorial values remain authoritative while true fixture safety blockers are reasserted.',
    )
  }

  const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.SANITY_STUDIO_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production'
  const token = process.env.SANITY_WRITE_TOKEN
  const readToken = dryRun ? process.env.SANITY_PREVIEW_TOKEN : undefined
  const apiVersion = process.env.SANITY_API_VERSION ?? '2026-08-01'

  if (!projectId) {
    throw new Error('Set SANITY_STUDIO_PROJECT_ID (or PUBLIC_SANITY_PROJECT_ID) before seeding.')
  }
  if (!token && !dryRun) {
    throw new Error(
      'Set SANITY_WRITE_TOKEN to a dedicated token with dataset write access.',
    )
  }

  const settingsFixture = readJson<JsonRecord>(fixturePath('site-settings.json'))
  const projectFixtures = readJson<JsonRecord[]>(fixturePath('projects.json'))
  const noteFixtures = optionalNotes()
  const manifestRows = readManifest()
  const manifestByPath = new Map(
    manifestRows.map((row) => [row.local_path, row]),
  )

  const referencedPaths = [...collectLocalAssetPaths([
    settingsFixture,
    projectFixtures,
    noteFixtures,
  ])].sort()

  assertUnique(
    projectFixtures.map((project) => {
      const slug = typeof project.slug === 'string'
        ? project.slug
        : String((project.slug as JsonRecord | undefined)?.current)
      return typeof project._id === 'string' && project._id
        ? project._id
        : `project.seed.${deterministicKey('id', slug)}`
    }),
    'project _id',
  )
  assertUnique(
    projectFixtures.map((project) =>
      typeof project.slug === 'string'
        ? project.slug
        : String((project.slug as JsonRecord | undefined)?.current),
    ),
    'project slug',
  )
  assertUnique(
    projectFixtures.flatMap((project) =>
      Array.isArray(project.contentBlocks)
        ? project.contentBlocks.flatMap((block) =>
            typeof (block as JsonRecord)._key === 'string'
              ? [String((block as JsonRecord)._key)]
              : [],
          )
        : [],
    ),
    'fixture block _key',
  )

  for (const localPath of referencedPaths) {
    const row = manifestByPath.get(localPath)
    if (!row) throw new Error(`Fixture path is absent from the manifest: ${localPath}`)
    if (row.asset_layer !== 'web-ready') {
      throw new Error(`Fixture path is not marked web-ready in the manifest: ${localPath}`)
    }
    resolveLocalAsset(localPath)
  }

  const client = createClient({
    projectId,
    dataset,
    token: token || readToken,
    apiVersion,
    useCdn: false,
    perspective: 'published',
  })

  console.log(
    dryRun
      ? `Dry run: verified ${referencedPaths.length} web-ready fixture assets; no uploads or document writes will occur.`
      : `Verified ${referencedPaths.length} web-ready fixture assets; uploading or reusing them.`,
  )
  const uploadedAssetIds = new Map<string, string>()
  for (const localPath of referencedPaths) {
    const row = manifestByPath.get(localPath)
    if (!row) throw new Error(`Missing manifest row for ${localPath}`)
    if (dryRun) {
      const absolutePath = resolveLocalAsset(localPath)
      const digests = await digestsForFile(absolutePath)
      if (row.sha256 && digests.sha256 !== row.sha256) {
        throw new Error(`Checksum mismatch for ${localPath}: manifest ${row.sha256}, file ${digests.sha256}.`)
      }
      const assetType = assetKindForPath(localPath) === 'image' ? 'sanity.imageAsset' : 'sanity.fileAsset'
      const existingId = await client.fetch<string | null>(
        `*[_type == $assetType && sha1hash == $sha1][0]._id`,
        {assetType, sha1: digests.sha1},
      )
      uploadedAssetIds.set(localPath, existingId || `dry-run-missing-${digests.sha1}`)
    } else {
      uploadedAssetIds.set(localPath, await uploadAsset(client, localPath, row))
    }
  }

  const mapper = createMapper(manifestByPath, uploadedAssetIds)
  const seedDocuments = [
    mapper.settings(settingsFixture),
    ...projectFixtures.map(mapper.project),
    ...noteFixtures.map(mapper.note),
  ]
  assertUnique(
    seedDocuments.flatMap((document) =>
      Array.isArray(document.contentBlocks)
        ? document.contentBlocks.map((block) => String((block as JsonRecord)._key))
        : [],
    ),
    'mapped block _key',
  )

  const existingDocuments = await client.fetch<JsonRecord[]>(
    `*[_id in $ids]`,
    {ids: seedDocuments.map((document) => document._id)},
  )
  const existingById = new Map(
    existingDocuments.map((document) => [String(document._id), document]),
  )
  const documents = seedDocuments.map((document) =>
    mergeSeedWithExisting(
      document,
      existingById.get(String(document._id)),
      updateMode,
    ) as JsonRecord,
  )

  if (dryRun) {
    const missingAssets = [...uploadedAssetIds.values()].filter((id) => id.startsWith('dry-run-missing-')).length
    const documentPlans = documents.map((document) => {
      const existing = existingById.get(String(document._id))
      const paths = changedDocumentPaths(existing, document)
        .filter((path) => !['_rev', '_createdAt', '_updatedAt'].includes(path))
      return {
        id: String(document._id),
        action: existing ? (paths.length ? 'update' : 'unchanged') : 'create',
        changedPaths: paths,
      }
    })
    console.log(JSON.stringify({
      dryRun: true,
      projectId,
      dataset,
      updateMode,
      assets: {referenced: referencedPaths.length, wouldUpload: missingAssets},
      documents: documentPlans,
    }, null, 2))
    return
  }

  let transaction = client.transaction()
  for (const document of documents) {
    transaction = transaction.createOrReplace(document as SanityDocumentStub & {_id: string})
  }
  await transaction.commit({autoGenerateArrayKeys: false})

  console.log(
    `Seed complete: 1 site settings document, ${projectFixtures.length} projects, ${noteFixtures.length} notes, ${referencedPaths.length} deduplicated assets.`,
  )
  console.log(
    updateMode === 'force'
      ? 'Force update reapplied visible=false, needsReview=true, and noIndex=true to imported records.'
      : 'New records remain visible=false, needsReview=true, and noIndex=true; existing publication/review choices were preserved.',
  )
}

const executedFile = process.argv[1] ? resolve(process.argv[1]) : undefined
if (executedFile === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}

import {createHash} from 'node:crypto'
import {createReadStream, existsSync} from 'node:fs'
import {basename, resolve} from 'node:path'
import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION} from '../sanity.constants'

type Reference = {_type: 'reference'; _ref: string; _key?: string}
type RecordValue = Record<string, unknown>
type DocumentValue = RecordValue & {_id: string; _createdAt?: string; title?: string}

const apply = process.argv.slice(2).filter((argument) => argument !== '--').includes('--apply')
const client = getCliClient({apiVersion: SANITY_API_VERSION}).withConfig({perspective: 'published'})
const workspaceRoot = resolve(process.cwd(), '..')
const michaelWorkLegacyId = 'work.michael-selected-photography'

const michaelAssets = [
  ['michael-poolside-product', 'Poolside product', 'assets/web-ready/images/michael/portfolio-expansion/michael-poolside-product.webp', 'A hand holding a drink beside a swimming pool and a striped snack box.'],
  ['michael-wow-rainbow-pavement', 'Rainbow pavement portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-wow-rainbow-pavement.webp', 'A man standing on a broad pavement painted in bright rainbow stripes.'],
  ['michael-food-test-sandwich', 'Sandwich still life', 'assets/web-ready/images/michael/portfolio-expansion/michael-food-test-sandwich.webp', 'A close-up deli sandwich held above a branded paper wrapper.'],
  ['michael-aw50273-dark-portrait', 'Patterned dress portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-aw50273-dark-portrait.webp', 'A seated woman in a black and yellow patterned dress holding a leafy stem.'],
  ['michael-ad-interior', 'Warm dining interior', 'assets/web-ready/images/michael/portfolio-expansion/michael-ad-interior.webp', 'A modern dining table and pendant lights in a warm beige interior.'],
  ['michael-rainbow-cart-portrait', 'Rainbow court portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-rainbow-cart-portrait.webp', 'A smiling man standing behind a red shopping cart on a colorful outdoor court.'],
  ['michael-nanu-black-pot', 'Black cookware still life', 'assets/web-ready/images/michael/portfolio-expansion/michael-nanu-black-pot.webp', 'A black cooking pot with gold details on a dark reflective surface.'],
  ['michael-8023156-uniform-portrait', 'Striped sunlight portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-8023156-uniform-portrait.webp', 'A woman in a dark blazer and cream uniform standing in striped sunlight.'],
  ['michael-cradlewise-family', 'Cradlewise family', 'assets/web-ready/images/michael/portfolio-expansion/michael-cradlewise-family.webp', 'Two parents sitting with their baby in a softly lit bedroom.'],
  ['michael-native-haircare-cupcakes', 'Native haircare portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-native-haircare-cupcakes.webp', 'A woman dressed in white holding a pink haircare bottle against a white background.'],
  ['michael-aw50519-court-bw', 'Court portrait in black and white', 'assets/web-ready/images/michael/portfolio-expansion/michael-aw50519-court-bw.webp', 'A black-and-white portrait of a man standing on an indoor court.'],
  ['michael-skincare-blue-still', 'Blue skincare still life', 'assets/web-ready/images/michael/portfolio-expansion/michael-skincare-blue-still.webp', 'A skincare tube and open cream jar arranged on a sculpted blue surface.'],
  ['michael-8024096-red-suit', 'Red suit portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-8024096-red-suit.webp', 'A woman in a bright red suit seated on outdoor steps among potted plants.'],
  ['michael-molekule-bath', 'Molekule bathroom scene', 'assets/web-ready/images/michael/portfolio-expansion/michael-molekule-bath.webp', 'A woman relaxing in a bathtub beside a compact air purifier.'],
  ['michael-aw59596-double-exposure', 'Double-exposure event portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-aw59596-double-exposure.webp', 'A warm double-exposure portrait of a woman at an event.'],
  ['michael-green-exterior-pair', 'Green exterior portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-green-exterior-pair.webp', 'A person in a yellow beanie standing beside a vivid green building.'],
  ['michael-product-popcorn', 'Popcorn product still life', 'assets/web-ready/images/michael/portfolio-expansion/michael-product-popcorn.webp', 'A yellow popcorn product box surrounded by scattered popcorn on a blue background.'],
  ['michael-img8738-wedding-bw', 'Wedding scene in black and white', 'assets/web-ready/images/michael/portfolio-expansion/michael-img8738-wedding-bw.webp', 'A black-and-white wedding scene with a bride surrounded by falling confetti.'],
  ['michael-sports-product-graphic', 'Skincare and peach still life', 'assets/web-ready/images/michael/portfolio-expansion/michael-sports-product-graphic.webp', 'White skincare bottles and peaches arranged on an orange surface.'],
  ['michael-aw51026-court-portrait', 'Indoor court portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-aw51026-court-portrait.webp', 'A man in a denim jacket holding a phone on an indoor court.'],
  ['michael-rob-summerlin-curlers', 'Salon chair portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-rob-summerlin-curlers.webp', 'A person in a red outfit and hair curlers reclining in a salon chair.'],
  ['michael-aw59536-group', 'Warm group portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-aw59536-group.webp', 'Three people posing together in a warmly lit room.'],
  ['michael-img7198-portrait', 'Reflective portrait', 'assets/web-ready/images/michael/portfolio-expansion/michael-img7198-portrait.webp', 'A woman in a pink scarf posing against a reflective silver background.'],
  ['michael-aw59665-double-exposure', 'Double-exposure pair', 'assets/web-ready/images/michael/portfolio-expansion/michael-aw59665-double-exposure.webp', 'A warm double exposure of two smiling men standing together.'],
  ['michael-native-stop-motion-still', 'Native poolside products', 'assets/web-ready/images/michael/michael_native_stop_motion-poster.webp', 'Two Native deodorant packages arranged beside a blue tiled swimming pool.'],
] as const

function reference(_ref: string, _key?: string): Reference {
  return {_type: 'reference', _ref, ...(_key ? {_key} : {})}
}

function referenceId(value: unknown): string | undefined {
  return value && typeof value === 'object' && '_ref' in value && typeof value._ref === 'string'
    ? value._ref.replace(/^drafts\./u, '')
    : undefined
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/gu, '')
    .replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 88) || 'asset'
}

function uniqueSlug(base: string, used: Set<string>): string {
  let slug = slugify(base)
  let suffix = 2
  while (used.has(slug)) {
    slug = `${slugify(base).slice(0, 82)}-${suffix}`
    suffix += 1
  }
  used.add(slug)
  return slug
}

async function sha1(path: string): Promise<string> {
  const hash = createHash('sha1')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function uploadImage(path: string, title: string): Promise<string> {
  const digest = await sha1(path)
  const existingId = await client.fetch<string | null>(
    `*[_type == "sanity.imageAsset" && sha1hash == $digest][0]._id`,
    {digest},
  )
  if (existingId) return existingId
  const uploaded = await client.assets.upload('image', createReadStream(path), {
    filename: basename(path),
    title,
  })
  return uploaded._id
}

function mediaProjectId(media: DocumentValue): string | undefined {
  const direct = referenceId(media.project)
  if (direct) return direct
  const legacy = Array.isArray(media.works) ? media.works.map(referenceId).filter(Boolean) : []
  if (legacy.length > 1) {
    throw new Error(`${media._id} belongs to multiple legacy Works. Assign one Project before migration.`)
  }
  return legacy[0]
}

async function main() {
  const [works, mediaItems, workPage, existingMichaelWork, existingMichaelMedia] = await Promise.all([
    client.fetch<DocumentValue[]>(`*[_type == "work" && !(_id in path("drafts.**"))]`),
    client.fetch<DocumentValue[]>(`*[_type == "mediaItem" && !(_id in path("drafts.**"))] | order(_createdAt asc)`),
    client.fetch<DocumentValue | null>(`*[_id == "workPage"][0]`),
    client.fetch<DocumentValue | null>(`*[_type == "work" && legacyId == $legacyId][0]`, {legacyId: michaelWorkLegacyId}),
    client.fetch<DocumentValue[]>(`*[_type == "mediaItem" && migrationSourceKey match "michael-gallery:*"]`),
  ])

  for (const [, , relativePath] of michaelAssets) {
    const path = resolve(workspaceRoot, relativePath)
    if (!existsSync(path)) throw new Error(`Missing Michael source image: ${path}`)
  }

  const unassigned = mediaItems.filter((media) => !mediaProjectId(media))
  const plan = {
    existingAssets: mediaItems.length,
    existingAssetsToLink: mediaItems.filter((media) => !referenceId(media.project) && mediaProjectId(media)).length,
    unassignedAssets: unassigned.map((media) => media._id),
    michaelWork: existingMichaelWork ? 'reuse' : 'create',
    michaelAssetsToCreate: michaelAssets.length - existingMichaelMedia.length,
    michaelGalleryDoorways: michaelAssets.length,
  }
  if (!apply) {
    console.log(JSON.stringify({dryRun: true, ...plan}, null, 2))
    console.log('Run again with --apply to flatten Asset ownership, import Michael photography, and rebuild the front gallery with Asset references.')
    return
  }

  let michaelWork = existingMichaelWork
  if (!michaelWork) {
    michaelWork = await client.create({
      _type: 'work',
      legacyId: michaelWorkLegacyId,
      title: 'Michael — Selected Photography',
      slug: {_type: 'slug', current: 'michael-selected-photography'},
      owner: 'michael',
      types: ['Photography'],
      template: 'photo',
      editorialStatus: 'draft',
      visible: false,
      featuredOnHome: false,
      homeOrder: 2,
      homeCardSize: 'standard',
      homeOffset: 0,
      homeTreatment: 'standard',
      projectTheme: 'warm',
      titleTreatment: 'stacked',
      heroTreatment: 'contained',
      layoutVariant: 'photoEssay',
      motionIntensity: 'medium',
      doNotPublishWithoutExplicitApproval: false,
      needsReview: false,
      seo: {noIndex: true},
    }) as DocumentValue
  }

  const usedSlugs = new Set(mediaItems.flatMap((media) => {
    const slug = media.slug && typeof media.slug === 'object' && 'current' in media.slug
      ? String(media.slug.current || '')
      : ''
    return slug ? [slug] : []
  }))
  const existingMichaelByKey = new Map(existingMichaelMedia.flatMap((media) => (
    typeof media.migrationSourceKey === 'string' ? [[media.migrationSourceKey, media]] : []
  )))
  const coverAssetByWork = new Map(works.flatMap((work) => {
    const cover = work.cover && typeof work.cover === 'object' ? work.cover as RecordValue : undefined
    const poster = cover?.poster && typeof cover.poster === 'object' ? cover.poster as RecordValue : undefined
    const assetId = referenceId(poster?.asset)
    return assetId ? [[work._id, assetId] as const] : []
  }))
  const michaelMedia: DocumentValue[] = []
  for (const [index, [sourceKey, title, relativePath, alt]] of michaelAssets.entries()) {
    const migrationSourceKey = `michael-gallery:${sourceKey}`
    const path = resolve(workspaceRoot, relativePath)
    const imageAssetId = await uploadImage(path, `Michael — ${title}`)
    const fields = {
      title: `Michael — ${title}`,
      slug: {_type: 'slug', current: sourceKey},
      migrationSourceKey,
      kind: 'image',
      image: {_type: 'image', asset: reference(imageAssetId)},
      alt,
      decorative: false,
      credit: 'Photography: Michael',
      tags: ['Michael', 'Photography'],
      project: reference(michaelWork._id),
      projectOrder: index,
    }
    const existing = existingMichaelByKey.get(migrationSourceKey)
    const media = existing
      ? await client.patch(existing._id).set(fields).commit()
      : await client.create({_type: 'mediaItem', ...fields})
    michaelMedia.push(media as DocumentValue)
    usedSlugs.add(sourceKey)
  }

  const orderByProject = new Map<string, number>()
  const migratedExisting: DocumentValue[] = []
  for (const media of mediaItems.filter((item) => !existingMichaelByKey.has(String(item.migrationSourceKey)))) {
    const projectId = mediaProjectId(media)
    const currentSlug = media.slug && typeof media.slug === 'object' && 'current' in media.slug
      ? String(media.slug.current || '')
      : ''
    const slug = currentSlug || uniqueSlug(String(media.title || media._id), usedSlugs)
    const order = projectId ? orderByProject.get(projectId) || 0 : undefined
    if (projectId) orderByProject.set(projectId, Number(order) + 1)
    const existingPoster = media.poster && typeof media.poster === 'object'
      ? media.poster as RecordValue
      : undefined
    const fallbackPosterAssetId = projectId && media.kind === 'video' && !referenceId(existingPoster?.asset)
      ? coverAssetByWork.get(projectId)
      : undefined
    const patched = await client.patch(media._id).set({
      ...(projectId ? {
        project: reference(projectId),
        projectOrder: typeof media.projectOrder === 'number' ? media.projectOrder : order,
      } : {}),
      ...(fallbackPosterAssetId ? {
        poster: {_type: 'image', asset: reference(fallbackPosterAssetId)},
      } : {}),
      slug: {_type: 'slug', current: slug},
    }).unset(['works']).commit()
    migratedExisting.push(patched as DocumentValue)
  }

  const firstMedia = michaelMedia[0]
  const firstImageAssetId = firstMedia && typeof firstMedia.image === 'object' && firstMedia.image && 'asset' in firstMedia.image
    ? referenceId(firstMedia.image.asset)
    : undefined
  if (!firstMedia || !firstImageAssetId) throw new Error('Michael primary image could not be resolved after upload.')

  const contentBlocks = michaelMedia.map((media, index) => ({
    _key: `michael-asset-${index + 1}`,
    _type: index % 3 === 0 ? 'fullBleedImage' : 'containedImage',
    mediaItem: reference(media._id),
    ...(index % 3 === 0 ? {} : {width: index % 2 === 0 ? 'wide' : 'medium', alignment: 'center'}),
  }))
  await client.patch(michaelWork._id).set({
    title: 'Michael — Selected Photography',
    slug: {_type: 'slug', current: 'michael-selected-photography'},
    owner: 'michael',
    types: ['Photography'],
    template: 'photo',
    shortDescription: 'A broad selection of portrait, product, lifestyle, interior, and campaign photography by Michael.',
    cover: {
      poster: {_type: 'image', asset: reference(firstImageAssetId)},
      alt: michaelAssets[0][3],
      decorative: false,
      mediaType: 'still',
      cardRatio: 'portrait',
    },
    contentBlocks,
    credits: [{_key: 'photography', _type: 'credit', label: 'Photography', value: 'Michael'}],
    whatWeDid: ['Photography'],
    editorialStatus: 'approved',
    visible: true,
    needsReview: false,
    doNotPublishWithoutExplicitApproval: false,
  }).commit()

  const allMedia = [...migratedExisting, ...michaelMedia]
  const mediaByProject = new Map<string, DocumentValue[]>()
  for (const media of allMedia) {
    const projectId = mediaProjectId(media)
    if (!projectId) continue
    const list = mediaByProject.get(projectId) || []
    list.push(media)
    mediaByProject.set(projectId, list)
  }
  for (const list of mediaByProject.values()) {
    list.sort((left, right) => Number(left.projectOrder || 0) - Number(right.projectOrder || 0))
  }
  if (!workPage || !Array.isArray(workPage.gallery)) throw new Error('The published workPage gallery is missing.')
  const michaelIds = new Set(michaelMedia.map((media) => media._id))
  const existingPlacements = workPage.gallery.flatMap((raw) => {
    if (!raw || typeof raw !== 'object') return []
    const placement = raw as RecordValue
    const currentAssetId = referenceId(placement.asset)
    if (currentAssetId && michaelIds.has(currentAssetId)) return []
    let assetId = currentAssetId
    if (!assetId) {
      const workId = referenceId(placement.work) || referenceId(placement.project)
      const candidates = workId ? mediaByProject.get(workId) || [] : []
      const coverAssetId = workId ? coverAssetByWork.get(workId) : undefined
      const coverMatch = coverAssetId
        ? candidates.find((media) => {
            const image = media.image && typeof media.image === 'object' ? media.image as RecordValue : undefined
            const poster = media.poster && typeof media.poster === 'object' ? media.poster as RecordValue : undefined
            return referenceId(image?.asset) === coverAssetId || referenceId(poster?.asset) === coverAssetId
          })
        : undefined
      assetId = coverMatch?._id || candidates[0]?._id
    }
    if (!assetId) throw new Error(`Gallery placement ${String(placement._key || 'unknown')} has no Project Asset.`)
    return [{
      _key: String(placement._key || `asset-${assetId}`),
      _type: 'workPlacement',
      asset: reference(assetId),
      cardSize: placement.cardSize || 'standard',
      treatment: placement.treatment || 'standard',
    }]
  })
  const michaelPlacements = michaelMedia.map((media, index) => ({
    _key: `michael-gallery-${index + 1}`,
    _type: 'workPlacement',
    asset: reference(media._id),
    cardSize: 'standard',
    treatment: 'standard',
  }))
  const gallery: RecordValue[] = []
  const length = Math.max(existingPlacements.length, michaelPlacements.length)
  for (let index = 0; index < length; index += 1) {
    if (existingPlacements[index]) gallery.push(existingPlacements[index])
    if (michaelPlacements[index]) gallery.push(michaelPlacements[index])
  }
  await client.patch(workPage._id).set({gallery}).commit({autoGenerateArrayKeys: false})

  console.log(JSON.stringify({applied: true, ...plan, galleryPlacements: gallery.length}, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

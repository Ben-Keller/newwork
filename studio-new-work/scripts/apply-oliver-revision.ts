import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID} from '../sanity.constants'

// Deliberate one-time update. Never called by a build or deployment workflow.
const revision = '2026-10-oliver'
const ids = ['siteSettings', 'workPage', 'footerSettings', 'contactPage']
const selection = [
  ['arc', 'arc-still-webp'],
  ['michael-selected-photography', 'michael-poolside-product'],
  ['michael-selected-photography', 'michael-wow-rainbow-pavement'],
  ['mercury-an-unexpected-life', 'mercury-an-unexpected-life-gallery-preview-cut'],
  ['michael-selected-photography', 'michael-aw50273-dark-portrait'],
  ['michael-selected-photography', 'michael-rainbow-cart-portrait'],
  ['native-cucumber-mint-stop-motion', 'native-stop-motion-working-mp4-extract'],
  ['cradlewise', 'cradlewise-still-webp'],
  ['michael-selected-photography', 'michael-8023156-uniform-portrait'],
  ['tour-de-france-x-toyota', 'tour-de-france-x-toyota-gallery-preview-cut'],
  ['michael-selected-photography', 'michael-skincare-blue-still'],
  ['humu-make-work-better-holly', 'humu-make-work-better-holly-gallery-preview-cut'],
  ['olympics-toyota-in-due-time', 'olympics-toyota-in-due-time-gallery-preview-cut'],
  ['dune-tansy', 'dune-tansy-still-webp'],
  ['michael-selected-photography', 'michael-8024096-red-suit'],
  ['michael-selected-photography', 'michael-aw59596-double-exposure'],
]
type Placement = {_key: string; _type: string; asset: {_type: 'reference'; _ref: string}; cardSize?: string; treatment?: string}
type Doc = {_id: string; _type: string; _rev: string; oliverRevision?: string; gallery?: Placement[]; galleryReserve?: Placement[]; navigation?: Array<Record<string, unknown>>; [key: string]: unknown}
type Asset = {_id: string; slug: string; project: string; kind: string; hasMedia: boolean; accessible: boolean}

async function main() {
  const args = new Set(process.argv.slice(2))
  const apply = args.has('--apply') && !args.has('--dry-run')
  const client = getCliClient({apiVersion: SANITY_API_VERSION}).withConfig({useCdn: false, perspective: 'raw'})
  if (client.config().projectId !== SANITY_PROJECT_ID || client.config().dataset !== SANITY_DATASET) throw new Error('Unexpected Sanity target.')
  const documents = await client.fetch<Doc[]>('*[_id in $ids || _id in $draftIds]', {ids, draftIds: ids.map(id => `drafts.${id}`)})
  if (documents.some(doc => doc._id.startsWith('drafts.'))) throw new Error('An editor has an existing settings draft. Reconcile it before this migration; nothing was changed.')
  const docs = Object.fromEntries(documents.map(doc => [doc._id, doc]))
  if (ids.some(id => !docs[id])) throw new Error('A required singleton is missing.')
  if (ids.every(id => docs[id].oliverRevision === revision)) {
    console.log('Oliver revision already applied. Editor changes are preserved; no action taken.')
    return
  }
  if (ids.some(id => docs[id].oliverRevision)) throw new Error('Partial/different migration marker found; inspect before proceeding.')
  const assets = await client.fetch<Asset[]>('*[_type == "mediaItem" && !(_id in path("drafts.**"))]{_id,"slug":slug.current,"project":project->slug.current,kind,"hasMedia":select(kind=="image"=>defined(image.asset),kind=="video"=>defined(poster.asset)&&(defined(videoFile.asset)||defined(videoUrl)),false),"accessible":decorative==true || length(coalesce(alt,""))>0}')
  const previous = docs.workPage.gallery || []
  const gallery = selection.map(([project, slug], index) => {
    const matches = assets.filter(asset => asset.project === project && asset.slug === slug)
    if (matches.length !== 1 || !matches[0].hasMedia || !matches[0].accessible) throw new Error(`Missing, ambiguous or incomplete selected Asset: ${project}/${slug}`)
    const asset = matches[0]
    const old = previous.find(item => item.asset?._ref === asset._id)
    return old || {_key: `oliver-${index + 1}`, _type: 'workPlacement', asset: {_type: 'reference' as const, _ref: asset._id}, cardSize: 'standard', treatment: 'standard'}
  })
  const selected = new Set(gallery.map(item => item.asset._ref))
  if (selected.size !== 16) throw new Error('The revision must contain sixteen unique Assets.')
  const reserve = [...(docs.workPage.galleryReserve || []), ...previous.filter(item => !selected.has(item.asset._ref))]
    .filter((item, index, all) => all.findIndex(other => other.asset._ref === item.asset._ref) === index)
  const artwork = await Promise.all(['horizontal', 'stacked', 'compact'].map(async variant => {
    const filename = `oliver-${variant}.svg`
    const contents = await readFile(new URL(`../../new-work-oliver-review/public/media/brand/${filename}`, import.meta.url))
    const viewBox = /viewBox="([^"]+)"/u.exec(contents.toString())?.[1].split(/\s+/u).map(Number)
    if (!viewBox || viewBox.length !== 4 || viewBox[2] <= 0 || viewBox[3] <= 0) throw new Error(`Invalid logo: ${filename}`)
    return {variant, filename, contents, width: viewBox[2], height: viewBox[3], digest: createHash('sha1').update(contents).digest('hex')}
  }))
  console.log(JSON.stringify({apply, project: SANITY_PROJECT_ID, dataset: SANITY_DATASET, documents: ids, gallery: {before: previous.length, after: gallery.length, reserve: reserve.length}, logos: artwork.map(({filename,width,height}) => ({filename,width,height})), homepageTicker: ['Film + photo','In production','New work'], cities: ['sf','la','nyc'], footerTicker: ['Arriving','In transit','Departing','Early'], callout: 'Looking to create something impactful?', contact: 'Keep existing email, address/location and socials; improve editor labels only.', projects: 'No project or Asset documents are edited or removed.'}, null, 2))
  if (!apply) return

  const backupDirectory = new URL('../.sanity/backups/', import.meta.url)
  await mkdir(backupDirectory, {recursive: true})
  const backup = new URL(`oliver-before-${new Date().toISOString().replace(/[:.]/gu, '-')}.json`, backupDirectory)
  await writeFile(backup, JSON.stringify({project: SANITY_PROJECT_ID, dataset: SANITY_DATASET, documents}, null, 2), {mode: 0o600})
  const brand: Record<string, unknown> = {}
  for (const art of artwork) {
    const existing = await client.fetch<string | null>('*[_type == "sanity.fileAsset" && sha1hash == $digest][0]._id', {digest: art.digest})
    const id = existing || (await client.assets.upload('file', art.contents, {filename: art.filename, contentType: 'image/svg+xml'}))._id
    brand[art.variant] = {_type: 'brandAsset', format: 'file', width: art.width, height: art.height, file: {_type: 'file', asset: {_type: 'reference', _ref: id}}}
  }
  const patches: Record<string, Record<string, unknown>> = {
    siteSettings: {
      wordmark: brand.horizontal, compactMark: brand.compact, stackedWordmark: brand.stacked,
      headerDescriptor: 'film + photo\nproduction agency',
      navigation: (docs.siteSettings.navigation || []).map(item => item.destination === 'about' ? {...item, visible: false} : item),
      'defaultSeo.metaDescription': 'New Work Agency is a film and photo production agency. Explore selected work and get in touch.',
      'defaultSeo.noIndex': false,
    },
    workPage: {gallery, galleryReserve: reserve, tickerWords: ['Film + photo','In production','New work'], tickerCities: ['sf','la','nyc'], btsHeading: 'Behind the scenes', btsSubtitle: ''},
    footerSettings: {calloutText: 'Looking to create something impactful?', tickerWords: ['Arriving','In transit','Departing','Early'], featuredHeading: 'Featured'},
    contactPage: {},
  }
  let transaction = client.transaction()
  for (const id of ids) transaction = transaction.patch(id, patch => patch.ifRevisionId(docs[id]._rev).set({...patches[id], oliverRevision: revision}))
  await transaction.commit({visibility: 'sync'})
  const after = await client.fetch<Doc[]>('*[_id in $ids]', {ids})
  if (after.some(doc => doc.oliverRevision !== revision)) throw new Error('Post-write verification failed.')
  const contact = after.find(doc => doc._id === 'contactPage')!
  for (const field of ['email','location','socialLinks']) if (JSON.stringify(contact[field]) !== JSON.stringify(docs.contactPage[field])) throw new Error(`Contact ${field} changed unexpectedly.`)
  console.log(`Updated four settings documents atomically. Contact placeholders preserved. Backup: ${backup.pathname}`)
}
main().catch(error => {console.error(error instanceof Error ? error.message : error); process.exitCode = 1})

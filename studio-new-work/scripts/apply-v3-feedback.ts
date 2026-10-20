import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID} from '../sanity.constants'

// Deliberate V3 content update; never invoked by a build or scheduled job.
// IDs, source provenance, ownership and existing public URLs remain stable.
type Doc = {_id: string; _rev: string; _type: string; [key: string]: unknown}
type Change = {doc: Doc; set: Record<string, unknown>; unset: string[]}
const names = /\b(?:Michael|Oliver)(?:\s+Hamilton)?\b/iu
const publicText = new Set(['title', 'client', 'shortDescription', 'alt', 'caption',
  'accessibleDescription', 'metaTitle', 'metaDescription', 'shareImageAlt', 'text', 'transcript'])
const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

function clean(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) {
    const entries = ['credits', 'contributors'].includes(key)
      ? value.filter(item => !record(item) || !names.test(String(item.name || item.value || '')))
      : value
    return entries.map(item => clean(item))
  }
  if (record(value)) return Object.fromEntries(Object.entries(value).flatMap(([childKey, item]) => {
    // Credit removals preserve the original values in the private backup.
    if (childKey === 'credit' && typeof item === 'string' && names.test(item)) return []
    return [[childKey, clean(item, childKey)]]
  }))
  if (typeof value !== 'string' || !publicText.has(key) || !names.test(value)) return value
  return value
    .replace(/^(?:Michael|Oliver(?: Hamilton)?)\s*[—–:-]\s*/iu, '')
    .replace(/\s+by (?:Michael|Oliver(?: Hamilton)?)(?=[.,]|$)/giu, '')
    .replace(/\b(?:Michael|Oliver)(?:\s+Hamilton)?\b/giu, 'New Work')
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg))) throw new Error('Use --apply or --dry-run')
  const apply = args.includes('--apply') && !args.includes('--dry-run')
  const client = getCliClient({apiVersion: SANITY_API_VERSION}).withConfig({useCdn: false, perspective: 'raw'})
  if (client.config().projectId !== SANITY_PROJECT_ID || client.config().dataset !== SANITY_DATASET) throw new Error('Unexpected Sanity target')
  const docs = await client.fetch<Doc[]>('*[_type in ["work", "mediaItem", "siteSettings", "footerSettings", "workPage", "contactPage", "aboutPage", "note"] && !(_id in path("versions.**"))]')
  const footer = docs.find(doc => doc._id === 'footerSettings')
  if (!footer) throw new Error('Missing footer')
  const changes: Change[] = []
  const publicRoots = new Set([...publicText, 'cover', 'seo', 'contentBlocks', 'credits', 'contributors', 'credit', 'reel'])
  const placeholders = JSON.parse(await readFile('../new-work-site/shared/client-logo-placeholders.json', 'utf8')) as Array<{_key: string; name: string; filename: string; width: number; height: number}>
  // Patch each draft from its own values, preserving all unrelated editor changes.
  for (const doc of docs) {
    const set: Record<string, unknown> = {}
    const unset: string[] = []
    for (const [key, value] of Object.entries(doc)) {
      if (!publicRoots.has(key)) continue
      if (key === 'credit' && typeof value === 'string' && names.test(value)) { unset.push(key); continue }
      const next = clean(value, key)
      if (JSON.stringify(next) !== JSON.stringify(value)) set[key] = next
    }
    if (doc._type === 'work') {
      const slug = record(doc.slug) ? doc.slug.current : ''
      const labels: Record<string, string> = {
        'michael-selected-photography': 'Client 01', 'dune-tansy': 'Client 02',
        'chanel-test': 'Client 03', 'fellow': 'Client 04', 'miss-jones-pancake': 'Client 05',
        'molekule-in-office': 'Client 06', arc: 'Arc', cradlewise: 'Cradlewise',
        'specialized-globe': 'Specialized', brava: 'Brava',
      }
      if (typeof slug === 'string' && labels[slug] && !doc.client) set.client = labels[slug]
    }
    if (doc._id.replace(/^drafts\./u, '') === footer._id && doc.clientLogos === undefined) {
      set.clientLogos = placeholders.map(item => ({_key: item._key, _type: 'clientLogo', name: item.name}))
    }
    if (Object.keys(set).length || unset.length) changes.push({doc, set, unset})
  }
  console.log(JSON.stringify({apply, documents: changes.map(({doc, set, unset}) => ({
    id: doc._id, title: doc.title, set: Object.keys(set), unset,
    nextTitle: set.title, nextClient: set.client,
  })), placeholderLogos: footer.clientLogos === undefined ? placeholders.length : 0}, null, 2))
  if (!apply || !changes.length) return
  await mkdir('.sanity/backups', {recursive: true})
  await writeFile(`.sanity/backups/v3-feedback-${Date.now()}.json`, JSON.stringify(changes.map(({doc}) => doc), null, 2), {mode: 0o600})
  const footerChanges = changes.filter(change => change.doc._id.replace(/^drafts\./u, '') === footer._id && change.set.clientLogos)
  if (footerChanges.length) {
    const logos: Array<Record<string, unknown>> = []
    for (const item of placeholders) {
      const bytes = await readFile(`../new-work-site/public/media/client-placeholders/${item.filename}`)
      const asset = await client.assets.upload('image', bytes, {filename: item.filename, contentType: 'image/webp'})
      logos.push({_key: item._key, _type: 'clientLogo', name: item.name,
        artwork: {_type: 'brandAsset', format: 'image', width: item.width, height: item.height,
          image: {_type: 'editorialImage', asset: {_type: 'reference', _ref: asset._id}}}})
    }
    footerChanges.forEach(change => { change.set.clientLogos = logos })
  }
  let transaction = client.transaction()
  for (const {doc, set, unset} of changes) {
    transaction = transaction.patch(doc._id, patch => {
      let next = patch.ifRevisionId(doc._rev)
      if (Object.keys(set).length) next = next.set(set)
      if (unset.length) next = next.unset(unset)
      return next
    })
  }
  await transaction.commit()
  console.log(`Applied ${changes.length} revision-guarded updates. Original documents backed up privately; URLs and internal ownership preserved.`)
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'V3 migration failed'); process.exitCode = 1 })

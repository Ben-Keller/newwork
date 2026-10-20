import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID} from '../sanity.constants'

type Placeholder = {_key: string; name: string; filename: string; width: number; height: number}
type Logo = {_key: string; name?: string; artwork?: {format?: string; file?: {asset?: {_ref?: string}}}}
type Footer = {_id: string; _rev: string; clientLogos?: Logo[]}

// Explicit maintenance only. Replace the original generated placeholders, never
// client-supplied artwork, names, ordering, links or other footer settings.
async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== '--')
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg))) throw new Error('Use --apply or --dry-run')
  const apply = args.includes('--apply') && !args.includes('--dry-run')
  const client = getCliClient({apiVersion: SANITY_API_VERSION}).withConfig({useCdn: false, perspective: 'raw'})
  if (client.config().projectId !== SANITY_PROJECT_ID || client.config().dataset !== SANITY_DATASET) throw new Error('Unexpected Sanity target')
  const placeholders = JSON.parse(await readFile('../new-work-site/shared/client-logo-placeholders.json', 'utf8')) as Placeholder[]
  for (const item of placeholders) {
    if (!/^client-\d{2}$/u.test(item._key) || !/^client-\d{2}-generated\.webp$/u.test(item.filename)
      || !(item.width > 0 && item.width <= 360 && item.height > 0 && item.height <= 160)) throw new Error('Invalid placeholder manifest')
  }
  const footers = await client.fetch<Footer[]>('*[_id in ["footerSettings", "drafts.footerSettings"]]')
  const references = footers.flatMap(footer => (footer.clientLogos || []).flatMap(item =>
    item.artwork?.file?.asset?._ref ? [item.artwork.file.asset._ref] : []))
  const files = await client.fetch<{_id: string; originalFilename: string}[]>('*[_id in $references]{_id,originalFilename}', {references})
  const filenames = new Map(files.map(file => [file._id, file.originalFilename]))
  const changes = footers.flatMap(footer => {
    const items = placeholders.filter(placeholder => {
      const current = footer.clientLogos?.find(item => item._key === placeholder._key)
      return current?.name === placeholder.name && current.artwork?.format === 'file'
        && filenames.get(current.artwork.file?.asset?._ref || '') === `${placeholder._key}.svg`
    })
    return items.length ? [{footer, items}] : []
  })
  console.log(JSON.stringify({apply, documents: changes.map(({footer, items}) => ({id: footer._id, replace: items.map(item => item._key)}))}, null, 2))
  if (!apply || !changes.length) return
  await mkdir('.sanity/backups', {recursive: true})
  await writeFile(`.sanity/backups/footer-placeholder-artwork-${Date.now()}.json`,
    JSON.stringify(changes.map(({footer}) => footer), null, 2), {mode: 0o600})
  const artwork = new Map<string, Record<string, unknown>>()
  for (const item of placeholders.filter(item => changes.some(change => change.items.includes(item)))) {
    const bytes = await readFile(`../new-work-site/public/media/client-placeholders/${item.filename}`)
    const asset = await client.assets.upload('image', bytes, {filename: item.filename, contentType: 'image/webp'})
    artwork.set(item._key, {_type: 'brandAsset', format: 'image', width: item.width, height: item.height,
      image: {_type: 'editorialImage', asset: {_type: 'reference', _ref: asset._id}}})
  }
  let transaction = client.transaction()
  for (const {footer, items} of changes) {
    transaction = transaction.patch(footer._id, patch => patch.ifRevisionId(footer._rev).set(
      Object.fromEntries(items.map(item => [`clientLogos[_key=="${item._key}"].artwork`, artwork.get(item._key)])),
    ))
  }
  await transaction.commit()
  console.log('Updated original placeholder artwork. Footer documents backed up; all other client content preserved.')
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Placeholder update failed'); process.exitCode = 1 })

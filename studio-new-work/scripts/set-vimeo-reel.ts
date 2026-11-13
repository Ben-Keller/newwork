import {mkdir, writeFile} from 'node:fs/promises'
import {getCliClient} from 'sanity/cli'
import {SANITY_DATASET, SANITY_PROJECT_ID} from '../sanity.constants'
import {parseApprovedWatchUrl} from '../shared/content-policy'

// Explicit maintenance only: update reel fields without publishing unrelated draft edits.
async function main() {
  const args = process.argv.slice(2).filter(value => value !== '--')
  if (args.some(value => !['--apply', '--dry-run'].includes(value))) throw new Error('Use --dry-run or --apply.')
  const url = 'https://vimeo.com/1043174924'
  if (parseApprovedWatchUrl(url)?.provider !== 'vimeo') throw new Error('Invalid Vimeo URL')
  const client = getCliClient({apiVersion: '2026-01-01'}).withConfig({useCdn: false, perspective: 'raw'})
  if (client.config().projectId !== SANITY_PROJECT_ID || client.config().dataset !== SANITY_DATASET) throw new Error('Unexpected dataset')
  const docs = await client.fetch<Array<{_id: string; _rev: string; reel?: Record<string, unknown>}>>('*[_id in ["workPage", "drafts.workPage"]]')
  if (!docs.some(doc => doc._id === 'workPage')) throw new Error('Published Work page missing')
  const apply = args.includes('--apply') && !args.includes('--dry-run')
  console.log(JSON.stringify({apply, updates: docs.map(doc => ({id: doc._id, previous: doc.reel, url}))}))
  if (!apply) return
  await mkdir('.sanity/backups', {recursive: true})
  await writeFile(`.sanity/backups/vimeo-reel-${Date.now()}.json`, JSON.stringify(docs, null, 2), {mode: 0o600})
  let tx = client.transaction()
  for (const doc of docs) tx = tx.patch(doc._id, patch => patch.ifRevisionId(doc._rev)
    .setIfMissing({reel: {_type: 'reelSettings'}})
    .set({'reel.vimeoUrl': url, 'reel.enabled': true, 'reel.visible': true}))
  await tx.commit()
  console.log('Updated only reel URL and visibility; other content and draft edits preserved.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })

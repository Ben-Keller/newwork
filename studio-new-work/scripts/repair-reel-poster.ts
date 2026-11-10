import {mkdir, writeFile} from 'node:fs/promises'
import {getCliClient} from 'sanity/cli'
import {SANITY_DATASET, SANITY_PROJECT_ID} from '../sanity.constants'

// Explicit maintenance only. Never remove valid images or publish an editor's draft.
async function main() {
  const args = process.argv.slice(2).filter(value => value !== '--')
  if (args.some(value => !['--apply', '--dry-run'].includes(value))) throw new Error('Use --dry-run or --apply.')
  const client = getCliClient({apiVersion: '2026-01-01'}).withConfig({useCdn: false, perspective: 'raw'})
  if (client.config().projectId !== SANITY_PROJECT_ID || client.config().dataset !== SANITY_DATASET) throw new Error('Unexpected dataset')
  const docs = await client.fetch<Array<{_id: string; _rev: string; reel?: {poster?: unknown}}>>('*[_id in ["workPage", "drafts.workPage"]]')
  const targets = docs.filter(doc => doc.reel?.poster === null)
  const apply = args.includes('--apply') && !args.includes('--dry-run')
  console.log(JSON.stringify({apply, repairs: targets.map(doc => ({id: doc._id, unset: 'reel.poster', previous: null}))}))
  if (!apply || !targets.length) return
  await mkdir('.sanity/backups', {recursive: true})
  await writeFile(`.sanity/backups/reel-poster-${Date.now()}.json`, JSON.stringify(targets, null, 2), {mode: 0o600})
  let tx = client.transaction()
  for (const doc of targets) tx = tx.patch(doc._id, patch => patch.ifRevisionId(doc._rev).unset(['reel.poster']))
  await tx.commit()
  console.log('Removed only null reel poster values; media, drafts and other settings preserved.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })

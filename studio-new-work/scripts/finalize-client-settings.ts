import {mkdir, writeFile} from 'node:fs/promises'
import {getCliClient} from 'sanity/cli'
import {SANITY_PROJECT_ID} from '../sanity.constants'

// Remove only the retired, already-hidden About menu entry. Keep every other
// setting and any future editor changes intact. Never run as part of a build.
async function main() {
  const args = process.argv.slice(2).filter(value => value !== '--')
  if (args.some(value => !['--apply', '--dry-run'].includes(value))) throw new Error('Use --dry-run or --apply.')
  const client = getCliClient({apiVersion: '2025-08-04'}).withConfig({useCdn: false, perspective: 'raw'})
  if (client.config().projectId !== SANITY_PROJECT_ID) throw new Error('Unexpected project')
  const documents = await client.fetch<Array<{_id: string; _rev: string; navigation: Array<{destination: string; visible?: boolean}>}>>('*[_id in ["siteSettings", "drafts.siteSettings"]]')
  if (documents.some(doc => doc._id.startsWith('drafts.'))) throw new Error('Existing settings draft: preserve it and review before applying.')
  const settings = documents.find(doc => doc._id === 'siteSettings')
  if (!settings || !Array.isArray(settings.navigation)) throw new Error('Missing navigation settings')
  const retired = settings.navigation.filter(item => item.destination === 'about')
  if (retired.some(item => item.visible !== false)) throw new Error('About is visible: review before removing it.')
  const apply = args.includes('--apply') && !args.includes('--dry-run')
  console.log(JSON.stringify({apply, hiddenRetiredLinks: retired.length, otherSettings: 'preserved'}))
  if (!apply || !retired.length) return
  await mkdir('.sanity/backups', {recursive: true})
  await writeFile(`.sanity/backups/client-settings-${Date.now()}.json`, JSON.stringify(settings, null, 2), {mode: 0o600})
  await client.patch(settings._id).ifRevisionId(settings._rev).set({navigation: settings.navigation.filter(item => item.destination !== 'about')}).commit()
  console.log('Published navigation cleanup; all active links and other settings preserved.')
}
main().catch(() => { console.error('Settings cleanup stopped. Check drafts, current navigation and project access; no credential values were logged.'); process.exitCode = 1 })

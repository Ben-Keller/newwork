import {getCliClient} from 'sanity/cli'
import {SANITY_DATASET, SANITY_PROJECT_ID} from '../sanity.constants'

// Prepare the connection without installing a personal CLI credential in Sanity.
// Add the dedicated GitHub Authorization header and enable at the domain cutover.
const name = 'Rebuild Oliver website'
const url = 'https://api.github.com/repos/Ben-Keller/newwork/actions/workflows/deploy-site.yml/dispatches'
type Hook = {id: string; name: string; url: string; dataset: string; isDisabledByUser?: boolean; isDisabled?: boolean}

async function main() {
  const args = process.argv.slice(2).filter(argument => argument !== '--')
  if (args.some(argument => !['--dry-run', '--apply'].includes(argument))) throw new Error('Use --dry-run or --apply.')
  const apply = args.includes('--apply') && !args.includes('--dry-run')
  const client = getCliClient({apiVersion: '2025-08-04'}).withConfig({useCdn: false})
  if (client.config().projectId !== SANITY_PROJECT_ID) throw new Error('Unexpected Sanity project.')
  const endpoint = `/hooks/projects/${SANITY_PROJECT_ID}`
  const existing = await client.request<Hook[]>({url: endpoint})
  const matches = existing.filter(hook => hook.name === name || hook.url === url)
  if (matches.length) {
    // Never overwrite a connection or its private headers once configured.
    console.log(JSON.stringify({action: 'preserved', hooks: matches.map(hook => ({id: hook.id, name: hook.name, dataset: hook.dataset, disabled: hook.isDisabledByUser || hook.isDisabled || false}))}, null, 2))
    return
  }
  const configuration = {
    type: 'document', name, url, dataset: SANITY_DATASET,
    description: 'Prepared for the Oliver revision. Add a dedicated GitHub Actions token as the Authorization header; enable only after the revised workflow and custom domain are active.',
    rule: {on: ['create', 'update', 'delete'], filter: '_type in ["siteSettings", "workPage", "footerSettings", "contactPage", "work", "mediaItem"]', projection: '{"ref": "main"}'},
    apiVersion: 'v2021-03-25', httpMethod: 'POST', includeDrafts: false, includeAllVersions: false,
    headers: {Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10'},
    isDisabledByUser: true,
  }
  console.log(JSON.stringify({apply, project: SANITY_PROJECT_ID, configuration, credential: 'Not installed; hook remains disabled.'}, null, 2))
  if (!apply) return
  await client.request({url: endpoint, method: 'POST', body: configuration})
  const verified = (await client.request<Hook[]>({url: endpoint})).filter(hook => hook.name === name && hook.url === url)
  if (verified.length !== 1 || !(verified[0].isDisabledByUser || verified[0].isDisabled)) throw new Error('Hook state could not be verified; inspect Sanity Manage before continuing.')
  console.log(JSON.stringify({created: true, id: verified[0].id, disabled: true, websiteBuildTriggered: false}))
}

main().catch(() => {
  // API errors may carry request/response headers. Do not log raw error objects.
  console.error('Could not prepare or verify the rebuild hook. Check project access and the hook list; no credential values were logged.')
  process.exitCode = 1
})

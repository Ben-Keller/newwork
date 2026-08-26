import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION} from '../sanity.constants'

const LEGACY_FIELDS = [
  'about',
  'aboutPeople',
  'aboutSeo',
  'analyticsEnabled',
  'capabilities',
  'contactEmail',
  'contactSeo',
  'location',
  'manifesto',
  'manifestoNeedsReview',
  'notesEnabled',
  'reel',
  'socialLinks',
] as const

async function main() {
  const args = process.argv.slice(2).filter((argument) => argument !== '--')
  const unknown = args.find((argument) => argument !== '--apply')
  if (unknown) throw new Error(`Unknown option: ${unknown}. Use --apply to write the migration.`)

  const client = getCliClient({apiVersion: SANITY_API_VERSION})
  const settings = await client.fetch<Record<string, unknown> | null>(
    '*[_id == "siteSettings"][0]',
  )
  if (!settings) throw new Error('The siteSettings singleton is missing.')

  const present = LEGACY_FIELDS.filter((field) => field in settings)
  if (present.length === 0) {
    console.log('No legacy site-settings fields remain.')
    return
  }

  if (!args.includes('--apply')) {
    console.log(`Dry run: would remove ${present.length} legacy fields from siteSettings:`)
    console.log(present.join(', '))
    return
  }

  await client.patch('siteSettings').unset([...present]).commit()
  console.log(`Removed ${present.length} legacy fields from siteSettings.`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

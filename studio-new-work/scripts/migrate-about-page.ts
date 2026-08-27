import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION} from '../sanity.constants'

const client = getCliClient({apiVersion: SANITY_API_VERSION}).withConfig({perspective: 'published'})
const apply = process.argv.slice(2).filter((argument) => argument !== '--').includes('--apply')

const requiredContent = {
  openingLabel: 'Lorem ipsum dolor',
  openingHeadline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  openingNote: 'Consectetur adipiscing',
  windingHeadline: 'Consectetur adipiscing elit.',
  orbitHeadline: 'Sed do eiusmod tempor incididunt.',
  indexHeadline: 'Ut enim ad minim veniam.',
  chaptersHeadline: 'Duis aute irure dolor.',
  apertureHeadline: 'Excepteur sint occaecat cupidatat.',
  fallbackLabel: 'Lorem ipsum dolor',
  fallbackHeadline: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  fallbackDescription:
    'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  closingLabel: 'Lorem ipsum dolor',
  closingHeadline: 'What should we make next?',
  ctaLabel: 'Lorem ipsum',
  ctaDestination: 'contact',
}

const legacyFields = [
  'heading',
  'about',
  'capabilities',
  'peopleHeading',
  'peopleIntroduction',
  'people',
  'image',
  'imageAlt',
  'imageDecorative',
]

async function main() {
  const aboutPage = await client.fetch<Record<string, unknown> | null>(`*[_id == "aboutPage"][0]`)
  if (!aboutPage) throw new Error('The published aboutPage singleton does not exist.')

  const missing = Object.keys(requiredContent).filter((field) => {
    const value = aboutPage[field]
    return typeof value !== 'string' || value.trim().length === 0
  })
  const legacyPresent = legacyFields.filter((field) => aboutPage[field] !== undefined)
  const plan = {missingFields: missing, legacyFieldsToRemove: legacyPresent}

  if (!apply) {
    console.log(JSON.stringify({dryRun: true, ...plan}, null, 2))
    console.log('Run again with --apply to fill only missing About fields and remove obsolete fields.')
    return
  }

  const setIfMissing = Object.fromEntries(
    Object.entries(requiredContent).filter(([field]) => missing.includes(field)),
  )
  await client
    .patch('aboutPage')
    .setIfMissing(setIfMissing)
    .unset(legacyPresent)
    .commit()
  console.log(JSON.stringify({applied: true, ...plan}, null, 2))
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

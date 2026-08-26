import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION} from '../sanity.constants'

type Reference = {_type: 'reference'; _ref: string; _weak?: boolean}
type RecordValue = Record<string, unknown>

const client = getCliClient({apiVersion: SANITY_API_VERSION})
const apply = process.argv.slice(2).filter((argument) => argument !== '--').includes('--apply')

const publishedId = (id: string) => id.replace(/^drafts\./u, '')
const workIdFor = (id: string) => {
  const base = publishedId(id)
  const migrated = base.startsWith('project.')
    ? `work.${base.slice('project.'.length)}`
    : `work.${base.replace(/[^A-Za-z0-9._-]/gu, '-')}`
  return id.startsWith('drafts.') ? `drafts.${migrated}` : migrated
}

const templateFor = (document: RecordValue) => {
  if (document.template === 'photo' || document.template === 'video' || document.template === 'featured') {
    return document.template
  }
  if (
    document.layoutVariant === 'photoEssay' &&
    Array.isArray(document.photos) &&
    document.photos.length >= 2 &&
    document.defaultPhoto
  ) return 'photo'
  // Legacy photo essays used page blocks rather than a selectable photo set.
  // Keep them public in the longer Featured template until an editor assembles
  // their canonical photo set and deliberately switches them to Photo.
  if (document.layoutVariant === 'photoEssay') return 'featured'
  if (document.layoutVariant === 'campaign' || document.layoutVariant === 'experimental') return 'featured'
  return 'video'
}

async function main() {
const projects = await client.fetch<Array<RecordValue & {_id: string}>>(
  `*[_type == "project"]`,
)
const idMap = new Map(projects.map((project) => [project._id, workIdFor(project._id)]))
const publishedIdMap = new Map(
  projects.map((project) => [publishedId(project._id), publishedId(workIdFor(project._id))]),
)

const workPage = await client.fetch<(RecordValue & {_id: string}) | null>(
  `*[_id == "workPage"][0]`,
)
const mediaItems = await client.fetch<Array<RecordValue & {_id: string}>>(
  `*[_type == "mediaItem" && defined(projects)]`,
)

const migrateReference = (value: unknown): Reference | undefined => {
  if (!value || typeof value !== 'object' || !('_ref' in value)) return undefined
  const reference = value as Reference
  const migrated = idMap.get(reference._ref) || publishedIdMap.get(reference._ref)
  return migrated ? {...reference, _ref: migrated} : reference
}

const plan = {
  projects: projects.map((project) => ({from: project._id, to: workIdFor(project._id), template: templateFor(project)})),
  workPagePlacements: Array.isArray(workPage?.gallery) ? workPage.gallery.length : 0,
  mediaItems: mediaItems.length,
}

if (!apply) {
  console.log(JSON.stringify({dryRun: true, ...plan}, null, 2))
  console.log('Run again with --apply to create Work records and rewrite known references. Legacy Project records are retained as a rollback copy.')
  process.exit(0)
}

let transaction = client.transaction()
for (const project of projects) {
  const {_rev, _createdAt, _updatedAt, ...fields} = project
  void _rev
  void _createdAt
  void _updatedAt
  transaction = transaction.createOrReplace({
    ...fields,
    _id: workIdFor(project._id),
    _type: 'work',
    template: templateFor(project),
  })
}

if (workPage && Array.isArray(workPage.gallery)) {
  const gallery = workPage.gallery.map((raw) => {
    const placement = raw && typeof raw === 'object' ? raw as RecordValue : {}
    const work = migrateReference(placement.work || placement.project)
    const {project: _legacyProject, ...rest} = placement
    void _legacyProject
    return {...rest, _type: 'workPlacement', work}
  })
  transaction = transaction.patch(workPage._id, {set: {gallery}})
}

for (const mediaItem of mediaItems) {
  const projectsValue = Array.isArray(mediaItem.projects) ? mediaItem.projects : []
  const works = projectsValue.map(migrateReference).filter(Boolean)
  transaction = transaction.patch(mediaItem._id, {set: {works}, unset: ['projects']})
}

await transaction.commit({autoGenerateArrayKeys: false})
console.log(JSON.stringify({applied: true, ...plan}, null, 2))
console.log('Migration complete. Legacy Project records remain in the dataset but are absent from the Studio structure; delete them only after production verification and export backup.')
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION} from '../sanity.constants'

type Reference = {_type: 'reference'; _ref: string; _weak?: boolean}
type RecordValue = Record<string, unknown>
type SanityDocument = RecordValue & {_id: string; legacyId?: string}

const client = getCliClient({apiVersion: SANITY_API_VERSION}).withConfig({perspective: 'published'})
const apply = process.argv.slice(2).filter((argument) => argument !== '--').includes('--apply')

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
  if (document.layoutVariant === 'photoEssay') return 'featured'
  if (document.layoutVariant === 'campaign' || document.layoutVariant === 'experimental') return 'featured'
  return 'video'
}

const withoutSystemFields = (document: SanityDocument): RecordValue => {
  const {_id, _rev, _createdAt, _updatedAt, ...fields} = document
  void _id
  void _rev
  void _createdAt
  void _updatedAt
  return fields
}

async function main() {
  const [projects, existingWorks, workPage, mediaItems] = await Promise.all([
    client.fetch<SanityDocument[]>(
      `*[_type == "project" && !(_id in path("drafts.**"))]`,
    ),
    client.fetch<SanityDocument[]>(
      `*[_type == "work" && !(_id in path("drafts.**")) && defined(legacyId)]`,
    ),
    client.fetch<SanityDocument | null>(`*[_id == "workPage"][0]`),
    client.fetch<SanityDocument[]>(
      `*[_type == "mediaItem" && !(_id in path("drafts.**")) && defined(projects)]`,
    ),
  ])

  const workByLegacyId = new Map(
    existingWorks.flatMap((work) => typeof work.legacyId === 'string' ? [[work.legacyId, work]] : []),
  )
  const missingLegacyIds = projects.filter((project) => typeof project.legacyId !== 'string')
  if (missingLegacyIds.length) {
    throw new Error(
      `Cannot migrate without stable legacyId values: ${missingLegacyIds.map((item) => item._id).join(', ')}`,
    )
  }

  const plan = projects.map((project) => ({
    from: project._id,
    legacyId: project.legacyId as string,
    action: workByLegacyId.has(project.legacyId as string) ? 'reuse' : 'create',
    template: templateFor(project),
  }))
  const summary = {
    projects: plan,
    workPagePlacements: Array.isArray(workPage?.gallery) ? workPage.gallery.length : 0,
    mediaItems: mediaItems.length,
  }

  if (!apply) {
    console.log(JSON.stringify({dryRun: true, ...summary}, null, 2))
    console.log(
      'Run again with --apply to create generated-ID Work records and rewrite known references. '
      + 'Legacy Project records are retained as a rollback copy.',
    )
    return
  }

  const migratedIdByProjectId = new Map<string, string>()
  for (const project of projects) {
    const legacyId = project.legacyId as string
    let work = workByLegacyId.get(legacyId)
    if (!work) {
      work = await client.create({
        ...withoutSystemFields(project),
        _type: 'work',
        legacyId,
        template: templateFor(project),
      }) as SanityDocument
      workByLegacyId.set(legacyId, work)
    }
    migratedIdByProjectId.set(project._id, work._id)
  }

  const migrateReference = (value: unknown): Reference | undefined => {
    if (!value || typeof value !== 'object' || !('_ref' in value)) return undefined
    const reference = value as Reference
    const migrated = migratedIdByProjectId.get(reference._ref)
    return migrated ? {...reference, _ref: migrated} : reference
  }

  let transaction = client.transaction()
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
  console.log(JSON.stringify({applied: true, ...summary}, null, 2))
  console.log(
    'Migration complete. Legacy Project records remain in the dataset as a rollback copy; '
    + 'remove them only in a later, separately reviewed cleanup after production verification.',
  )
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

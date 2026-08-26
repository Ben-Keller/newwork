import {getCliClient} from 'sanity/cli'
import {SANITY_API_VERSION} from '../sanity.constants'

type RecordValue = Record<string, unknown>
type ProjectDocument = RecordValue & {
  _id: string
  _type: 'project'
  legacyId?: string
}

const APPLY = process.argv.includes('--apply')
const SYSTEM_FIELDS = new Set(['_id', '_rev', '_createdAt', '_updatedAt'])
const client = getCliClient({apiVersion: SANITY_API_VERSION})

function isRecord(value: unknown): value is RecordValue {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function publicProjectBody(project: ProjectDocument): RecordValue & {_type: 'project'} {
  return Object.fromEntries(
    Object.entries(project).filter(([key]) => !SYSTEM_FIELDS.has(key)),
  ) as RecordValue & {_type: 'project'}
}

function rewriteReferences(value: unknown, idMap: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => rewriteReferences(item, idMap))
  if (!isRecord(value)) return value

  const rewritten: RecordValue = {}
  for (const [key, child] of Object.entries(value)) {
    if (key === '_ref' && typeof child === 'string' && idMap.has(child)) {
      rewritten[key] = idMap.get(child)
    } else {
      rewritten[key] = rewriteReferences(child, idMap)
    }
  }
  return rewritten
}

function changedTopLevelFields(document: RecordValue, idMap: Map<string, string>): RecordValue {
  const values: RecordValue = {}
  for (const [key, value] of Object.entries(document)) {
    if (SYSTEM_FIELDS.has(key)) continue
    const rewritten = rewriteReferences(value, idMap)
    if (JSON.stringify(value) !== JSON.stringify(rewritten)) values[key] = rewritten
  }
  return values
}

async function main() {
  const projects = await client.fetch<ProjectDocument[]>('*[_type == "project"]')
  const privateProjects = projects.filter(
    (project) => project._id.includes('.') && !project._id.startsWith('drafts.'),
  )

  if (!privateProjects.length) {
    console.log('No private legacy project IDs remain.')
    return
  }

  const privateIds = privateProjects.map((project) => project._id)
  const migratedProjects = await client.fetch<ProjectDocument[]>(
    '*[_type == "project" && legacyId in $legacyIds]',
    {legacyIds: privateIds},
  )
  const migratedByLegacyId = new Map(
    migratedProjects.flatMap((project) =>
      typeof project.legacyId === 'string' ? [[project.legacyId, project] as const] : [],
    ),
  )

  const idMap = new Map<string, string>()
  for (const project of privateProjects) {
    const existing = migratedByLegacyId.get(project._id)
    if (existing) {
      idMap.set(project._id, existing._id)
      continue
    }
    if (!APPLY) {
      idMap.set(project._id, '<Sanity-generated ID>')
      continue
    }
    const created = await client.create({
      ...publicProjectBody(project),
      legacyId: project._id,
    })
    idMap.set(project._id, created._id)
  }

  const referenceDocuments = await client.fetch<RecordValue[]>(
    '*[references($legacyIds)]',
    {legacyIds: privateIds},
  )

  if (!APPLY) {
    console.log(JSON.stringify({
      dryRun: true,
      projectsToRecreate: privateProjects.length,
      referencingDocumentsToPatch: referenceDocuments.length,
      legacyIds: privateIds,
    }, null, 2))
    return
  }

  let transaction = client.transaction()
  let patchedDocuments = 0
  for (const document of referenceDocuments) {
    if (typeof document._id !== 'string') continue
    const values = changedTopLevelFields(document, idMap)
    if (!Object.keys(values).length) continue
    transaction = transaction.patch(document._id, {set: values})
    patchedDocuments += 1
  }
  for (const privateId of privateIds) transaction = transaction.delete(privateId)
  await transaction.commit({returnDocuments: false})

  const remaining = await client.fetch<number>(
    'count(*[_id in $legacyIds || references($legacyIds)])',
    {legacyIds: privateIds},
  )
  if (remaining !== 0) {
    throw new Error(`Migration verification failed: ${remaining} legacy documents or references remain.`)
  }

  console.log(
    `Migrated ${privateProjects.length} projects to Sanity-generated public IDs and updated ${patchedDocuments} referencing documents.`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

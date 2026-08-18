import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production'

if (!projectId) {
  throw new Error(
    'Sanity Studio needs SANITY_STUDIO_PROJECT_ID (or PUBLIC_SANITY_PROJECT_ID). Add it to .env before running pnpm sanity:dev.',
  )
}

export default defineConfig({
  name: 'new-work',
  title: 'New Work',
  projectId,
  dataset,
  basePath: '/studio',
  plugins: [structureTool({structure}), visionTool({defaultApiVersion: '2026-08-01'})],
  schema: {types: schemaTypes},
  document: {
    newDocumentOptions: (previous, {creationContext}) =>
      creationContext.type === 'global'
        ? previous.filter((template) => template.templateId !== 'siteSettings')
        : previous,
    actions: (previous, context) =>
      context.schemaType === 'siteSettings'
        ? previous.filter((action) => !['delete', 'duplicate'].includes(action.action ?? ''))
        : previous,
  },
})

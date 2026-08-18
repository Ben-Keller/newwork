import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production'

if (!projectId) {
  throw new Error(
    'Sanity CLI needs SANITY_STUDIO_PROJECT_ID (or PUBLIC_SANITY_PROJECT_ID). Add it to .env first.',
  )
}

export default defineCliConfig({
  api: {projectId, dataset},
})


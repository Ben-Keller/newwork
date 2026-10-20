import {defineCliConfig} from 'sanity/cli'
import {SANITY_DATASET, SANITY_PROJECT_ID} from './sanity.constants'

export default defineCliConfig({
  api: {
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
  },
  deployment: {
    appId: 'elnsw9988qshp75q4qqbaivt',
    /**
     * Enable auto-updates for studios.
     * Learn more at https://www.sanity.io/docs/studio/latest-version-of-sanity#k47faf43faf56
     */
    autoUpdates: true,
  },
  typegen: {
    enabled: true,
    path: '../new-work-site/sanity/**/*.ts',
    schema: './schema.json',
    generates: '../new-work-site/src/sanity.types.ts',
    overloadClientMethods: true,
  },
})

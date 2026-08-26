import {defineConfig} from 'sanity'
import {presentationTool} from 'sanity/presentation'
import {structureTool} from 'sanity/structure'
import {NewWorkIcon} from './components/NewWorkIcon'
import {rightsBadge, workflowBadge} from './components/documentBadges'
import {schemaTypes} from './schemaTypes'
import {presentationResolve} from './presentation'
import {structure} from './structure'
import {SANITY_DATASET, SANITY_PROJECT_ID} from './sanity.constants'

const SINGLETONS = ['siteSettings', 'workPage', 'aboutPage', 'contactPage', 'footerSettings']
const CLIENT_HIDDEN_TYPES = ['note']
const CONFIGURED_PREVIEW_ORIGIN = process.env.SANITY_STUDIO_PREVIEW_ORIGIN
const PREVIEW_ORIGIN = CONFIGURED_PREVIEW_ORIGIN || (process.env.NODE_ENV === 'development' ? 'http://localhost:4321' : undefined)

export default defineConfig({
  name: 'new-work',
  title: 'New Work',
  icon: NewWorkIcon,

  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,

  plugins: [
    structureTool({structure, title: 'Website content', icon: NewWorkIcon}),
    ...(PREVIEW_ORIGIN
      ? [
          presentationTool({
            title: 'Website preview',
            resolve: presentationResolve,
            previewUrl: {origin: PREVIEW_ORIGIN},
          }),
        ]
      : []),
  ],

  releases: {enabled: false},
  scheduledDrafts: {enabled: false},
  tasks: {enabled: false},

  schema: {
    types: schemaTypes,
    templates: (previous) => [
      {
        id: 'project-film',
        title: 'Film project',
        schemaType: 'project',
        value: {
          types: ['Film'],
          layoutVariant: 'cinematic',
          editorialStatus: 'draft',
          rightsApprovalStatus: 'pending',
          needsReview: false,
        },
      },
      {
        id: 'project-photography',
        title: 'Photography project',
        schemaType: 'project',
        value: {
          types: ['Photography'],
          layoutVariant: 'photoEssay',
          editorialStatus: 'draft',
          rightsApprovalStatus: 'pending',
          needsReview: false,
        },
      },
      {
        id: 'project-campaign',
        title: 'Campaign project',
        schemaType: 'project',
        value: {
          types: ['Campaign'],
          layoutVariant: 'campaign',
          editorialStatus: 'draft',
          rightsApprovalStatus: 'pending',
          needsReview: false,
        },
      },
      {
        id: 'media-image',
        title: 'Image asset',
        schemaType: 'mediaItem',
        value: {
          kind: 'image',
          decorative: false,
          rightsApprovalStatus: 'pending',
        },
      },
      {
        id: 'media-video',
        title: 'Film or short loop',
        schemaType: 'mediaItem',
        value: {
          kind: 'video',
          decorative: false,
          rightsApprovalStatus: 'pending',
        },
      },
      {
        id: 'media-file',
        title: 'Brand or download file',
        schemaType: 'mediaItem',
        value: {
          kind: 'file',
          decorative: false,
          rightsApprovalStatus: 'pending',
        },
      },
      ...previous.filter(
        (template) =>
          !['project', 'mediaItem'].includes(template.schemaType) &&
          !SINGLETONS.includes(template.schemaType) &&
          !CLIENT_HIDDEN_TYPES.includes(template.schemaType),
      ),
    ],
  },

  document: {
    comments: {enabled: false},
    newDocumentOptions: (previous, {creationContext}) =>
      creationContext.type === 'global'
        ? previous.filter(
            (template) =>
              !SINGLETONS.includes(template.templateId) &&
              !CLIENT_HIDDEN_TYPES.includes(template.templateId),
          )
        : previous,
    actions: (previous, context) =>
      SINGLETONS.includes(context.schemaType)
        ? previous.filter((action) => !['delete', 'duplicate'].includes(action.action ?? ''))
        : previous,
    badges: (previous, context) => {
      if (context.schemaType === 'project') return [workflowBadge, rightsBadge, ...previous]
      if (context.schemaType === 'mediaItem') return [rightsBadge, ...previous]
      return previous
    },
  },
})

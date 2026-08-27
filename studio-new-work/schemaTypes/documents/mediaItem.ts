import {ImagesIcon} from '@sanity/icons/Images'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {rightsApprovalFields} from '../objects/rightsFields'
import {hiddenAllFieldsGroup} from '../clientGroups'

export const mediaItem = defineType({
  name: 'mediaItem',
  title: 'Asset',
  type: 'document',
  icon: ImagesIcon,
  groups: [
    {name: 'content', title: 'Asset', default: true},
    {name: 'usage', title: 'Usage & credits'},
    {name: 'internal', title: 'Rights & approval'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({name: 'title', title: 'Asset title', type: 'string', group: 'content', description: 'A searchable editorial name; it is not shown publicly.', validation: (Rule) => Rule.required().max(140)}),
    defineField({
      name: 'slug',
      title: 'Asset URL name',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96},
      hidden: ({value}) => Boolean((value as {current?: string} | undefined)?.current),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'migrationSourceKey',
      title: 'Migration source key',
      type: 'string',
      group: 'internal',
      hidden: true,
      readOnly: true,
      description: 'Stable import key used to update migrated assets without creating duplicates.',
    }),
    defineField({
      name: 'kind',
      title: 'Asset type',
      type: 'string',
      group: 'content',
      options: {list: [
        {title: 'Image', value: 'image'},
        {title: 'Film or short loop', value: 'video'},
        {title: 'Brand or download file', value: 'file'},
      ], layout: 'radio'},
      initialValue: 'image',
      hidden: true,
      readOnly: true,
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'image', title: 'Image', type: 'image', group: 'content', options: {hotspot: true}, hidden: ({document}) => document?.kind !== 'image'}),
    defineField({name: 'poster', title: 'Video poster', type: 'image', group: 'content', options: {hotspot: true}, hidden: ({document}) => document?.kind !== 'video'}),
    defineField({
      name: 'videoUrl',
      title: 'Vimeo or YouTube URL',
      type: 'url',
      group: 'content',
      description: 'Use a dedicated streaming service for production video.',
      hidden: ({document}) => document?.kind !== 'video',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({
      name: 'videoFile',
      title: 'Uploaded short loop',
      type: 'file',
      group: 'content',
      hidden: ({document}) => document?.kind !== 'video',
      description: 'For an existing short, silent loop. Use the Vimeo or YouTube field for a full film.',
      options: {accept: 'video/mp4,video/webm'},
    }),
    defineField({name: 'file', title: 'File', type: 'file', group: 'content', hidden: ({document}) => document?.kind !== 'file'}),
    defineField({name: 'alt', title: 'Accessibility description', type: 'string', group: 'usage', hidden: ({document}) => document?.decorative === true || document?.kind === 'file', validation: (Rule) => Rule.max(220)}),
    defineField({name: 'decorative', title: 'Decorative asset', type: 'boolean', group: 'usage', initialValue: false, description: 'Use only when the image adds no information and nearby text fully describes its meaning.'}),
    defineField({name: 'caption', title: 'Default caption', type: 'string', group: 'usage', validation: (Rule) => Rule.max(320)}),
    defineField({name: 'credit', title: 'Default credit', type: 'string', group: 'usage', validation: (Rule) => Rule.max(160)}),
    defineField({
      name: 'sourceUrl',
      title: 'Original source',
      type: 'url',
      group: 'internal',
      description: 'Migration or provenance source. This is never displayed on the website.',
      hidden: true,
      readOnly: true,
      deprecated: {reason: 'Preserved only as an internal migration record.'},
      validation: (Rule) => Rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      group: 'usage',
      of: [defineArrayMember({type: 'string'})],
      options: {layout: 'tags'},
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'project',
      title: 'Project',
      type: 'reference',
      group: 'usage',
      description: 'The Project is this asset’s collection. Assets remain independent library records.',
      to: [{type: 'work'}],
      options: {disableNew: true},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'projectOrder',
      title: 'Order within project',
      type: 'number',
      group: 'usage',
      description: 'Assets with lower numbers appear first on the Project page.',
      initialValue: 0,
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    ...rightsApprovalFields,
  ],
  initialValue: {kind: 'image', decorative: false, rightsApprovalStatus: 'pending'},
  validation: (Rule) => Rule.custom((value) => {
    if (!value || typeof value !== 'object') return true
    const asset = value as {kind?: string; image?: unknown; poster?: unknown; videoUrl?: unknown; decorative?: boolean; alt?: unknown}
    if (asset.kind === 'image' && !asset.image) return 'Choose an image.'
    if (asset.kind === 'video' && !asset.videoUrl && !(asset as {videoFile?: unknown}).videoFile) return 'Add a Vimeo or YouTube URL, or choose an uploaded short loop.'
    if (asset.kind === 'file' && !(asset as {file?: unknown}).file) return 'Choose a file.'
    if (asset.kind !== 'file' && asset.decorative !== true && !(typeof asset.alt === 'string' && asset.alt.trim())) return 'Add an accessibility description or mark the asset decorative.'
    return true
  }),
  preview: {
    select: {title: 'title', kind: 'kind', image: 'image', poster: 'poster', approval: 'rightsApprovalStatus', project: 'project.title', alt: 'alt', decorative: 'decorative'},
    prepare: ({title, kind, image, poster, approval, project, alt, decorative}) => ({
      title: title || 'Untitled asset',
      subtitle: [
        kind === 'video' ? 'Video' : kind === 'file' ? 'File' : 'Image',
        project || 'Not assigned to a Project',
        kind !== 'file' && decorative !== true && !alt ? 'Needs description' : undefined,
        approval === 'expired' ? 'Rights expired' : undefined,
      ].filter(Boolean).join(' · '),
      media: kind === 'video' ? poster : image,
    }),
  },
})

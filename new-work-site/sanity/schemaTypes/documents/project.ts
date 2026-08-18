import {defineArrayMember, defineField, defineType, type ValidationContext} from 'sanity'
import {
  PUBLIC_MEDIA_BLOCK_TYPES,
  hasAssetReference,
  isRecord,
  projectPublicationError,
  warningForMissing,
  wordCount,
} from '../validation'
import {rightsApprovalFields} from '../objects/rightsFields'

const API_VERSION = '2026-08-01'

async function isUniqueSlug(slug: string | undefined, context: ValidationContext): Promise<boolean> {
  if (!slug) return true
  const documentId = String(context.document?._id ?? '').replace(/^drafts\./u, '')
  const duplicateCount = await context.getClient({apiVersion: API_VERSION}).fetch(
    `count(*[_type == "project" && slug.current == $slug && !(_id in [$publishedId, $draftId])])`,
    {slug, publishedId: documentId, draftId: `drafts.${documentId}`},
  ) as number
  return duplicateCount === 0
}

async function duplicateHomeOrderWarning(value: number | undefined, context: ValidationContext): Promise<true | string> {
  if (typeof value !== 'number') return true
  const documentId = String(context.document?._id ?? '').replace(/^drafts\./u, '')
  const duplicateCount = await context.getClient({apiVersion: API_VERSION}).fetch(
    `count(*[_type == "project" && homeOrder == $homeOrder && !(_id in [$publishedId, $draftId])])`,
    {homeOrder: value, publishedId: documentId, draftId: `drafts.${documentId}`},
  ) as number
  return duplicateCount === 0 ? true : 'Another project uses this home order.'
}

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  groups: [
    {name: 'content', title: 'Project', default: true},
    {name: 'presentation', title: 'Presentation'},
    {name: 'media', title: 'Media'},
    {name: 'credits', title: 'Credits'},
    {name: 'publishing', title: 'Publishing'},
    {name: 'seo', title: 'SEO'},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', group: 'content', validation: (Rule) => Rule.required().max(140)}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96, isUnique: isUniqueSlug},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'owner',
      title: 'Internal owner',
      type: 'string',
      group: 'internal',
      options: {list: [
        {title: 'Oliver', value: 'oliver'},
        {title: 'Michael', value: 'michael'},
        {title: 'Anjali', value: 'anjali'},
        {title: 'Collective', value: 'collective'},
        {title: 'Other', value: 'other'},
      ]},
    }),
    defineField({
      name: 'client',
      title: 'Client / commissioner',
      type: 'string',
      group: 'content',
      description: 'Confirmed values only; never infer for production.',
      validation: (Rule) => Rule.custom((value) => warningForMissing(value, 'Client')).warning(),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: 'content',
      validation: (Rule) => [
        Rule.integer().min(1900).max(new Date().getFullYear() + 2),
        Rule.custom((value) => (typeof value === 'number' ? true : 'Year is recommended before publication.')).warning(),
      ],
    }),
    defineField({
      name: 'types',
      title: 'Output types',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'string'})],
      options: {list: ['Film', 'Photography', 'Campaign', 'Animation', 'BTS']},
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({name: 'role', title: 'Role', type: 'string', group: 'content', validation: (Rule) => Rule.max(120)}),
    defineField({
      name: 'contributors',
      title: 'Contributors',
      type: 'array',
      group: 'credits',
      of: [defineArrayMember({type: 'contributor'})],
    }),
    defineField({
      name: 'shortDescription',
      title: 'Short description',
      type: 'text',
      rows: 5,
      group: 'content',
      description: 'Aim for 35–90 words. More than 160 words is blocked.',
      validation: (Rule) => [
        Rule.custom((value) =>
          wordCount(value) <= 160 ? true : 'Description cannot exceed 160 words.'),
        Rule.custom((value) => {
          const count = wordCount(value)
          if (count === 0) return 'Description is recommended before publication.'
          return count >= 35 && count <= 90
            ? true
            : `Description is ${count} words; the recommended range is 35–90.`
        }).warning(),
      ],
    }),
    defineField({
      name: 'cover',
      title: 'Cover',
      type: 'coverMedia',
      group: 'media',
      validation: (Rule) => Rule.custom((value, context) => {
        const document = context.document as {visible?: boolean; featuredOnHome?: boolean}
        if (document?.visible !== true && document?.featuredOnHome !== true) return true
        return isRecord(value) && hasAssetReference(value.poster)
          ? true
          : 'A visible or featured project requires a cover poster.'
      }),
    }),
    defineField({
      name: 'contentBlocks',
      title: 'Content blocks',
      type: 'array',
      group: 'media',
      of: [
        defineArrayMember({type: 'heroImage'}),
        defineArrayMember({type: 'heroVideo'}),
        defineArrayMember({type: 'fullBleedImage'}),
        defineArrayMember({type: 'containedImage'}),
        defineArrayMember({type: 'imagePair'}),
        defineArrayMember({type: 'imageGrid'}),
        defineArrayMember({type: 'video'}),
        defineArrayMember({type: 'shortLoop'}),
        defineArrayMember({type: 'textNote'}),
        defineArrayMember({type: 'caption'}),
      ],
      validation: (Rule) => Rule.custom((value, context) => {
        const blocks = Array.isArray(value) ? value : []
        if ((context.document as {visible?: boolean})?.visible !== true) return true
        return blocks.some((block) => isRecord(block) && PUBLIC_MEDIA_BLOCK_TYPES.has(String(block._type)))
          ? true
          : 'A public project requires at least one media block.'
      }),
    }),
    defineField({
      name: 'credits',
      title: 'Credits',
      type: 'array',
      group: 'credits',
      of: [defineArrayMember({type: 'credit'})],
      validation: (Rule) => Rule.custom((value) => warningForMissing(value, 'Credits')).warning(),
    }),
    defineField({
      name: 'whatWeDid',
      title: 'What we did',
      type: 'array',
      group: 'credits',
      of: [defineArrayMember({type: 'string'})],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({name: 'featuredOnHome', title: 'Featured on home', type: 'boolean', group: 'publishing', initialValue: false}),
    defineField({
      name: 'homeOrder',
      title: 'Home order',
      type: 'number',
      group: 'publishing',
      description: 'The public grid always follows this explicit editorial order.',
      validation: (Rule) => [
        Rule.integer(),
        Rule.custom((value, context) =>
          (context.document as {featuredOnHome?: boolean})?.featuredOnHome !== true || typeof value === 'number'
            ? true
            : 'Home order is required when featured.'),
        Rule.custom(duplicateHomeOrderWarning).warning(),
      ],
    }),
    defineField({
      name: 'homeCardSize',
      title: 'Home card size',
      type: 'string',
      group: 'presentation',
      description: 'Controls editorial emphasis without changing the source media. Wide is reserved for a reviewed feature placement.',
      options: {list: [
        {title: 'Standard', value: 'standard'},
        {title: 'Tall', value: 'tall'},
        {title: 'Large', value: 'large'},
        {title: 'Wide feature', value: 'wide'},
      ], layout: 'radio'},
      initialValue: 'standard',
    }),
    defineField({
      name: 'homeColumn',
      title: 'Preferred desktop column',
      type: 'number',
      group: 'presentation',
      description: 'Optional art-direction hint from 1–4. Smaller layouts and unavailable placements fall back to editorial order.',
      validation: (Rule) => Rule.integer().min(1).max(4),
    }),
    defineField({
      name: 'homeOffset',
      title: 'Home vertical offset',
      type: 'number',
      group: 'presentation',
      description: 'A bounded editorial offset. Values are preserved from -240…320; the near-tessellated home renderer safely displays 0…12px to prevent overlap and oversized lane gaps.',
      initialValue: 0,
      validation: (Rule) => Rule.integer().min(-240).max(320),
    }),
    defineField({
      name: 'homeTreatment',
      title: 'Home card treatment',
      type: 'string',
      group: 'presentation',
      options: {list: [
        {title: 'Standard', value: 'standard'},
        {title: 'Masked', value: 'masked'},
        {title: 'Framed', value: 'framed'},
        {title: 'Poster', value: 'poster'},
      ], layout: 'radio'},
      initialValue: 'standard',
    }),
    defineField({
      name: 'projectTheme',
      title: 'Project theme',
      type: 'string',
      group: 'presentation',
      options: {list: [
        {title: 'Light gray', value: 'light'},
        {title: 'Warm', value: 'warm'},
        {title: 'Dark', value: 'dark'},
        {title: 'Accent-led', value: 'accent'},
      ], layout: 'radio'},
      initialValue: 'light',
    }),
    defineField({
      name: 'accentColor',
      title: 'Accent color',
      type: 'string',
      group: 'presentation',
      description: 'Optional six-digit hexadecimal color, for example #B65A4A. Text contrast remains controlled by the theme.',
      validation: (Rule) => Rule.custom((value) =>
        value === undefined || /^#[0-9A-Fa-f]{6}$/u.test(value)
          ? true
          : 'Use a six-digit hexadecimal color such as #B65A4A.'),
    }),
    defineField({
      name: 'titleTreatment',
      title: 'Title treatment',
      type: 'string',
      group: 'presentation',
      options: {list: [
        {title: 'Standard', value: 'standard'},
        {title: 'Stacked', value: 'stacked'},
        {title: 'Oversized', value: 'oversized'},
        {title: 'Split', value: 'split'},
      ], layout: 'radio'},
      initialValue: 'standard',
    }),
    defineField({
      name: 'heroTreatment',
      title: 'Hero treatment',
      type: 'string',
      group: 'presentation',
      options: {list: [
        {title: 'Contained', value: 'contained'},
        {title: 'Full viewport', value: 'fullViewport'},
        {title: 'Split', value: 'split'},
        {title: 'Masked', value: 'masked'},
      ], layout: 'radio'},
      initialValue: 'contained',
    }),
    defineField({
      name: 'layoutVariant',
      title: 'Project layout variant',
      type: 'string',
      group: 'presentation',
      description: 'Selects the presentation template; every option renders the same ordered content-block contract.',
      options: {list: [
        {title: 'Cinematic', value: 'cinematic'},
        {title: 'Photo essay', value: 'photoEssay'},
        {title: 'Campaign', value: 'campaign'},
        {title: 'Experimental', value: 'experimental'},
      ], layout: 'radio'},
      initialValue: 'cinematic',
    }),
    defineField({
      name: 'motionIntensity',
      title: 'Motion intensity',
      type: 'string',
      group: 'presentation',
      description: 'Relative art-direction hint only. Reduced-motion and data-saving preferences always take precedence.',
      options: {list: [
        {title: 'Low', value: 'low'},
        {title: 'Medium', value: 'medium'},
        {title: 'High', value: 'high'},
      ], layout: 'radio'},
      initialValue: 'medium',
    }),
    defineField({
      name: 'visible',
      title: 'Publicly visible',
      type: 'boolean',
      group: 'publishing',
      initialValue: false,
      description: 'Turning this on does not bypass review, approval, placeholder, master, or accessibility blockers.',
    }),
    defineField({name: 'publishAt', title: 'Publish at', type: 'datetime', group: 'publishing'}),
    defineField({
      name: 'needsReview',
      title: 'Needs editorial review',
      type: 'boolean',
      group: 'internal',
      initialValue: true,
      validation: (Rule) => Rule.custom((value) => value === true ? 'Review imported facts before publication.' : true).warning(),
    }),
    defineField({
      name: 'doNotPublishWithoutExplicitApproval',
      title: 'Do not publish without explicit approval',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
      validation: (Rule) => Rule.custom((value) => value === true ? 'Publication remains blocked until documented approval is obtained and this flag is deliberately cleared.' : true).warning(),
    }),
    ...rightsApprovalFields,
    defineField({
      name: 'sourcePage',
      title: 'Source page',
      type: 'url',
      group: 'internal',
      description: 'Internal provenance only; never render publicly.',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({name: 'seo', title: 'SEO overrides', type: 'seoFields', group: 'seo'}),
  ],
  initialValue: {
    visible: false,
    needsReview: true,
    featuredOnHome: false,
    homeCardSize: 'standard',
    homeOffset: 0,
    homeTreatment: 'standard',
    projectTheme: 'light',
    titleTreatment: 'standard',
    heroTreatment: 'contained',
    layoutVariant: 'cinematic',
    motionIntensity: 'medium',
    doNotPublishWithoutExplicitApproval: false,
    rightsApprovalStatus: 'pending',
  },
  validation: (Rule) => Rule.custom(projectPublicationError),
  orderings: [
    {title: 'Home order', name: 'homeOrderAsc', by: [{field: 'homeOrder', direction: 'asc'}]},
    {title: 'Title', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
    {title: 'Year, newest', name: 'yearDesc', by: [{field: 'year', direction: 'desc'}]},
  ],
  preview: {
    select: {
      title: 'title',
      media: 'cover.poster',
      visible: 'visible',
      needsReview: 'needsReview',
      order: 'homeOrder',
      blocked: 'doNotPublishWithoutExplicitApproval',
    },
    prepare: ({title, media, visible, needsReview, order, blocked}) => ({
      title: title || 'Untitled project',
      subtitle: [
        typeof order === 'number' ? `#${order}` : 'unordered',
        visible ? 'visible' : 'hidden',
        needsReview ? 'needs review' : undefined,
        blocked ? 'approval blocked' : undefined,
      ].filter(Boolean).join(' · '),
      media,
    }),
  },
})

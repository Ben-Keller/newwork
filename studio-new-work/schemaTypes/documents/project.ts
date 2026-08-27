import {ProjectsIcon} from '@sanity/icons/Projects'
import {defineArrayMember, defineField, defineType, type ValidationContext} from 'sanity'
import {
  PUBLIC_MEDIA_BLOCK_TYPES,
  hasAssetReference,
  isRecord,
  workPublicationError,
  warningForMissing,
  wordCount,
} from '../validation'
import {rightsApprovalFieldsFor} from '../objects/rightsFields'
import {hiddenAllFieldsGroup, hideResolvedReviewField} from '../clientGroups'
import {SANITY_API_VERSION} from '../../sanity.constants'

async function isUniqueSlug(slug: string | undefined, context: ValidationContext): Promise<boolean> {
  if (!slug) return true
  const documentId = String(context.document?._id ?? '').replace(/^drafts\./u, '')
  const duplicateCount = await context.getClient({apiVersion: SANITY_API_VERSION}).fetch(
    `count(*[_type == "work" && slug.current == $slug && !(_id in [$publishedId, $draftId])])`,
    {slug, publishedId: documentId, draftId: `drafts.${documentId}`},
  ) as number
  return duplicateCount === 0
}

async function duplicateHomeOrderWarning(value: number | undefined, context: ValidationContext): Promise<true | string> {
  if (typeof value !== 'number') return true
  const documentId = String(context.document?._id ?? '').replace(/^drafts\./u, '')
  const duplicateCount = await context.getClient({apiVersion: SANITY_API_VERSION}).fetch(
    `count(*[_type == "work" && homeOrder == $homeOrder && !(_id in [$publishedId, $draftId])])`,
    {homeOrder: value, publishedId: documentId, draftId: `drafts.${documentId}`},
  ) as number
  return duplicateCount === 0 ? true : 'Another Project uses this home order.'
}

async function approvedProjectAssetsError(
  value: unknown,
  context: ValidationContext,
): Promise<true | string> {
  if (!isRecord(value) || value.editorialStatus !== 'approved') return true
  const workId = String(value._id || context.document?._id || '').replace(/^drafts\./u, '')
  const assets = await context.getClient({apiVersion: SANITY_API_VERSION}).fetch<Array<{
    _id: string
    accessible: boolean
    hasMedia: boolean
    rightsApproved: boolean
  }>>(
    `*[_type == "mediaItem" && project._ref == $workId]{
      _id,
      "hasMedia": select(
        kind == "image" => defined(image.asset),
        kind == "video" => defined(poster.asset) && (defined(videoFile.asset) || defined(videoUrl)),
        kind == "file" => defined(file.asset),
        false
      ),
      "accessible": kind == "file" || decorative == true || length(coalesce(alt, "")) > 0,
      "rightsApproved": rightsApprovalStatus == "approved" &&
        length(coalesce(rightsApprovalEvidence, "")) > 0 &&
        (!defined(rightsExpiresAt) || rightsExpiresAt > now())
    }`,
    {workId},
  )
  if (!assets.length) return 'Link at least one flat Asset to this Project before approving it.'
  const blocked = assets.filter((asset) => !asset.hasMedia || !asset.accessible || !asset.rightsApproved)
  return blocked.length === 0 ? true
    : `${blocked.length} linked Project assets cannot be published. Each needs valid media, accessibility text, and current recorded rights approval.`
}

export const work = defineType({
  name: 'work',
  title: 'Project',
  type: 'document',
  icon: ProjectsIcon,
  groups: [
    {name: 'overview', title: 'Project details', default: true},
    {name: 'card', title: 'Work-page card'},
    {name: 'page', title: 'Project page'},
    {name: 'credits', title: 'Credits'},
    {name: 'publishing', title: 'Approval & publishing'},
    {name: 'seo', title: 'Search & sharing'},
    {name: 'advanced', title: 'Page style', hidden: true},
    hiddenAllFieldsGroup,
  ],
  fieldsets: [
    {
      name: 'artDirection',
      title: 'Advanced art direction',
      description: 'Use these overrides only when the standard Project-page template is not sufficient.',
      options: {collapsible: true, collapsed: true},
    },
    {
      name: 'legacyGallery',
      title: 'Legacy gallery placement',
      description: 'The Front gallery now controls public order and card presentation.',
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', group: 'overview', validation: (Rule) => Rule.required().max(140)}),
    defineField({
      name: 'legacyId',
      title: 'Legacy source ID',
      type: 'string',
      group: 'advanced',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: {source: 'title', maxLength: 96, isUnique: isUniqueSlug},
      hidden: ({value}) => Boolean((value as {current?: string} | undefined)?.current),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'owner',
      title: 'Internal owner',
      type: 'string',
      group: 'advanced',
      options: {list: [
        {title: 'Oliver', value: 'oliver'},
        {title: 'Michael', value: 'michael'},
        {title: 'Collective', value: 'collective'},
        {title: 'Other', value: 'other'},
      ]},
    }),
    defineField({
      name: 'client',
      title: 'Client / commissioner',
      type: 'string',
      group: 'overview',
      description: 'Optional. Add only when the public client name is confirmed.',
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      group: 'overview',
      validation: (Rule) => Rule.integer().min(1900).max(new Date().getFullYear() + 2),
    }),
    defineField({
      name: 'types',
      title: 'Output types',
      type: 'array',
      group: 'overview',
      of: [defineArrayMember({type: 'string'})],
      options: {list: ['Film', 'Photography', 'Campaign', 'Animation', 'BTS']},
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'template',
      title: 'Page template',
      type: 'string',
      group: 'overview',
      description: 'Presentation style only. Every image, video, or file remains a flat Asset linked to this Project.',
      options: {list: [
        {title: 'Photo', value: 'photo'},
        {title: 'Video', value: 'video'},
        {title: 'Featured', value: 'featured'},
      ], layout: 'radio'},
      initialValue: 'video',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'role', title: 'Role', type: 'string', group: 'overview', validation: (Rule) => Rule.max(120)}),
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
      group: 'overview',
      description: 'Aim for 12–90 words. More than 160 words is blocked.',
      validation: (Rule) => [
        Rule.custom((value) =>
          wordCount(value) <= 160 ? true : 'Description cannot exceed 160 words.'),
        Rule.custom((value) => {
          const count = wordCount(value)
          if (count === 0) return 'Description is recommended before publication.'
          return count >= 12 && count <= 90
            ? true
            : `Description is ${count} words; the recommended range is 12–90.`
        }).warning(),
      ],
    }),
    defineField({
      name: 'cover',
      title: 'Cover',
      type: 'coverMedia',
      group: 'card',
      validation: (Rule) => Rule.custom((value, context) => {
        const document = context.document as {editorialStatus?: string; visible?: boolean; featuredOnHome?: boolean}
        const publicProject = document?.editorialStatus === 'approved' ||
          (document?.editorialStatus === undefined && (document?.visible === true || document?.featuredOnHome === true))
        if (!publicProject) return true
        return isRecord(value) && hasAssetReference(value.poster)
          ? true
          : 'A visible or featured Project requires a cover poster.'
      }),
    }),
    defineField({
      name: 'contentBlocks',
      title: 'Project page sections',
      type: 'array',
      group: 'page',
      description: 'Add sections, then drag them into the order they should appear on the Project page.',
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
        const document = context.document as {editorialStatus?: string; visible?: boolean}
        const publicProject = document?.editorialStatus === 'approved' ||
          (document?.editorialStatus === undefined && document?.visible === true)
        if (!publicProject) return true
        return blocks.some((block) => isRecord(block) && PUBLIC_MEDIA_BLOCK_TYPES.has(String(block._type)))
          ? true
          : 'A public Project requires at least one media block.'
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
    defineField({
      name: 'featuredOnHome',
      title: 'Featured on home (legacy)',
      type: 'boolean',
      group: 'advanced',
      fieldset: 'legacyGallery',
      initialValue: false,
      deprecated: {reason: 'Add and order this Project’s Assets from Work page → Front gallery.'},
    }),
    defineField({
      name: 'homeOrder',
      title: 'Home order',
      type: 'number',
      group: 'advanced',
      fieldset: 'legacyGallery',
      description: 'Preserved for migration. The Front gallery now controls order.',
      deprecated: {reason: 'Drag Asset placements into order from Work page → Front gallery.'},
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
      group: 'advanced',
      fieldset: 'legacyGallery',
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
      group: 'advanced',
      fieldset: 'legacyGallery',
      description: 'Optional art-direction hint from 1–4. Smaller layouts and unavailable placements fall back to editorial order.',
      validation: (Rule) => Rule.integer().min(1).max(4),
    }),
    defineField({
      name: 'homeOffset',
      title: 'Home vertical offset',
      type: 'number',
      group: 'advanced',
      fieldset: 'legacyGallery',
      description: 'A bounded editorial offset. Values are preserved from -240…320; the near-tessellated home renderer safely displays 0…12px to prevent overlap and oversized lane gaps.',
      initialValue: 0,
      validation: (Rule) => Rule.integer().min(-240).max(320),
    }),
    defineField({
      name: 'homeTreatment',
      title: 'Home card treatment',
      type: 'string',
      group: 'advanced',
      fieldset: 'legacyGallery',
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
      group: 'advanced',
      fieldset: 'artDirection',
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
      group: 'advanced',
      fieldset: 'artDirection',
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
      group: 'advanced',
      fieldset: 'artDirection',
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
      group: 'advanced',
      fieldset: 'artDirection',
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
      title: 'Project page style',
      type: 'string',
      group: 'page',
      description: 'Choose the presentation that best matches the Project. The website handles the detailed layout.',
      options: {list: [
        {title: 'Cinematic', value: 'cinematic'},
        {title: 'Photo essay', value: 'photoEssay'},
        {title: 'Campaign', value: 'campaign'},
        {title: 'Experimental', value: 'experimental'},
      ], layout: 'radio'},
      initialValue: 'cinematic',
      hidden: true,
      readOnly: true,
    }),
    defineField({
      name: 'motionIntensity',
      title: 'Motion intensity',
      type: 'string',
      group: 'advanced',
      fieldset: 'artDirection',
      description: 'Relative art-direction hint only. Reduced-motion and data-saving preferences always take precedence.',
      options: {list: [
        {title: 'Low', value: 'low'},
        {title: 'Medium', value: 'medium'},
        {title: 'High', value: 'high'},
      ], layout: 'radio'},
      initialValue: 'medium',
    }),
    defineField({
      name: 'editorialStatus',
      title: 'Editorial status',
      type: 'string',
      group: 'publishing',
      description: 'This describes readiness. The Sanity Publish button still controls whether changes go live.',
      options: {
        list: [
          {title: 'Working draft', value: 'draft'},
          {title: 'Needs review', value: 'review'},
          {title: 'Ready to publish', value: 'ready'},
          {title: 'Approved for website', value: 'approved'},
        ],
        layout: 'radio',
      },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'visible',
      title: 'Publicly visible (legacy)',
      type: 'boolean',
      group: 'advanced',
      initialValue: false,
      hidden: true,
      readOnly: true,
      deprecated: {reason: 'Use Editorial status in the Publishing tab.'},
    }),
    defineField({
      name: 'publishAt',
      title: 'Publish at (legacy)',
      type: 'datetime',
      group: 'advanced',
      hidden: true,
      readOnly: true,
      deprecated: {reason: 'Scheduling is not enabled for this Studio.'},
    }),
    defineField({
      name: 'needsReview',
      title: 'Needs editorial review',
      type: 'boolean',
      group: 'advanced',
      hidden: true,
      readOnly: true,
      deprecated: {reason: 'Use Editorial status in the Publishing tab.'},
      initialValue: true,
    }),
    defineField({
      name: 'doNotPublishWithoutExplicitApproval',
      title: 'Do not publish without explicit approval',
      type: 'boolean',
      group: 'publishing',
      initialValue: false,
      hidden: hideResolvedReviewField,
      validation: (Rule) => Rule.custom((value) => value === true ? 'Publication remains blocked until documented approval is obtained and this flag is deliberately cleared.' : true).warning(),
    }),
    ...rightsApprovalFieldsFor('publishing'),
    defineField({
      name: 'sourcePage',
      title: 'Source page',
      type: 'url',
      group: 'advanced',
      hidden: true,
      readOnly: true,
      description: 'Internal provenance only; never render publicly.',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
    defineField({name: 'seo', title: 'SEO overrides', type: 'seoFields', group: 'seo'}),
  ],
  initialValue: {
    template: 'video',
    visible: false,
    editorialStatus: 'draft',
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
  validation: (Rule) => [
    Rule.custom(workPublicationError),
    Rule.custom(approvedProjectAssetsError),
  ],
  orderings: [
    {title: 'Title', name: 'titleAsc', by: [{field: 'title', direction: 'asc'}]},
    {title: 'Year, newest', name: 'yearDesc', by: [{field: 'year', direction: 'desc'}]},
  ],
  preview: {
    select: {
      title: 'title',
      media: 'cover.poster',
      blocked: 'doNotPublishWithoutExplicitApproval',
      status: 'editorialStatus',
      types: 'types',
      year: 'year',
    },
    prepare: ({title, media, blocked, status, types, year}) => ({
      title: title || 'Untitled Project',
      subtitle: [
        status === 'approved' ? 'Approved' : status === 'ready' ? 'Ready to publish' : status === 'review' ? 'Needs review' : 'Working draft',
        Array.isArray(types) ? types.join(' / ') : undefined,
        typeof year === 'number' ? String(year) : undefined,
        blocked ? 'approval blocked' : undefined,
      ].filter(Boolean).join(' · '),
      media,
    }),
  },
})

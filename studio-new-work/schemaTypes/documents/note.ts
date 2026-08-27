import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineField, defineType, type ValidationContext} from 'sanity'
import {notePublicationError} from '../validation'
import {rightsApprovalFields} from '../objects/rightsFields'
import {SANITY_API_VERSION} from '../../sanity.constants'

async function isUniqueNoteSlug(slug: string | undefined, context: ValidationContext): Promise<boolean> {
  if (!slug) return true
  const documentId = String(context.document?._id ?? '').replace(/^drafts\./u, '')
  const duplicateCount = await context.getClient({apiVersion: SANITY_API_VERSION}).fetch(
    `count(*[_type == "note" && slug.current == $slug && !(_id in [$publishedId, $draftId])])`,
    {slug, publishedId: documentId, draftId: `drafts.${documentId}`},
  ) as number
  return duplicateCount === 0
}

export const note = defineType({
  name: 'note',
  title: 'Note',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Note', default: true},
    {name: 'publishing', title: 'Publishing'},
    {name: 'seo', title: 'SEO'},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({name: 'title', title: 'Title', type: 'string', group: 'content', validation: (Rule) => Rule.required().max(140)}),
    defineField({name: 'legacyId', title: 'Legacy source ID', type: 'string', group: 'internal', hidden: true, readOnly: true}),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'content',
      options: {source: 'title', maxLength: 96, isUnique: isUniqueNoteSlug},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'date', title: 'Date', type: 'date', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'string',
      group: 'content',
      description: 'One sentence, at most 220 characters.',
      validation: (Rule) => [
        Rule.required().max(220),
        Rule.custom((value) => {
          if (typeof value !== 'string') return true
          const sentenceEndings = value.trim().match(/[.!?]+(?=\s|$)/gu)?.length ?? 0
          return sentenceEndings <= 1 ? true : 'Keep the summary to one sentence.'
        }),
      ],
    }),
    defineField({name: 'media', title: 'Media', type: 'mediaAsset', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'body', title: 'Body', type: 'portableText', group: 'content'}),
    defineField({name: 'visible', title: 'Publicly visible', type: 'boolean', group: 'publishing', initialValue: false}),
    defineField({name: 'seo', title: 'SEO', type: 'seoFields', group: 'seo'}),
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
    }),
    ...rightsApprovalFields,
  ],
  initialValue: {
    visible: false,
    needsReview: true,
    doNotPublishWithoutExplicitApproval: false,
  },
  validation: (Rule) => Rule.custom(notePublicationError),
  orderings: [{title: 'Date, newest', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', date: 'date', visible: 'visible', needsReview: 'needsReview', media: 'media.image'},
    prepare: ({title, date, visible, needsReview, media}) => ({
      title: title || 'Untitled note',
      subtitle: [date, visible ? 'visible' : 'hidden', needsReview ? 'needs review' : undefined].filter(Boolean).join(' · '),
      media,
    }),
  },
})

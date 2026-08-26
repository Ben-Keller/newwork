import {PlayIcon} from '@sanity/icons/Play'
import {defineField, defineType} from 'sanity'
import {
  documentIsVisible,
  hasAssetReference,
  isApprovedHostedMediaUrl,
  isNonEmptyString,
  isPlayableVideoAssetReference,
} from '../validation'
import {captionCreditFields, internalSafetyFields} from './blockFields'
import {hiddenAllFieldsGroup, reviewRequiredGroup} from '../clientGroups'

export const shortLoop = defineType({
  name: 'shortLoop',
  title: 'Short muted loop',
  type: 'object',
  icon: PlayIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({
      name: 'source',
      title: 'Hosted source',
      type: 'editorialFile',
      group: 'content',
      validation: (Rule) => Rule.custom((value) =>
        value === undefined || isPlayableVideoAssetReference(value)
          ? true
          : 'Upload an MP4 or WebM video file.',
      ),
    }),
    defineField({
      name: 'remoteSource',
      title: 'Approved remote source URL',
      type: 'url',
      group: 'content',
      hidden: ({parent}) => !Boolean(parent?.remoteSource),
      readOnly: true,
      validation: (Rule) => Rule.custom((value) =>
        value === undefined || isApprovedHostedMediaUrl(value)
          ? true
          : 'Use a direct HTTPS video file on the approved Sanity CDN.'),
    }),
    defineField({
      name: 'poster',
      title: 'Poster',
      type: 'editorialImage',
      group: 'content',
      validation: (Rule) => Rule.custom((value, context) =>
        !documentIsVisible(context) || hasAssetReference(value) ? true : 'A public loop requires a poster.'),
    }),
    defineField({
      name: 'alt',
      title: 'Accessible description',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.custom((value, context) => {
        const parent = context.parent as {decorative?: boolean}
        if (!documentIsVisible(context) || parent?.decorative === true) return true
        return isNonEmptyString(value) ? true : 'Describe the loop or deliberately mark it decorative.'
      }),
    }),
    defineField({name: 'decorative', title: 'Decorative duplicate', type: 'boolean', group: 'content', initialValue: false}),
    defineField({
      name: 'autoplayPolicy',
      title: 'Autoplay policy',
      type: 'string',
      group: 'content',
      initialValue: 'never',
      options: {list: [
        {title: 'Never autoplay', value: 'never'},
        {title: 'Muted, in-view autoplay', value: 'inViewMuted'},
      ], layout: 'radio'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'startMuted', title: 'Start muted', type: 'boolean', group: 'content', initialValue: true, hidden: true, readOnly: true}),
    defineField({name: 'loop', title: 'Loop', type: 'boolean', group: 'content', initialValue: true, hidden: true, readOnly: true}),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {select: {media: 'poster', title: 'caption'}, prepare: ({media, title}) => ({title: title || 'Short muted loop', media})},
})

import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'
import {documentIsVisible, isNonEmptyString} from '../validation'
import {captionCreditFields, internalSafetyFields, libraryMediaField} from './blockFields'
import {hiddenAllFieldsGroup, reviewRequiredGroup} from '../clientGroups'

export const heroImage = defineType({
  name: 'heroImage',
  title: 'Hero image',
  type: 'object',
  icon: ImageIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
  ],
  fields: [
    libraryMediaField('image'),
    defineField({name: 'image', title: 'Image', type: 'editorialImage', group: 'content', hidden: ({parent}) => Boolean(parent?.mediaItem), validation: (Rule) => Rule.custom((value, context) => value || (context.parent as {mediaItem?: unknown})?.mediaItem ? true : 'Choose an asset-library image.')}),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      group: 'content',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {decorative?: boolean; mediaItem?: unknown}
          if (!documentIsVisible(context) || parent?.decorative === true || parent?.mediaItem) return true
          return isNonEmptyString(value) ? true : 'A public still requires meaningful alt text.'
        }),
    }),
    defineField({name: 'decorative', title: 'Decorative duplicate', type: 'boolean', group: 'content', initialValue: false}),
    defineField({
      name: 'displayWidth',
      title: 'Display width',
      type: 'string',
      group: 'content',
      initialValue: 'wide',
      options: {list: [
        {title: 'Contained', value: 'contained'},
        {title: 'Wide', value: 'wide'},
        {title: 'Full bleed', value: 'fullBleed'},
      ]},
      validation: (Rule) => Rule.required(),
    }),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {select: {media: 'image', title: 'caption'}, prepare: ({media, title}) => ({title: title || 'Hero image', media})},
})

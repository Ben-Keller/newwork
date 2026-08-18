import {defineField, defineType} from 'sanity'
import {documentIsVisible, isNonEmptyString} from '../validation'
import {captionCreditFields, internalSafetyFields} from './blockFields'

export const fullBleedImage = defineType({
  name: 'fullBleedImage',
  title: 'Full-bleed image',
  type: 'object',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({name: 'image', title: 'Image', type: 'editorialImage', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.custom((value, context) => {
        const parent = context.parent as {decorative?: boolean}
        if (!documentIsVisible(context) || parent?.decorative === true) return true
        return isNonEmptyString(value) ? true : 'A public still requires meaningful alt text.'
      }),
    }),
    defineField({name: 'decorative', title: 'Decorative duplicate', type: 'boolean', group: 'content', initialValue: false}),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {select: {media: 'image', title: 'caption'}, prepare: ({media, title}) => ({title: title || 'Full-bleed image', media})},
})


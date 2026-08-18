import {defineField, defineType} from 'sanity'
import {documentIsVisible, isNonEmptyString} from '../validation'
import {captionCreditFields, internalSafetyFields} from './blockFields'

export const containedImage = defineType({
  name: 'containedImage',
  title: 'Contained image',
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
    defineField({
      name: 'width',
      title: 'Width',
      type: 'string',
      group: 'content',
      initialValue: 'wide',
      options: {list: [
        {title: 'Narrow', value: 'narrow'},
        {title: 'Medium', value: 'medium'},
        {title: 'Wide', value: 'wide'},
      ]},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alignment',
      title: 'Alignment',
      type: 'string',
      group: 'content',
      initialValue: 'center',
      options: {list: [
        {title: 'Left', value: 'left'},
        {title: 'Center', value: 'center'},
        {title: 'Right', value: 'right'},
      ], layout: 'radio'},
      validation: (Rule) => Rule.required(),
    }),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {select: {media: 'image', title: 'caption', width: 'width'}, prepare: ({media, title, width}) => ({title: title || 'Contained image', subtitle: width, media})},
})


import {defineField, defineType} from 'sanity'
import {captionCreditFields, internalSafetyFields} from './blockFields'

export const imagePair = defineType({
  name: 'imagePair',
  title: 'Image pair',
  type: 'object',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({name: 'left', title: 'Left image', type: 'imageItem', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'right', title: 'Right image', type: 'imageItem', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'ratioHandling',
      title: 'Ratio handling',
      type: 'string',
      group: 'content',
      initialValue: 'natural',
      options: {list: [
        {title: 'Keep natural ratios', value: 'natural'},
        {title: 'Match heights without cropping', value: 'matched'},
        {title: 'Use approved crops', value: 'crop'},
      ]},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'sharedCaption', title: 'Shared caption', type: 'string', group: 'content'}),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {select: {media: 'left.image', title: 'sharedCaption'}, prepare: ({media, title}) => ({title: title || 'Image pair', media})},
})


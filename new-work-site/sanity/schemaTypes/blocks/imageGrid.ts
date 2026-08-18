import {defineArrayMember, defineField, defineType} from 'sanity'
import {captionCreditFields, internalSafetyFields} from './blockFields'

export const imageGrid = defineType({
  name: 'imageGrid',
  title: 'Image grid',
  type: 'object',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'imageItem'})],
      validation: (Rule) => Rule.required().min(3).max(8),
    }),
    defineField({
      name: 'desktopColumns',
      title: 'Desktop columns',
      type: 'number',
      group: 'content',
      initialValue: 3,
      options: {list: [2, 3], layout: 'radio'},
      validation: (Rule) => Rule.required().integer().min(2).max(3),
    }),
    defineField({
      name: 'mobileLayout',
      title: 'Mobile layout',
      type: 'string',
      group: 'content',
      initialValue: 'stack',
      readOnly: true,
      options: {list: [{title: 'Stack', value: 'stack'}]},
    }),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {
    select: {media: 'images.0.image', count: 'images.length', title: 'caption'},
    prepare: ({media, count, title}) => ({title: title || 'Image grid', subtitle: count ? `${count} images` : undefined, media}),
  },
})


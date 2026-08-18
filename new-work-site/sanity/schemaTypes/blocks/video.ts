import {defineField, defineType} from 'sanity'
import {captionCreditFields, internalSafetyFields, videoSourceFields} from './blockFields'

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'object',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    ...videoSourceFields,
    defineField({
      name: 'autoplay',
      title: 'Autoplay',
      type: 'boolean',
      group: 'content',
      initialValue: false,
      description: 'Defaults off. The site always disables sound on any permitted autoplay path.',
    }),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {select: {media: 'poster', title: 'caption'}, prepare: ({media, title}) => ({title: title || 'Video', media})},
})


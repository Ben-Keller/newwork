import {PlayIcon} from '@sanity/icons/Play'
import {defineField, defineType} from 'sanity'
import {captionCreditFields, internalSafetyFields, videoSourceFields} from './blockFields'
import {hiddenAllFieldsGroup, reviewRequiredGroup} from '../clientGroups'

export const video = defineType({
  name: 'video',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
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

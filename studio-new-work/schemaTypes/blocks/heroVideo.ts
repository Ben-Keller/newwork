import {PlayIcon} from '@sanity/icons/Play'
import {defineType} from 'sanity'
import {captionCreditFields, internalSafetyFields, videoSourceFields} from './blockFields'
import {hiddenAllFieldsGroup, reviewRequiredGroup} from '../clientGroups'

export const heroVideo = defineType({
  name: 'heroVideo',
  title: 'Hero video',
  type: 'object',
  icon: PlayIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
  ],
  fields: [...videoSourceFields, ...captionCreditFields, ...internalSafetyFields],
  preview: {
    select: {media: 'poster', title: 'caption', vimeoId: 'vimeoId', youtubeId: 'youtubeId'},
    prepare: ({media, title, vimeoId, youtubeId}) => ({
      title: title || 'Hero video',
      subtitle: vimeoId ? `Vimeo ${vimeoId}` : youtubeId ? `YouTube ${youtubeId}` : 'Hosted video',
      media,
    }),
  },
})

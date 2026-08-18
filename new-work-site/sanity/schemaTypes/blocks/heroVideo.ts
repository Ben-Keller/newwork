import {defineType} from 'sanity'
import {captionCreditFields, internalSafetyFields, videoSourceFields} from './blockFields'

export const heroVideo = defineType({
  name: 'heroVideo',
  title: 'Hero video',
  type: 'object',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'internal', title: 'Internal review'},
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


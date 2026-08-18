import {defineType} from 'sanity'
import {provenanceFields} from './provenanceFields'

export const editorialFile = defineType({
  name: 'editorialFile',
  title: 'Editorial file',
  type: 'file',
  options: {
    accept: 'video/*,audio/*,image/svg+xml,image/png,.svg,.png,.vtt,.srt',
  },
  fields: provenanceFields,
})

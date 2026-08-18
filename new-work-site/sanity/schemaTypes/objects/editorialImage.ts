import {defineType} from 'sanity'
import {provenanceFields} from './provenanceFields'

export const editorialImage = defineType({
  name: 'editorialImage',
  title: 'Editorial image',
  type: 'image',
  options: {
    hotspot: true,
  },
  fields: provenanceFields,
})

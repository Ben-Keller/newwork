import {defineType} from 'sanity'
import {hasActiveReviewFlag} from '../clientGroups'
import {clientProvenanceFields} from './provenanceFields'

export const editorialImage = defineType({
  name: 'editorialImage',
  title: 'Editorial image',
  type: 'image',
  options: {
    hotspot: true,
  },
  fieldsets: [
    {
      name: 'migration',
      title: 'Review required',
      description: 'Only unresolved publishing blockers appear here.',
      hidden: ({parent, value}) => !hasActiveReviewFlag(value) && !hasActiveReviewFlag(parent),
      options: {collapsible: true, collapsed: true},
    },
  ],
  fields: clientProvenanceFields.map((field) => ({...field, fieldset: 'migration'})),
})

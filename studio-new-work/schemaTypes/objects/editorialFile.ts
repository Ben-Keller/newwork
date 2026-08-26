import {defineType} from 'sanity'
import {hasActiveReviewFlag} from '../clientGroups'
import {clientProvenanceFields} from './provenanceFields'

export const editorialFile = defineType({
  name: 'editorialFile',
  title: 'Editorial file',
  type: 'file',
  options: {
    accept: 'video/*,audio/*,image/svg+xml,image/png,.svg,.png,.vtt,.srt',
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

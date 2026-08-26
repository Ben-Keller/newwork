import {DocumentTextIcon} from '@sanity/icons/DocumentText'
import {defineField, defineType} from 'sanity'
import {internalSafetyFields} from './blockFields'
import {hiddenAllFieldsGroup, reviewRequiredGroup} from '../clientGroups'

export const caption = defineType({
  name: 'caption',
  title: 'Caption',
  type: 'object',
  icon: DocumentTextIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({name: 'text', title: 'Text', type: 'text', rows: 2, group: 'content', validation: (Rule) => Rule.required().max(320)}),
    defineField({name: 'credit', title: 'Credit', type: 'string', group: 'content'}),
    defineField({
      name: 'association',
      title: 'Associated media',
      type: 'string',
      group: 'content',
      initialValue: 'previous',
      options: {list: [
        {title: 'Previous media block', value: 'previous'},
        {title: 'Next media block', value: 'next'},
      ], layout: 'radio'},
      validation: (Rule) => Rule.required(),
    }),
    ...internalSafetyFields,
  ],
  preview: {select: {title: 'text', subtitle: 'credit'}},
})

import {defineField, defineType} from 'sanity'
import {captionCreditFields, internalSafetyFields} from './blockFields'

export const textNote = defineType({
  name: 'textNote',
  title: 'Text note',
  type: 'object',
  groups: [
    {name: 'content', title: 'Content', default: true},
    {name: 'internal', title: 'Internal review'},
  ],
  fields: [
    defineField({name: 'body', title: 'Text', type: 'portableText', group: 'content', validation: (Rule) => Rule.required().min(1)}),
    defineField({
      name: 'maxWidth',
      title: 'Maximum width',
      type: 'string',
      group: 'content',
      initialValue: 'medium',
      options: {list: [
        {title: 'Narrow', value: 'narrow'},
        {title: 'Medium', value: 'medium'},
        {title: 'Wide', value: 'wide'},
      ]},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'alignment',
      title: 'Alignment',
      type: 'string',
      group: 'content',
      initialValue: 'left',
      options: {list: [
        {title: 'Left', value: 'left'},
        {title: 'Center', value: 'center'},
      ], layout: 'radio'},
      validation: (Rule) => Rule.required(),
    }),
    ...captionCreditFields,
    ...internalSafetyFields,
  ],
  preview: {select: {body: 'body'}, prepare: ({body}) => ({title: body?.[0]?.children?.[0]?.text || 'Text note'})},
})


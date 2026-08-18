import {defineField, defineType} from 'sanity'

export const contributor = defineType({
  name: 'contributor',
  title: 'Contributor',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      title: 'Confirmed name',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'role',
      title: 'Confirmed role',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'role'},
  },
})


import {TextIcon} from '@sanity/icons/Text'
import {defineField, defineType} from 'sanity'

export const footerLine = defineType({
  name: 'footerLine',
  title: 'Footer strapline',
  type: 'object',
  icon: TextIcon,
  fields: [
    defineField({
      name: 'text',
      title: 'Line',
      type: 'string',
      validation: (Rule) => Rule.required().max(100),
    }),
    defineField({
      name: 'emphasis',
      title: 'Words to emphasize',
      type: 'string',
      description: 'Optional. Enter an exact phrase from the line above.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const text = (context.parent as {text?: unknown} | undefined)?.text
          if (!value || typeof text !== 'string') return true
          return text.includes(value) ? true : 'Use an exact phrase from the line.'
        }),
    }),
  ],
  preview: {
    select: {title: 'text'},
    prepare: ({title}) => ({title: title || 'Empty line'}),
  },
})

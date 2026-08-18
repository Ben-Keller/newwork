import {defineField, defineType} from 'sanity'
import {isNonEmptyString} from '../validation'

export const credit = defineType({
  name: 'credit',
  title: 'Credit',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Role / label',
      type: 'string',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'value',
      title: 'Credit',
      type: 'string',
      description: 'Use this for a concise plain-text credit.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {richValue?: unknown[]}
          return isNonEmptyString(value) || (Array.isArray(parent?.richValue) && parent.richValue.length > 0)
            ? true
            : 'Add a plain-text or rich-text credit value.'
        }),
    }),
    defineField({
      name: 'richValue',
      title: 'Rich credit value',
      type: 'portableText',
      description: 'Optional alternative to the plain-text value.',
    }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      validation: (Rule) => Rule.uri({scheme: ['https']}),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      const creditValue = value as {value?: unknown; richValue?: unknown[]}
      return isNonEmptyString(creditValue?.value) ||
        (Array.isArray(creditValue?.richValue) && creditValue.richValue.length > 0)
        ? true
        : 'A credit value is required.'
    }),
  preview: {
    select: {title: 'label', subtitle: 'value'},
  },
})


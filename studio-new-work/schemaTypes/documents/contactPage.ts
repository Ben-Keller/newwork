import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {hiddenAllFieldsGroup} from '../clientGroups'
import {collectBlockingSafetyFlags, isRecord} from '../validation'

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact page',
  type: 'document',
  icon: EnvelopeIcon,
  groups: [
    {name: 'content', title: 'Contact details', default: true},
    {name: 'seo', title: 'Search & sharing'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({name: 'heading', title: 'Page heading', type: 'string', group: 'content', initialValue: 'Contact', validation: (Rule) => Rule.required().max(80)}),
    defineField({name: 'introduction', title: 'Introduction', type: 'portableText', group: 'content'}),
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({name: 'location', title: 'Location', type: 'string', group: 'content', validation: (Rule) => Rule.max(120)}),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      group: 'content',
      of: [defineArrayMember({type: 'socialLink'})],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({name: 'seo', title: 'Contact-page SEO', type: 'seoFields', group: 'seo'}),
  ],
  initialValue: {heading: 'Contact'},
  validation: (Rule) => Rule.custom((value) => {
    if (!isRecord(value)) return true
    const blockers = collectBlockingSafetyFlags(value.seo)
    return blockers.length
      ? `Clear Contact-page publication flags: ${blockers.join(', ')}.`
      : true
  }),
  preview: {prepare: () => ({title: 'Contact page', subtitle: 'Email, location and social links'})},
})

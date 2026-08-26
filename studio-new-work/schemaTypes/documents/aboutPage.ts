import {UsersIcon} from '@sanity/icons/Users'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {collectBlockingSafetyFlags, isRecord} from '../validation'
import {hiddenAllFieldsGroup} from '../clientGroups'

function uniqueAboutOwner(value: unknown): true | string {
  if (!Array.isArray(value)) return true
  const owners = value.flatMap((candidate) => {
    if (!isRecord(candidate) || typeof candidate.projectOwner !== 'string') return []
    return [candidate.projectOwner]
  })
  return new Set(owners).size === owners.length
    ? true
    : 'Each project owner can appear only once on the About page.'
}

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About page',
  type: 'document',
  icon: UsersIcon,
  groups: [
    {name: 'copy', title: 'Page copy', default: true},
    {name: 'people', title: 'People'},
    {name: 'image', title: 'Page image'},
    {name: 'seo', title: 'Search & sharing'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({name: 'heading', title: 'Page heading', type: 'string', group: 'copy', initialValue: 'About', validation: (Rule) => Rule.required().max(80)}),
    defineField({name: 'about', title: 'About text', type: 'portableText', group: 'copy'}),
    defineField({
      name: 'capabilities',
      title: 'Expertise',
      type: 'array',
      group: 'copy',
      of: [defineArrayMember({type: 'string'})],
      validation: (Rule) => Rule.unique(),
    }),
    defineField({
      name: 'peopleHeading',
      title: 'People section heading',
      type: 'string',
      group: 'people',
      initialValue: 'The Creatives',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'peopleIntroduction',
      title: 'People section introduction',
      type: 'text',
      rows: 3,
      group: 'people',
      validation: (Rule) => Rule.max(220),
    }),
    defineField({
      name: 'people',
      title: 'People',
      type: 'array',
      group: 'people',
      description: 'Drag profiles into the order they should appear.',
      of: [defineArrayMember({type: 'aboutPerson'})],
      validation: (Rule) => Rule.max(6).custom(uniqueAboutOwner),
    }),
    defineField({name: 'image', title: 'About image', type: 'editorialImage', group: 'image'}),
    defineField({
      name: 'imageAlt',
      title: 'Image description',
      type: 'string',
      group: 'image',
      hidden: ({document}) => !document?.image || document?.imageDecorative === true,
      validation: (Rule) => Rule.max(220),
    }),
    defineField({
      name: 'imageDecorative',
      title: 'Image is decorative',
      type: 'boolean',
      group: 'image',
      initialValue: false,
      hidden: ({document}) => !document?.image,
    }),
    defineField({name: 'seo', title: 'About-page SEO', type: 'seoFields', group: 'seo'}),
  ],
  initialValue: {heading: 'About', peopleHeading: 'The Creatives', imageDecorative: false},
  validation: (Rule) =>
    Rule.custom((value) => {
      if (!isRecord(value)) return true
      const blockers = collectBlockingSafetyFlags({
        image: value.image,
        people: value.people,
        seo: value.seo,
      })
      if (blockers.length) {
        return `Clear About-page publication flags: ${blockers.join(', ')}.`
      }
      if (!value.image || value.imageDecorative === true) return true
      return typeof value.imageAlt === 'string' && value.imageAlt.trim()
        ? true
        : 'Describe the About image or mark it decorative.'
    }),
  preview: {prepare: () => ({title: 'About page', subtitle: 'Copy, people and expertise'})},
})

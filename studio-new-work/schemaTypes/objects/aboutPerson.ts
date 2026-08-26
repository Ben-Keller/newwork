import {UserIcon} from '@sanity/icons/User'
import {defineField, defineType} from 'sanity'
import {hiddenAllFieldsGroup, hideResolvedReviewField, reviewRequiredGroup} from '../clientGroups'

export const aboutPerson = defineType({
  name: 'aboutPerson',
  title: 'About person',
  type: 'object',
  icon: UserIcon,
  groups: [
    {name: 'content', title: 'Profile', default: true},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required().max(80),
    }),
    defineField({
      name: 'projectOwner',
      title: 'Project owner mapping',
      type: 'string',
      group: 'content',
      description: 'Selects approved project covers to support this profile when full project records exist.',
      options: {list: [
        {title: 'Oliver', value: 'oliver'},
        {title: 'Michael', value: 'michael'},
        {title: 'Collective', value: 'collective'},
        {title: 'Other', value: 'other'},
      ]},
      hidden: ({value}) => typeof value === 'string' && value.length > 0,
      readOnly: ({value}) => typeof value === 'string' && value.length > 0,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'roleLabel',
      title: 'Role label',
      type: 'string',
      group: 'content',
      description: 'Use confirmed public wording only.',
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'portableText',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'selectedWork',
      title: 'Selected external work',
      type: 'array',
      group: 'content',
      description: 'Optional supporting work used when this person does not yet have full project records.',
      of: [{type: 'aboutWork'}],
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'needsReview',
      title: 'Profile needs review',
      type: 'boolean',
      group: 'internal',
      initialValue: true,
      hidden: hideResolvedReviewField,
      validation: (Rule) => Rule.custom((value) =>
        value === true ? 'This profile remains hidden from production until reviewed.' : true,
      ).warning(),
    }),
    defineField({
      name: 'prototypeOnly',
      title: 'Prototype only',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
      hidden: hideResolvedReviewField,
      validation: (Rule) => Rule.custom((value) =>
        value === true ? 'Replace this profile copy before production publication.' : true,
      ).warning(),
    }),
    defineField({
      name: 'doNotPublishWithoutExplicitApproval',
      title: 'Do not publish without explicit approval',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
      hidden: hideResolvedReviewField,
      validation: (Rule) => Rule.custom((value) =>
        value === true ? 'Document explicit approval before clearing this blocker.' : true,
      ).warning(),
    }),
  ],
  preview: {
    select: {title: 'name', subtitle: 'roleLabel', needsReview: 'needsReview'},
    prepare: ({title, subtitle, needsReview}) => ({
      title: title || 'Untitled profile',
      subtitle: [subtitle, needsReview ? 'Needs review' : undefined].filter(Boolean).join(' · '),
    }),
  },
})

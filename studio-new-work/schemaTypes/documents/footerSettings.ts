import {ControlsIcon} from '@sanity/icons/Controls'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {hiddenAllFieldsGroup} from '../clientGroups'

export const footerSettings = defineType({
  name: 'footerSettings',
  title: 'Footer',
  type: 'document',
  icon: ControlsIcon,
  groups: [
    {name: 'strapline', title: 'Strapline', default: true},
    {name: 'directory', title: 'Link columns'},
    {name: 'legal', title: 'Legal line'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({
      name: 'strapline',
      title: 'Strapline lines',
      type: 'array',
      group: 'strapline',
      description: 'Drag lines into order. Each line can emphasize one exact phrase.',
      of: [defineArrayMember({type: 'footerLine'})],
      validation: (Rule) => Rule.required().min(1).max(6),
    }),
    defineField({name: 'peopleHeading', title: 'People column heading', type: 'string', group: 'directory', initialValue: 'People', validation: (Rule) => Rule.required().max(40)}),
    defineField({name: 'exploreHeading', title: 'Explore column heading', type: 'string', group: 'directory', initialValue: 'Explore', validation: (Rule) => Rule.required().max(40)}),
    defineField({name: 'connectHeading', title: 'Connect column heading', type: 'string', group: 'directory', initialValue: 'Connect', validation: (Rule) => Rule.required().max(40)}),
    defineField({
      name: 'exploreLinks',
      title: 'Explore links',
      type: 'array',
      group: 'directory',
      of: [defineArrayMember({type: 'footerLink'})],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'contactLabel',
      title: 'Email link label',
      type: 'string',
      group: 'directory',
      description: 'Leave blank to display the email address itself.',
      validation: (Rule) => Rule.max(60),
    }),
    defineField({
      name: 'copyrightLine',
      title: 'Copyright line',
      type: 'string',
      group: 'legal',
      initialValue: 'All rights reserved.',
      description: 'The current year and site name are added automatically.',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({name: 'showYear', title: 'Show year and copyright', type: 'boolean', group: 'legal', initialValue: true}),
  ],
  initialValue: {
    strapline: [
      {_type: 'footerLine', _key: 'film', text: 'New Work is film.', emphasis: 'New Work'},
      {_type: 'footerLine', _key: 'photography', text: 'New Work is photography.', emphasis: 'New Work'},
      {_type: 'footerLine', _key: 'beautiful', text: 'We make beautiful work.', emphasis: 'beautiful'},
      {_type: 'footerLine', _key: 'create', text: 'Come create with us.', emphasis: 'create'},
    ],
    peopleHeading: 'People',
    exploreHeading: 'Explore',
    connectHeading: 'Connect',
    exploreLinks: [
      {_type: 'footerLink', _key: 'work', label: 'Work', destination: 'work'},
      {_type: 'footerLink', _key: 'about', label: 'About', destination: 'about'},
      {_type: 'footerLink', _key: 'contact', label: 'Contact', destination: 'contact'},
    ],
    copyrightLine: 'All rights reserved.',
    showYear: true,
  },
  preview: {prepare: () => ({title: 'Footer', subtitle: 'Strapline, columns and legal copy'})},
})

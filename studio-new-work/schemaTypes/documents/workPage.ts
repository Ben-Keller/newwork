import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {collectBlockingSafetyFlags, isRecord, wordCount} from '../validation'
import {hiddenAllFieldsGroup} from '../clientGroups'

function uniqueWorkDoorways(value: unknown): true | string {
  if (!Array.isArray(value)) return true
  const doorwayIds = value.flatMap((placement) => {
    if (!isRecord(placement) || !isRecord(placement.work)) return []
    const workId = typeof placement.work._ref === 'string' ? placement.work._ref : undefined
    const photoId = isRecord(placement.doorwayPhoto) && typeof placement.doorwayPhoto._ref === 'string'
      ? placement.doorwayPhoto._ref
      : 'default'
    return workId ? [`${workId}:${photoId}`] : []
  })
  return new Set(doorwayIds).size === doorwayIds.length
    ? true
    : 'The same Work/photo doorway can appear only once.'
}

export const workPage = defineType({
  name: 'workPage',
  title: 'Work page',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'copy', title: 'Page copy', default: true},
    {name: 'gallery', title: 'Work gallery'},
    {name: 'modules', title: 'Homepage reel preview'},
    {name: 'seo', title: 'Search & sharing'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({
      name: 'introName',
      title: 'Opening logo text',
      type: 'string',
      group: 'copy',
      description: 'The short name used by the opening Work-page logo treatment.',
      initialValue: 'New Work',
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: 'manifesto',
      title: 'Work-page statement',
      type: 'string',
      group: 'copy',
      description: 'Aim for one specific line of 8–18 words.',
      validation: (Rule) => [
        Rule.max(160),
        Rule.custom((value) => {
          const count = wordCount(value)
          return count === 0 || (count >= 8 && count <= 18)
            ? true
            : 'The recommended length is 8–18 words.'
        }).warning(),
      ],
    }),
    defineField({
      name: 'gallery',
      title: 'Work gallery',
      type: 'array',
      group: 'gallery',
      description: 'Drag Work placements into order. A Photo Work can appear more than once by choosing a different doorway photo.',
      of: [defineArrayMember({type: 'workPlacement'})],
      validation: (Rule) => Rule.required().min(1).custom(uniqueWorkDoorways),
    }),
    defineField({
      name: 'reel',
      title: 'Homepage reel preview',
      type: 'reelSettings',
      group: 'modules',
      initialValue: {enabled: false, startMuted: true, aspectRatio: '16:9'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'notesEnabled',
      title: 'Show Notes on the website',
      type: 'boolean',
      group: 'modules',
      initialValue: false,
      hidden: true,
      readOnly: true,
      deprecated: {reason: 'Notes are not part of the current client website workflow.'},
    }),
    defineField({name: 'seo', title: 'Work-page SEO', type: 'seoFields', group: 'seo'}),
  ],
  initialValue: {
    introName: 'New Work',
    reel: {enabled: false, startMuted: true, aspectRatio: '16:9'},
    notesEnabled: false,
  },
  validation: (Rule) => Rule.custom((value) => {
    if (!isRecord(value)) return true
    const reel = isRecord(value.reel) && value.reel.enabled === true ? value.reel : undefined
    const blockers = collectBlockingSafetyFlags({reel, seo: value.seo})
    return blockers.length
      ? `Clear Work-page publication flags: ${blockers.join(', ')}.`
      : true
  }),
  preview: {
    prepare: () => ({title: 'Work page', subtitle: 'Opening copy, Work order and reel'}),
  },
})

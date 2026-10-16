import {HomeIcon} from '@sanity/icons/Home'
import {defineArrayMember, defineField, defineType} from 'sanity'
import {collectBlockingSafetyFlags, isRecord, wordCount} from '../validation'
import {hiddenAllFieldsGroup} from '../clientGroups'

function uniqueGalleryAssets(value: unknown): true | string {
  if (!Array.isArray(value)) return true
  const assetIds = value.flatMap((placement) => (
    isRecord(placement) && isRecord(placement.asset) && typeof placement.asset._ref === 'string'
      ? [placement.asset._ref]
      : []
  ))
  return new Set(assetIds).size === assetIds.length
    ? true
    : 'The same Asset can appear in the front gallery only once.'
}

export const workPage = defineType({
  name: 'workPage',
  title: 'Work page',
  type: 'document',
  icon: HomeIcon,
  groups: [
    {name: 'copy', title: 'Page copy', default: true},
    {name: 'gallery', title: 'Front gallery'},
    {name: 'ticker', title: 'Homepage ticker'},
    {name: 'bts', title: 'Behind the scenes'},
    {name: 'modules', title: 'Homepage reel preview'},
    {name: 'seo', title: 'Search & sharing'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({name: 'oliverRevision', title: 'Revision migration', type: 'string', hidden: true, readOnly: true}),
    defineField({
      name: 'introName',
      title: 'Opening logo accessible name',
      type: 'string',
      group: 'copy',
      description: 'The text description for the opening artwork. Change the artwork itself under Brand & navigation.',
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
      title: 'Front gallery',
      type: 'array',
      group: 'gallery',
      description: 'Select 16 Assets for four desktop rows. Drag to change the selection order; the website distributes films across the rows. Assets beyond the first 16 are held in reserve. Removing a placement never deletes its Asset or Project.',
      of: [defineArrayMember({type: 'workPlacement'})],
      validation: (Rule) => [Rule.required().min(1).custom(uniqueGalleryAssets), Rule.length(16).warning('Choose 16 gallery Assets for the four-row layout. Only the first 16 appear.')],
    }),
    defineField({name: 'galleryReserve', title: 'Reserve gallery assets', type: 'array', group: 'gallery', description: 'Saved placements that are not shown on the homepage. To use one, replace an item in Front gallery with the same Asset.', of: [defineArrayMember({type: 'workPlacement'})]}),
    defineField({name: 'tickerWords', title: 'Ticker messages', type: 'array', group: 'ticker', description: 'Messages rotate with the selected city clocks. Long messages page within the single-line Tall board.', of: [defineArrayMember({type: 'string', validation: (Rule) => Rule.required().max(60)})], initialValue: ['Film + photo', 'In production', 'New work'], validation: (Rule) => Rule.min(1).max(12)}),
    defineField({name: 'tickerCities', title: 'City clocks', type: 'array', group: 'ticker', description: 'Actual local times rotate between messages. Leave empty for messages only.', of: [defineArrayMember({type: 'string', options: {list: [{title: 'San Francisco', value: 'sf'}, {title: 'Los Angeles', value: 'la'}, {title: 'New York', value: 'nyc'}]}})], initialValue: ['sf', 'la', 'nyc'], validation: (Rule) => Rule.unique().max(3)}),
    defineField({name: 'btsHeading', title: 'Section heading', type: 'string', group: 'bts', initialValue: 'Behind the scenes', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'btsSubtitle', title: 'Small caption', type: 'string', group: 'bts', initialValue: 'A closer look', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'behindTheScenes', title: 'Mosaic photographs', type: 'array', group: 'bts', description: 'Choose Assets linked to their Projects and drag them into order. Add genuine BTS photos to the Asset library first. While empty, the current portfolio-image mosaic remains as a placeholder.', of: [defineArrayMember({type: 'workPlacement'})], validation: (Rule) => Rule.max(24).custom(uniqueGalleryAssets)}),
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

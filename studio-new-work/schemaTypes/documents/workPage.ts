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
    {name: 'splash', title: 'Opening splash'},
    {name: 'gallery', title: 'Front gallery'},
    {name: 'ticker', title: 'Homepage ticker'},
    {name: 'bts', title: 'Behind the scenes'},
    {name: 'modules', title: 'Homepage reel preview'},
    {name: 'seo', title: 'Search & sharing'},
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({name: 'galleryCount', title: 'Gallery tiles shown', type: 'number', group: 'gallery', initialValue: 16, description: 'Show the top eligible Front gallery entries, up to this number. Default: 16. Additional entries stay hidden. Multiples of four give complete desktop rows.', validation: Rule => Rule.integer().min(1).max(40)}),
    defineField({name: 'showBts', title: 'Show Behind the scenes', type: 'boolean', group: 'bts', initialValue: true, description: 'Turn off to hide the section without deleting its photos. Unset means shown.'}),
    defineField({name: 'btsCount', title: 'BTS photos shown', type: 'number', group: 'bts', initialValue: 12, description: 'Show the top selected photographs, up to this number. Default: 12.', validation: Rule => Rule.integer().min(1).max(24)}),
    defineField({name: 'btsUseFallback', title: 'Use portfolio photos when empty', type: 'boolean', group: 'bts', initialValue: true, description: 'Turn off to hide the section until you select BTS photographs. Unset keeps the existing portfolio fallback.'}),
    defineField({name: 'splash', title: 'Opening splash', type: 'splashSettings', group: 'splash'}),
    defineField({name: 'oliverRevision', title: 'Revision migration', type: 'string', hidden: true, readOnly: true}),
    defineField({
      name: 'introName',
      title: 'Contact page brand label',
      type: 'string',
      group: 'copy',
      description: 'The small brand label above the Contact page heading. Change logo artwork under Brand & navigation.',
      initialValue: 'New Work',
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: 'manifesto',
      hidden: true,
      readOnly: true,
      deprecated: {reason: 'The current website does not display this legacy statement.'},
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
      description: 'The top eligible entries appear, up to Gallery tiles shown (default 16). Drag to change selection order; the website distributes films across the rows. Additional entries stay hidden. Removing a placement never deletes its Asset or Project.',
      of: [defineArrayMember({type: 'workPlacement'})],
      validation: (Rule) => Rule.required().min(1).custom(uniqueGalleryAssets),
    }),
    defineField({name: 'galleryReserve', title: 'Reserve gallery assets', type: 'array', group: 'gallery', description: 'Saved placements that are not shown on the homepage. To use one, replace an item in Front gallery with the same Asset.', of: [defineArrayMember({type: 'workPlacement'})]}),
    defineField({name: 'tickerWords', title: 'Ticker messages', type: 'array', group: 'ticker', description: 'Messages rotate with the selected city clocks. Long messages page within the single-line Tall board.', of: [defineArrayMember({type: 'string', validation: (Rule) => Rule.required().max(60)})], initialValue: ['Film + photo', 'In production', 'New work'], validation: (Rule) => Rule.min(1).max(12)}),
    defineField({name: 'tickerCities', title: 'City clocks', type: 'array', group: 'ticker', description: 'Actual local times rotate between messages. Leave empty for messages only.', of: [defineArrayMember({type: 'string', options: {list: [{title: 'San Francisco', value: 'sf'}, {title: 'Los Angeles', value: 'la'}, {title: 'New York', value: 'nyc'}]}})], initialValue: ['sf', 'la', 'nyc'], validation: (Rule) => Rule.unique().max(3)}),
    defineField({name: 'btsShowCaptions', title: 'Show photo captions', type: 'boolean', group: 'bts', initialValue: true, description: 'Unset keeps captions visible.'}),
    defineField({name: 'btsShowNumbers', title: 'Show photo numbers', type: 'boolean', group: 'bts', initialValue: true, description: 'Numbers appear alongside captions. Unset keeps them visible.'}),
    defineField({name: 'btsArtworkMode', title: 'Pinboard artwork', type: 'string', group: 'bts', initialValue: 'default', options: {list: [{title: 'Original storyboard', value: 'default'}, {title: 'Custom artwork', value: 'custom'}, {title: 'No artwork', value: 'none'}], layout: 'radio'}, description: 'Custom artwork replaces the original storyboard; add as many pieces as needed below.'}),
    defineField({name: 'btsArtworks', title: 'Custom artwork pieces', type: 'array', group: 'bts', of: [defineArrayMember({type: 'btsArtwork'})], hidden: ({document}) => document?.btsArtworkMode !== 'custom', description: 'Add, remove or hide pieces independently. These are decorative, display-only images and do not count toward BTS photos shown.'}),
    defineField({name: 'btsHeading', title: 'Section heading', type: 'string', group: 'bts', description: 'The word Behind is outlined when it begins the heading.', initialValue: 'Behind the scenes', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'btsSubtitle', title: 'Small caption', type: 'string', group: 'bts', description: 'Optional. Leave empty to show only the section heading.', validation: (Rule) => Rule.max(60)}),
    defineField({name: 'behindTheScenes', title: 'Pinboard photographs', type: 'array', group: 'bts', description: 'Drag photographs into order. The top entries appear up to BTS photos shown (default 12); extra entries stay hidden. Photos are display-only on the website. Add photographs to the Asset library first. Use the controls above to hide the section or disable portfolio fallback.', of: [defineArrayMember({type: 'workPlacement'})], validation: Rule => Rule.custom(uniqueGalleryAssets)}),
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
    const reel = isRecord(value.reel) && value.reel.visible !== false && value.reel.enabled === true ? value.reel : undefined
    const blockers = collectBlockingSafetyFlags({reel, splash: value.splash, seo: value.seo, btsArtworks: value.btsArtworkMode === 'custom' && Array.isArray(value.btsArtworks) ? value.btsArtworks.filter(item => !isRecord(item) || item.hidden !== true) : undefined})
    return blockers.length
      ? `Clear Work-page publication flags: ${blockers.join(', ')}.`
      : true
  }),
  preview: {
    prepare: () => ({title: 'Work page', subtitle: 'Opening copy, Work order and reel'}),
  },
})

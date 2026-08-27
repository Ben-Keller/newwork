import {defineField, defineType, type ValidationContext} from 'sanity'
import {
  documentIsVisible,
  hasAssetReference,
  isApprovedHostedMediaUrl,
  isNonEmptyString,
  isRecord,
  isPlayableVideoAssetReference,
} from '../validation'
import {hiddenAllFieldsGroup, hideResolvedReviewField, reviewRequiredGroup} from '../clientGroups'
import {SANITY_API_VERSION} from '../../sanity.constants'

async function wideFeaturePlacementWarning(value: string | undefined, context: ValidationContext): Promise<true | string> {
  const document = context.document as {_id?: string; featuredOnHome?: boolean; homeOrder?: number}
  if (value !== 'wideFeature' || document?.featuredOnHome !== true || typeof document.homeOrder !== 'number') {
    return true
  }
  const documentId = String(document._id ?? '').replace(/^drafts\./u, '')
  const precedingPortraits = await context.getClient({apiVersion: SANITY_API_VERSION}).fetch(
    `count(*[_type == "work" && featuredOnHome == true && homeOrder < $homeOrder && cover.cardRatio != "wideFeature" && !(_id in [$publishedId, $draftId])])`,
    {
      homeOrder: document.homeOrder,
      publishedId: documentId,
      draftId: `drafts.${documentId}`,
    },
  ) as number
  return precedingPortraits >= 8
    ? true
    : 'Place a wide feature only after two complete rows (eight portrait cards).'
}

export const coverMedia = defineType({
  name: 'coverMedia',
  title: 'Cover media',
  type: 'object',
  groups: [
    {name: 'media', title: 'Media', default: true},
    {name: 'crop', title: 'Crop'},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
  ],
  fields: [
    defineField({
      name: 'poster',
      title: 'Poster',
      type: 'editorialImage',
      group: 'media',
      description: 'Required for public home placement. Tune crop/hotspot on this image.',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const document = context.document as {visible?: boolean; featuredOnHome?: boolean}
          return document?.visible === true || document?.featuredOnHome === true
            ? hasAssetReference(value) || 'A public or featured Project requires a cover poster.'
            : true
        }),
    }),
    defineField({
      name: 'alt',
      title: 'Poster alt text',
      type: 'string',
      group: 'media',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {decorative?: boolean}
          if (!documentIsVisible(context) || parent?.decorative === true) return true
          return isNonEmptyString(value) ? true : 'A public cover requires meaningful alt text.'
        }),
    }),
    defineField({
      name: 'decorative',
      title: 'Decorative duplicate',
      type: 'boolean',
      group: 'media',
      initialValue: false,
      description: 'Use only if adjacent Project identity fully duplicates the image meaning.',
    }),
    defineField({
      name: 'previewVideo',
      title: 'Hosted preview video',
      type: 'editorialFile',
      group: 'media',
      description: 'Optional silent 3–8 second derivative.',
      validation: (Rule) => [
        Rule.custom((value) =>
          value === undefined || isPlayableVideoAssetReference(value)
            ? true
            : 'Upload an MP4 or WebM preview file.',
        ),
        Rule.custom((value) => {
          if (!isRecord(value) || typeof value.sourceDurationSeconds !== 'number') return true
          return value.sourceDurationSeconds >= 3 && value.sourceDurationSeconds <= 8
            ? true
            : 'Preview derivatives should be 3–8 seconds.'
        }).warning(),
      ],
    }),
    defineField({
      name: 'previewVideoUrl',
      title: 'Approved preview CDN URL',
      type: 'url',
      group: 'media',
      hidden: true,
      readOnly: true,
      validation: (Rule) =>
        Rule.custom((value) =>
          value === undefined || isApprovedHostedMediaUrl(value)
            ? true
            : 'Use a direct HTTPS video file on the approved Sanity CDN.',
        ),
    }),
    defineField({name: 'previewPosterOverride', title: 'Preview poster override', type: 'editorialImage', group: 'media'}),
    defineField({
      name: 'mediaType',
      title: 'Media type',
      type: 'string',
      group: 'media',
      initialValue: 'still',
      options: {
        list: [
          {title: 'Still', value: 'still'},
          {title: 'Motion', value: 'motion'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'cardRatio',
      title: 'Card ratio',
      type: 'string',
      group: 'crop',
      initialValue: 'portrait',
      options: {
        list: [
          {title: 'Portrait — 4:5', value: 'portrait'},
          {title: 'Wide feature — 3:2', value: 'wideFeature'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => [
        Rule.required(),
        Rule.custom(wideFeaturePlacementWarning).warning(),
      ],
    }),
    defineField({name: 'mobilePoster', title: 'Optional mobile poster', type: 'editorialImage', group: 'crop'}),
    defineField({name: 'focalPoint', title: 'Fixture focal point', type: 'focalPoint', group: 'crop', hidden: true, readOnly: true}),
    defineField({
      name: 'previewIsPlaceholder',
      title: 'Preview is a placeholder',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
      hidden: hideResolvedReviewField,
      description: 'Replace this still-derived interaction test before approving the Project for the website.',
    }),
    defineField({name: 'prototypeOnly', title: 'Prototype only', type: 'boolean', group: 'internal', initialValue: false, hidden: hideResolvedReviewField}),
    defineField({name: 'needsReview', title: 'Needs review', type: 'boolean', group: 'internal', initialValue: false, hidden: hideResolvedReviewField}),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      if (!isRecord(value)) return true
      if (value.previewVideo && value.previewVideoUrl) {
        return 'Choose either an uploaded preview or a remote preview URL, not both.'
      }
      return true
    }),
  preview: {
    select: {media: 'poster', mediaType: 'mediaType', ratio: 'cardRatio', placeholder: 'previewIsPlaceholder'},
    prepare: ({media, mediaType, ratio, placeholder}) => ({
      title: mediaType === 'motion' ? 'Motion cover' : 'Still cover',
      subtitle: `${ratio === 'wideFeature' ? '3:2 feature' : '4:5 portrait'}${placeholder ? ' · placeholder preview' : ''}`,
      media,
    }),
  },
})

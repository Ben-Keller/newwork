import {ImageIcon} from '@sanity/icons/Image'
import {defineField, defineType} from 'sanity'
import {documentIsVisible, isNonEmptyString} from '../validation'
import {libraryMediaField} from '../blocks/blockFields'
import {hiddenAllFieldsGroup, hideResolvedReviewField, reviewRequiredGroup} from '../clientGroups'

export const imageItem = defineType({
  name: 'imageItem',
  title: 'Image',
  type: 'object',
  icon: ImageIcon,
  groups: [
    {name: 'content', title: 'Content', default: true},
    reviewRequiredGroup,
    hiddenAllFieldsGroup,
  ],
  fields: [
    libraryMediaField('image'),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'editorialImage',
      group: 'content',
      hidden: ({parent}) => Boolean(parent?.mediaItem),
      validation: (Rule) => Rule.custom((value, context) =>
        value || (context.parent as {mediaItem?: unknown})?.mediaItem
          ? true
          : 'Choose an asset-library image.'),
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      group: 'content',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {decorative?: boolean; mediaItem?: unknown}
          if (!documentIsVisible(context) || parent?.decorative === true || parent?.mediaItem) return true
          return isNonEmptyString(value) ? true : 'Public images require meaningful alt text.'
        }),
    }),
    defineField({
      name: 'decorative',
      title: 'Decorative duplicate',
      type: 'boolean',
      group: 'content',
      description: 'Use only when nearby text already identifies the same subject.',
      initialValue: false,
      hidden: hideResolvedReviewField,
    }),
    defineField({name: 'caption', title: 'Caption', type: 'string', group: 'content'}),
    defineField({name: 'credit', title: 'Credit', type: 'string', group: 'content'}),
    defineField({
      name: 'altNeedsReview',
      title: 'Alt text needs review',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
      validation: (Rule) =>
        Rule.custom((value) =>
          value === true ? 'Supply reviewed alt text or deliberately mark this image decorative.' : true,
        ).warning(),
    }),
    defineField({name: 'prototypeOnly', title: 'Prototype only', type: 'boolean', group: 'internal', initialValue: false, hidden: hideResolvedReviewField}),
    defineField({name: 'needsReview', title: 'Needs review', type: 'boolean', group: 'internal', initialValue: false, hidden: hideResolvedReviewField}),
    defineField({
      name: 'doNotPublishWithoutExplicitApproval',
      title: 'Do not publish without explicit approval',
      type: 'boolean',
      group: 'internal',
      initialValue: false,
      hidden: hideResolvedReviewField,
    }),
  ],
  preview: {
    select: {media: 'image', title: 'caption', alt: 'alt', needsReview: 'altNeedsReview'},
    prepare: ({media, title, alt, needsReview}) => ({
      media,
      title: title || alt || 'Untitled image',
      subtitle: needsReview ? 'Alt text needs review' : undefined,
    }),
  },
})

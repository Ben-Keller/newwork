import {ALL_FIELDS_GROUP, type FieldGroupDefinition} from 'sanity'

export const REVIEW_FLAGS = [
  'needsReview',
  'prototypeOnly',
  'altNeedsReview',
  'needsApprovedEmbed',
  'needsApprovedMaster',
  'previewIsPlaceholder',
  'doNotPublishWithoutExplicitApproval',
]

export function hasActiveReviewFlag(value: unknown) {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return REVIEW_FLAGS.some((field) => record[field] === true)
}

export const hiddenAllFieldsGroup: FieldGroupDefinition = {
  ...ALL_FIELDS_GROUP,
  hidden: true,
}

export const reviewRequiredGroup: FieldGroupDefinition = {
  name: 'internal',
  title: 'Review required',
  hidden: ({value}) => !hasActiveReviewFlag(value),
}

export const hideResolvedReviewField = ({value}: {value: unknown}) => value !== true

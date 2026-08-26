import {defineArrayMember, defineField} from 'sanity'
import {hideResolvedReviewField, REVIEW_FLAGS} from '../clientGroups'

export const provenanceFields = [
  defineField({
    name: 'manifestAssetId',
    title: 'Manifest asset ID',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'sourcePath',
    title: 'Imported local path',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'manifestPerson',
    title: 'Manifest person',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'manifestProject',
    title: 'Manifest project',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'assetLayer',
    title: 'Asset layer',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'assetKind',
    title: 'Manifest kind',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'formatOrCodec',
    title: 'Format / codec',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'sourceUrl',
    title: 'Original media URL',
    type: 'url',
    description: 'Internal provenance only. This URL must never be rendered publicly.',
    validation: (Rule) => Rule.uri({scheme: ['https']}),
  }),
  defineField({
    name: 'sourcePage',
    title: 'Original page',
    type: 'url',
    description: 'Internal provenance only.',
    validation: (Rule) => Rule.uri({scheme: ['https']}),
  }),
  defineField({
    name: 'derivedFrom',
    title: 'Derived from',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'sourceReportedDimensionsOrDuration',
    title: 'Source-reported dimensions / duration',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'derivation',
    title: 'Derivation',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'rightsStatus',
    title: 'Rights status',
    type: 'string',
    validation: (Rule) =>
      Rule.custom((value) =>
        typeof value === 'string' && value.includes('replace-with-approved-master')
          ? 'This is a portfolio-resolution source. Replace it with a confirmed master before publication.'
          : true,
      ).warning(),
  }),
  defineField({
    name: 'assetRightsApprovalEvidence',
    title: 'Asset rights approval evidence',
    type: 'text',
    rows: 3,
    description: 'Internal record of the approver, source/ticket, allowed use, and any restrictions. Never rendered publicly.',
  }),
  defineField({
    name: 'assetRightsApprovedAt',
    title: 'Asset rights approved at',
    type: 'datetime',
  }),
  defineField({
    name: 'assetRightsExpiresAt',
    title: 'Asset rights expire at',
    type: 'datetime',
    description: 'Leave empty only when the approval is genuinely open-ended.',
  }),
  defineField({
    name: 'assetRightsTerritories',
    title: 'Asset rights territories / channels',
    type: 'array',
    of: [defineArrayMember({type: 'string'})],
    validation: (Rule) => Rule.unique(),
  }),
  defineField({
    name: 'publishStatus',
    title: 'Manifest publish status',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'manifestNotes',
    title: 'Manifest notes',
    type: 'text',
    rows: 3,
    readOnly: true,
  }),
  defineField({
    name: 'sha256',
    title: 'SHA-256',
    type: 'string',
    readOnly: true,
  }),
  defineField({
    name: 'intrinsicWidth',
    title: 'Imported width',
    type: 'number',
    readOnly: true,
    validation: (Rule) => Rule.positive().integer(),
  }),
  defineField({
    name: 'intrinsicHeight',
    title: 'Imported height',
    type: 'number',
    readOnly: true,
    validation: (Rule) => Rule.positive().integer(),
  }),
  defineField({
    name: 'sourceDurationSeconds',
    title: 'Source duration (seconds)',
    type: 'number',
    description: 'Duration reported for the original source, not necessarily this derivative.',
    validation: (Rule) => Rule.positive(),
  }),
  defineField({
    name: 'needsReview',
    title: 'Asset needs review',
    type: 'boolean',
    initialValue: true,
    description: 'Clear only after this imported asset has been reviewed.',
  }),
  defineField({
    name: 'prototypeOnly',
    title: 'Prototype only',
    type: 'boolean',
    initialValue: false,
    description: 'Prototype-only media is blocked from public production queries.',
  }),
  defineField({
    name: 'altNeedsReview',
    title: 'Alt text needs review',
    type: 'boolean',
    initialValue: false,
    description: 'A human must supply meaningful alt text or mark the media decorative.',
  }),
  defineField({
    name: 'needsApprovedEmbed',
    title: 'Needs approved embed',
    type: 'boolean',
    initialValue: false,
    description: 'This remote player is not yet approved for public use.',
  }),
  defineField({
    name: 'needsApprovedMaster',
    title: 'Needs approved master',
    type: 'boolean',
    initialValue: false,
    description: 'Replace this portfolio rendition with an approved original master.',
  }),
  defineField({
    name: 'previewIsPlaceholder',
    title: 'Preview is a placeholder',
    type: 'boolean',
    initialValue: false,
    description: 'This still-derived preview is not a finished film.',
  }),
  defineField({
    name: 'doNotPublishWithoutExplicitApproval',
    title: 'Do not publish without explicit approval',
    type: 'boolean',
    initialValue: false,
    description: 'Publication is blocked until documented approval is recorded and this flag is cleared.',
  }),
]

export const clientProvenanceFields = provenanceFields.map((field) => {
  const isReviewFlag = REVIEW_FLAGS.includes(field.name)
  return {
    ...field,
    hidden: isReviewFlag ? hideResolvedReviewField : true,
    readOnly: !isReviewFlag,
  }
})

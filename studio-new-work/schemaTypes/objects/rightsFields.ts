import {defineArrayMember, defineField} from 'sanity'

const LEGACY_RIGHTS_REASON =
  'Rights are managed by the content owner outside Sanity. This field is retained only to preserve existing data.'

export function rightsApprovalFieldsFor(group = 'internal') {
  return [
  defineField({
    name: 'rightsApprovalStatus',
    title: 'Rights approval (legacy)',
    type: 'string',
    group,
    initialValue: undefined,
    hidden: true,
    readOnly: true,
    deprecated: {reason: LEGACY_RIGHTS_REASON},
    options: {list: [
      {title: 'Pending review', value: 'pending'},
      {title: 'Approved for portfolio publication', value: 'approved'},
      {title: 'Expired / withdrawn', value: 'expired'},
    ], layout: 'radio'},
  }),
  defineField({
    name: 'rightsApprovalEvidence',
    title: 'Rights approval evidence (legacy)',
    type: 'text',
    rows: 3,
    group,
    hidden: true,
    readOnly: true,
    deprecated: {reason: LEGACY_RIGHTS_REASON},
  }),
  defineField({
    name: 'rightsApprovedAt',
    title: 'Rights approved at (legacy)',
    type: 'datetime',
    group,
    hidden: true,
    readOnly: true,
    deprecated: {reason: LEGACY_RIGHTS_REASON},
  }),
  defineField({
    name: 'rightsExpiresAt',
    title: 'Rights expire at (legacy)',
    type: 'datetime',
    group,
    hidden: true,
    readOnly: true,
    deprecated: {reason: LEGACY_RIGHTS_REASON},
  }),
  defineField({
    name: 'rightsTerritories',
    title: 'Approved territories (legacy)',
    type: 'array',
    group,
    hidden: true,
    readOnly: true,
    deprecated: {reason: LEGACY_RIGHTS_REASON},
    of: [defineArrayMember({type: 'string'})],
  }),
  ]
}

export const rightsApprovalFields = rightsApprovalFieldsFor()

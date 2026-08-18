import {defineArrayMember, defineField} from 'sanity'

export const rightsApprovalFields = [
  defineField({
    name: 'rightsApprovalStatus',
    title: 'Rights approval',
    type: 'string',
    group: 'internal',
    initialValue: 'pending',
    options: {list: [
      {title: 'Pending review', value: 'pending'},
      {title: 'Approved for portfolio publication', value: 'approved'},
      {title: 'Expired / withdrawn', value: 'expired'},
    ], layout: 'radio'},
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'rightsApprovalEvidence',
    title: 'Rights approval evidence',
    type: 'text',
    rows: 3,
    group: 'internal',
    description: 'Record the approver, source, ticket/email location, and permitted portfolio use. Do not paste secrets.',
  }),
  defineField({
    name: 'rightsApprovedAt',
    title: 'Rights approved at',
    type: 'datetime',
    group: 'internal',
  }),
  defineField({
    name: 'rightsExpiresAt',
    title: 'Rights expire at',
    type: 'datetime',
    group: 'internal',
    description: 'Leave empty only when approval is genuinely open-ended.',
  }),
  defineField({
    name: 'rightsTerritories',
    title: 'Approved territories',
    type: 'array',
    group: 'internal',
    of: [defineArrayMember({type: 'string'})],
    validation: (Rule) => Rule.unique(),
  }),
]

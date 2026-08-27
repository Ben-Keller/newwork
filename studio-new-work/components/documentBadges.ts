import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {ClockIcon} from '@sanity/icons/Clock'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'
import type {DocumentBadgeComponent} from 'sanity'

type BadgeDocument = {
  _type?: string
  editorialStatus?: string
  doNotPublishWithoutExplicitApproval?: boolean
}

export const workflowBadge: DocumentBadgeComponent = ({draft, published}) => {
  const document = (draft || published) as BadgeDocument | null
  if (document?._type !== 'work') return null
  if (document.doNotPublishWithoutExplicitApproval === true) {
    return {label: 'Approval blocked', title: 'Explicit publication approval is still required', color: 'danger', icon: WarningOutlineIcon}
  }
  switch (document.editorialStatus) {
    case 'approved':
      return {label: 'Approved for website', color: 'success', icon: CheckmarkCircleIcon}
    default:
      return {label: 'Draft', color: 'primary', icon: ClockIcon}
  }
}

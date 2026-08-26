import {CheckmarkCircleIcon} from '@sanity/icons/CheckmarkCircle'
import {ClockIcon} from '@sanity/icons/Clock'
import {PublishIcon} from '@sanity/icons/Publish'
import {WarningOutlineIcon} from '@sanity/icons/WarningOutline'
import type {DocumentBadgeComponent} from 'sanity'

type BadgeDocument = {
  _type?: string
  editorialStatus?: string
  rightsApprovalStatus?: string
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
    case 'ready':
      return {label: 'Ready to publish', color: 'primary', icon: PublishIcon}
    case 'review':
      return {label: 'Needs review', color: 'warning', icon: WarningOutlineIcon}
    default:
      return {label: 'Working draft', color: 'primary', icon: ClockIcon}
  }
}

export const rightsBadge: DocumentBadgeComponent = ({draft, published}) => {
  const document = (draft || published) as BadgeDocument | null
  if (!document || !['work', 'mediaItem'].includes(document._type || '')) return null
  if (document.rightsApprovalStatus === 'approved') {
    return {label: 'Rights approved', color: 'success', icon: CheckmarkCircleIcon}
  }
  if (document.rightsApprovalStatus === 'expired') {
    return {label: 'Rights expired', color: 'danger', icon: WarningOutlineIcon}
  }
  return {label: 'Rights need review', color: 'warning', icon: WarningOutlineIcon}
}

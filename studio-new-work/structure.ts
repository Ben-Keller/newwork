import {CogIcon} from '@sanity/icons/Cog'
import {DashboardIcon} from '@sanity/icons/Dashboard'
import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {HomeIcon} from '@sanity/icons/Home'
import {ImagesIcon} from '@sanity/icons/Images'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {UsersIcon} from '@sanity/icons/Users'
import type {ComponentType} from 'react'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {ClientDashboard} from './components/ClientDashboard'

const singleton = (
  S: StructureBuilder,
  typeName: string,
  title: string,
  icon: ComponentType,
) =>
  S.listItem()
    .id(typeName)
    .title(title)
    .icon(icon)
    .child(S.document().schemaType(typeName).documentId(typeName).title(title))

export const structure: StructureResolver = (S) =>
  S.list()
    .title('New Work website')
    .items([
      S.listItem()
        .id('start-here')
        .title('Start here')
        .icon(DashboardIcon)
        .child(S.component(ClientDashboard).id('client-dashboard').title('Start here')),
      S.divider(),
      singleton(S, 'workPage', 'Work page', HomeIcon),
      S.listItem()
        .id('projects')
        .title('Projects')
        .icon(ProjectsIcon)
        .child(
          S.list()
            .title('Projects')
            .items([
              S.listItem()
                .id('projects-all')
                .title('All projects')
                .child(
                  S.documentList()
                    .id('projects-all-list')
                    .title('All projects')
                    .schemaType('project')
                    .filter('_type == "project"')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
              S.listItem()
                .id('projects-drafts')
                .title('Working drafts')
                .child(
                  S.documentList()
                    .id('projects-drafts-list')
                    .title('Working drafts')
                    .schemaType('project')
                    .filter('_type == "project" && editorialStatus == "draft"')
                    .defaultOrdering([{field: '_updatedAt', direction: 'desc'}]),
                ),
              S.listItem()
                .id('projects-ready')
                .title('Ready to publish')
                .child(
                  S.documentList()
                    .id('projects-ready-list')
                    .title('Ready to publish')
                    .schemaType('project')
                    .filter('_type == "project" && editorialStatus == "ready"')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
              S.listItem()
                .id('projects-needs-attention')
                .title('Needs client review')
                .child(
                  S.documentList()
                    .id('projects-needs-attention-list')
                    .title('Needs client review')
                    .schemaType('project')
                    .filter('_type == "project" && (editorialStatus == "review" || doNotPublishWithoutExplicitApproval == true || rightsApprovalStatus != "approved")')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
              S.listItem()
                .id('projects-live')
                .title('Approved for website')
                .child(
                  S.documentList()
                    .id('projects-live-list')
                    .title('Approved for website')
                    .schemaType('project')
                    .filter('_type == "project" && editorialStatus == "approved"')
                    .defaultOrdering([{field: 'title', direction: 'asc'}]),
                ),
            ]),
        ),
      S.listItem()
        .id('assets')
        .title('Asset library')
        .icon(ImagesIcon)
        .child(
          S.list()
            .title('Asset library')
            .items([
              S.documentTypeListItem('mediaItem').title('All assets'),
              S.listItem()
                .id('assets-images')
                .title('Images')
                .child(S.documentList().id('assets-images-list').title('Images').schemaType('mediaItem').filter('_type == "mediaItem" && kind == "image"').defaultOrdering([{field: 'title', direction: 'asc'}])),
              S.listItem()
                .id('assets-video')
                .title('Video & motion')
                .child(S.documentList().id('assets-video-list').title('Video & motion').schemaType('mediaItem').filter('_type == "mediaItem" && kind == "video"').defaultOrdering([{field: 'title', direction: 'asc'}])),
              S.listItem()
                .id('assets-files')
                .title('Brand & files')
                .child(S.documentList().id('assets-files-list').title('Brand & files').schemaType('mediaItem').filter('_type == "mediaItem" && kind == "file"').defaultOrdering([{field: 'title', direction: 'asc'}])),
              S.listItem()
                .id('assets-accessibility')
                .title('Needs descriptions')
                .child(S.documentList().id('assets-accessibility-list').title('Needs descriptions').schemaType('mediaItem').filter('_type == "mediaItem" && kind in ["image", "video"] && decorative != true && !defined(alt)').defaultOrdering([{field: 'title', direction: 'asc'}])),
              S.listItem()
                .id('assets-rights')
                .title('Rights & approval')
                .child(S.documentList().id('assets-rights-list').title('Rights & approval').schemaType('mediaItem').filter('_type == "mediaItem" && (rightsApprovalStatus != "approved" || (defined(rightsExpiresAt) && rightsExpiresAt <= now()))').defaultOrdering([{field: 'title', direction: 'asc'}])),
            ]),
        ),
      S.divider(),
      singleton(S, 'aboutPage', 'About page', UsersIcon),
      singleton(S, 'contactPage', 'Contact page', EnvelopeIcon),
      singleton(S, 'footerSettings', 'Footer', CogIcon),
      singleton(S, 'siteSettings', 'Brand & navigation', CogIcon),
    ])

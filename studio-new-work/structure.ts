import {CogIcon} from '@sanity/icons/Cog'
import {DashboardIcon} from '@sanity/icons/Dashboard'
import {EnvelopeIcon} from '@sanity/icons/Envelope'
import {HomeIcon} from '@sanity/icons/Home'
import {ImagesIcon} from '@sanity/icons/Images'
import {ProjectsIcon} from '@sanity/icons/Projects'
import {PlayIcon} from '@sanity/icons/Play'
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
      singleton(S, 'aboutPage', 'About page', PlayIcon),
      S.listItem()
        .id('work')
        .title('Projects')
        .icon(ProjectsIcon)
        .child(
          S.list()
            .title('Projects')
            .items([
              S.listItem()
                .id('work-drafts')
                .title('Drafts')
                .child(
                  S.documentList()
                    .id('work-drafts-list')
                    .title('Drafts')
                    .schemaType('work')
                    .filter('_type == "work" && editorialStatus == "draft"')
                    .defaultOrdering([{field: '_updatedAt', direction: 'desc'}]),
                ),
              S.listItem()
                .id('work-live')
                .title('Approved')
                .child(
                  S.documentList()
                    .id('work-live-list')
                    .title('Approved')
                    .schemaType('work')
                    .filter('_type == "work" && editorialStatus == "approved"')
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
                .id('assets-by-project')
                .title('By project')
                .child(
                  S.documentTypeList('work')
                    .id('asset-projects-list')
                    .title('Projects')
                    .filter('_type == "work"')
                    .defaultOrdering([{field: 'title', direction: 'asc'}])
                    .child((workId) =>
                      S.documentList()
                        .id(`assets-for-${workId}`)
                        .title('Project assets')
                        .schemaType('mediaItem')
                        .filter('_type == "mediaItem" && project._ref == $workId')
                        .params({workId})
                        .defaultOrdering([
                          {field: 'projectOrder', direction: 'asc'},
                          {field: 'title', direction: 'asc'},
                        ]),
                    ),
                ),
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
            ]),
        ),
      S.divider(),
      singleton(S, 'contactPage', 'Contact page', EnvelopeIcon),
      singleton(S, 'footerSettings', 'Footer', CogIcon),
      singleton(S, 'siteSettings', 'Brand & navigation', CogIcon),
    ])

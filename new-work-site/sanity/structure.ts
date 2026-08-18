import type {StructureResolver} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('New Work')
    .items([
      S.listItem()
        .id('siteSettings')
        .title('Site Settings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings').title('Site Settings')),
      S.divider(),
      S.listItem()
        .id('projects')
        .title('Projects')
        .child(
          S.list()
            .title('Projects')
            .items([
              S.listItem()
                .id('projects-home-order')
                .title('Home order')
                .child(
                  S.documentList()
                    .id('projects-home-order-list')
                    .title('Home order')
                    .schemaType('project')
                    .filter('_type == "project"')
                    .defaultOrdering([{field: 'homeOrder', direction: 'asc'}]),
                ),
              S.listItem()
                .id('projects-needs-review')
                .title('Needs review')
                .child(
                  S.documentList()
                    .id('projects-needs-review-list')
                    .title('Needs review')
                    .schemaType('project')
                    .filter('_type == "project" && needsReview == true')
                    .defaultOrdering([{field: 'homeOrder', direction: 'asc'}]),
                ),
              S.listItem()
                .id('projects-visible')
                .title('Marked visible')
                .child(
                  S.documentList()
                    .id('projects-visible-list')
                    .title('Marked visible')
                    .schemaType('project')
                    .filter('_type == "project" && visible == true')
                    .defaultOrdering([{field: 'homeOrder', direction: 'asc'}]),
                ),
              S.listItem()
                .id('projects-approval-blocked')
                .title('Approval blocked')
                .child(
                  S.documentList()
                    .id('projects-approval-blocked-list')
                    .title('Approval blocked')
                    .schemaType('project')
                    .filter('_type == "project" && doNotPublishWithoutExplicitApproval == true'),
                ),
              S.listItem()
                .id('projects-rights-pending')
                .title('Rights pending or expired')
                .child(
                  S.documentList()
                    .id('projects-rights-pending-list')
                    .title('Rights pending or expired')
                    .schemaType('project')
                    .filter('_type == "project" && (rightsApprovalStatus != "approved" || !defined(rightsApprovalEvidence) || (defined(rightsExpiresAt) && rightsExpiresAt <= now()))'),
                ),
              S.listItem()
                .id('projects-missing-editorial')
                .title('Missing copy or credits')
                .child(
                  S.documentList()
                    .id('projects-missing-editorial-list')
                    .title('Missing copy or credits')
                    .schemaType('project')
                    .filter('_type == "project" && (!defined(shortDescription) || count(credits) == 0 || count(types) == 0)'),
                ),
              S.listItem()
                .id('projects-missing-seo')
                .title('Missing SEO overrides')
                .child(
                  S.documentList()
                    .id('projects-missing-seo-list')
                    .title('Missing SEO overrides')
                    .schemaType('project')
                    .filter('_type == "project" && (!defined(seo.metaTitle) || !defined(seo.metaDescription) || !defined(seo.shareImage.asset))'),
                ),
              S.listItem()
                .id('projects-home-ready')
                .title('Home launch candidates')
                .child(
                  S.documentList()
                    .id('projects-home-ready-list')
                    .title('Home launch candidates')
                    .schemaType('project')
                    .filter('_type == "project" && featuredOnHome == true && visible == true && needsReview != true && rightsApprovalStatus == "approved"')
                    .defaultOrdering([{field: 'homeOrder', direction: 'asc'}]),
                ),
              S.listItem()
                .id('projects-all')
                .title('All projects')
                .child(S.documentTypeList('project').id('projects-all-list').title('All projects')),
            ]),
        ),
      S.listItem()
        .id('notes')
        .title('Notes')
        .child(
          S.list()
            .title('Notes')
            .items([
              S.listItem()
                .id('notes-needs-review')
                .title('Needs review')
                .child(S.documentList().id('notes-needs-review-list').title('Needs review').schemaType('note').filter('_type == "note" && needsReview == true')),
              S.listItem()
                .id('notes-rights-pending')
                .title('Rights pending')
                .child(S.documentList().id('notes-rights-pending-list').title('Rights pending').schemaType('note').filter('_type == "note" && rightsApprovalStatus != "approved"')),
              S.listItem()
                .id('notes-all')
                .title('All notes')
                .child(S.documentTypeList('note').id('notes-all-list').title('All notes').defaultOrdering([{field: 'date', direction: 'desc'}])),
            ]),
        ),
    ])

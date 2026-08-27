import {describe, expect, it} from 'vitest';
import {auditPublishedSanity} from '../../src/lib/content/sanity-audit';

type AuditFixture = {
  singletonCounts: Record<string, number>;
  aboutPage: Record<string, string>;
  workPage: {notesEnabled: boolean; gallery: Array<Record<string, unknown>>};
  workDocuments: Array<Record<string, unknown>>;
  publicWorkIds: string[];
  legacyProjectCount: number;
  notes: Array<Record<string, unknown>>;
  publicNoteIds: string[];
};

function validSnapshot(): AuditFixture {
  const aboutPage = Object.fromEntries([
    'openingLabel',
    'openingHeadline',
    'openingNote',
    'windingHeadline',
    'orbitHeadline',
    'indexHeadline',
    'chaptersHeadline',
    'apertureHeadline',
    'fallbackLabel',
    'fallbackHeadline',
    'fallbackDescription',
    'closingLabel',
    'closingHeadline',
    'ctaLabel',
    'ctaDestination',
  ].map((field) => [field, `${field} value`]));

  return {
    singletonCounts: {
      siteSettings: 1,
      workPage: 1,
      aboutPage: 1,
      contactPage: 1,
      footerSettings: 1,
    },
    aboutPage,
    workPage: {
      notesEnabled: false,
      gallery: [{
        _key: 'arc',
        assetId: 'asset.arc',
        assetType: 'mediaItem',
        assetKind: 'image',
        workId: 'work.arc',
        workType: 'work',
      }],
    },
    workDocuments: [{
      _id: 'work.arc',
      title: 'Arc',
      slug: 'arc',
      editorialStatus: 'approved',
      assets: [{
        _id: 'asset.arc',
        title: 'Arc cover',
        slug: 'arc-cover',
        kind: 'image',
        rightsApprovalStatus: 'approved',
        hasRightsEvidence: true,
        hasMedia: true,
        hasAccessibilityText: true,
      }],
    }],
    publicWorkIds: ['work.arc'],
    legacyProjectCount: 0,
    notes: [],
    publicNoteIds: [],
  };
}

describe('published Sanity release audit', () => {
  it('accepts a current, internally consistent content graph', () => {
    expect(auditPublishedSanity(validSnapshot())).toEqual({
      errors: [],
      warnings: [],
      summary: {
        galleryPlacements: 1,
        legacyProjects: 0,
        publicNotes: 0,
        publicWorks: 1,
        works: 1,
      },
    });
  });

  it('reports schema drift, legacy references, and silently filtered approved work', () => {
    const snapshot = validSnapshot();
    snapshot.aboutPage.openingHeadline = '';
    snapshot.workDocuments.push({
      _id: 'work.hidden',
      title: 'Hidden approved work',
      slug: 'hidden',
      editorialStatus: 'approved',
    });
    snapshot.workPage.gallery = [{
      _key: 'legacy',
      workId: undefined,
      workType: undefined,
      legacyProjectId: 'project.arc',
    }];
    snapshot.legacyProjectCount = 16;

    const result = auditPublishedSanity(snapshot, new Date('2026-08-27T00:00:00Z'));
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('openingHeadline'),
      expect.stringContaining('Hidden approved work'),
      expect.stringContaining('must reference a flat Asset document'),
      expect.stringContaining('must link to a current Project'),
    ]));
    expect(result.warnings).toContain('16 legacy Project rollback documents remain in the dataset.');
  });

  it('does not treat future approved Work as a current release failure', () => {
    const snapshot = validSnapshot();
    snapshot.workDocuments.push({
      _id: 'work.future',
      title: 'Future work',
      slug: 'future',
      editorialStatus: 'approved',
      publishAt: '2026-09-01T00:00:00Z',
    });

    expect(auditPublishedSanity(snapshot, new Date('2026-08-27T00:00:00Z')).errors).toEqual([]);
  });
});

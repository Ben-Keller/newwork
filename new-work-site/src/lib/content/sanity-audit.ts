import {isNonEmptyString, isRecord, type UnknownRecord} from '../../../shared/content-policy';

const SINGLETON_IDS = [
  'siteSettings',
  'workPage',
  'aboutPage',
  'contactPage',
  'footerSettings',
] as const;

const ABOUT_TEXT_FIELDS = [
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
] as const;

export interface SanityReleaseAuditResult {
  errors: string[];
  warnings: string[];
  summary: {
    galleryPlacements: number;
    legacyProjects: number;
    publicNotes: number;
    publicWorks: number;
    works: number;
  };
}

function records(value: unknown): UnknownRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(isNonEmptyString) : [];
}

function isDue(value: unknown, now: Date): boolean {
  if (!isNonEmptyString(value)) return true;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

function label(document: UnknownRecord): string {
  return isNonEmptyString(document.title)
    ? `${document.title} (${String(document._id || 'unknown id')})`
    : String(document._id || 'unknown document');
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

export function auditPublishedSanity(
  input: unknown,
  now = new Date(),
): SanityReleaseAuditResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(input)) {
    return {
      errors: ['The Sanity release-audit query did not return an object.'],
      warnings,
      summary: {galleryPlacements: 0, legacyProjects: 0, publicNotes: 0, publicWorks: 0, works: 0},
    };
  }

  const singletonCounts = isRecord(input.singletonCounts) ? input.singletonCounts : {};
  for (const singleton of SINGLETON_IDS) {
    const count = Number(singletonCounts[singleton]);
    if (count !== 1) errors.push(`Expected one published ${singleton} singleton; found ${count || 0}.`);
  }

  const aboutPage = isRecord(input.aboutPage) ? input.aboutPage : {};
  const missingAboutFields = ABOUT_TEXT_FIELDS.filter((field) => !isNonEmptyString(aboutPage[field]));
  if (missingAboutFields.length) {
    errors.push(`About page is missing required editable fields: ${missingAboutFields.join(', ')}.`);
  }

  const works = records(input.workDocuments);
  const publicWorkIds = new Set(strings(input.publicWorkIds));
  if (!works.length) errors.push('No published documents use the current work schema type.');
  if (!publicWorkIds.size) errors.push('The current work schema has no production-eligible documents.');

  const duplicateWorkSlugs = duplicateValues(
    works.flatMap((work) => isNonEmptyString(work.slug) ? [work.slug] : []),
  );
  if (duplicateWorkSlugs.length) {
    errors.push(`Current Work slugs must be unique: ${duplicateWorkSlugs.join(', ')}.`);
  }

  for (const work of works) {
    if (work.editorialStatus === 'approved' && isDue(work.publishAt, now) && !publicWorkIds.has(String(work._id))) {
      errors.push(`${label(work)} is approved but excluded by the production publication filter.`);
    }
    const assets = records(work.assets);
    if (work.editorialStatus === 'approved' && isDue(work.publishAt, now) && assets.length === 0) {
      errors.push(`${label(work)} is approved but has no flat Assets linked to its Project.`);
    }
    const duplicateAssetSlugs = duplicateValues(
      assets.flatMap((asset) => isNonEmptyString(asset.slug) ? [asset.slug] : []),
    );
    if (duplicateAssetSlugs.length) {
      errors.push(`${label(work)} has duplicate Asset URL names: ${duplicateAssetSlugs.join(', ')}.`);
    }
    for (const asset of assets) {
      const assetLabel = label(asset);
      if (
        !isNonEmptyString(asset.slug)
        || asset.hasMedia !== true
        || asset.hasRightsEvidence !== true
        || asset.hasAccessibilityText !== true
        || asset.rightsApprovalStatus !== 'approved'
        || !isDue(asset.rightsExpiresAt, now)
      ) {
        errors.push(`${assetLabel} is linked to ${label(work)} but is not production-ready.`);
      }
    }
  }

  const workPage = isRecord(input.workPage) ? input.workPage : {};
  const gallery = records(workPage.gallery);
  if (!gallery.length) errors.push('The Work-page gallery has no published placements.');
  const galleryAssetIds: string[] = [];
  for (const [index, placement] of gallery.entries()) {
    const placementLabel = isNonEmptyString(placement._key) ? placement._key : `position ${index + 1}`;
    if (!isNonEmptyString(placement.assetId) || placement.assetType !== 'mediaItem') {
      errors.push(`Gallery placement ${placementLabel} must reference a flat Asset document.`);
    } else if (!['image', 'video'].includes(String(placement.assetKind))) {
      errors.push(`Gallery placement ${placementLabel} must use a visual image or video Asset.`);
    } else {
      galleryAssetIds.push(placement.assetId);
    }
    if (!isNonEmptyString(placement.workId) || placement.workType !== 'work') {
      errors.push(`Gallery Asset ${placementLabel} must link to a current Project.`);
    } else {
      if (!publicWorkIds.has(placement.workId)) {
        warnings.push(`Gallery Asset ${placementLabel} links to a Project that is not currently public.`);
      }
    }
  }
  const duplicatePlacements = duplicateValues(galleryAssetIds);
  if (duplicatePlacements.length) {
    errors.push(`The Work-page gallery repeats Assets: ${duplicatePlacements.join(', ')}.`);
  }

  const notes = records(input.notes);
  const publicNoteIds = new Set(strings(input.publicNoteIds));
  if (workPage.notesEnabled === true) {
    for (const note of notes) {
      if (
        note.visible === true
        && isDue(note.date, now)
        && isDue(note.publishAt, now)
        && !publicNoteIds.has(String(note._id))
      ) {
        errors.push(`${label(note)} is visible but excluded by the production Notes filter.`);
      }
    }
  }

  const legacyProjects = Number(input.legacyProjectCount) || 0;
  if (legacyProjects > 0) {
    warnings.push(
      `${legacyProjects} legacy Project rollback document${legacyProjects === 1 ? '' : 's'} remain in the dataset.`,
    );
  }

  return {
    errors,
    warnings,
    summary: {
      galleryPlacements: gallery.length,
      legacyProjects,
      publicNotes: publicNoteIds.size,
      publicWorks: publicWorkIds.size,
      works: works.length,
    },
  };
}

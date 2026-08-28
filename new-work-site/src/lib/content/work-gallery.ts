import {isNonEmptyString, isRecord, type UnknownRecord} from '../../../shared/content-policy';
import {excludedWorkGalleryItemIds} from '../../content/local/gallery-curation';
import type {
  ProjectView,
  WorkGalleryEntryView,
  WorkGalleryPlacementView,
} from '../types';

export function sortProjects<T extends {homeOrder: number; title: string}>(projects: T[]): T[] {
  return [...projects].sort((left, right) => (
    left.homeOrder - right.homeOrder || left.title.localeCompare(right.title)
  ));
}

export function applyWorkGallery(
  projects: ProjectView[],
  placements: WorkGalleryPlacementView[] | undefined,
): ProjectView[] {
  if (!placements) return sortProjects(projects);
  const placementByProject = new Map(
    placements.map((placement, index) => [placement.workId, {placement, index}]),
  );
  return sortProjects(projects.map((project) => {
    const curated = placementByProject.get(project.id.replace(/^drafts\./u, ''))
      || placementByProject.get(project.id);
    return {
      ...project,
      featuredOnHome: Boolean(curated),
      homeOrder: curated ? curated.index + 1 : Number.MAX_SAFE_INTEGER,
      homeCardSize: curated?.placement.cardSize || project.homeCardSize,
      homeTreatment: curated?.placement.treatment || project.homeTreatment,
      homeColumn: curated ? undefined : project.homeColumn,
      homeOffset: curated ? 0 : project.homeOffset,
    };
  }));
}

export function preferUnifiedWorkDocuments(records: UnknownRecord[]): UnknownRecord[] {
  const bySlug = new Map<string, UnknownRecord>();
  records.forEach((record) => {
    const slug = stringValue(record.slug)
      || stringValue(isRecord(record.slug) ? record.slug.current : undefined)
      || stringValue(record._id);
    if (!slug) return;
    const existing = bySlug.get(slug);
    if (!existing || (record._type === 'work' && existing._type !== 'work')) bySlug.set(slug, record);
  });
  return [...bySlug.values()];
}

export function workGalleryEntryId(work: ProjectView, assetOrPhotoId?: string): string {
  return assetOrPhotoId ? `${work.slug}--${assetOrPhotoId}` : work.slug;
}

export function isExcludedWorkGalleryItem(
  workSlug?: string,
  assetOrPhotoId?: string,
): boolean {
  if (workSlug && excludedWorkGalleryItemIds.has(workSlug)) return true;
  if (assetOrPhotoId && excludedWorkGalleryItemIds.has(assetOrPhotoId)) return true;
  return Boolean(
    workSlug
    && assetOrPhotoId
    && excludedWorkGalleryItemIds.has(`${workSlug}--${assetOrPhotoId}`),
  );
}

export function isExcludedWorkGalleryEntry(entry: WorkGalleryEntryView): boolean {
  const doorwayId = entry.asset?.slug || entry.photo?.id;
  return isExcludedWorkGalleryItem(entry.work.slug, doorwayId);
}

export function filterWorkGalleryEntries(entries: WorkGalleryEntryView[]): WorkGalleryEntryView[] {
  return entries.filter((entry) => !isExcludedWorkGalleryEntry(entry));
}

export function buildWorkGallery(
  projects: ProjectView[],
  placements?: WorkGalleryPlacementView[],
): WorkGalleryEntryView[] {
  const byId = new Map<string, ProjectView>();
  projects.forEach((project) => {
    byId.set(project.id, project);
    byId.set(project.id.replace(/^drafts\./u, ''), project);
  });

  const buildEntry = (
    work: ProjectView,
    assetId?: string,
    cardSize = work.homeCardSize,
    treatment = work.homeTreatment,
  ): WorkGalleryEntryView => {
    const asset = assetId ? work.assets.find((candidate) => candidate.id === assetId) : undefined;
    const photo = !asset && assetId
      ? work.photos.find((candidate) => candidate.id === assetId)
      : undefined;
    const selectedPhoto = photo || (work.template === 'photo'
      ? work.photos.find((candidate) => candidate.id === work.defaultPhotoId) || work.photos[0]
      : undefined);
    const doorwayId = asset?.slug || photo?.id;
    return {
      id: workGalleryEntryId(work, doorwayId),
      work,
      asset,
      photo,
      image: asset?.poster || selectedPhoto?.image || work.cover.poster,
      href: doorwayId ? `/work/${work.slug}/${doorwayId}` : `/work/${work.slug}`,
      cardSize,
      treatment,
    };
  };

  if (placements?.length) {
    return filterWorkGalleryEntries(placements.flatMap((placement) => {
      const work = byId.get(placement.workId);
      return work ? [buildEntry(
        work,
        placement.assetId || placement.photoId,
        placement.cardSize,
        placement.treatment,
      )] : [];
    }));
  }
  return filterWorkGalleryEntries(sortProjects(projects).map((work) => buildEntry(work)));
}

export function buildPrototypeWorkGallery(
  projects: ProjectView[],
  photoWorkId: string,
): WorkGalleryEntryView[] {
  const photoWork = projects.find((project) => project.id === photoWorkId);
  const standardWorks = projects.filter((project) => project !== photoWork);
  if (!photoWork) return buildWorkGallery(standardWorks);
  const workEntries = buildWorkGallery(standardWorks);
  const photoEntries = photoWork.photos.flatMap((photo) => buildWorkGallery(
    [photoWork],
    [{
      _key: photo.id,
      workId: photoWork.id,
      photoId: photo.id,
      cardSize: 'standard',
      treatment: 'standard',
    }],
  ));
  const interleaved: WorkGalleryEntryView[] = [];
  const length = Math.max(workEntries.length, photoEntries.length);
  for (let index = 0; index < length; index += 1) {
    const workEntry = workEntries[index];
    const photoEntry = photoEntries[index];
    if (workEntry) interleaved.push(workEntry);
    if (photoEntry) interleaved.push(photoEntry);
  }
  return interleaved;
}

export function adjacentProjects(projects: ProjectView[], slug: string) {
  const index = projects.findIndex((project) => project.slug === slug);
  if (index < 0) return {previous: undefined, next: undefined};
  return {
    previous: index > 0 ? projects[index - 1] : undefined,
    next: index < projects.length - 1 ? projects[index + 1] : undefined,
  };
}

function stringValue(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

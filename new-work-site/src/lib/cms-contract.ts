import {isNonEmptyString, isRecord, type UnknownRecord} from '../../shared/content-policy';

export interface CmsPayload {
  settings: UnknownRecord;
  projects: UnknownRecord[];
  notes: UnknownRecord[];
}

function recordLabel(record: UnknownRecord, fallback: string): string {
  const id = isNonEmptyString(record._id) ? record._id : undefined;
  const title = isNonEmptyString(record.title) ? record.title : undefined;
  return id || title || fallback;
}

function recordArray(value: unknown, label: string): UnknownRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value.map((candidate, index) => {
    if (!isRecord(candidate)) throw new Error(`${label}[${index}] must be an object.`);
    return candidate;
  });
}

function validateProject(project: UnknownRecord, index: number): void {
  const label = recordLabel(project, `project ${index + 1}`);
  const slug = typeof project.slug === 'string'
    ? project.slug
    : isRecord(project.slug) && isNonEmptyString(project.slug.current)
      ? project.slug.current
      : undefined;
  const errors = [
    isNonEmptyString(project._id) || isNonEmptyString(project.id) ? undefined : 'id',
    isNonEmptyString(project.title) ? undefined : 'title',
    slug ? undefined : 'slug',
    isRecord(project.cover) ? undefined : 'cover',
    Array.isArray(project.types) ? undefined : 'types array',
    Array.isArray(project.contentBlocks) ? undefined : 'contentBlocks array',
  ].filter(Boolean);
  if (errors.length) throw new Error(`${label} is missing or has invalid: ${errors.join(', ')}.`);
}

function validateNote(note: UnknownRecord, index: number): void {
  const label = recordLabel(note, `note ${index + 1}`);
  const errors = [
    isNonEmptyString(note._id) || isNonEmptyString(note.id) ? undefined : 'id',
    isNonEmptyString(note.title) ? undefined : 'title',
    isNonEmptyString(note.summary) ? undefined : 'summary',
    isNonEmptyString(note.date) ? undefined : 'date',
    isRecord(note.media) ? undefined : 'media',
  ].filter(Boolean);
  if (errors.length) throw new Error(`${label} is missing or has invalid: ${errors.join(', ')}.`);
}

export function parseCmsPayload(input: {
  settings: unknown;
  projects: unknown;
  notes: unknown;
}): CmsPayload {
  if (!isRecord(input.settings)) throw new Error('siteSettings must be an object.');
  if (!isNonEmptyString(input.settings.siteName)) throw new Error('siteSettings.siteName is required.');
  if (!isRecord(input.settings.defaultSeo)) throw new Error('siteSettings.defaultSeo must be an object.');
  if (!isRecord(input.settings.reel)) throw new Error('siteSettings.reel must be an object.');
  if (input.settings.aboutPeople !== undefined) {
    recordArray(input.settings.aboutPeople, 'siteSettings.aboutPeople');
  }

  const projects = recordArray(input.projects, 'projects');
  const notes = recordArray(input.notes, 'notes');
  projects.forEach(validateProject);
  notes.forEach(validateNote);
  return {settings: input.settings, projects, notes};
}

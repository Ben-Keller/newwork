import {isNonEmptyString, isRecord, type UnknownRecord} from '../../../shared/content-policy';
import type {ProjectLayoutVariant, ProjectType, WorkTemplate} from '../types';

export function recordOrEmpty(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

export function optionalRecord(value: unknown): UnknownRecord | undefined {
  return isRecord(value) ? value : undefined;
}

export function stringFrom(value: unknown): string | undefined {
  return isNonEmptyString(value) ? value.trim() : undefined;
}

export function enumValue<const T extends readonly string[]>(
  value: unknown,
  values: T,
): T[number] | undefined {
  return typeof value === 'string' && values.includes(value) ? value as T[number] : undefined;
}

export function presentationOffset(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(Math.min(320, Math.max(-240, value)));
}

export function presentationColumn(value: unknown): 1 | 2 | 3 | 4 | undefined {
  return value === 1 || value === 2 || value === 3 || value === 4
    ? value
    : undefined;
}

export function presentationAccent(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  return /^#[0-9a-f]{6}$/iu.test(normalized) ? normalized.toUpperCase() : undefined;
}

export function inferredLayoutVariant(types: ProjectType[]): ProjectLayoutVariant {
  if (types.includes('Campaign')) return 'campaign';
  if (types.includes('Film')) return 'cinematic';
  if (types.includes('Photography') && !types.includes('Animation')) return 'photoEssay';
  return types.includes('Animation') ? 'experimental' : 'cinematic';
}

export function inferredWorkTemplate(
  types: ProjectType[],
  legacyLayout?: ProjectLayoutVariant,
): WorkTemplate {
  if (legacyLayout === 'campaign' || legacyLayout === 'experimental' || types.includes('Campaign')) {
    return 'featured';
  }
  if (legacyLayout === 'photoEssay' || (types.includes('Photography') && !types.includes('Film'))) {
    return 'photo';
  }
  return 'video';
}

export type BrowserStorageArea = 'local' | 'session';

function resolveStorage(area: BrowserStorageArea): Storage | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readStorageValue(area: BrowserStorageArea, key: string): string | null {
  try {
    return resolveStorage(area)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorageValue(
  area: BrowserStorageArea,
  key: string,
  value: string,
): boolean {
  try {
    const storage = resolveStorage(area);
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageValue(area: BrowserStorageArea, key: string): boolean {
  try {
    const storage = resolveStorage(area);
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function readStorageJson(area: BrowserStorageArea, key: string): unknown {
  const value = readStorageValue(area, key);
  if (value === null) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function writeStorageJson(area: BrowserStorageArea, key: string, value: unknown): boolean {
  try {
    return writeStorageValue(area, key, JSON.stringify(value));
  } catch {
    return false;
  }
}

export function readStorageStringArray(area: BrowserStorageArea, key: string): string[] {
  const value = readStorageJson(area, key);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

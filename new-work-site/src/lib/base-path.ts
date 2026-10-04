const configuredBase = import.meta.env.BASE_URL || '/';

export const basePath = configuredBase === '/'
  ? ''
  : `/${configuredBase.replace(/^\/+|\/+$/gu, '')}`;

// Versions share a hostname, but must not share gallery/session preferences.
export const storagePrefix = basePath ? `${basePath}:` : '';

export function withBase(value: string): string {
  if (!value || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/iu.test(value)) return value;
  const pathname = value.startsWith('/') ? value : `/${value}`;
  return `${basePath}${pathname}` || '/';
}

export function withoutBase(value: string): string {
  if (!basePath) return value || '/';
  if (value === basePath) return '/';
  return value.startsWith(`${basePath}/`) ? value.slice(basePath.length) || '/' : value;
}

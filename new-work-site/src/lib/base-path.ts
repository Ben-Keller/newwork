const configuredBase = import.meta.env.BASE_URL || '/';

export const basePath = configuredBase === '/'
  ? ''
  : `/${configuredBase.replace(/^\/+|\/+$/gu, '')}`;

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

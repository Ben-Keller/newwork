/** Match the Studio limits; older documents retain existing defaults. */
export function displayCount(value: unknown, fallback = 16, max = 40): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= max ? value : fallback;
}

/** Keep time and text formatting separate from the animation lifecycle. */
export const CITY_CLOCKS = [
  { city: 'SF', name: 'San Francisco', zone: 'America/Los_Angeles' },
  { city: 'LA', name: 'Los Angeles', zone: 'America/Los_Angeles' },
  { city: 'NYC', name: 'New York', zone: 'America/New_York' },
] as const;
const clockFormatters = new Map<string, Intl.DateTimeFormat>();
export function cityTime(cityIndex: number, date = new Date(), format: 'short' | 'board' = 'short'): string {
  const city = CITY_CLOCKS[cityIndex % CITY_CLOCKS.length]!;
  let formatter = clockFormatters.get(city.zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', { timeZone: city.zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    clockFormatters.set(city.zone, formatter);
  }
  return `${format === 'board' ? city.name : city.city} ${formatter.format(date)}`;
}
export function projectLabel(client: string | undefined, title: string): string {
  const name = client?.trim();
  return name && !title.toLowerCase().includes(name.toLowerCase()) ? `${name} / ${title}` : title;
}
export function tickerPages(text: string, columns: number, rows: number): string[] {
  const clean = text.normalize('NFKD').replace(/[\u0300-\u036f]/gu, '').toUpperCase().trim();
  const lines: string[] = []; let line = '';
  for (const paragraph of clean.split(/\r?\n/gu)) {
    for (let word of paragraph.trim().split(/\s+/gu)) {
      if (line && line.length + word.length + 1 > columns) { lines.push(line); line = ''; }
      while (word.length > columns) { if (line) { lines.push(line); line = ''; } lines.push(word.slice(0, columns)); word = word.slice(columns); }
      line = line ? `${line} ${word}` : word;
    }
    lines.push(line); line = '';
  }
  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += rows) pages.push(Array.from({ length: rows }, (_, j) => (lines[i + j] || '').padEnd(columns)).join(''));
  return pages;
}

import { describe, expect, it } from 'vitest';
import { cityTime, projectLabel, tickerPages } from '../../src/lib/ticker';
describe('departure board content', () => {
  it('uses city-local time across daylight-saving changes and the date boundary', () => {
    expect(cityTime(0, new Date('2026-01-01T04:30:00Z'))).toBe('SF 20:30');
    expect(cityTime(1, new Date('2026-07-01T04:30:00Z'))).toBe('LA 21:30');
    expect(cityTime(2, new Date('2026-07-01T04:30:00Z'))).toBe('NYC 00:30');
    expect(cityTime(2, new Date('2026-11-01T05:59:00Z'))).toBe('NYC 01:59');
    expect(cityTime(2, new Date('2026-11-01T06:00:00Z'))).toBe('NYC 01:00');
  });
  it('shows only the client and uses a neutral placeholder when missing', () => {
    expect(projectLabel('Mercury')).toBe('Mercury');
    expect(projectLabel('  Client 01  ')).toBe('Client 01');
    expect(projectLabel(undefined)).toBe('Client pending');
    expect(projectLabel(' ')).toBe('Client pending');
  });
  it('fits each full city name and its live time into one board line', () => {
    const date = new Date('2026-07-01T04:30:00Z');
    for (const [index, name, time] of [[0, 'SAN FRANCISCO', '21:30'], [1, 'LOS ANGELES', '21:30'], [2, 'NEW YORK', '00:30']] as const) {
      expect(tickerPages(cityTime(index, date, 'board'), 20, 1)).toEqual([`${name} ${time}`.padEnd(20)]);
    }
  });
  it('shows every word of long titles over stable, whole-word pages', () => {
    const pages = tickerPages('A production with a particularly long title and 2026: the next chapter', 20, 1);
    expect(pages.every(page => page.length === 20)).toBe(true);
    expect(pages.join(' ').replace(/\s+/gu, ' ').trim()).toBe('A PRODUCTION WITH A PARTICULARLY LONG TITLE AND 2026: THE NEXT CHAPTER');
    expect(tickerPages('SUPERCALIFRAGILISTICEXPIALIDOCIOUS', 10, 2).map(p => p.replaceAll(' ', '')).join('')).toBe('SUPERCALIFRAGILISTICEXPIALIDOCIOUS');
    expect(tickerPages('', 10, 1)).toEqual(['          ']);
  });
});

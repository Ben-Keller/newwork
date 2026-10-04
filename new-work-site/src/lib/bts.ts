import { pickResponsiveSource } from './responsive-images';
import { withBase } from './base-path';
import type { ImageView, WorkGalleryEntryView } from './types';

/**
 * One behind-the-scenes frame. These are assembled from the work gallery as
 * placeholders until a real BTS collection exists in Sanity, so swapping the
 * source later only means replacing `buildBtsItems`. The same shape feeds the
 * archived experiments in `src/archive/bts-experiments`.
 */
export interface BtsItem {
  id: string;
  image: ImageView;
  /** ~480px wide: strips, cards and WebGL textures. */
  thumb: string;
  /** ~1200px wide: lightbox and focused views. */
  large: string;
  video?: string;
  project: string;
  client?: string;
  year?: number;
  href: string;
  department: string;
  note: string;
  /** Call-sheet time, HH:MM on a 24h clock. */
  time: string;
  /** Minutes after midnight, for positioning on the day. */
  minutes: number;
  /** Film edge code, e.g. "14A". */
  edge: string;
}


const PLACEHOLDER_NOTES: ReadonlyArray<readonly [string, string]> = [
  ['Camera', 'Lens tests before crew call'],
  ['Art', 'Dressing the set, second pass'],
  ['Direction', 'Blocking the first setup'],
  ['Lighting', 'Chasing the last of the window light'],
  ['Wardrobe', 'Final fitting between takes'],
  ['Camera', 'Handheld pickups off the plan'],
  ['Direction', 'Playback at video village'],
  ['Grip', 'Rigging the car mount'],
  ['Sound', 'Room tone. Nobody move.'],
  ['Crew', 'Lunch. Forty minutes, hard out.'],
  ['Talent', 'Waiting on the sun'],
  ['Lighting', 'Magic hour, one take'],
  ['Camera', 'Second unit, wide and early'],
  ['Art', 'Hero props on the cart'],
  ['Crew', 'Martini shot'],
];

const DAY_START = 5 * 60 + 30;
const DAY_END = 21 * 60 + 45;

export const formatClock = (minutes: number): string => {
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60) % 24;
  return `${String(hours).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** Pick an existing derivative close to `width` for local or Sanity images. */
export const sizedImageSrc = pickResponsiveSource;

export const buildBtsItems = (entries: WorkGalleryEntryView[], limit = 15): BtsItem[] => {
  const seen = new Set<string>();
  const unique = entries.filter((entry) => {
    if (!entry.image.src || seen.has(entry.image.src)) return false;
    seen.add(entry.image.src);
    return true;
  });
  // Interleave projects so neighbouring frames don't all come from one shoot.
  const byWork = new Map<string, WorkGalleryEntryView[]>();
  unique.forEach((entry) => {
    const list = byWork.get(entry.work.id) ?? [];
    list.push(entry);
    byWork.set(entry.work.id, list);
  });
  const queues = [...byWork.values()];
  const picked: WorkGalleryEntryView[] = [];
  while (picked.length < limit && queues.some((queue) => queue.length)) {
    queues.forEach((queue) => {
      const next = queue.shift();
      if (next && picked.length < limit) picked.push(next);
    });
  }

  const span = DAY_END - DAY_START;
  return picked.map((entry, index) => {
    const [department, note] = PLACEHOLDER_NOTES[index % PLACEHOLDER_NOTES.length]!;
    const minutes = DAY_START + (picked.length > 1 ? (span * index) / (picked.length - 1) : 0);
    const roundedMinutes = Math.round(minutes / 5) * 5;
    return {
      id: `bts-${index}-${entry.id}`,
      image: entry.image,
      thumb: sizedImageSrc(entry.image, 480),
      large: sizedImageSrc(entry.image, 1200),
      video: entry.photo ? undefined : entry.work.cover.previewVideo,
      project: entry.work.title,
      client: entry.work.client,
      year: entry.work.year,
      href: withBase(entry.href),
      department,
      note,
      time: formatClock(roundedMinutes),
      minutes: roundedMinutes,
      edge: `${12 + Math.floor(index / 6)}${String.fromCharCode(65 + (index % 6))}`,
    };
  });
};

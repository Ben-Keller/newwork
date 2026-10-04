/**
 * The data contract for the archived BTS experiments. Kept local so the whole
 * folder can be lifted into another site: feed `BtsExperiments` any list of
 * items in this shape.
 */
export interface BtsImage {
  src: string;
  width: number;
  height: number;
  alt: string;
}

export interface BtsItem {
  id: string;
  image: BtsImage;
  /** ~480px wide: strips, cards and WebGL textures. */
  thumb: string;
  /** ~1200px wide: lightbox and focused views. */
  large: string;
  /** Optional muted preview clip. */
  video?: string;
  project: string;
  client?: string;
  year?: number;
  href: string;
  department: string;
  note: string;
  /** Call-sheet time, HH:MM on a 24h clock. */
  time: string;
  /** Minutes after midnight. */
  minutes: number;
  /** Film edge code, e.g. "14A". */
  edge: string;
}

// Numbered as they were presented in review round 2 of the New Work site.
export const BTS_VARIANTS = [
  { id: 'reel', number: '03', label: 'Film reel' },
  { id: 'video-village', number: '04', label: 'Video village' },
  { id: 'viewfinder', number: '05', label: 'Viewfinder' },
  { id: 'point-cloud', number: '06', label: 'Point cloud' },
] as const;

export type BtsVariantId = typeof BTS_VARIANTS[number]['id'];

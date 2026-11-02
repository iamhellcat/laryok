import manifest from './manifest.json';

export interface ArtEntry {
  src: string;
  w: number;
  h: number;
  /** Позиція на полотні 1206×2622 (є тільки в шарів сцени). */
  x?: number;
  y?: number;
}

export const CANVAS = manifest.canvas;

const entries = manifest.art as Record<string, ArtEntry>;

export function art(key: string): ArtEntry {
  const entry = entries[key];
  if (!entry) throw new Error(`Немає арту "${key}"`);
  return entry;
}

export const hasArt = (key: string) => key in entries;

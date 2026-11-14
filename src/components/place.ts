import type { CSSProperties } from 'react';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/** Положення спрайта в рамці зі сторонами `box`, коли відомі його координати на полотні. */
export function place(a: { x?: number; y?: number; w: number; h: number }, box: { x: number; y: number; w: number; h: number }): CSSProperties {
  return { left: pct((a.x ?? 0) - box.x, box.w), top: pct((a.y ?? 0) - box.y, box.h), width: pct(a.w, box.w) };
}

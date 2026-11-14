import type { CSSProperties } from 'react';
import { art } from '../art';

export function Sprite({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  const a = art(name);
  return <img className={className} src={a.src} width={a.w} height={a.h} alt="" draggable={false} style={style} />;
}

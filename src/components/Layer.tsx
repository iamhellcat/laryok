import { art, CANVAS } from '../art';

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

interface Props {
  name: string;
  className?: string;
}

/** Шар сцени: картинка стоїть там, де її намалювали на полотні 1206×2622. */
export function Layer({ name, className = '' }: Props) {
  const a = art(name);
  return (
    <img
      className={`layer ${className}`}
      src={a.src}
      width={a.w}
      height={a.h}
      alt=""
      draggable={false}
      style={{ left: pct(a.x ?? 0, CANVAS.w), top: pct(a.y ?? 0, CANVAS.h), width: pct(a.w, CANVAS.w) }}
    />
  );
}

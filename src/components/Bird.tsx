import { useEffect, useState, type CSSProperties } from 'react';
import { art, CANVAS } from '../art';

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const rand = (min: number, max: number) => min + Math.random() * (max - min);

// Висота польоту на полотні: між лічильником монет (низ ≈171) і вивіскою ларька (верх ≈669).
const FLIGHT_Y = 340;

/** Птах повільно й незграбно пролітає небом справа наліво, з паузою 5–14 с між прольотами. */
export function Bird() {
  const a = art('bird');
  const left = ((a.x ?? 0) / CANVAS.w) * 100;
  const width = (a.w / CANVAS.w) * 100;
  const top = (FLIGHT_Y / CANVAS.h) * 100;
  const [flight, setFlight] = useState(0);
  const [flying, setFlying] = useState(false);
  const still = reducedMotion();

  useEffect(() => {
    if (still || flying) return;
    const id = setTimeout(() => {
      setFlight((n) => n + 1);
      setFlying(true);
    }, rand(5000, 14000));
    return () => clearTimeout(id);
  }, [flying, still]);

  if (still) return <img className="layer" src={a.src} alt="" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%` }} />;
  if (!flying) return null;

  const style = {
    left: `${left}%`,
    top: `${top}%`,
    width: `${width}%`,
    '--from': `${((100 - left) / width) * 100}%`,
    '--to': `${(-(left + width) / width) * 100}%`,
    '--seed': rand(-6, 6).toFixed(1),
  } as CSSProperties;

  return (
    <div key={flight} className="bird" style={style} onAnimationEnd={(e) => e.target === e.currentTarget && setFlying(false)}>
      <img className="bird-body" src={a.src} alt="" draggable={false} />
    </div>
  );
}

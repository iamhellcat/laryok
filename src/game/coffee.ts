import { art } from '../art';
import { COFFEE_SYMBOLS, type CoffeeTopic } from '../data/coffee';
import { localDay } from './wallet';

const KEY = 'laryok:coffee';

/** Один символ на чашці. Позиція в пікселях полотна від центру дна чашки. */
export interface CoffeePick {
  id: string;
  dx: number;
  dy: number;
  /** Нахил символа, градуси. */
  rot: number;
  /** Яка пляма (1–5) проступає на цьому місці до потрушування й як повернута. */
  spot: number;
  spotRot: number;
}

/** Розклад на день: тема й три символи (дно — минуле, стінки — теперішнє, краї — майбутнє). */
export interface CoffeeReading {
  day: string;
  topic: CoffeeTopic;
  picks: [CoffeePick, CoffeePick, CoffeePick];
}

/** Дно, внутрішнє коло, і ширина чашки на картинці (полотно 1206×2622). */
export const CUP = { cx: 582, cy: 1336, innerR: 165, outerR: 272 };

/** Символи збільшені, щоб читалися на телефоні, але найбільші не виходять за ~135 px (орел вдвічі ширший за зірку). */
export function symbolScale(w: number, h: number) {
  // у картинці символа 16 px сяйва з кожного боку, на розмір малюнка воно не впливає
  return Math.min(1.5, 135 / (Math.max(w, h) - 32));
}

/** Рідкісний символ випадає в чотири рази рідше за звичайний. */
const WEIGHT = { common: 4, rare: 1 };

const between = (a: number, b: number) => a + Math.random() * (b - a);

if (new URLSearchParams(location.search).has('reset')) {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // нічого
  }
}

/** Сьогоднішнє ворожіння на каві, якщо воно вже було. */
export function todaysCoffee(): CoffeeReading | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as CoffeeReading;
    return v.day === localDay() && Array.isArray(v.picks) && v.picks.length === 3 ? v : null;
  } catch {
    return null;
  }
}

export function saveCoffee(reading: CoffeeReading) {
  try {
    localStorage.setItem(KEY, JSON.stringify(reading));
  } catch {
    // приватний режим: розклад не збережеться, повторне ворожіння дозволиться
  }
}

function pickSymbols(): string[] {
  const pool = COFFEE_SYMBOLS.filter((s) => {
    try {
      art(`coffee/${s.id}`);
      return true;
    } catch {
      return false; // спрайта ще нема
    }
  });
  const chosen: string[] = [];
  while (chosen.length < 3 && pool.length > 0) {
    const total = pool.reduce((sum, s) => sum + (s.rare ? WEIGHT.rare : WEIGHT.common), 0);
    let roll = Math.random() * total;
    const i = pool.findIndex((s) => (roll -= s.rare ? WEIGHT.rare : WEIGHT.common) < 0);
    chosen.push(pool.splice(i < 0 ? pool.length - 1 : i, 1)[0].id);
  }
  return chosen;
}

/** Нове ворожіння: три різні символи й їхні місця на чашці. */
export function drawCoffee(topic: CoffeeTopic): CoffeeReading {
  const ids = pickSymbols();
  const half = (id: string) => {
    const a = art(`coffee/${id}`);
    return (Math.max(a.w, a.h) * symbolScale(a.w, a.h)) / 2;
  };

  // Кути для стінок і країв не збігаються, щоб символи не злипалися.
  const wallAngle = between(0, Math.PI * 2);
  const edgeAngle = wallAngle + between(Math.PI * 0.55, Math.PI * 1.45);

  const place = (angle: number, radius: number, id: string) => {
    const r = Math.max(60, Math.min(radius, CUP.outerR - half(id) * 0.8));
    return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r * 0.95 };
  };

  for (let attempt = 0; ; attempt++) {
    const spots = [1, 2, 3, 4, 5].sort(() => Math.random() - 0.5);
    const centerAngle = between(0, Math.PI * 2);
    const spots3 = spots.slice(0, 3);
    const positions = [
      place(centerAngle, between(0, 45), ids[0]),
      place(wallAngle, between(190, 215), ids[1]),
      place(edgeAngle, between(235, 260), ids[2]),
    ];
    const apart = positions.every((p, i) => positions.every((q, j) => i >= j || Math.hypot(p.dx - q.dx, p.dy - q.dy) > 125));
    if (!apart && attempt < 40) continue;
    const picks = ids.map((id, i) => ({
      id,
      ...positions[i],
      rot: between(-18, 18),
      spot: spots3[i],
      spotRot: between(0, 360),
    }));
    return { day: localDay(), topic, picks: picks as CoffeeReading['picks'] };
  }
}

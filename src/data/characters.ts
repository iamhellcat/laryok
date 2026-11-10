import { babka } from './babka';
import { cat } from './cat';
import { student } from './student';
import type { Character } from './types';

/** Порядок зміни персонажів по днях. */
export const CHARACTERS: Character[] = [babka, cat, student];

/** Перший день гри: чергує бабку, кота, студента, ... далі по колу. */
const FIRST_DAY = new Date(2026, 10, 2);

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Персонаж дня. Для перевірки: ?character=cat, ?character=babka чи ?character=student. */
export function characterForToday(now: Date = new Date()): Character {
  const forced = new URLSearchParams(location.search).get('character');
  const chosen = CHARACTERS.find((c) => c.id === forced);
  if (chosen) return chosen;
  const days = Math.round((midnight(now) - midnight(FIRST_DAY)) / 86_400_000);
  return CHARACTERS[((days % CHARACTERS.length) + CHARACTERS.length) % CHARACTERS.length];
}

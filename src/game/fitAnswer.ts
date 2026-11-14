/**
 * Розкладка відповіді магічної кулі на синьому трикутнику (dice_still).
 * Трикутник широкий угорі й звужується донизу, тому довгий текст розбиваємо на рядки по словах:
 * шукаємо найбільший розмір шрифту, при якому всі рядки вміщаються у трикутник.
 * Усі розміри в пікселях полотна 1206×2622.
 */

/** Вісь трикутника. */
export const TRIANGLE_CENTER_X = 655;

/** Ширина трикутника на висоті y: виміряно по картинці dice_still. */
const WIDTH_AT: [number, number][] = [
  [1060, 200], [1064, 261], [1072, 274], [1084, 283], [1096, 274], [1110, 257], [1124, 241],
  [1140, 220], [1160, 195], [1180, 169], [1200, 145], [1230, 107],
];

function triangleWidth(y: number) {
  if (y <= WIDTH_AT[0][0]) return WIDTH_AT[0][1];
  for (let i = 1; i < WIDTH_AT.length; i++) {
    const [y1, w1] = WIDTH_AT[i];
    if (y <= y1) {
      const [y0, w0] = WIDTH_AT[i - 1];
      return w0 + ((w1 - w0) * (y - y0)) / (y1 - y0);
    }
  }
  return 0;
}

export interface AnswerLayout {
  lines: string[];
  /** Розмір шрифту, px полотна. */
  size: number;
  /** Верх текстового блоку, px полотна. */
  top: number;
}

const MIN_SIZE = 26;
const MAX_SIZE = 80;
const BOTTOM = 1192;
/** Висота (центр рядка), нижче якої один короткий рядок не опускаємо. Трикутник вужчий донизу, тому центр трохи нижче найширшого місця. */
const SINGLE_CENTER_LOW = 1116;
const SINGLE_CENTER_HIGH = 1100;
/** Перший рядок кількох: чим нижче, тим більше повітря від верхнього краю, але вужче місце. */
const MULTI_TOP_LOW = 1074;
const MULTI_TOP_HIGH = 1062;

/** Відступ від краю трикутника з кожного боку: росте разом із шрифтом, щоб великі літери не впиралися в рамку. */
const padFor = (size: number) => 12 + 0.2 * size;

/** Усі розбиття слів на `n` підряд ідучих груп. */
function splits(words: string[], n: number): string[][] {
  if (n === 1) return [[words.join(' ')]];
  const out: string[][] = [];
  for (let i = 1; i <= words.length - (n - 1); i++) {
    const head = words.slice(0, i).join(' ');
    for (const rest of splits(words.slice(i), n - 1)) out.push([head, ...rest]);
  }
  return out;
}

/**
 * @param measure ширина рядка шрифтом розміру 1 (множиться на розмір).
 */
export function fitAnswer(text: string, measure: (s: string) => number): AnswerLayout {
  const words = text.trim().split(/\s+/);
  let fallback: AnswerLayout | null = null;
  for (let size = MAX_SIZE; size >= MIN_SIZE; size--) {
    const pad = padFor(size);
    for (let n = 1; n <= Math.min(words.length, 4); n++) {
      // Один рядок: найнижче положення, де він ще вміщається (по центру трикутника). Кілька рядків: від верху з відступом.
      const tops: number[] = [];
      if (n === 1) for (let c = SINGLE_CENTER_LOW; c >= SINGLE_CENTER_HIGH; c -= 2) tops.push(c - size / 2);
      else for (let t = MULTI_TOP_LOW; t >= MULTI_TOP_HIGH; t -= 2) tops.push(t);
      for (const top of tops) {
        if (top + n * size > BOTTOM) continue;
        let best: { lines: string[]; slack: number } | null = null;
        for (const lines of splits(words, n)) {
          // Запас у пікселях між рядком і краєм трикутника на нижній межі рядка (там він найвужчий).
          const slack = Math.min(...lines.map((line, k) => triangleWidth(top + (k + 0.9) * size) - 2 * pad - measure(line) * size));
          if (slack >= 0 && (!best || slack > best.slack)) best = { lines, slack };
        }
        if (best) return { lines: best.lines, size, top };
      }
      if (size === MIN_SIZE && n === Math.min(words.length, 4)) fallback = { lines: splits(words, n)[0], size, top: MULTI_TOP_HIGH };
    }
  }
  return fallback ?? { lines: [text], size: MIN_SIZE, top: MULTI_TOP_HIGH };
}

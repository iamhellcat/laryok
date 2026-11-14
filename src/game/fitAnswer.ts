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
/** Відступ від краю трикутника з кожного боку. */
const PAD = 12;

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
    for (let n = 1; n <= Math.min(words.length, 4); n++) {
      // Один рядок стоїть по центру широкої частини, кілька — від верху.
      const top = n === 1 ? 1094 - size / 2 : 1064;
      if (top + n * size > BOTTOM) continue;
      let best: { lines: string[]; slack: number } | null = null;
      for (const lines of splits(words, n)) {
        // Запас у пікселях між рядком і краєм трикутника на нижній межі рядка (там він найвужчий).
        const slack = Math.min(...lines.map((line, k) => triangleWidth(top + (k + 0.9) * size) - 2 * PAD - measure(line) * size));
        if (slack >= 0 && (!best || slack > best.slack)) best = { lines, slack };
      }
      if (best) return { lines: best.lines, size, top };
      if (size === MIN_SIZE && n === Math.min(words.length, 4)) fallback = { lines: splits(words, n)[0], size, top };
    }
  }
  return fallback ?? { lines: [text], size: MIN_SIZE, top: 1064 };
}

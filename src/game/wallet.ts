const KEY = 'laryok:wallet';

export const DAILY_COINS = 5;
export const MAX_COINS = 100;

export const PUSH_LINES = [
  'Опача! Плюс 5 монеток сюди!',
  'Це небагато, але це чесна праця.',
  'Можна купити маккохфе.',
];

interface Saved {
  balance: number;
  lastClaim: string;
}

export interface DailyPush {
  gain: number;
  line: string;
}

export interface Wallet {
  balance: number;
  push: DailyPush | null;
}

export function localDay(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function read(): Saved | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return typeof v.balance === 'number' && typeof v.lastClaim === 'string' ? v : null;
  } catch {
    return null;
  }
}

function write(v: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // приватний режим — просто не зберігаємо
  }
}

/**
 * Читає гаманець і нараховує щоденні монети.
 * Для перевірки: ?reset — почати з нуля, ?coins=N — виставити баланс.
 */
export function loadWallet(): Wallet {
  const params = new URLSearchParams(location.search);
  if (params.has('reset')) {
    try {
      localStorage.removeItem(KEY);
    } catch {
      // нічого
    }
  }

  const day = localDay();
  const saved = read();
  let balance = saved?.balance ?? 0;
  let push: DailyPush | null = null;

  if (!saved || saved.lastClaim !== day) {
    const next = Math.min(MAX_COINS, balance + DAILY_COINS);
    if (next > balance) push = { gain: next - balance, line: PUSH_LINES[hash(day) % PUSH_LINES.length] };
    balance = next;
    write({ balance, lastClaim: day });
  }

  const forced = params.get('coins');
  if (forced !== null && /^\d+$/.test(forced)) {
    balance = Math.min(MAX_COINS, Number(forced));
    write({ balance, lastClaim: day });
  }

  return { balance, push };
}

export function saveBalance(balance: number) {
  write({ balance, lastClaim: read()?.lastClaim ?? localDay() });
}

export function coinWord(n: number) {
  const last = n % 10;
  const teen = n % 100 >= 11 && n % 100 <= 14;
  if (!teen && last === 1) return 'монета';
  if (!teen && last >= 2 && last <= 4) return 'монети';
  return 'монет';
}

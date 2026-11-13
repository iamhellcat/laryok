import { localDay } from './wallet';

const KEY = 'laryok:paper';

// Для перевірки: ?reset скидає й «куплену» сьогодні газету.
if (new URLSearchParams(location.search).has('reset')) {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // нічого
  }
}

/** Газету «Сьогодні» вже куплено цього дня: її можна перечитувати без нової монети. */
export function paperBoughtToday(): boolean {
  try {
    return localStorage.getItem(KEY) === localDay();
  } catch {
    return false;
  }
}

export function markPaperBought() {
  try {
    localStorage.setItem(KEY, localDay());
  } catch {
    // приватний режим: газета знову коштуватиме монету
  }
}

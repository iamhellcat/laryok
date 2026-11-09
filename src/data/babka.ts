import { BABKA_TAROT } from './tarot';
import type { Character, SystemId } from './types';

export const SYSTEM_LABELS: Record<SystemId, string> = {
  tarot: 'Хочу карту дня на Таро',
  ball: 'Можна потрусити Магічну кулю?',
  coffee: 'Ворожіння на Маккохфе',
  iching: 'Східна мудрість — оракул І-Цзин',
  mo: 'Східна мудрість — тибетське ворожіння МО',
  astro: 'Можна почитати Астро вісник?',
};

export const SYSTEM_ORDER: SystemId[] = ['tarot', 'ball', 'coffee', 'iching', 'mo', 'astro'];

/** Системи, які вже працюють. Решта з'являться в меню по мірі готовності. */
export const READY_SYSTEMS: SystemId[] = ['tarot', 'ball', 'coffee', 'iching', 'mo', 'astro'];

export const babka: Character = {
  id: 'babka',
  start: 'start',
  nodes: {
    start: {
      say: 'Чого тобі?',
      mood: 'neutral',
      after: 'Ну, чого ще?',
      replies: [
        { label: 'Не дуже-то люб’язно!', next: 'rude' },
        { label: 'Що така красуня тут робить?', next: 'flirt' },
        { label: 'Я за пророцтвом.', next: 'menu' },
      ],
    },
    rude: {
      say: 'Мені не доплачують за посмішки. Кажи швидше, я на перекур хочу.',
      mood: 'grumpy',
      after: 'Ще щось? Я, між іншим, на перекур збиралась.',
      replies: 'menu',
    },
    flirt: {
      say: 'Та всяке різне: гарнюням каву варю і пророцтва видаю. Чого хочеш, зайчику?',
      mood: 'happy',
      after: 'Ну що, зайчику, ще щось погадаємо?',
      replies: 'menu',
    },
    broke: {
      say: 'Нема грошей — нема пророцтв. Зароби і приходь завтра.',
      mood: 'grumpy',
      replies: [],
    },
  },
  tarot: BABKA_TAROT,
};

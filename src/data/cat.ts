import { CAT_TAROT } from './tarot-cat';
import type { Character } from './types';

export const cat: Character = {
  id: 'cat',
  start: 'start',
  wanderMoods: ['neutral', 'happy'],
  nodes: {
    start: {
      say: 'Мур-мур, що цікавить?',
      mood: 'neutral',
      replies: [
        { label: 'Ти розмовляєш?', next: 'talk' },
        { label: 'А де м-м-м інші продавці?', next: 'others' },
        { label: 'Я за пророцтвом.', next: 'menu' },
      ],
    },
    talk: {
      say: 'Ну так, мрр мяу. Ти що, расист? Кажи швиденько, що треба, в мене денний сон за планом.',
      mood: 'neutral',
      replies: 'menu',
    },
    others: {
      say: 'Я за них. Думаєш, якщо в мене лапки, я карти не зможу помішати? Обирай, на чому погадаємо.',
      mood: 'happy',
      replies: 'menu',
    },
    broke: {
      say: 'Мур. Без монеток карт не мішаю. Заходь завтра, а зараз я сплю.',
      mood: 'neutral',
      replies: [],
    },
  },
  tarot: CAT_TAROT,
};

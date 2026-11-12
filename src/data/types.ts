export type SystemId = 'tarot' | 'ball' | 'coffee' | 'iching' | 'mo' | 'astro';

export type Mood = 'neutral' | 'happy' | 'grumpy' | 'sad';

/** `next: 'menu'` — показати вибір видів пророцтв, лишивши репліку персонажа як є. */
export interface Reply {
  label: string;
  next: string;
}

export interface DialogNode {
  say: string;
  mood: Mood;
  /** Якщо задано, під час репліки персонаж міняє настрій з `mood` на цей (студент: усміхнувся, а потім засмутився). */
  thenMood?: Mood;
  /** 'menu' — після цієї репліки одразу вибір пророцтв. */
  replies: Reply[] | 'menu';
  /** Що персонаж каже після ворожіння, якщо розмова пішла через цю репліку («Що ще хочеш?» у відповідному тоні). */
  after?: string;
}

export type CharacterId = 'babka' | 'cat' | 'student';

/** Фрази персонажа для ворожіння на Маккохфе. */
export interface CoffeeVoice {
  /** «Що саме цікавить?», далі кнопки з темами. */
  ask: string;
  /** Що каже, якщо кава сьогодні вже була. */
  used: string;
  usedMood: Mood;
  /** Початок тлумачення. */
  intro: string;
  /** Підводки до символів: на дні, на стінках, на краях. */
  leads: [string, string, string];
  /** Завершення тлумачення. */
  outro: string;
}

export interface Character {
  id: CharacterId;
  start: string;
  /** Якщо задано, спрайт персонажа довільно міняється між цими настроями (кіт). */
  wanderMoods?: Mood[];
  nodes: Record<string, DialogNode>;
  coffee: CoffeeVoice;
  /** Тлумачення арканів Таро від цього персонажа. */
  tarot: Record<import('./tarot').TarotCard, string>;
}

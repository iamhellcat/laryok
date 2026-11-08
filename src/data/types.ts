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
  /** 'menu' — після цієї репліки одразу вибір пророцтв. */
  replies: Reply[] | 'menu';
}

export type CharacterId = 'babka' | 'cat';

export interface Character {
  id: CharacterId;
  start: string;
  /** Якщо задано, спрайт персонажа довільно міняється між цими настроями (кіт). */
  wanderMoods?: Mood[];
  nodes: Record<string, DialogNode>;
  /** Тлумачення арканів Таро від цього персонажа. */
  tarot: Record<import('./tarot').TarotCard, string>;
}

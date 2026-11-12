import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Bird } from './components/Bird';
import { CoinCounter } from './components/CoinCounter';
import { DailyPush } from './components/DailyPush';
import { Dialog } from './components/Dialog';
import { Layer } from './components/Layer';
import type { CoffeeRun } from './components/Coffee';
import { Oracle } from './components/Oracles';
import { art, CANVAS, hasArt } from './art';
import { READY_SYSTEMS, SYSTEM_LABELS, SYSTEM_ORDER } from './data/babka';
import { characterForToday } from './data/characters';
import { COFFEE_TOPICS, type CoffeeTopic } from './data/coffee';
import type { Mood, Reply, SystemId } from './data/types';
import { todaysCoffee } from './game/coffee';
import { loadWallet, saveBalance } from './game/wallet';

// Читаємо гаманець один раз при запуску, щоб щоденні монети нарахувалися рівно раз.
const wallet = loadWallet();

const character = characterForToday();

type Ui =
  | { kind: 'idle' }
  // path — репліка, якою розмова дійшла до вибору пророцтв; від неї залежить тон фрази «що ще?» після ворожіння.
  // then — настрій, на який персонаж перемикається посеред репліки (див. DialogNode.thenMood).
  | { kind: 'dialog'; say: string; mood: Mood; then?: Mood; menu: boolean; replies: Reply[]; path: string }
  | { kind: 'oracle'; system: SystemId; path: string; coffee?: CoffeeRun };

const PRODUCTS = [
  'tarot/tarot_button',
  'magic_ball/magic_ball_button',
  'coffee/coffee_button',
  'i-tsin/i_tsin_batton',
  'newspaper/newspaper_button',
];

export default function App() {
  const [balance, setBalance] = useState(wallet.balance);
  const [push, setPush] = useState(wallet.push);
  const [ui, setUi] = useState<Ui>({ kind: 'idle' });
  const [hover, setHover] = useState(false);

  // Під час розмови сцена трохи їде вгору рівно настільки, щоб персонаж лишався над діалогом.
  const stageRef = useRef<HTMLDivElement>(null);
  const [lift, setLift] = useState(0);
  const talking = ui.kind === 'dialog';
  useEffect(() => {
    const stage = stageRef.current;
    const scene = stage?.querySelector<HTMLElement>('.scene');
    const dialog = stage?.querySelector<HTMLElement>('.dialog');
    if (!talking || !stage || !scene || !dialog) return;
    const spot = art(`characters/${character.id}/${character.id}_neutral`);
    const measure = () => {
      const sceneH = scene.offsetHeight;
      const base = (stage.clientHeight - sceneH) / 2; // верх сцени без зсуву
      const top = base + ((spot.y ?? 0) / CANVAS.h) * sceneH;
      const bottom = top + (spot.h / CANVAS.h) * sceneH;
      const gap = stage.clientWidth * 0.02;
      const need = bottom + gap - dialog.offsetTop;
      // Не піднімаємо персонажа вище за 12% висоти екрана.
      setLift(Math.max(0, Math.min(need, top - stage.clientHeight * 0.12)));
    };
    measure();
    const watcher = new ResizeObserver(measure);
    watcher.observe(dialog);
    watcher.observe(stage);
    return () => watcher.disconnect();
  }, [talking]);

  // Кіт міняє спрайти довільно: раз на кілька секунд випадає один із його настроїв.
  const [wander, setWander] = useState<Mood>('neutral');
  useEffect(() => {
    const moods = character.wanderMoods;
    if (!moods) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      setWander(moods[Math.floor(Math.random() * moods.length)]);
      timer = setTimeout(next, 3000 + Math.random() * 5000);
    };
    timer = setTimeout(next, 2000 + Math.random() * 3000);
    return () => clearTimeout(timer);
  }, []);

  // Репліка зі зміною настрою: за мить після початку персонаж міняє спрайт.
  const thenMood = ui.kind === 'dialog' ? ui.then : undefined;
  const spoken = ui.kind === 'dialog' ? ui.say : '';
  useEffect(() => {
    if (!thenMood) return;
    const timer = setTimeout(() => {
      setUi((u) => (u.kind === 'dialog' && u.then ? { ...u, mood: u.then, then: undefined } : u));
    }, 1800);
    return () => clearTimeout(timer);
  }, [thenMood, spoken]);

  const sayNode = (id: string) => {
    const node = character.nodes[id];
    setUi({
      kind: 'dialog',
      say: node.say,
      mood: node.mood,
      then: node.thenMood,
      menu: node.replies === 'menu',
      replies: node.replies === 'menu' ? [] : node.replies,
      path: id,
    });
  };

  const reply = (r: Reply) => {
    if (r.next === 'menu' && ui.kind === 'dialog') setUi({ ...ui, menu: true, replies: [] });
    else if (r.next.startsWith('coffee:')) {
      const arg = r.next.slice('coffee:'.length);
      const coffee: CoffeeRun = arg === 'again' ? { mode: 'again' } : { mode: 'new', topic: arg as CoffeeTopic };
      setUi({ kind: 'oracle', system: 'coffee', path: ui.kind === 'dialog' ? ui.path : character.start, coffee });
    } else sayNode(r.next);
  };

  // Репліка поза сценарієм діалогу (питання про тему кави, «кава вже була»), розмова лишається на тій самій гілці.
  const talk = (say: string, mood: Mood, replies: Reply[]) => {
    setUi({ kind: 'dialog', say, mood, menu: false, replies, path: ui.kind === 'dialog' ? ui.path : character.start });
  };

  // Кава раз на день: вдруге персонаж відмовляє, але можна перечитати сьогоднішній розклад (без монети).
  const chooseCoffee = () => {
    const voice = character.coffee;
    if (todaysCoffee()) {
      talk(voice.used, voice.usedMood, [
        { label: 'Перечитати сьогоднішнє', next: 'coffee:again' },
        { label: 'Обрати щось інше', next: 'menu' },
      ]);
      return;
    }
    if (balance < 1) {
      sayNode('broke');
      return;
    }
    talk(voice.ask, 'neutral', COFFEE_TOPICS.map((t) => ({ label: t.label, next: `coffee:${t.id}` })));
  };

  const choose = (system: SystemId) => {
    if (system === 'coffee') {
      chooseCoffee();
      return;
    }
    if (balance < 1) {
      sayNode('broke');
      return;
    }
    if (system === 'astro') spend();
    setUi({ kind: 'oracle', system, path: ui.kind === 'dialog' ? ui.path : character.start });
  };

  // Після ворожіння персонаж не мовчить, а питає «що ще?» тим самим тоном; без монет — каже, що їх нема.
  const afterOracle = (path: string, free = false) => {
    if (balance < 1 && !free) {
      sayNode('broke');
      return;
    }
    const node = character.nodes[path];
    setUi({
      kind: 'dialog',
      say: node.after ?? character.nodes[character.start].after ?? node.say,
      mood: node.mood,
      menu: true,
      replies: [],
      path,
    });
  };

  const spend = () => {
    const next = balance - 1;
    setBalance(next);
    saveBalance(next);
  };

  const said = ui.kind === 'dialog' ? ui.mood : 'neutral';
  const mood = said === 'neutral' && character.wanderMoods ? wander : said;
  const sprite = `characters/${character.id}/${character.id}_${mood}`;
  const kiosk = art('laryok');

  const dialogReplies: Reply[] =
    ui.kind === 'dialog' && ui.menu
      ? SYSTEM_ORDER.filter((s) => READY_SYSTEMS.includes(s)).map((s) => ({ label: SYSTEM_LABELS[s], next: s }))
      : ui.kind === 'dialog'
        ? ui.replies
        : [];

  return (
    <div ref={stageRef} className="stage" style={{ '--lift': `${talking ? lift : 0}px` } as CSSProperties}>
      <div className="scene">
        <Layer name="background" />
        <Bird />
        <Layer name="laryok" />
        <Layer
          name={hasArt(sprite) ? sprite : `characters/${character.id}/${character.id}_neutral`}
          className={hover ? 'wiggle' : ''}
        />
        {PRODUCTS.map((p) => <Layer key={p} name={p} />)}

        <button
          className="kiosk-hit"
          aria-label="Підійти до ларька"
          style={{
            left: `${((kiosk.x ?? 0) / CANVAS.w) * 100}%`,
            top: `${((kiosk.y ?? 0) / CANVAS.h) * 100}%`,
            width: `${(kiosk.w / CANVAS.w) * 100}%`,
            height: `${(kiosk.h / CANVAS.h) * 100}%`,
          }}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
          onPointerLeave={() => setHover(false)}
          onClick={() => sayNode(character.start)}
        />

      </div>

      <div className="ui">
        <CoinCounter balance={balance} />

        {ui.kind === 'dialog' && (
          <>
            <button className="backdrop" aria-label="Закрити розмову" onClick={() => setUi({ kind: 'idle' })} />
            <Dialog
              say={ui.say}
              replies={dialogReplies}
              onReply={(r) => (ui.menu ? choose(r.next as SystemId) : reply(r))}
              onClose={() => setUi({ kind: 'idle' })}
            />
          </>
        )}

        {ui.kind === 'oracle' && (
          <Oracle
            system={ui.system}
            character={character}
            coffee={ui.coffee}
            onReveal={spend}
            onClose={() => afterOracle(ui.path, ui.coffee?.mode === 'again')}
          />
        )}

        {push && <DailyPush push={push} onClose={() => setPush(null)} />}
      </div>
    </div>
  );
}

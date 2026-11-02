import { useState } from 'react';
import { Bird } from './components/Bird';
import { CoinCounter } from './components/CoinCounter';
import { DailyPush } from './components/DailyPush';
import { Dialog } from './components/Dialog';
import { Layer } from './components/Layer';
import { Oracle } from './components/Oracles';
import { art, CANVAS, hasArt } from './art';
import { babka, READY_SYSTEMS, SYSTEM_LABELS, SYSTEM_ORDER } from './data/babka';
import type { Mood, Reply, SystemId } from './data/types';
import { loadWallet, saveBalance } from './game/wallet';

// Читаємо гаманець один раз при запуску, щоб щоденні монети нарахувалися рівно раз.
const wallet = loadWallet();

const character = babka;

type Ui =
  | { kind: 'idle' }
  | { kind: 'dialog'; say: string; mood: Mood; menu: boolean; replies: Reply[] }
  | { kind: 'oracle'; system: SystemId };

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

  const sayNode = (id: string) => {
    const node = character.nodes[id];
    setUi({
      kind: 'dialog',
      say: node.say,
      mood: node.mood,
      menu: node.replies === 'menu',
      replies: node.replies === 'menu' ? [] : node.replies,
    });
  };

  const reply = (r: Reply) => {
    if (r.next === 'menu' && ui.kind === 'dialog') setUi({ ...ui, menu: true, replies: [] });
    else sayNode(r.next);
  };

  const choose = (system: SystemId) => {
    if (balance < 1) {
      sayNode('broke');
      return;
    }
    if (system === 'astro') spend();
    setUi({ kind: 'oracle', system });
  };

  const spend = () => {
    const next = balance - 1;
    setBalance(next);
    saveBalance(next);
  };

  const mood = ui.kind === 'dialog' ? ui.mood : 'neutral';
  const sprite = `characters/${character.id}/${character.id}_${mood}`;
  const kiosk = art('laryok');

  const dialogReplies: Reply[] =
    ui.kind === 'dialog' && ui.menu
      ? SYSTEM_ORDER.filter((s) => READY_SYSTEMS.includes(s)).map((s) => ({ label: SYSTEM_LABELS[s], next: s }))
      : ui.kind === 'dialog'
        ? ui.replies
        : [];

  return (
    <div className="stage">
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
          <Oracle system={ui.system} character={character} onReveal={spend} onClose={() => setUi({ kind: 'idle' })} />
        )}

        {push && <DailyPush push={push} onClose={() => setPush(null)} />}
      </div>
    </div>
  );
}

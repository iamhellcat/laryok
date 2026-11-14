import { useEffect, useState, type CSSProperties } from 'react';
import { HEXAGRAMS, type Hexagram } from '../data/iching';
import { Sprite } from './Sprite';

// Тире довге, а «ст.», «до н. е.» не розриваються на рядки.
const ASK_TEXT =
  'І-цзін або Книга змін — класичний філософський твір Китаю, що датується VIII ст. до н. е. 64 гексаграми, кожна з яких складається з комбінації двох триграм, дає пораду або настанову на поточний період життя. Щоб отримати передбачення, традиційно шість разів кидають три монетки, малюючи лінію в залежності від того, скільки з них лягли аверсом чи реверсом.';

/** Сцена монеток: три однакові монетки в ряд із запасом угорі для підкидання. Одиниці умовні, лише для пропорцій. */
const BOX = { w: 1140, h: 580 };
const COIN = { w: 327, h: 332, y: 210, xs: [40, 407, 774] };

type Phase = 'ask' | 'toss' | 'done';

/** Скільки триває підкидання, мс; збігається з анімаціями в styles.css. */
const TOSS_MS = 1500;

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** Шість ліній гексаграми знизу вгору: суцільна — ян, перервана — інь. Лінії з'являються по черзі знизу. */
function HexagramLines({ lines }: { lines: number[] }) {
  return (
    <svg className="hexagram" viewBox="0 0 100 88" role="img" aria-label="Гексаграма">
      {[...lines].reverse().map((yang, i) => (
        <g key={i} transform={`translate(0 ${i * 15.2})`}>
          <g className="hx-line" style={{ ['--n' as string]: lines.length - 1 - i }}>
            {yang ? (
              <rect width="100" height="10" rx="3" />
            ) : (
              <>
                <rect width="42" height="10" rx="3" />
                <rect x="58" width="42" height="10" rx="3" />
              </>
            )}
          </g>
        </g>
      ))}
    </svg>
  );
}

interface Props {
  /** Викликається, коли монетки підкинули: тоді списується монета. */
  onReveal: () => void;
  onClose: () => void;
}

/** І-Цзин: розповідь про Книгу змін, три монетки підкидаються, і з'являється гексаграма. */
export function IChingRitual({ onReveal, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('ask');
  const [hexagram, setHexagram] = useState<Hexagram | null>(null);

  useEffect(() => {
    if (phase !== 'toss') return;
    const id = setTimeout(() => setPhase('done'), TOSS_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const toss = () => {
    setHexagram(pick(HEXAGRAMS));
    onReveal();
    setPhase('toss');
  };

  const coinStyle = (i: number): CSSProperties => ({
    left: `${(COIN.xs[i] / BOX.w) * 100}%`,
    top: `${(COIN.y / BOX.h) * 100}%`,
    width: `${(COIN.w / BOX.w) * 100}%`,
  });

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle cf-frame" role="dialog" aria-label="І-Цзин">
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>
        <div className="oracle-scroll">
          <div className="oracle-body cf-body top">
            <div className="io-wrap">
              <div className="cf io" data-phase={phase} style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}>
                {COIN.xs.map((_, i) => (
                  <Sprite key={i} name="i-tsin/flip_a_coin" className={`io-coin c${i}`} style={coinStyle(i)} />
                ))}
              </div>
            </div>

            {phase === 'done' && hexagram ? (
              <div className="io-result">
                <HexagramLines lines={hexagram.lines} />
                <h2 className="result-title">№ {hexagram.n} · {hexagram.name}</h2>
                <p className="result-text">{hexagram.text}</p>
              </div>
            ) : (
              <p className={phase === 'ask' ? 'cf-text' : 'cf-text bl-hint-out'}>{ASK_TEXT}</p>
            )}

            {phase === 'ask' && <button className="reply done cf-action" onClick={toss}>Підкинути</button>}
            {phase === 'done' && <button className="reply done cf-action" onClick={onClose}>Гаразд</button>}
            {phase === 'toss' && (
              // Невидима кнопка тримає місце, щоб монетки не зсувались.
              <button className="reply done cf-action ghost" tabIndex={-1} aria-hidden="true" disabled>Підкинути</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

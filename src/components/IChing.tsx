import { useEffect, useState, type CSSProperties } from 'react';
import { HEXAGRAMS, type Hexagram } from '../data/iching';
import { Sprite } from './Sprite';

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

// Тире довге, а «ст.», «до н. е.» не розриваються на рядки.
const ASK_TEXT =
  'І-цзін або Книга змін — класичний філософський твір Китаю, що датується VIII ст. до н. е. 64 гексаграми, кожна з яких складається з комбінації двох триграм, дає пораду або настанову на поточний період життя. Щоб отримати передбачення, традиційно шість разів кидають три монетки, малюючи лінію в залежності від того, скільки з них лягли аверсом чи реверсом.';

/** Сцена монеток: умовні одиниці, потрібні лише для пропорцій. Угорі запас, щоб монетки могли підлетіти. */
const BOX = { w: 900, h: 740 };
/** Розмір монетки в цих одиницях (спрайт 327×332). */
const COIN = { w: 300, ratio: 332 / 327 };

/**
 * Варіанти, як лежать три монетки: x, y — лівий верхній кут, r — нахил у градусах. Монетки, що йдуть далі в списку, лежать зверху.
 * a — трикутник, де монетки трохи накладаються; b — каскад по діагоналі; c — розсип без накладання. Для перегляду: ?io=a, ?io=b, ?io=c.
 */
const LAYOUTS = {
  a: [{ x: 300, y: 190, r: -8 }, { x: 70, y: 400, r: 10 }, { x: 500, y: 370, r: 6 }],
  b: [{ x: 110, y: 210, r: -14 }, { x: 300, y: 300, r: 8 }, { x: 490, y: 390, r: -6 }],
  c: [{ x: 60, y: 340, r: 14 }, { x: 320, y: 200, r: -10 }, { x: 570, y: 420, r: 22 }],
} as const;

type LayoutId = keyof typeof LAYOUTS;

const chooseLayout = (): LayoutId => {
  const forced = new URLSearchParams(location.search).get('io');
  if (forced === 'a' || forced === 'b' || forced === 'c') return forced;
  return pick(Object.keys(LAYOUTS) as LayoutId[]);
};

type Phase = 'ask' | 'toss' | 'done';

/** Скільки триває підкидання, мс; збігається з анімаціями в styles.css. */
const TOSS_MS = 1500;

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
  // Як лягли монетки, вирішується при відкритті: щоразу інакше.
  const [layout] = useState(chooseLayout);

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

  const coinStyle = (i: number): CSSProperties => {
    const c = LAYOUTS[layout][i];
    return {
      left: `${(c.x / BOX.w) * 100}%`,
      top: `${(c.y / BOX.h) * 100}%`,
      width: `${(COIN.w / BOX.w) * 100}%`,
      rotate: `${c.r}deg`,
    };
  };

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle cf-frame" role="dialog" aria-label="І-Цзин">
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>
        <div className="oracle-scroll">
          <div className="oracle-body cf-body top">
            {/* На екрані гексаграми монеток уже нема. */}
            {phase !== 'done' && (
              <div className="io-wrap">
                <div className="cf io" data-phase={phase} style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}>
                  {LAYOUTS[layout].map((_, i) => (
                    <Sprite key={i} name="i-tsin/flip_a_coin" className={`io-coin c${i}`} style={coinStyle(i)} />
                  ))}
                </div>
              </div>
            )}

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

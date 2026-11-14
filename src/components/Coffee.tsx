import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { art } from '../art';
import { COFFEE_SYMBOLS, TOPIC_INDEX, type CoffeeTopic } from '../data/coffee';
import type { Character } from '../data/types';
import { place } from './place';
import { Sprite } from './Sprite';
import { CUP, drawCoffee, saveCoffee, symbolScale, todaysCoffee, type CoffeeReading } from '../game/coffee';

/** Як відкрито ворожіння: нове за обраною темою або перечитування сьогоднішнього. */
export type CoffeeRun = { mode: 'new'; topic: CoffeeTopic } | { mode: 'again' };

/** Екран 1: речення з'являються по черзі в такт анімації (затримка в секундах). */
const BREW_LINES: [string, number][] = [
  ['Ви відкриваєте пакетик, засипаєте його в паперовий стаканчик, заливаєте кип’ятком і запах, знайомий з навчання, вдаряє вам у носа.', 0.4],
  ['Нота ностальгії, присмак першого кохання, фантом долара по 8 та гіркий післясмак невідворотно швидкоплинної молодості.', 2.8],
  ['Ви не можете позбутися почуття, що каву маєте заварювати не ви, а продавець, але вам сказали, що так треба для встановлення контакту з космосом.', 5],
];
const SIP_TEXT =
  'Важко сказати, чи вам смакує розчинна кава, чи спогади про кращі часи. І хоча вміст пакетику не мав би залишити сліди, щойно ви допили свій напій, на стінках стаканчика дійсно проступають певні символи.';
// Цього тексту в документі нема, його написав Claude.
const SPOTS_TEXT = 'Поки що це схоже на плями. Потрусіть стаканчик, можливо, щось проступить.';

const TIME_LINES = ['Це події, що минули.', 'Це події, що мають місце зараз.', 'Це події майбутнього.'];

type Phase = 'brew' | 'sip' | 'empty' | 'spin' | 'spun' | 'flip' | 'bottom' | 'spots' | 'shake' | 'read';

/** Само збігається з тривалістю анімацій у styles.css. */
const BREW_MS = 6800;
const AUTO: Partial<Record<Phase, [number, Phase]>> = {
  sip: [5400, 'empty'],
  spin: [1400, 'spun'],
  flip: [1000, 'bottom'],
  shake: [1250, 'read'],
};

const pct = (v: number, of: number) => `${(v / of) * 100}%`;

// ---------- екран 1: пакетик і стаканчик ----------

const BREW_BOX = { x: 330, y: 650, w: 730, h: 962 };
/** Рамка пакетика: об'єднання трьох кадрів. */
const SACHET = { x: 570, y: 656, w: 474, h: 499 };
/** Середина надірваного краю пакетика: навколо неї він нахиляється над стаканчиком. */
const EDGE = { x: 735, y: 780 };
/** Куди цю точку перенести, щоб пакетик завис над стаканчиком. */
const POUR_AT = { x: 570, y: 1110 };

/** Крупинки розчинної кави: рівномірно по краю пакетика й униз у стаканчик. */
const GRAINS = Array.from({ length: 40 }, (_, i) => {
  const t = (i * 0.618034) % 1;
  const sx = 426 + 288 * t;
  const sy = 1058 + 104 * t;
  const ex = Math.min(690, Math.max(410, sx + (((i * 37) % 11) / 11 - 0.5) * 60));
  const ey = 1215 + ((i * 53) % 7) * 5;
  return {
    x: ((sx - BREW_BOX.x) / BREW_BOX.w) * 100,
    y: ((sy - BREW_BOX.y) / BREW_BOX.h) * 100,
    gx: ((ex - sx) / BREW_BOX.w) * 100,
    gy: ((ey - sy) / BREW_BOX.w) * 100,
    delay: 3.1 + (i / 40) * 1.6 + ((i * 17) % 5) * 0.04,
    size: 1.7 + ((i * 29) % 5) * 0.3,
    tone: i % 3,
  };
});

function BrewStage() {
  const s1 = art('coffee/coffe_stick1');
  const s2 = art('coffee/coffe_stick2');
  const s3 = art('coffee/coffe_stick3');
  const cup = art('coffee/cup_empthy1');
  const wrapper: CSSProperties = {
    left: pct(SACHET.x - BREW_BOX.x, BREW_BOX.w),
    top: pct(SACHET.y - BREW_BOX.y, BREW_BOX.h),
    width: pct(SACHET.w, BREW_BOX.w),
    height: pct(SACHET.h, BREW_BOX.h),
    transformOrigin: `${pct(EDGE.x - SACHET.x, SACHET.w)} ${pct(EDGE.y - SACHET.y, SACHET.h)}`,
    ['--tx' as string]: pct(POUR_AT.x - EDGE.x, SACHET.w),
    ['--ty' as string]: pct(POUR_AT.y - EDGE.y, SACHET.h),
  };
  return (
    <div className="cf brew" style={{ aspectRatio: `${BREW_BOX.w} / ${BREW_BOX.h}` }}>
      <Sprite name="coffee/cup_empthy1" style={place(cup, BREW_BOX)} />
      <div className="cf-sachet" style={wrapper}>
        {/* Нижній шар без смужки, поверх нього кадр зі смужкою розчиняється. */}
        <Sprite name="coffee/coffe_stick3" className="cf-s3" style={place(s3, SACHET)} />
        <Sprite name="coffee/coffe_stick1" className="cf-s1" style={place(s1, SACHET)} />
        <Sprite name="coffee/coffe_stick2" className="cf-s2" style={place(s2, SACHET)} />
      </div>
      {GRAINS.map((g, i) => (
        <i
          key={i}
          className={`cf-grain t${g.tone}`}
          style={{
            left: `${g.x}%`,
            top: `${g.y}%`,
            width: `${g.size}cqw`,
            height: `${g.size}cqw`,
            animationDelay: `${g.delay}s`,
            ['--gx' as string]: `${g.gx}cqw`,
            ['--gy' as string]: `${g.gy}cqw`,
          }}
        />
      ))}
    </div>
  );
}

// ---------- екрани 2+: стаканчик ----------

const CUP_BOX = { w: 660, h: 640 };
/** Запас знизу, щоб чашка, що трясеться, не виходила за рамку. */
const CUP_PAD = 24;
/** Центр дна чашки в рамці. Нижній край чашки сидить на 4 px від низу. */
const CUP_AT = { x: CUP_BOX.w / 2, y: CUP_BOX.h - CUP_PAD - (1605 - CUP.cy) };

/**
 * Клуб пари: вузький знизу й зверху, посередині ширший, тягнеться вгору хвилею. Ширина «пливе», тому форма
 * виходить аморфною, а не лінією однієї товщини. Малюється суцільною заливкою, а не обводкою.
 */
function steamWisp(x: number, base: number, height: number, sway: number, width: number, phase: number) {
  const steps = 32;
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = x + Math.sin(t * 6.6 + phase) * sway * (0.25 + t * 0.9);
    const taper = Math.pow(Math.sin(Math.PI * Math.min(1, 0.06 + t * 0.9)), 0.75);
    const w = Math.max(1.5, width * taper * (1 + 0.3 * Math.sin(t * 8.5 + phase * 1.7)) * (1 - 0.3 * t));
    const y = base - t * height;
    left.push(`${(cx - w / 2).toFixed(1)} ${y.toFixed(1)}`);
    right.push(`${(cx + w / 2).toFixed(1)} ${y.toFixed(1)}`);
  }
  return `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
}

const STEAM = [
  { d: steamWisp(40, 124, 100, 12, 38, 0.4), delay: 0, dur: 3.4 },
  { d: steamWisp(84, 126, 114, 14, 48, 2.1), delay: 0.5, dur: 3.8 },
  { d: steamWisp(122, 124, 94, 11, 36, 4.2), delay: 1, dur: 3.2 },
  { d: steamWisp(62, 120, 70, 9, 30, 5.4), delay: 1.5, dur: 3 },
];

interface CupStageProps {
  phase: Phase;
  reading: CoffeeReading | null;
  lit: number | null;
}

function CupStage({ phase, reading, lit }: CupStageProps) {
  const front = art('coffee/cup_empthy2');
  const liquid = art('coffee/liquid');
  const frontStyle: CSSProperties = {
    left: pct(CUP_BOX.w / 2 - front.w / 2, CUP_BOX.w),
    top: pct(CUP_BOX.h - CUP_PAD - front.h, CUP_BOX.h),
    width: pct(front.w, CUP_BOX.w),
    height: pct(front.h, CUP_BOX.h),
  };
  // Спрайти вигляду зверху ставимо за центром дна, а не за краєм картинки.
  const top = (name: string): CSSProperties => {
    const a = art(name);
    return {
      left: pct(CUP_AT.x + ((a.x ?? 0) - CUP.cx), CUP_BOX.w),
      top: pct(CUP_AT.y + ((a.y ?? 0) - CUP.cy), CUP_BOX.h),
      width: pct(a.w, CUP_BOX.w),
    };
  };
  const centered = (name: string, dx: number, dy: number, scale: number): CSSProperties => {
    const a = art(name);
    return {
      left: pct(CUP_AT.x + dx - (a.w * scale) / 2, CUP_BOX.w),
      top: pct(CUP_AT.y + dy - (a.h * scale) / 2, CUP_BOX.h),
      width: pct(a.w * scale, CUP_BOX.w),
    };
  };

  return (
    <div className="cf cup" data-phase={phase} style={{ aspectRatio: `${CUP_BOX.w} / ${CUP_BOX.h}` }}>
      <div className="cf-front" style={frontStyle}>
        <Sprite name="coffee/cup_empthy2" className="cf-empty" style={{ left: 0, top: 0, width: '100%' }} />
        <Sprite name="coffee/cup_with_coffee" className="cf-full" style={{ left: 0, top: 0, width: '100%' }} />
        <Sprite
          name="coffee/liquid"
          className="cf-liquid"
          style={{
            left: pct((liquid.x ?? 0) - (front.x ?? 0), front.w),
            top: pct((liquid.y ?? 0) - (front.y ?? 0), front.h),
            width: pct(liquid.w, front.w),
          }}
        />
      </div>

      <svg
        className="cf-steam"
        viewBox="0 0 160 130"
        style={{ left: pct(CUP_BOX.w / 2 - 125, CUP_BOX.w), top: pct(36, CUP_BOX.h), width: pct(250, CUP_BOX.w) }}
        aria-hidden="true"
      >
        {STEAM.map((w) => (
          <path key={w.d} d={w.d} style={{ animationDelay: `${w.delay}s`, animationDuration: `${w.dur}s` }} />
        ))}
      </svg>

      <div
        className="cf-top"
        style={{ transformOrigin: `${pct(CUP_AT.x, CUP_BOX.w)} ${pct(CUP_AT.y, CUP_BOX.h)}` }}
      >
        <Sprite name="coffee/cup_back" className="cf-clean" style={top('coffee/cup_back')} />
        <Sprite name="coffee/cup" className="cf-grounds" style={top('coffee/cup')} />
        {reading?.picks.map((p, i) => {
          // Плями більші за символи: стискаємо й підтягуємо до центру, щоб не виходили за край чашки.
          const a = art(`coffee/spot${p.spot}`);
          const scale = 0.8;
          const maxR = Math.max(0, CUP.outerR - 10 - (Math.max(a.w, a.h) * scale * 0.8) / 2);
          const r = Math.hypot(p.dx, p.dy);
          const k = r > maxR ? maxR / r : 1;
          return (
            <Sprite
              key={`spot${i}`}
              name={`coffee/spot${p.spot}`}
              className="cf-spot"
              style={{ ...centered(`coffee/spot${p.spot}`, p.dx * k, p.dy * k, scale), rotate: `${p.spotRot}deg` }}
            />
          );
        })}
        {reading?.picks.map((p) => {
          const a = art(`coffee/${p.id}`);
          return (
            <Sprite
              key={p.id}
              name={`coffee/${p.id}`}
              className="cf-sym"
              style={{ ...centered(`coffee/${p.id}`, p.dx, p.dy, symbolScale(a.w, a.h)), rotate: `${p.rot}deg` }}
            />
          );
        })}
        {reading && lit !== null && (
          <i
            key={`lit${lit}`}
            className="cf-lit"
            style={(() => {
              const p = reading.picks[lit];
              const a = art(`coffee/${p.id}`);
              const d = Math.max(a.w, a.h) * symbolScale(a.w, a.h) * 1.5;
              return {
                left: pct(CUP_AT.x + p.dx - d / 2, CUP_BOX.w),
                top: pct(CUP_AT.y + p.dy - d / 2, CUP_BOX.h),
                width: pct(d, CUP_BOX.w),
                aspectRatio: '1',
              };
            })()}
          />
        )}
      </div>
    </div>
  );
}

// ---------- ворожіння ----------

interface Props {
  character: Character;
  run: CoffeeRun;
  /** Викликається в момент, коли символи проступили: тоді списується монета. */
  onReveal: () => void;
  onClose: () => void;
}

export function CoffeeRitual({ character, run, onReveal, onClose }: Props) {
  const saved = run.mode === 'again' ? todaysCoffee() : null;
  const [phase, setPhase] = useState<Phase>(saved ? 'read' : 'brew');
  const [reading, setReading] = useState<CoffeeReading | null>(saved);
  const [step, setStep] = useState(saved ? 3 : 0);
  const [lit, setLit] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const lastPart = useRef<HTMLDivElement>(null);
  const voice = character.coffee;

  useEffect(() => {
    if (phase === 'brew') {
      const id = setTimeout(() => setReady(true), BREW_MS);
      return () => clearTimeout(id);
    }
    const auto = AUTO[phase];
    if (!auto) return;
    const id = setTimeout(() => {
      if (phase === 'shake') {
        setStep(1);
        setLit(0);
      }
      setPhase(auto[1]);
    }, auto[0]);
    return () => clearTimeout(id);
  }, [phase]);

  // Новий абзац тлумачення підсуваємо під закріплену чашку.
  // Прокручуємо тільки саму рамку: scrollIntoView зсунув би ще й усю сцену.
  useEffect(() => {
    const part = lastPart.current;
    const box = part?.closest<HTMLElement>('.oracle-scroll');
    // Лише коли читач сам відкрив наступний абзац: перечитування й «Показати все» лишаються зверху.
    if (phase !== 'read' || lit === null || step < 2 || !part || !box) return;
    const sticky = box.querySelector<HTMLElement>('.cf-sticky')?.offsetHeight ?? 0;
    const top = part.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - sticky;
    box.scrollTo({ top, behavior: 'smooth' });
  }, [phase, step, lit]);

  const topic = run.mode === 'new' ? run.topic : (reading?.topic ?? 'events');

  const parts = (reading?.picks ?? []).map((p, i) => {
    const symbol = COFFEE_SYMBOLS.find((s) => s.id === p.id);
    return { symbol, text: symbol?.texts[i][TOPIC_INDEX[topic]] ?? '', lead: voice.leads[i], time: TIME_LINES[i] };
  });

  const toSpots = () => {
    setReading(drawCoffee(topic));
    setPhase('spots');
  };
  const shake = () => {
    if (!reading) return;
    saveCoffee(reading);
    onReveal();
    setPhase('shake');
  };

  // Після «Покрутіть» тексту нема, але місце під ним лишається, щоб чашка й кнопки не стрибали.
  const textHidden = phase === 'spin' || phase === 'spun' || phase === 'flip' || phase === 'bottom';
  const text = phase === 'spots' || phase === 'shake' ? SPOTS_TEXT : phase !== 'read' && phase !== 'brew' ? SIP_TEXT : '';

  const action: [string, () => void] | null =
    phase === 'brew' ? (ready ? ['Далі', () => setPhase('sip')] : null)
    : phase === 'empty' ? ['Покрутіть стакан', () => setPhase('spin')]
    : phase === 'spun' ? ['Переверніть', () => setPhase('flip')]
    : phase === 'bottom' ? ['Дізнатися тлумачення', toSpots]
    : phase === 'spots' ? ['Потрусити стаканчик', shake]
    : null;

  const reveal = () => {
    setLit(step);
    setStep(step + 1);
  };

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle cf-frame" role="dialog" aria-label="Ворожіння на Маккохфе">
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>
        <div className="oracle-scroll">
          <div className="oracle-body cf-body">
            <div className={phase === 'read' ? 'cf-sticky on' : 'cf-sticky'}>
              <div className={phase === 'brew' ? 'cf-wrap brew' : 'cf-wrap'}>
                {phase === 'brew' ? <BrewStage /> : <CupStage phase={phase} reading={reading} lit={lit} />}
              </div>
            </div>

            {phase === 'brew' && (
              <p className="cf-text">
                {BREW_LINES.map(([line, delay]) => (
                  <span className="cf-line" key={line} style={{ animationDelay: `${delay}s` }}>{line} </span>
                ))}
              </p>
            )}
            {text && <p className={textHidden ? 'cf-text fixed gone' : 'cf-text fixed'} key={text}>{text}</p>}

            {phase === 'read' && (
              <div className="cf-read">
                {parts.slice(0, step).map((part, i) => (
                  <div className="cf-part" key={i} ref={i === step - 1 ? lastPart : undefined}>
                    <p>
                      {i === 0 && <>{voice.intro} </>}
                      {part.lead} <b>{part.symbol?.name}.</b> {part.time} {part.text}
                    </p>
                    {i === 2 && <p className="cf-outro">{voice.outro}</p>}
                  </div>
                ))}
              </div>
            )}

            {phase !== 'read' &&
              (action ? (
                <button className="reply done cf-action" key={phase} onClick={action[1]}>{action[0]}</button>
              ) : (
                // Невидима кнопка тримає місце, щоб чашка не стрибала, коли справжня з'являється чи зникає.
                <button className="reply done cf-action ghost" tabIndex={-1} aria-hidden="true" disabled>Дізнатися тлумачення</button>
              ))}

            {phase === 'read' && step < 3 && (
              <>
                <button className="reply done cf-action" onClick={reveal}>Далі</button>
                <button
                  className="cf-link"
                  onClick={() => {
                    setStep(3);
                    setLit(null);
                  }}
                >
                  Показати все
                </button>
              </>
            )}
            {phase === 'read' && step >= 3 && <button className="reply done cf-action" onClick={onClose}>Гаразд</button>}
          </div>
        </div>
      </div>
    </>
  );
}

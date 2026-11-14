import { useState, type ReactNode } from 'react';
import { art } from '../art';
import { HEXAGRAMS, type Hexagram } from '../data/iching';
import { MO_READINGS, MO_SYLLABLES } from '../data/mo';
import { splitReading, TAROT_CARDS, tarotArtKey, type TarotCard } from '../data/tarot';
import type { Character, SystemId } from '../data/types';
import { Astro } from './Astro';
import { BallRitual } from './Ball';
import { CoffeeRitual, type CoffeeRun } from './Coffee';

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

function Img({ name, className }: { name: string; className?: string }) {
  const a = art(name);
  return <img className={className} src={a.src} width={a.w} height={a.h} alt="" draggable={false} />;
}

interface RevealProps<T> {
  roll: () => T;
  back: ReactNode;
  result: (r: T) => ReactNode;
  onReveal: () => void;
  onClose: () => void;
  label: string;
}

/** Велика рамка: спершу «Тик!», після тапу випадає результат. Монета списується в момент відкриття. */
function RevealOracle<T>({ roll, back, result, onReveal, onClose, label }: RevealProps<T>) {
  const [rolled, setRolled] = useState<{ value: T } | null>(null);

  const reveal = () => {
    setRolled({ value: roll() });
    onReveal();
  };

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle" role="dialog" aria-label={label}>
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>
        <div className="oracle-scroll">
          {rolled ? (
            <div className="oracle-body reveal">
              {result(rolled.value)}
              <button className="reply done" onClick={onClose}>Гаразд</button>
            </div>
          ) : (
            <button className="oracle-body tick-target" onClick={reveal}>
              {back}
              <span className="tick">Тик!</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

interface OracleProps {
  character: Character;
  /** Для ворожіння на каві: нове за темою чи перечитування. */
  coffee?: CoffeeRun;
  onReveal: () => void;
  onClose: () => void;
}

function Tarot({ character, onReveal, onClose }: OracleProps) {
  return (
    <RevealOracle<TarotCard>
      label="Таро"
      roll={() => pick(TAROT_CARDS)}
      onReveal={onReveal}
      onClose={onClose}
      back={<Img name="tarot/tarot_deck" className="card" />}
      result={(card) => {
        const { title, body } = splitReading(character.tarot[card]);
        return (
          <>
            <Img name={tarotArtKey(card)} className="card" />
            <h2 className="result-title">{title}</h2>
            <p className="result-text">{body}</p>
          </>
        );
      }}
    />
  );
}

/** Шість ліній гексаграми знизу вгору: суцільна — ян, перервана — інь. */
function HexagramLines({ lines }: { lines: number[] }) {
  return (
    <svg className="hexagram" viewBox="0 0 100 88" role="img" aria-label="Гексаграма">
      {[...lines].reverse().map((yang, i) => (
        <g key={i} transform={`translate(0 ${i * 15.2})`}>
          {yang ? (
            <rect width="100" height="10" rx="3" />
          ) : (
            <>
              <rect width="42" height="10" rx="3" />
              <rect x="58" width="42" height="10" rx="3" />
            </>
          )}
        </g>
      ))}
    </svg>
  );
}

function IChing({ onReveal, onClose }: OracleProps) {
  return (
    <RevealOracle<Hexagram>
      label="І-Цзин"
      roll={() => pick(HEXAGRAMS)}
      onReveal={onReveal}
      onClose={onClose}
      back={<Img name="i-tsin/flip_a_coin" className="coin" />}
      result={(h) => (
        <>
          <HexagramLines lines={h.lines} />
          <h2 className="result-title">№ {h.n} · {h.name}</h2>
          <p className="result-text">{h.text}</p>
        </>
      )}
    />
  );
}

function Mo({ onReveal, onClose }: OracleProps) {
  return (
    <RevealOracle<[number, number]>
      label="Тибетське ворожіння МО"
      roll={() => [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)]}
      onReveal={onReveal}
      onClose={onClose}
      back={<Img name="mo/mo_back" className="dice-back" />}
      result={([a, b]) => (
        <>
          <div className="dice">
            <Img name={`mo/${MO_SYLLABLES[a].id}`} className="die" />
            <Img name={`mo/${MO_SYLLABLES[b].id}`} className="die" />
          </div>
          <h2 className="result-title">{MO_SYLLABLES[a].label} · {MO_SYLLABLES[b].label}</h2>
          <p className="result-text">{MO_READINGS[a][b]}</p>
        </>
      )}
    />
  );
}

export function Oracle({ system, ...props }: OracleProps & { system: SystemId }) {
  switch (system) {
    case 'tarot': return <Tarot {...props} />;
    case 'ball': return <BallRitual onReveal={props.onReveal} onClose={props.onClose} />;
    case 'coffee': return <CoffeeRitual character={props.character} run={props.coffee ?? { mode: 'new', topic: 'events' }} onReveal={props.onReveal} onClose={props.onClose} />;
    case 'iching': return <IChing {...props} />;
    case 'mo': return <Mo {...props} />;
    case 'astro': return <Astro onClose={props.onClose} />;
    default: return null;
  }
}

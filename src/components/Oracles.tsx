import { useState, type ReactNode } from 'react';
import { art } from '../art';
import { COFFEE_SYMBOLS, MAGIC_BALL_ANSWERS, type CoffeeSymbol } from '../data/oracles';
import { splitReading, TAROT_CARDS, tarotArtKey, type TarotCard } from '../data/tarot';
import type { Character, SystemId } from '../data/types';

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
    </>
  );
}

interface OracleProps {
  character: Character;
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

// Синій трикутник на ball_front, у частках від розміру кулі.
const BALL_TRIANGLE = { left: 33.2, width: 35, top: 35, height: 18 };

/** Короткі відповіді — крупніше, довгі переносяться на два рядки й стають дрібнішими. */
const answerSize = (answer: string) => (answer.length <= 7 ? '8.4cqw' : answer.length <= 13 ? '5.6cqw' : '4.2cqw');

function Ball({ onReveal, onClose }: OracleProps) {
  return (
    <RevealOracle<string>
      label="Магічна куля"
      roll={() => pick(MAGIC_BALL_ANSWERS)}
      onReveal={onReveal}
      onClose={onClose}
      back={<div className="ball"><Img name="magic_ball/ball_back" /></div>}
      result={(answer) => (
        <div className="ball">
          <Img name="magic_ball/ball_front" />
          <span
            className="ball-answer"
            style={{ ...pos(BALL_TRIANGLE), fontSize: answerSize(answer) }}
          >
            {answer}
          </span>
        </div>
      )}
    />
  );
}

const pos = (r: { left: number; width: number; top: number; height: number }) => ({
  left: `${r.left}%`, width: `${r.width}%`, top: `${r.top}%`, height: `${r.height}%`,
});

function Coffee({ onReveal, onClose }: OracleProps) {
  return (
    <RevealOracle<CoffeeSymbol[]>
      label="Ворожіння на Маккохфе"
      roll={() => {
        const first = pick(COFFEE_SYMBOLS);
        return [first, pick(COFFEE_SYMBOLS.filter((s) => s !== first))];
      }}
      onReveal={onReveal}
      onClose={onClose}
      back={<Img name="coffee/cup_back" className="cup" />}
      result={(symbols) => (
        <>
          <Img name="coffee/cup" className="cup" />
          {symbols.map((s) => (
            <p className="symbol" key={s.name}>
              <b>{s.name}</b> — {s.meaning}
            </p>
          ))}
        </>
      )}
    />
  );
}

export function Oracle({ system, ...props }: OracleProps & { system: SystemId }) {
  switch (system) {
    case 'tarot': return <Tarot {...props} />;
    case 'ball': return <Ball {...props} />;
    case 'coffee': return <Coffee {...props} />;
    default: return null;
  }
}

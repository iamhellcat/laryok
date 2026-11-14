import { useEffect, useState, type CSSProperties } from 'react';
import { art } from '../art';
import { MO_READINGS, MO_SYLLABLES } from '../data/mo';
import { Sprite } from './Sprite';

const ASK_TEXT =
  'Мо — це форма ворожіння на кісточках, яка є частиною культури й релігії Тибету. Тибетський народ звертається до Мо при прийнятті важливих рішень. На гранях кісточок написані склади мантри, кожен з яких позначає певну стихію та енергію.';

/** Рамка сцени: кубики з запасом угорі, щоб вони могли підскочити. */
const BOX = { x: 267, y: 1311, w: 672, h: 449 };

/** Де стоять два кубики (лівий і правий), у пікселях полотна. Розміри кубика 240×250. */
const DICE = [
  { x: 307, y: 1471 },
  { x: 660, y: 1469 },
] as const;

type Phase = 'ask' | 'toss' | 'done';

/** Скільки триває підкидання, мс; збігається з анімаціями в styles.css. */
const TOSS_MS = 1500;

const roll = () => Math.floor(Math.random() * MO_SYLLABLES.length);

/** Назву комбінації в «ялинках» виділяємо жирним. */
function Reading({ text }: { text: string }) {
  return (
    <>
      {text.split(/(«[^»]+»)/).map((part, i) => (part.startsWith('«') ? <b key={i}>{part}</b> : part))}
    </>
  );
}

interface Props {
  /** Викликається, коли кісточки кинули: тоді списується монета. */
  onReveal: () => void;
  onClose: () => void;
}

/** Тибетське ворожіння МО: розповідь про МО, кнопка, два кубики підскакують, крутяться й падають символами догори. */
export function MoRitual({ onReveal, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('ask');
  const [faces, setFaces] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (phase !== 'toss') return;
    const id = setTimeout(() => setPhase('done'), TOSS_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const toss = () => {
    setFaces([roll(), roll()]);
    onReveal();
    setPhase('toss');
  };

  const blank = art('mo/blank');
  const dieStyle = (i: number): CSSProperties => ({
    left: `${((DICE[i].x - BOX.x) / BOX.w) * 100}%`,
    top: `${((DICE[i].y - BOX.y) / BOX.h) * 100}%`,
    width: `${(blank.w / BOX.w) * 100}%`,
    height: `${(blank.h / BOX.h) * 100}%`,
  });

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle cf-frame" role="dialog" aria-label="Тибетське ворожіння МО">
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>
        <div className="oracle-scroll">
          <div className="oracle-body cf-body top">
            <div className="mo-wrap">
              <div className="cf mo" data-phase={phase} style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}>
                {DICE.map((_, i) => (
                  <div className={`mo-die d${i}`} key={i} style={dieStyle(i)}>
                    <Sprite name="mo/blank" className="mo-blank" />
                    <Sprite name={`mo/${MO_SYLLABLES[faces[i]].id}`} className="mo-face" />
                  </div>
                ))}
              </div>
            </div>

            {phase === 'done' ? (
              <p className="cf-text mo-reading" key="reading">
                <Reading text={MO_READINGS[faces[0]][faces[1]]} />
              </p>
            ) : (
              <p className={phase === 'ask' ? 'cf-text' : 'cf-text bl-hint-out'}>{ASK_TEXT}</p>
            )}

            {phase === 'ask' && <button className="reply done cf-action" onClick={toss}>Кинути кісточки</button>}
            {phase === 'done' && <button className="reply done cf-action" onClick={onClose}>Гаразд</button>}
            {phase === 'toss' && (
              // Невидима кнопка тримає місце, щоб кубики не зсувались.
              <button className="reply done cf-action ghost" tabIndex={-1} aria-hidden="true" disabled>Кинути кісточки</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

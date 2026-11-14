import { useEffect, useState, type CSSProperties } from 'react';
import { art } from '../art';
import { MAGIC_BALL_ANSWERS } from '../data/oracles';
import { place } from './place';
import { Sprite } from './Sprite';

const ASK_TEXT = 'Загадайте одне просте питання, на яке можна відповісти «так» або «ні» та потрусіть кулю.';

/** Рамка сцени: кулька з запасом по 40 px, щоб вона могла трястися, не виходячи за межі. */
const BOX = { x: 257, y: 783, w: 800, h: 766 };

/** Місце для відповіді на синьому трикутнику (dice_still), у пікселях полотна. Трикутник вужчий донизу. */
const ANSWER = { x: 544, y: 1066, w: 222, h: 76 };

type Phase = 'ask' | 'shake' | 'roll' | 'done';

/** Скільки триває кожна стадія, мс; збігається з анімаціями в styles.css. */
const AUTO: Partial<Record<Phase, [number, Phase]>> = {
  shake: [1300, 'roll'],
  roll: [2000, 'done'],
};

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

/** Короткі відповіді крупніше, довгі переносяться на два рядки й стають дрібнішими. */
const answerSize = (answer: string) => (answer.length <= 7 ? '9cqw' : answer.length <= 13 ? '5.4cqw' : '4.4cqw');

interface Props {
  /** Викликається, коли кулю потрусили: тоді списується монета. */
  onReveal: () => void;
  onClose: () => void;
}

/** Магічна куля: підказка й кнопка, потім куля трясеться, з її віконця викочується кубик і зупиняється з відповіддю. */
export function BallRitual({ onReveal, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('ask');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    const auto = AUTO[phase];
    if (!auto) return;
    const id = setTimeout(() => setPhase(auto[1]), auto[0]);
    return () => clearTimeout(id);
  }, [phase]);

  const shake = () => {
    setAnswer(pick(MAGIC_BALL_ANSWERS));
    onReveal();
    setPhase('shake');
  };

  const back = art('magic_ball/ball_back');
  const front = art('magic_ball/ball_front');
  const answerBox: CSSProperties = {
    left: `${((ANSWER.x - BOX.x) / BOX.w) * 100}%`,
    top: `${((ANSWER.y - BOX.y) / BOX.h) * 100}%`,
    width: `${(ANSWER.w / BOX.w) * 100}%`,
    height: `${(ANSWER.h / BOX.h) * 100}%`,
    fontSize: answerSize(answer),
  };

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle cf-frame" role="dialog" aria-label="Магічна куля">
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>
        <div className="oracle-scroll">
          <div className="oracle-body cf-body">
            <div className="bl-wrap">
              <div className="cf bl" data-phase={phase} style={{ aspectRatio: `${BOX.w} / ${BOX.h}` }}>
                <div className="bl-ball">
                  <Sprite name="magic_ball/ball_back" className="bl-back" style={place(back, BOX)} />
                  <Sprite name="magic_ball/ball_front" className="bl-front" style={place(front, BOX)} />
                  <Sprite name="magic_ball/dice_roll" className="bl-roll" style={place(art('magic_ball/dice_roll'), BOX)} />
                  <Sprite name="magic_ball/dice_still" className="bl-still" style={place(art('magic_ball/dice_still'), BOX)} />
                  <span className="bl-answer" style={answerBox}>{answer}</span>
                </div>
              </div>
            </div>

            <p className={phase === 'ask' ? 'cf-text' : 'cf-text bl-hint-out'}>{ASK_TEXT}</p>

            {phase === 'ask' && <button className="reply done cf-action" onClick={shake}>Потрусити</button>}
            {phase === 'done' && <button className="reply done cf-action" onClick={onClose}>Гаразд</button>}
            {(phase === 'shake' || phase === 'roll') && (
              // Невидима кнопка тримає місце, щоб куля не зсувалась.
              <button className="reply done cf-action ghost" tabIndex={-1} aria-hidden="true" disabled>Потрусити</button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

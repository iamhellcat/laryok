import { useEffect, useMemo, useState } from 'react';
import { art } from '../art';
import { MAGIC_BALL_ANSWERS } from '../data/oracles';
import { fitAnswer, TRIANGLE_CENTER_X } from '../game/fitAnswer';
import { place } from './place';
import { Sprite } from './Sprite';

const ASK_TEXT = 'Загадайте одне просте питання, на яке можна відповісти «так» або «ні», та потрусіть кулю.';

/** Рамка сцени: кулька з запасом по 40 px, щоб вона могла трястися, не виходячи за межі. */
const BOX = { x: 257, y: 783, w: 800, h: 766 };

/** Шрифт відповіді: ширину рядків міряємо ним же. */
const ANSWER_FONT = "700 100px 'Sofia Sans Extra Condensed', 'Arial Narrow', sans-serif";

/** Ширина рядка шрифтом розміру 1. */
const measureText = (() => {
  const ctx = document.createElement('canvas').getContext('2d');
  return (s: string) => {
    if (!ctx) return s.length * 0.4;
    ctx.font = ANSWER_FONT;
    return ctx.measureText(s).width / 100;
  };
})();

type Phase = 'ask' | 'shake' | 'roll' | 'done';

/** Скільки триває кожна стадія, мс; збігається з анімаціями в styles.css. */
const AUTO: Partial<Record<Phase, [number, Phase]>> = {
  shake: [1300, 'roll'],
  roll: [2000, 'done'],
};

const pick = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)];

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
  // Довга відповідь розбивається на рядки, щоб шрифт був якнайбільший і вміщався у трикутник.
  const layout = useMemo(() => (answer ? fitAnswer(answer, measureText) : null), [answer]);
  const answerStyle = layout && {
    left: `${((TRIANGLE_CENTER_X - 160 - BOX.x) / BOX.w) * 100}%`,
    width: `${(320 / BOX.w) * 100}%`,
    top: `${((layout.top - BOX.y) / BOX.h) * 100}%`,
    fontSize: `${(layout.size / BOX.w) * 100}cqw`,
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
                  <span className="bl-answer" style={answerStyle ?? undefined}>
                    {layout?.lines.map((line) => <span className="bl-line" key={line}>{line}</span>)}
                  </span>
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

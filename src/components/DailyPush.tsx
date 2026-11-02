import { coinWord, type DailyPush as Push } from '../game/wallet';

/** Сповіщення про щоденні монети. Тап будь-де закриває його. */
export function DailyPush({ push, onClose }: { push: Push; onClose: () => void }) {
  return (
    <>
      <button className="backdrop" aria-label="Закрити" onClick={onClose} />
      <div className="frame push" role="alert">
        <h2>+{push.gain} {coinWord(push.gain)}</h2>
        <p>{push.line}</p>
      </div>
    </>
  );
}

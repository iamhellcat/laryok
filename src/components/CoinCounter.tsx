import { art, CANVAS } from '../art';

export function CoinCounter({ balance }: { balance: number }) {
  const a = art('coins');
  return (
    <div
      className="coins"
      role="status"
      aria-label={`Монет: ${balance}`}
      style={{ left: `${((a.x ?? 0) / CANVAS.w) * 100}%`, top: `${((a.y ?? 0) / CANVAS.h) * 100}%`, width: `${(a.w / CANVAS.w) * 100}%` }}
    >
      <img src={a.src} alt="" draggable={false} />
      <span className="coins-count">{balance}</span>
    </div>
  );
}

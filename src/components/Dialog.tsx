import type { Reply } from '../data/types';

interface Props {
  say: string;
  replies: Reply[];
  onReply: (r: Reply) => void;
  onClose: () => void;
}

export function Dialog({ say, replies, onReply, onClose }: Props) {
  return (
    <div className="frame dialog" role="dialog" aria-label="Розмова">
      <button className="close" aria-label="Закрити" onClick={onClose}>×</button>
      <p className="say" key={say}>{say}</p>
      <div className={replies.length > 3 ? 'replies many' : 'replies'}>
        {replies.map((r) => (
          <button key={r.label} className="reply" onClick={() => onReply(r)}>{r.label}</button>
        ))}
      </div>
    </div>
  );
}

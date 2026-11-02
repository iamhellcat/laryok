import { useMemo } from 'react';
import { MERCURY_RETROGRADE } from '../data/astro';
import { computeAstro, type MoonPhaseInfo } from '../game/astro';

const clock = (d: Date) => d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

/** Фаза Місяця: освітлена частина малюється з кута Сонце–Місяць (на північній півкулі зростаючий світиться справа). */
function MoonIcon({ phase }: { phase: MoonPhaseInfo }) {
  const a = phase.waxing ? phase.angle : 360 - phase.angle;
  const rx = Math.abs(Math.cos((a * Math.PI) / 180)) * 40;
  const lit = `M50 10 A40 40 0 0 1 50 90 A${rx} 40 0 0 ${a < 90 ? 0 : 1} 50 10Z`;
  return (
    <svg className="moon-icon" viewBox="0 0 100 100" role="img" aria-label={phase.name}>
      <circle cx="50" cy="50" r="40" className="moon-dark" />
      <path d={lit} className="moon-lit" transform={phase.waxing ? undefined : 'translate(100 0) scale(-1 1)'} />
      <circle cx="50" cy="50" r="40" className="moon-rim" />
    </svg>
  );
}

/** Газета «Сьогодні»: місячна доба, Місяць у знаку й аспекти дня. */
export function Astro({ onClose }: { onClose: () => void }) {
  const r = useMemo(() => computeAstro(), []);
  const percent = Math.round(r.phase.illumination * 100);

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle paper" role="dialog" aria-label="Астро вісник">
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>

        <header className="paper-head">
          <h2>СЬОГОДНІ</h2>
          <p>{r.dateLabel}</p>
        </header>

        <section className="paper-moon">
          <MoonIcon phase={r.phase} />
          <div>
            <h3>{r.phase.name}</h3>
            <p className="note">{percent}% освітлення · {r.lunarDay.n}-та місячна доба</p>
          </div>
        </section>
        <p className="paper-text">
          <b>{r.lunarDay.title}.</b> Сприятливо: {r.lunarDay.good}. Краще уникати: {r.lunarDay.avoid}.
        </p>

        <section>
          <h3>Місяць {r.moonSign.in}</h3>
          <p className="paper-text">{r.moonSign.moon}</p>
          {r.moonIngress && (
            <p className="note">О {clock(r.moonIngress.time)} Місяць переходить у знак «{r.moonIngress.sign.name}».</p>
          )}
        </section>

        <section>
          <h3>Аспекти дня</h3>
          {r.events.length === 0 && <p className="paper-text">Сьогодні без гучних подій: спокійний космічний фон.</p>}
          {r.events.map((e) => (
            <p className={`paper-text event ${e.tone}`} key={e.title + e.time.getTime()}>
              <b>{clock(e.time)} · {e.title}.</b> {e.text}
            </p>
          ))}
        </section>

        <section>
          <h3>Сонце {r.sunSign.in}</h3>
          {r.retrograde.length > 0 && <p className="note">Ретроградні: {r.retrograde.join(', ')}.</p>}
          {r.mercuryRetrograde && <p className="paper-text">{MERCURY_RETROGRADE}</p>}
        </section>

        <p className="paper-tip">{r.summary}</p>
        <button className="reply done" onClick={onClose}>Гаразд</button>
      </div>
    </>
  );
}

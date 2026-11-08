import { useMemo } from 'react';
import { computeAstro, type MoonPhaseInfo } from '../game/astro';

/** Ділить текст на заголовок (перше речення без крапки) і решту. */
function splitHead(text: string) {
  const i = text.indexOf('. ');
  return i < 0 ? { head: text, body: '' } : { head: text.slice(0, i), body: text.slice(i + 2) };
}

/** «сьогодні о 17:52» або «13 листопада о 17:52». */
function when(d: Date, today: Date) {
  const day = d.toDateString() === today.toDateString() ? 'сьогодні' : d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  return `${day} о ${clock(d)}`;
}

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
  const moonSign = splitHead(r.moonSign);
  const sunSign = splitHead(r.sunSign);
  // Перше речення опису доби — жирним, решта звичайним текстом.
  const cut = r.lunarDay.text.indexOf('. ');
  const lunarLead = cut < 0 ? r.lunarDay.text : r.lunarDay.text.slice(0, cut + 1);
  const lunarBody = cut < 0 ? '' : r.lunarDay.text.slice(cut + 2);

  return (
    <>
      <button className="backdrop dim" aria-label="Закрити" onClick={onClose} />
      <div className="frame oracle paper" role="dialog" aria-label="Астро вісник">
        <button className="close" aria-label="Закрити" onClick={onClose}>×</button>

        <div className="oracle-scroll">
          <header className="paper-head">
            <h2>СЬОГОДНІ</h2>
            <p>{r.dateLabel}</p>
          </header>

          <section className="paper-moon">
            <MoonIcon phase={r.phase} />
            <div>
              <h3>{r.phase.name}</h3>
              <p className="note">{percent}% освітлення · {r.lunarDay.n} місячна доба</p>
            </div>
          </section>
          <p className="paper-text">
            <b>{lunarLead}</b> {lunarBody}
          </p>

          <section>
            <h3>{moonSign.head}</h3>
            <p className="paper-text">{moonSign.body}</p>
            {r.moonIngress && (
              <p className="note">О {clock(r.moonIngress.time)} Місяць переходить у знак «{r.moonIngress.sign}».</p>
            )}
          </section>

          <section>
            <h3>{sunSign.head}</h3>
            <p className="paper-text">{sunSign.body}</p>
            {r.sunIngress && (
              <p className="note">О {clock(r.sunIngress.time)} Сонце переходить у знак «{r.sunIngress.sign}».</p>
            )}
          </section>

          {(r.retrograde.length > 0 || r.stations.length > 0) && (
            <section>
              <h3>Ретрогради</h3>
              {r.stations.map((st) => (
                <p className="note" key={st.text}>О {clock(st.time)} {st.text}</p>
              ))}
              {r.retrograde.map(({ text, exit }) => {
                const { head, body } = splitHead(text);
                return (
                  <div key={head}>
                    <p className="paper-text">
                      <b>{head}.</b> {body}
                    </p>
                    {exit && <p className="note">Вийде з ретроградності {when(exit, r.today)}.</p>}
                  </div>
                );
              })}
            </section>
          )}

          <section>
            <h3>Висновки дня</h3>
            {r.events.length === 0 && <p className="paper-text">Сьогодні без гучних подій: спокійний космічний фон.</p>}
            {r.main && <p className="paper-text"><b>{r.main}</b></p>}
            {r.events.map((e) => (
              <p className={`paper-text event ${e.tone}`} key={e.title + e.time.getTime()}>
                <b>{clock(e.time)} · {e.title}.</b> {e.text}
                {e.detail && <span className="detail">{e.detail}</span>}
              </p>
            ))}
            <p className="paper-tip">{r.summary}</p>
          </section>

          <button className="reply done" onClick={onClose}>Гаразд</button>
        </div>
      </div>
    </>
  );
}

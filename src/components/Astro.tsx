import { useMemo, useState } from 'react';
import { ASPECT_NAMES } from '../data/astro';
import { computeAstro, type AspectToday, type MoonPhaseInfo } from '../game/astro';

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

const VOWELS = 'аеєиіїоуюяАЕЄИІЇОУЮЯ';

/** «Сонце й Місяць», «Місяць і Венера»: «й» після голосної, «і» після приголосної. */
const andJoin = (a: string, b: string) => `${a} ${VOWELS.includes(a.slice(-1)) ? 'й' : 'і'} ${b}`;

/** «А, Б та В». */
function listJoin(items: string[]) {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} та ${items[items.length - 1]}`;
}

/** Рядок зверху блоку: «Сьогодні наявні: квадратури Місяця й Венери та …; з’єднання Марса й Юпітера.» */
function aspectLine(aspects: AspectToday[]) {
  const parts = (['square', 'opposition', 'conjunction'] as const)
    .map((kind) => {
      const list = aspects.filter((a) => a.kind === kind);
      if (list.length === 0) return '';
      const name = list.length === 1 ? ASPECT_NAMES[kind].one : ASPECT_NAMES[kind].many;
      return `${name} ${listJoin(list.map((a) => andJoin(a.genitive[0], a.genitive[1])))}`;
    })
    .filter(Boolean);
  return `Сьогодні наявні: ${parts.join('; ')}.`;
}

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
  const [moreRetro, setMoreRetro] = useState(false);
  const [moreAspects, setMoreAspects] = useState(false);
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
              {r.phaseMoment && <p className="note">{r.phaseMoment.title} о {clock(r.phaseMoment.time)}.</p>}
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

          {r.aspects.length > 0 && (
            <section>
              <h3>Планетарні аспекти</h3>
              <p className="paper-text">{aspectLine(r.aspects)}</p>
              <button className="reply more" aria-expanded={moreAspects} onClick={() => setMoreAspects(!moreAspects)}>
                {moreAspects ? 'Сховати' : 'Детальніше'}
              </button>
              {moreAspects &&
                r.aspects.map((a) => (
                  <div className="retro-detail" key={`${a.kind}-${a.names.join()}`}>
                    <p className="paper-text">
                      <b>{ASPECT_NAMES[a.kind].head}: {andJoin(a.names[0], a.names[1])}.</b> {a.text}
                    </p>
                    {a.exact && <p className="note">Точний о {clock(a.exact)}.</p>}
                  </div>
                ))}
            </section>
          )}

          {(r.retrograde.length > 0 || r.exiting.length > 0 || r.entering.length > 0) && (
            <section>
              <h3>Ретрогради</h3>
              {r.retrograde.length > 0 && (
                <p className="paper-text">
                  Зараз у ретрограді перебувають: <b>{r.retrograde.map((p) => p.name).join(', ')}</b>.
                </p>
              )}
              {/* Вихід із ретроградності описуємо лише тоді, коли планета виходить саме сьогодні. */}
              {r.exiting.length > 0 && (
                <>
                  <p className="paper-text">
                    З ретрограду виходить: <b>{r.exiting.map((p) => `${p.name} (о ${clock(p.time)})`).join(', ')}</b>.
                  </p>
                  {r.exiting.map((p) => (
                    <p className="paper-text" key={p.name}>{p.text}</p>
                  ))}
                </>
              )}
              {r.entering.map((p) => (
                <p className="note" key={p.name}>О {clock(p.time)} {p.name} входить у ретроградність.</p>
              ))}
              {r.retrograde.length > 0 && (
                <>
                  <button className="reply more" aria-expanded={moreRetro} onClick={() => setMoreRetro(!moreRetro)}>
                    {moreRetro ? 'Сховати' : 'Детальніше'}
                  </button>
                  {moreRetro &&
                    r.retrograde.map(({ name, text, exit }) => {
                      const { head, body } = splitHead(text);
                      return (
                        <div className="retro-detail" key={name}>
                          <p className="paper-text">
                            <b>{head}.</b> {body}
                          </p>
                          {exit && <p className="note">Вийде з ретроградності {when(exit, r.today)}.</p>}
                        </div>
                      );
                    })}
                </>
              )}
            </section>
          )}

          <section>
            <h3>Висновки дня</h3>
            <div className="paper-tip">
              {r.theses.map((t) => (
                <p key={t.label}>
                  <b>{t.label}:</b> {t.text}
                </p>
              ))}
            </div>
          </section>

          <button className="reply done" onClick={onClose}>Гаразд</button>
        </div>
      </div>
    </>
  );
}

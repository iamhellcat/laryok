import { Body, EclipticGeoMoon, Ecliptic, GeoVector, MoonPhase, Observer, SearchMoonPhase, SearchRiseSet, SunPosition } from 'astronomy-engine';
import {
  ASPECTS, LUNAR_DAYS, MOON_IN_SIGN, PAIR_SPHERE, PLANETS, RETROGRADE_TEXT, SIGN_NAMES, SUN_IN_SIGN, SUN_MOON, TONE_SUMMARY, type Tone,
} from '../data/astro';

// Місячну добу рахуємо за сходом Місяця в Києві.
const KYIV = new Observer(50.4501, 30.5234, 180);
const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Планети, для яких показуємо ретроградність (Хірона в бібліотеці немає). */
const MOVERS = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];

const BODIES = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];

export interface MoonPhaseInfo {
  angle: number;
  name: string;
  illumination: number;
  waxing: boolean;
}

export interface AspectEvent {
  time: Date;
  title: string;
  /** Які планети в якому аспекті (для фазових подій немає). */
  detail?: string;
  text: string;
  tone: Tone;
  score: number;
  /** Подія за участі Місяця (їх за добу багато, тому в газету беремо не більше трьох). */
  moon: boolean;
}

export interface Ingress {
  time: Date;
  sign: string;
}

export interface Station {
  time: Date;
  text: string;
}

export interface AstroReport {
  dateLabel: string;
  phase: MoonPhaseInfo;
  lunarDay: { n: number; text: string };
  /** Текст з документа: перше речення — заголовок, далі опис. */
  moonSign: string;
  sunSign: string;
  /** Якщо протягом доби Місяць чи Сонце переходить в інший знак. */
  moonIngress: Ingress | null;
  sunIngress: Ingress | null;
  /** Планети, які зараз ретроградні, з описами. */
  retrograde: string[];
  /** Планети, що протягом доби змінюють напрямок руху. */
  stations: Station[];
  events: AspectEvent[];
  /** «Головний аспект дня — …» */
  main: string;
  summary: string;
}

const norm360 = (a: number) => ((a % 360) + 360) % 360;
const norm180 = (a: number) => ((a + 540) % 360) - 180;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function longitude(body: Body, t: Date): number {
  if (body === Body.Sun) return SunPosition(t).elon;
  if (body === Body.Moon) return EclipticGeoMoon(t).lon;
  return Ecliptic(GeoVector(body, t, true)).elon;
}

function phaseName(angle: number): string {
  const near = (target: number) => Math.abs(norm180(angle - target)) <= 10;
  if (near(0)) return 'Новий місяць';
  if (near(90)) return 'Перша чверть';
  if (near(180)) return 'Повний місяць';
  if (near(270)) return 'Остання чверть';
  if (angle < 90) return 'Молодий місяць';
  if (angle < 180) return 'Зростаючий місяць';
  if (angle < 270) return 'Спадаючий місяць';
  return 'Старий місяць';
}

/** Час останнього новолуння до моменту `t`. */
function lastNewMoon(t: Date): Date {
  let found = SearchMoonPhase(0, new Date(t.getTime() - 31 * DAY), 31)!.date;
  for (;;) {
    const next = SearchMoonPhase(0, new Date(found.getTime() + 2 * DAY), 31)?.date;
    if (!next || next > t) return found;
    found = next;
  }
}

function moonrisesBetween(from: Date, to: Date): number {
  let count = 0;
  let cursor = from;
  for (let i = 0; i < 32; i++) {
    const rise = SearchRiseSet(Body.Moon, KYIV, +1, cursor, 2)?.date;
    if (!rise || rise > to) break;
    count++;
    cursor = new Date(rise.getTime() + HOUR);
  }
  return count;
}

/** Місячна доба починається зі сходу Місяця; перший схід після новолуння відкриває першу добу. */
function lunarDayNumber(now: Date): number {
  const newMoon = lastNewMoon(now);
  const n = moonrisesBetween(newMoon, now);
  if (n > 0) return Math.min(30, n);
  // До першого сходу ще триває остання доба попереднього циклу.
  const prev = lastNewMoon(new Date(newMoon.getTime() - HOUR));
  return Math.min(30, Math.max(29, moonrisesBetween(prev, newMoon)));
}

const signIndex = (lon: number) => Math.floor(norm360(lon) / 30);

export function computeAstro(now: Date = new Date()): AstroReport {
  const angle = MoonPhase(now);
  const phase: MoonPhaseInfo = {
    angle,
    name: phaseName(angle),
    illumination: (1 - Math.cos((angle * Math.PI) / 180)) / 2,
    waxing: angle < 180,
  };

  const n = lunarDayNumber(now);
  const lunarDay = { n, text: LUNAR_DAYS[n - 1] };

  // Сканування доби по годинах: точні аспекти, вхід Місяця в знак.
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const samples = Array.from({ length: 25 }, (_, h) => {
    const t = new Date(dayStart.getTime() + h * HOUR);
    return { t, lon: BODIES.map((b) => longitude(b, t)) };
  });

  const events: AspectEvent[] = [];
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i + 1; j < BODIES.length; j++) {
      for (const aspect of ASPECTS) {
        for (let k = 0; k < 24; k++) {
          const d1 = norm180(samples[k].lon[j] - samples[k].lon[i] - aspect.angle);
          const d2 = norm180(samples[k + 1].lon[j] - samples[k + 1].lon[i] - aspect.angle);
          if (Math.abs(d1) > 30 || Math.abs(d2) > 30 || d1 * d2 > 0 || d1 === d2) continue;
          const a = PLANETS[BODIES[i]];
          const b = PLANETS[BODIES[j]];
          const time = new Date(samples[k].t.getTime() + HOUR * (d1 / (d1 - d2)));
          const phaseEvent = BODIES[i] === Body.Sun && BODIES[j] === Body.Moon ? SUN_MOON[aspect.angle] : undefined;
          events.push({
            time,
            title: phaseEvent?.title ?? cap(PAIR_SPHERE[`${BODIES[i]}-${BODIES[j]}`]),
            detail: phaseEvent ? undefined : `${cap(aspect.name)}: ${a.name} — ${b.name}`,
            text: phaseEvent?.text ?? aspect.lines[(time.getHours() + i + j) % aspect.lines.length],
            tone: aspect.tone,
            score: phaseEvent ? 50 : a.weight + b.weight + aspect.weight,
            moon: BODIES[i] === Body.Moon || BODIES[j] === Body.Moon,
          });
        }
      }
    }
  }

  // Місяць робить багато аспектів за добу, тож залишаємо найвагоміші й не більше трьох місячних.
  let moonKept = 0;
  const ranked = events
    .sort((x, y) => y.score - x.score)
    .filter((e) => !e.moon || ++moonKept <= 3)
    .slice(0, 5);
  const lead = ranked.find((e) => e.score < 50) ?? ranked[0];
  const picked = [...ranked].sort((x, y) => x.time.getTime() - y.time.getTime());

  // Перехід у новий знак: знаходимо годину зміни, а потім уточнюємо до хвилин.
  const ingress = (bodyIndex: number): Ingress | null => {
    const body = BODIES[bodyIndex];
    for (let k = 0; k < 24; k++) {
      const from = signIndex(samples[k].lon[bodyIndex]);
      const to = signIndex(samples[k + 1].lon[bodyIndex]);
      if (from === to) continue;
      let lo = samples[k].t.getTime();
      let hi = samples[k + 1].t.getTime();
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        if (signIndex(longitude(body, new Date(mid))) === from) lo = mid;
        else hi = mid;
      }
      return { time: new Date(hi), sign: SIGN_NAMES[to] };
    }
    return null;
  };

  // Ретроградність: швидкість планети за довготою. Знак змінюється в «стоянці» (station).
  const velocity = (body: Body, t: Date) =>
    norm180(longitude(body, new Date(t.getTime() + HOUR / 2)) - longitude(body, new Date(t.getTime() - HOUR / 2)));

  const retrograde = MOVERS.filter((b) => velocity(b, now) < 0).map((b) => RETROGRADE_TEXT[b]);

  const stations: Station[] = [];
  for (const body of MOVERS) {
    const v = samples.map((s) => velocity(body, s.t));
    for (let k = 0; k < 24; k++) {
      if (Math.sign(v[k]) === Math.sign(v[k + 1])) continue;
      let lo = samples[k].t.getTime();
      let hi = samples[k + 1].t.getTime();
      for (let i = 0; i < 16; i++) {
        const mid = (lo + hi) / 2;
        if (Math.sign(velocity(body, new Date(mid))) === Math.sign(v[k])) lo = mid;
        else hi = mid;
      }
      stations.push({
        time: new Date(hi),
        text: `${PLANETS[body].name} ${v[k + 1] < 0 ? 'стає ретроградним' : 'повертається до прямого руху'}.`,
      });
    }
  }
  stations.sort((a, b) => a.time.getTime() - b.time.getTime());

  const soft = picked.filter((e) => e.tone === 'soft').length;
  const hard = picked.filter((e) => e.tone === 'hard').length;

  return {
    dateLabel: now.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }),
    phase,
    lunarDay,
    moonSign: MOON_IN_SIGN[signIndex(longitude(Body.Moon, now))],
    moonIngress: ingress(1),
    sunSign: SUN_IN_SIGN[signIndex(longitude(Body.Sun, now))],
    sunIngress: ingress(0),
    retrograde,
    stations,
    events: picked,
    main: lead ? `Головний аспект дня — ${lead.title.charAt(0).toLowerCase()}${lead.title.slice(1)}.` : '',
    summary: TONE_SUMMARY[soft > hard ? 'soft' : hard > soft ? 'hard' : 'neutral'],
  };
}

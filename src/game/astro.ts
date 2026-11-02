import { Body, EclipticGeoMoon, Ecliptic, GeoVector, MoonPhase, Observer, SearchMoonPhase, SearchRiseSet, SunPosition } from 'astronomy-engine';
import { ASPECTS, LUNAR_DAYS, PLANETS, SIGNS, SUN_MOON, TONE_SUMMARY, type LunarDay, type Sign, type Tone } from '../data/astro';

// Місячну добу рахуємо за сходом Місяця в Києві.
const KYIV = new Observer(50.4501, 30.5234, 180);
const HOUR = 3600_000;
const DAY = 24 * HOUR;

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
  text: string;
  tone: Tone;
  score: number;
  /** Подія за участі Місяця (їх за добу багато, тому в газету беремо не більше трьох). */
  moon: boolean;
}

export interface AstroReport {
  dateLabel: string;
  phase: MoonPhaseInfo;
  lunarDay: LunarDay & { n: number };
  moonSign: Sign;
  moonIngress: { time: Date; sign: Sign } | null;
  sunSign: Sign;
  retrograde: string[];
  mercuryRetrograde: boolean;
  events: AspectEvent[];
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
  const lunarDay = { n, ...LUNAR_DAYS[n - 1] };

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
            title: phaseEvent?.title ?? `${cap(aspect.name)}: ${a.name} — ${b.name}`,
            text: phaseEvent?.text ?? `Теми: ${a.theme} та ${b.theme}. ${aspect.line}`,
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
  const picked = events
    .sort((x, y) => y.score - x.score)
    .filter((e) => !e.moon || ++moonKept <= 3)
    .slice(0, 5)
    .sort((x, y) => x.time.getTime() - y.time.getTime());

  let moonIngress: AstroReport['moonIngress'] = null;
  for (let k = 0; k < 24; k++) {
    const a = signIndex(samples[k].lon[1]);
    const b = signIndex(samples[k + 1].lon[1]);
    if (a !== b) {
      moonIngress = { time: new Date(samples[k].t.getTime() + HOUR / 2), sign: SIGNS[b] };
      break;
    }
  }

  const planetNames = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];
  const retrograde = planetNames
    .filter((b) => norm180(longitude(b, new Date(now.getTime() + DAY)) - longitude(b, new Date(now.getTime() - DAY))) < 0)
    .map((b) => PLANETS[b].name);

  const soft = picked.filter((e) => e.tone === 'soft').length;
  const hard = picked.filter((e) => e.tone === 'hard').length;

  return {
    dateLabel: now.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }),
    phase,
    lunarDay,
    moonSign: SIGNS[signIndex(longitude(Body.Moon, now))],
    moonIngress,
    sunSign: SIGNS[signIndex(longitude(Body.Sun, now))],
    retrograde,
    mercuryRetrograde: retrograde.includes(PLANETS.Mercury.name),
    events: picked,
    summary: TONE_SUMMARY[soft > hard ? 'soft' : hard > soft ? 'hard' : 'neutral'],
  };
}

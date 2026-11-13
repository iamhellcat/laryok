import { Body, EclipticGeoMoon, Ecliptic, GeoVector, MoonPhase, Observer, SearchMoonPhase, SearchRiseSet, SunPosition } from 'astronomy-engine';
import {
  LUNAR_DAYS, MOON_IN_SIGN, MOON_SIGN_THESIS, PHASE_THESIS, PLANET_NAMES, RETROGRADE, SIGN_NAMES, SUN_IN_SIGN, SUN_SIGN_THESIS,
} from '../data/astro';

// Місячну добу рахуємо за сходом Місяця в Києві.
const KYIV = new Observer(50.4501, 30.5234, 180);
const HOUR = 3600_000;
const DAY = 24 * HOUR;

/** Планети, для яких показуємо ретроградність (Хірона в бібліотеці немає). */
const MOVERS = [Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];

/** Моменти фаз за кутом Місяць–Сонце. */
const PHASE_MOMENTS: [number, string][] = [
  [0, 'Новий Місяць'],
  [90, 'Перша чверть'],
  [180, 'Повний Місяць'],
  [270, 'Остання чверть'],
];

const BODIES = [Body.Sun, Body.Moon, Body.Mercury, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn, Body.Uranus, Body.Neptune, Body.Pluto];

export interface MoonPhaseInfo {
  angle: number;
  name: string;
  illumination: number;
  waxing: boolean;
}

export interface Ingress {
  time: Date;
  sign: string;
}

export interface RetrogradePlanet {
  /** «Меркурій». */
  name: string;
  /** Опис ретроградності: перше речення — заголовок. */
  text: string;
  /** Коли планета вийде з ретроградності (повернеться до прямого руху). */
  exit: Date | null;
}

/** Планета, що протягом доби змінює напрямок руху. */
export interface Station {
  name: string;
  time: Date;
}

export interface ExitingPlanet extends Station {
  /** Що означає вихід цієї планети з ретроградності (текст з документа). */
  text: string;
}

export interface AstroReport {
  /** Момент, для якого складено випуск. */
  today: Date;
  dateLabel: string;
  phase: MoonPhaseInfo;
  /** Точний момент нового/повного місяця чи чверті, якщо він припадає на цю добу. */
  phaseMoment: { time: Date; title: string } | null;
  lunarDay: { n: number; text: string };
  /** Текст з документа: перше речення — заголовок, далі опис. */
  moonSign: string;
  sunSign: string;
  /** Якщо протягом доби Місяць чи Сонце переходить в інший знак. */
  moonIngress: Ingress | null;
  sunIngress: Ingress | null;
  /** Планети, які зараз ретроградні, з описами й датою виходу. */
  retrograde: RetrogradePlanet[];
  /** Планети, що саме сьогодні виходять із ретроградності. */
  exiting: ExitingPlanet[];
  /** Планети, що саме сьогодні входять у ретроградність. */
  entering: Station[];
  /** Підсумок дня: три короткі тези (фаза Місяця, Сонце в знаку, Місяць у знаку). */
  theses: { label: string; text: string }[];
}

const norm360 = (a: number) => ((a % 360) + 360) % 360;
const norm180 = (a: number) => ((a + 540) % 360) - 180;

function longitude(body: Body, t: Date): number {
  if (body === Body.Sun) return SunPosition(t).elon;
  if (body === Body.Moon) return EclipticGeoMoon(t).lon;
  return Ecliptic(GeoVector(body, t, true)).elon;
}

function phaseName(angle: number): string {
  const near = (target: number) => Math.abs(norm180(angle - target)) <= 10;
  if (near(0)) return 'Новий Місяць';
  if (near(90)) return 'Перша чверть';
  if (near(180)) return 'Повний Місяць';
  if (near(270)) return 'Остання чверть';
  if (angle < 90) return 'Молодий Місяць';
  if (angle < 180) return 'Зростаючий Місяць';
  if (angle < 270) return 'Спадаючий Місяць';
  return 'Старий Місяць';
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

  // Точний момент фази: нового й повного місяця та чвертей — коли кут «Місяць мінус Сонце» дорівнює 0, 90, 180, 270.
  let phaseMoment: AstroReport['phaseMoment'] = null;
  const elongation = (k: number) => norm360(samples[k].lon[1] - samples[k].lon[0]);
  for (const [angle, title] of PHASE_MOMENTS) {
    for (let k = 0; k < 24; k++) {
      const d1 = norm180(elongation(k) - angle);
      const d2 = norm180(elongation(k + 1) - angle);
      if (Math.abs(d1) > 30 || Math.abs(d2) > 30 || d1 * d2 > 0 || d1 === d2) continue;
      phaseMoment = { time: new Date(samples[k].t.getTime() + HOUR * (d1 / (d1 - d2))), title };
    }
  }

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

  // Коли ретроградна планета вийде з ретроградності: крокуємо по днях до зміни знаку швидкості, далі уточнюємо до хвилин.
  const nextDirect = (body: Body): Date | null => {
    for (let day = 1; day <= 400; day++) {
      const hi = now.getTime() + day * DAY;
      if (velocity(body, new Date(hi)) < 0) continue;
      let lo = hi - DAY;
      let up = hi;
      for (let i = 0; i < 18; i++) {
        const mid = (lo + up) / 2;
        if (velocity(body, new Date(mid)) < 0) lo = mid;
        else up = mid;
      }
      return new Date(up);
    }
    return null;
  };

  const retroBodies = MOVERS.filter((b) => velocity(b, now) < 0);
  const retrograde: RetrogradePlanet[] = retroBodies.map((b) => ({ name: PLANET_NAMES[b], text: RETROGRADE[b].text, exit: nextDirect(b) }));

  // Зміна напрямку руху протягом доби: хто виходить із ретроградності, а хто входить у неї.
  const exiting: ExitingPlanet[] = [];
  const entering: Station[] = [];
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
      const time = new Date(hi);
      if (v[k + 1] >= 0) exiting.push({ name: PLANET_NAMES[body], time, text: RETROGRADE[body].exit });
      else entering.push({ name: PLANET_NAMES[body], time });
    }
  }
  exiting.sort((a, b) => a.time.getTime() - b.time.getTime());
  entering.sort((a, b) => a.time.getTime() - b.time.getTime());

  const sunIndex = signIndex(longitude(Body.Sun, now));
  const moonIndex = signIndex(longitude(Body.Moon, now));
  // «Місяць у Леві», «Сонце в Скорпіоні»: заголовок береться з тексту з документа.
  const headOf = (text: string) => text.slice(0, text.indexOf('.'));

  return {
    today: now,
    dateLabel: now.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }),
    phase,
    phaseMoment,
    lunarDay,
    moonSign: MOON_IN_SIGN[moonIndex],
    moonIngress: ingress(1),
    sunSign: SUN_IN_SIGN[sunIndex],
    sunIngress: ingress(0),
    retrograde,
    exiting,
    entering,
    theses: [
      { label: phase.name, text: PHASE_THESIS[phase.name] },
      { label: headOf(SUN_IN_SIGN[sunIndex]), text: SUN_SIGN_THESIS[sunIndex] },
      { label: headOf(MOON_IN_SIGN[moonIndex]), text: MOON_SIGN_THESIS[moonIndex] },
    ],
  };
}

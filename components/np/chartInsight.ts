// components/np/chartInsight.ts — "data to action": what a point on a chart means and what to do about it.
//
// Every point gets three lines:
//   what   the exact value and when ("Tue · 54 ms (−4 vs usual)")
//   why    where it sits against the athlete's OWN usual range, plus the factor tags of that day if there are any.
//          It never says "because": a tag is shown as context, with the note "a pattern in your own days, not proof of a cause".
//   action one small, safe step (training load, sleep, water). No diagnosis, no medicine: when something stays off the
//          answer is always "tell your coach, school nurse or doctor".
// Everything is computed from the points the chart already has: no invented numbers.

import type { Lang } from '@/lib/i18n/translations';
import { prevDay, type TagMap } from './tags';
import { UX, type TagKey } from './uxCopy';

export type Pos = 'above' | 'below' | 'inside';
export type Insight = { what: string; why: string; action: string; pos: Pos | null };
export type ExplainItem = { index: number; label: string; valueText: string; insight: Insight; flag: 'above' | 'below' | null };
export type ExplainSpec = { at: (i: number) => Insight | null; list: ExplainItem[]; heads?: { flagged: string; recent: string } };
/** higher is better (readiness, HRV) · lower is better (resting HR) · a load with a target zone */
export type Metric = 'high' | 'rhr' | 'load';

export const POS_HEX: Record<Pos, string> = { above: '#2FD8F0', inside: '#3FE0A8', below: '#FF7A59' };

type Copy = {
  what: string;
  why: string;
  act: string;
  all: string;
  sheetSub: string;
  flagged: string;
  recent: string;
  none: string;
  close: string;
  pos: Record<Pos, (lo: string, hi: string) => string>;
  noBand: string;
  vsUsual: string;
  tagsPrev: (names: string[]) => string;
  tagsDay: (names: string[]) => string;
  note: string;
  action: Record<Metric, Record<Pos, string>>;
  heart: {
    heads: { flagged: string; recent: string };
    what: (bpm: number, time: string, zone: string) => string;
    diff: (d: number, resting: number) => string;
    night: string;
    zone: Record<'peak' | 'cardio' | 'rest' | 'idle', string>;
    action: Record<'peak' | 'cardio' | 'rest' | 'idle', string>;
  };
  stage: {
    what: (name: string, dur: string, at: string) => string;
    share: (pct: number) => string;
    why: Record<'deep' | 'rem' | 'light' | 'awake', string>;
    action: Record<'deep' | 'rem' | 'light' | 'awake', string>;
  };
};

const COPY: Record<Lang, Copy> = {
  en: {
    what: 'What happened',
    why: 'Why it matters',
    act: 'What to do',
    all: 'Open the breakdown',
    sheetSub: 'Tap a day to see it on the chart.',
    flagged: 'Outside your usual range',
    recent: 'Recent days',
    none: 'No day is outside your usual range.',
    close: 'Close',
    pos: {
      above: (lo, hi) => `Above your usual range (${lo}–${hi}).`,
      inside: (lo, hi) => `Inside your usual range (${lo}–${hi}).`,
      below: (lo, hi) => `Below your usual range (${lo}–${hi}).`,
    },
    noBand: 'Your usual range appears after a few more days of data.',
    vsUsual: 'vs usual',
    tagsPrev: (n) => `The day before you tagged: ${n.join(', ')}.`,
    tagsDay: (n) => `That day you tagged: ${n.join(', ')}.`,
    note: 'A pattern in your own days, not proof of a cause.',
    action: {
      high: {
        above: 'Your body is recovering well. A good window for the planned hard session. Warm up properly.',
        inside: 'A normal day for you. Train as planned and keep your routine.',
        below: 'Recovery is lower than usual. Choose an easy session and go to bed earlier. If you feel unwell, tell your coach or school nurse.',
      },
      rhr: {
        above: 'Resting heart rate is higher than usual. Keep today easy, drink water, sleep earlier. If it stays high for several days, tell your coach or a doctor.',
        inside: 'Normal for you. Nothing to change.',
        below: 'Lower than usual, a sign of good recovery. Keep your routine.',
      },
      load: {
        above: 'Load is high. Plan a light or rest day next, and sleep well.',
        inside: 'Load is in your optimal zone. Keep the weekly plan.',
        below: 'Light load. If you feel fresh, there is room for a harder session.',
      },
    },
    heart: {
      heads: { flagged: 'Peaks and lows today', recent: 'Latest readings' },
      what: (b, t, z) => `${b} bpm at ${t} · ${z}`,
      diff: (d, r) => (d > 0 ? `${d} bpm above your resting ${r}.` : d < 0 ? `${-d} bpm below your resting ${r}.` : `Equal to your resting ${r}.`),
      night: 'Night-time values are where recovery happens.',
      zone: { peak: 'Peak', cardio: 'Cardio', rest: 'Rest', idle: 'Idle' },
      action: {
        peak: 'A high effort. Afterwards eat, drink water and keep the evening calm.',
        cardio: 'A cardio effort. Cool down slowly and drink water.',
        rest: 'Normal resting range. Nothing to change.',
        idle: 'Calm values, good for recovery. Keep a steady bedtime.',
      },
    },
    stage: {
      what: (n, d, a) => `${n} · ${d} · from ${a}`,
      share: (p) => `${p}% of this night.`,
      why: {
        deep: 'Deep sleep is when the body does most of its physical repair.',
        rem: 'REM sleep supports memory and learning.',
        light: 'Light sleep links the other stages and is the biggest share of most nights.',
        awake: 'Short awake moments are normal. Long or frequent ones lower restfulness.',
      },
      action: {
        deep: 'Protect it: a regular bedtime and no screens for 30 minutes before sleep.',
        rem: 'Enough total sleep keeps REM long. Avoid caffeine in the afternoon.',
        light: 'Nothing to change here. Keep the same bedtime.',
        awake: 'Keep the room dark and cool. If you often wake up tired, tell your coach or school nurse.',
      },
    },
  },
  ru: {
    what: 'Что произошло',
    why: 'Почему это важно',
    act: 'Что делать',
    all: 'Открыть разбор',
    sheetSub: 'Нажми на день, чтобы увидеть его на графике.',
    flagged: 'Вне твоей обычной нормы',
    recent: 'Последние дни',
    none: 'Ни один день не вышел за твою обычную норму.',
    close: 'Закрыть',
    pos: {
      above: (lo, hi) => `Выше твоей обычной нормы (${lo}–${hi}).`,
      inside: (lo, hi) => `В пределах твоей обычной нормы (${lo}–${hi}).`,
      below: (lo, hi) => `Ниже твоей обычной нормы (${lo}–${hi}).`,
    },
    noBand: 'Твоя обычная норма появится после нескольких дней данных.',
    vsUsual: 'от обычного',
    tagsPrev: (n) => `Днём раньше ты отметил(а): ${n.join(', ')}.`,
    tagsDay: (n) => `В тот день ты отметил(а): ${n.join(', ')}.`,
    note: 'Закономерность в твоих днях, а не доказательство причины.',
    action: {
      high: {
        above: 'Тело хорошо восстанавливается. Подходящее окно для запланированной тяжёлой тренировки. Хорошо разомнись.',
        inside: 'Обычный день для тебя. Тренируйся по плану и держи режим.',
        below: 'Восстановление ниже обычного. Выбери лёгкую тренировку и ляг раньше. Если плохо себя чувствуешь, скажи тренеру или школьной медсестре.',
      },
      rhr: {
        above: 'Пульс покоя выше обычного. Сегодня полегче, пей воду, ложись раньше. Если он держится несколько дней, скажи тренеру или врачу.',
        inside: 'Для тебя это норма. Менять ничего не нужно.',
        below: 'Ниже обычного: признак хорошего восстановления. Держи режим.',
      },
      load: {
        above: 'Нагрузка высокая. Следующим поставь лёгкий или выходной день и хорошо выспись.',
        inside: 'Нагрузка в твоей оптимальной зоне. Держи недельный план.',
        below: 'Нагрузка лёгкая. Если чувствуешь себя свежим, есть запас для более тяжёлой тренировки.',
      },
    },
    heart: {
      heads: { flagged: 'Пики и минимумы сегодня', recent: 'Последние измерения' },
      what: (b, t, z) => `${b} уд/мин в ${t} · ${z}`,
      diff: (d, r) => (d > 0 ? `На ${d} уд/мин выше пульса покоя ${r}.` : d < 0 ? `На ${-d} уд/мин ниже пульса покоя ${r}.` : `Равно пульсу покоя ${r}.`),
      night: 'Ночные значения: именно тогда идёт восстановление.',
      zone: { peak: 'Пик', cardio: 'Кардио', rest: 'Отдых', idle: 'Покой' },
      action: {
        peak: 'Высокое усилие. После него поешь, попей воды и проведи спокойный вечер.',
        cardio: 'Кардио-нагрузка. Остывай медленно и пей воду.',
        rest: 'Обычный пульс покоя. Менять ничего не нужно.',
        idle: 'Спокойные значения, хорошо для восстановления. Держи ровное время отбоя.',
      },
    },
    stage: {
      what: (n, d, a) => `${n} · ${d} · с ${a}`,
      share: (p) => `${p}% этой ночи.`,
      why: {
        deep: 'В глубоком сне тело делает основную физическую «починку».',
        rem: 'REM-сон помогает памяти и учёбе.',
        light: 'Лёгкий сон связывает остальные стадии и занимает большую часть большинства ночей.',
        awake: 'Короткие пробуждения нормальны. Долгие или частые снижают спокойность сна.',
      },
      action: {
        deep: 'Береги его: ровное время отбоя и без экранов за 30 минут до сна.',
        rem: 'Достаточный общий сон сохраняет REM. Не пей кофеин во второй половине дня.',
        light: 'Здесь менять нечего. Держи то же время отбоя.',
        awake: 'Держи комнату тёмной и прохладной. Если часто просыпаешься уставшим, скажи тренеру или школьной медсестре.',
      },
    },
  },
  lv: {
    what: 'Kas notika',
    why: 'Kāpēc tas ir svarīgi',
    act: 'Ko darīt',
    all: 'Atvērt sīkāku analīzi',
    sheetSub: 'Pieskaries dienai, lai redzētu to grafikā.',
    flagged: 'Ārpus tavas ierastās normas',
    recent: 'Pēdējās dienas',
    none: 'Neviena diena nav ārpus tavas ierastās normas.',
    close: 'Aizvērt',
    pos: {
      above: (lo, hi) => `Virs tavas ierastās normas (${lo}–${hi}).`,
      inside: (lo, hi) => `Tavas ierastās normas robežās (${lo}–${hi}).`,
      below: (lo, hi) => `Zem tavas ierastās normas (${lo}–${hi}).`,
    },
    noBand: 'Tava ierastā norma parādīsies pēc dažām dienām ar datiem.',
    vsUsual: 'pret ierasto',
    tagsPrev: (n) => `Dienu iepriekš tu atzīmēji: ${n.join(', ')}.`,
    tagsDay: (n) => `Tajā dienā tu atzīmēji: ${n.join(', ')}.`,
    note: 'Likumsakarība tavās dienās, nevis cēloņa pierādījums.',
    action: {
      high: {
        above: 'Ķermenis atjaunojas labi. Piemērots brīdis plānotajam smagajam treniņam. Labi iesildies.',
        inside: 'Tev ierasta diena. Trenējies pēc plāna un ievēro režīmu.',
        below: 'Atjaunošanās ir zemāka nekā parasti. Izvēlies vieglu treniņu un ej gulēt agrāk. Ja jūties slikti, pasaki trenerim vai skolas medmāsai.',
      },
      rhr: {
        above: 'Atpūtas pulss ir augstāks nekā parasti. Šodien vieglāk, dzer ūdeni, ej gulēt agrāk. Ja tas turas vairākas dienas, pasaki trenerim vai ārstam.',
        inside: 'Tev tā ir norma. Nekas nav jāmaina.',
        below: 'Zemāks nekā parasti: laba atjaunošanās pazīme. Ievēro režīmu.',
      },
      load: {
        above: 'Slodze ir augsta. Nākamo plāno vieglu vai brīvu dienu un labi izgulies.',
        inside: 'Slodze ir tavā optimālajā zonā. Turi nedēļas plānu.',
        below: 'Viegla slodze. Ja jūties spirgts, ir vieta smagākam treniņam.',
      },
    },
    heart: {
      heads: { flagged: 'Šodienas virsotnes un zemākās vērtības', recent: 'Pēdējie mērījumi' },
      what: (b, t, z) => `${b} sit./min plkst. ${t} · ${z}`,
      diff: (d, r) => (d > 0 ? `Par ${d} sit./min virs tava atpūtas pulsa ${r}.` : d < 0 ? `Par ${-d} sit./min zem tava atpūtas pulsa ${r}.` : `Vienāds ar tavu atpūtas pulsu ${r}.`),
      night: 'Nakts vērtības: tieši tad notiek atjaunošanās.',
      zone: { peak: 'Maksimums', cardio: 'Kardio', rest: 'Atpūta', idle: 'Miers' },
      action: {
        peak: 'Liela piepūle. Pēc tās paēd, padzer ūdeni un pavadi mierīgu vakaru.',
        cardio: 'Kardio slodze. Atvēsinies lēni un dzer ūdeni.',
        rest: 'Ierastais atpūtas pulss. Nekas nav jāmaina.',
        idle: 'Mierīgas vērtības, labi atjaunošanai. Turi vienmērīgu gulētiešanas laiku.',
      },
    },
    stage: {
      what: (n, d, a) => `${n} · ${d} · no ${a}`,
      share: (p) => `${p}% no šīs nakts.`,
      why: {
        deep: 'Dziļajā miegā ķermenis veic lielāko daļu fiziskās atjaunošanas.',
        rem: 'REM miegs palīdz atmiņai un mācībām.',
        light: 'Vieglais miegs savieno pārējās fāzes un ir lielākā daļa no vairuma nakšu.',
        awake: 'Īsas pamošanās ir normālas. Garas vai biežas samazina miega mieru.',
      },
      action: {
        deep: 'Sargā to: regulārs gulētiešanas laiks un bez ekrāniem 30 minūtes pirms miega.',
        rem: 'Pietiekams kopējais miegs saglabā REM. Pēcpusdienā nelieto kofeīnu.',
        light: 'Šeit nekas nav jāmaina. Turi to pašu gulētiešanas laiku.',
        awake: 'Turi istabu tumšu un vēsu. Ja bieži mostas noguris, pasaki trenerim vai skolas medmāsai.',
      },
    },
  },
};

export const insightCopy = (lang: Lang): Copy => COPY[lang];

const withUnit = (v: string, unit: string): string => (unit ? `${v} ${unit}` : v);

/** Builds the per-point explanation for a series chart (readiness, HRV, resting HR, load …). */
export function makeExplain(a: {
  lang: Lang;
  metric: Metric;
  labels: string[];
  values: (number | null)[];
  /** ISO date of every point (only with `tags`) */
  dates?: (string | null)[];
  tags?: TagMap;
  /** morning metrics (readiness, HRV, resting HR) reflect the DAY BEFORE, so look at that day's tags */
  tagLag?: 0 | 1;
  band: { lo: number; hi: number } | null;
  unit?: string;
  decimals?: number;
  /** how many of the latest points the breakdown sheet lists (default 40) */
  maxItems?: number;
}): ExplainSpec {
  const c = COPY[a.lang];
  const u = UX[a.lang];
  const unit = a.unit ?? '';
  const dp = a.decimals ?? 0;
  const f = (v: number): string => v.toFixed(dp);

  const at = (i: number): Insight | null => {
    const v = a.values[i];
    if (v === null || v === undefined) return null;
    let pos: Pos | null = null;
    let usualTxt = '';
    let why: string;
    if (a.band) {
      pos = v > a.band.hi ? 'above' : v < a.band.lo ? 'below' : 'inside';
      why = c.pos[pos](f(a.band.lo), f(a.band.hi));
      const mid = (a.band.lo + a.band.hi) / 2;
      const d = Number((v - mid).toFixed(dp));
      usualTxt = ` (${d > 0 ? '+' : d < 0 ? '−' : '±'}${Math.abs(d).toFixed(dp)} ${c.vsUsual})`;
    } else {
      why = c.noBand;
    }
    const date = a.dates?.[i] ?? null;
    let names: string[] = [];
    if (date && a.tags) {
      const key = (a.tagLag ?? 0) === 1 ? prevDay(date) : date;
      names = (a.tags[key] ?? []).map((k: TagKey) => u.tags.names[k]);
    }
    if (names.length) why += ` ${(a.tagLag ?? 0) === 1 ? c.tagsPrev(names) : c.tagsDay(names)} ${c.note}`;
    return {
      what: `${a.labels[i]} · ${withUnit(f(v), unit)}${usualTxt}`,
      why,
      action: pos ? c.action[a.metric][pos] : c.action[a.metric].inside,
      pos,
    };
  };

  const list: ExplainItem[] = [];
  a.values.forEach((v, i) => {
    const ins = at(i);
    if (v === null || v === undefined || !ins) return;
    list.push({ index: i, label: a.labels[i], valueText: withUnit(f(v), unit), insight: ins, flag: ins.pos === 'above' ? 'above' : ins.pos === 'below' ? 'below' : null });
  });
  return { at, list: list.slice(-(a.maxItems ?? 40)) };
}

/** One 30-minute slot of the day's heart-rate chart. */
export function heartInsight(a: { lang: Lang; bpm: number; resting: number; time: string; zone: 'peak' | 'cardio' | 'rest' | 'idle'; tags: TagKey[] }): Insight {
  const c = COPY[a.lang];
  const u = UX[a.lang];
  const hour = Number(a.time.slice(0, 2));
  let why = c.heart.diff(Math.round(a.bpm) - a.resting, a.resting);
  if (a.zone === 'idle' && hour < 6) why += ` ${c.heart.night}`;
  if (a.tags.length) why += ` ${c.tagsDay(a.tags.map((k) => u.tags.names[k]))} ${c.note}`;
  return { what: c.heart.what(Math.round(a.bpm), a.time, c.heart.zone[a.zone]), why, action: c.heart.action[a.zone], pos: null };
}

/** One segment of the night's hypnogram. */
export function stageInsight(a: { lang: Lang; stage: 'deep' | 'rem' | 'light' | 'awake'; name: string; dur: string; at: string; pct: number }): Insight {
  const c = COPY[a.lang].stage;
  return { what: c.what(a.name, a.dur, a.at), why: `${c.share(a.pct)} ${c.why[a.stage]}`, action: c.action[a.stage], pos: null };
}

// components/np/uxCopy.ts — copy for the ergonomics / time-of-day / factor-tag pass (EN / RU / LV).
// Nothing here is a number: every figure on screen is computed from the athlete's own data (or the labelled demo set).

import type { Lang } from '@/lib/i18n/translations';

export type TagKey = 'lateMeal' | 'alcohol' | 'caffeine' | 'sauna' | 'highStress' | 'hardWorkout';
export type Phase = 'morning' | 'afternoon' | 'evening';

export type UxCopy = {
  /** slider extremes: "48 bpm" over "Min" */
  range: { min: string; usualMax: string; usualMin: string; max: string };
  phase: { label: string; morning: string; afternoon: string; evening: string };
  morning: { green: string; yellow: string; red: string; none: string };
  afternoon: {
    heroTitle: string;
    stress: string;
    strain: string;
    calm: string;
    mid: string;
    high: string;
    none: string;
    advice: { overload: string; stress: string; ok: (from: number, to: number) => string; none: string };
  };
  evening: {
    heroTitle: string;
    bedtime: string;
    window: (a: string, b: string) => string;
    basis: string;
    wakeLabel: string;
    wakeSet: string;
    advice: string;
    windDown: string;
    windDownNow: (now: number, resting: number) => string;
    windDownNone: string;
  };
  tags: { title: string; sub: string; names: Record<TagKey, string>; demo: string; saved: string };
  impact: {
    title: string;
    sentence: (tag: string, n: number, metric: string, a: string, b: string, d: string) => string;
    notEnough: string;
    note: string;
    metric: { readiness: string; sleep: string; stress: string };
  };
  calib: { title: (day: number, of: number) => string; sub: string };
  device: { demo: (min: number, pct: number) => string; check: { today: string; yesterday: string; ago: (n: number) => string; none: string } };
  hypno: { show: string; hide: string; title: string; demo: string; axis: string };
};

export const UX: Record<Lang, UxCopy> = {
  en: {
    range: { min: 'Min', usualMax: 'Usual max', usualMin: 'Usual min', max: 'Max' },
    phase: { label: 'Time of day', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' },
    morning: {
      green: 'Your body is restored. A good day for high-intensity training.',
      yellow: 'A steady day. Keep the plan and do not add extra load.',
      red: 'Take it easy today. The plan eases off; if something hurts, tell your coach, a doctor or the school nurse.',
      none: 'Do the morning check-in and Lotus builds your plan for today.',
    },
    afternoon: {
      heroTitle: 'Mid-day balance',
      stress: 'Daytime stress balance',
      strain: 'Activity strain',
      calm: 'Calm',
      mid: 'Moderate',
      high: 'High',
      none: 'No check-in yet',
      advice: {
        overload: 'Your load is above the productive zone. Keep the rest of the day light.',
        stress: 'Stress is high today. Take a short break before training and keep the session easy.',
        ok: (from, to) => `You are pacing well. Keep today's training load inside ${from}–${to}.`,
        none: 'Do the check-in to get a pacing plan for the rest of the day.',
      },
    },
    evening: {
      heroTitle: 'Bedtime guidance',
      bedtime: 'Target bedtime',
      window: (a, b) => `${a} – ${b}`,
      basis: 'For 8–9 hours of sleep. The common guideline for teenagers is 8–10 hours.',
      wakeLabel: 'Tomorrow I wake up at',
      wakeSet: 'Set wake-up time',
      advice: 'Wind down: screens off 30 minutes before bed and a calm evening protect tonight’s recovery.',
      windDown: 'Resting heart rate wind-down',
      windDownNow: (now, resting) => `${now} bpm now, ${Math.max(0, now - resting)} above your resting ${resting}`,
      windDownNone: 'Heart-rate wind-down needs a wearable. Until then, your check-in tells Lotus how you recover.',
    },
    tags: {
      title: 'What shaped today?',
      sub: 'Tap what applies. Lotus compares your next mornings with and without it.',
      names: { lateMeal: 'Late meal', alcohol: 'Alcohol', caffeine: 'Caffeine', sauna: 'Sauna', highStress: 'High stress', hardWorkout: 'Intense workout' },
      demo: 'Demo tags',
      saved: 'Saved on this device only',
    },
    impact: {
      title: 'Your tags',
      sentence: (tag, n, metric, a, b, d) => `After days tagged “${tag}” (${n} days), your ${metric} the next morning averaged ${a} against ${b} after other days (${d}).`,
      notEnough: 'Not enough days yet: tag at least 3 days and keep checking in every morning.',
      note: 'A pattern in your own days, not proof of a cause.',
      metric: { readiness: 'readiness', sleep: 'sleep rating', stress: 'calm rating (7 = calm)' },
    },
    calib: { title: (d, of) => `Calibrating baseline · day ${d} of ${of}`, sub: 'Your usual ranges appear as you check in. Until then, numbers have no personal comparison.' },
    device: {
      demo: (m, p) => `Demo wearable · synced ${m}m ago · ${p}%`,
      check: { today: 'Checked in today', yesterday: 'Last check-in: yesterday', ago: (n) => `Last check-in: ${n} days ago`, none: 'No check-in yet' },
    },
    hypno: { show: 'Show the night', hide: 'Hide the night', title: 'Sleep stages through the night', demo: 'Demo night', axis: 'Time' },
  },
  ru: {
    range: { min: 'Мин', usualMax: 'Обычный макс', usualMin: 'Обычный мин', max: 'Макс' },
    phase: { label: 'Время суток', morning: 'Утро', afternoon: 'День', evening: 'Вечер' },
    morning: {
      green: 'Тело восстановилось. Хороший день для интенсивной тренировки.',
      yellow: 'Ровный день. Держи план и не добавляй лишней нагрузки.',
      red: 'Сегодня спокойнее. План смягчён; если что-то болит, скажи тренеру, врачу или школьной медсестре.',
      none: 'Пройди утренний чек-ин, и Lotus составит план на сегодня.',
    },
    afternoon: {
      heroTitle: 'Баланс дня',
      stress: 'Дневной баланс стресса',
      strain: 'Нагрузка дня',
      calm: 'Спокойно',
      mid: 'Умеренно',
      high: 'Высокий',
      none: 'Чек-ина ещё нет',
      advice: {
        overload: 'Нагрузка выше продуктивной зоны. Остаток дня проведи легко.',
        stress: 'Сегодня высокий стресс. Сделай короткий перерыв перед тренировкой и держи её лёгкой.',
        ok: (from, to) => `Темп хороший. Держи сегодняшнюю нагрузку в пределах ${from}–${to}.`,
        none: 'Пройди чек-ин, чтобы получить план темпа на остаток дня.',
      },
    },
    evening: {
      heroTitle: 'Подсказка ко сну',
      bedtime: 'Когда лечь',
      window: (a, b) => `${a} – ${b}`,
      basis: 'Расчёт на 8–9 часов сна. Общая рекомендация для подростков: 8–10 часов.',
      wakeLabel: 'Завтра я встаю в',
      wakeSet: 'Указать время подъёма',
      advice: 'Спокойный вечер и никаких экранов за 30 минут до сна помогают восстановлению этой ночью.',
      windDown: 'Спад пульса покоя',
      windDownNow: (now, resting) => `Сейчас ${now} уд/мин, на ${Math.max(0, now - resting)} выше пульса покоя ${resting}`,
      windDownNone: 'Спад пульса показывается с носимым устройством. Пока Lotus судит о восстановлении по твоему чек-ину.',
    },
    tags: {
      title: 'Что повлияло на день?',
      sub: 'Отметь, что было. Lotus сравнит твои следующие утра с этим фактором и без него.',
      names: { lateMeal: 'Поздний ужин', alcohol: 'Алкоголь', caffeine: 'Кофеин', sauna: 'Сауна', highStress: 'Сильный стресс', hardWorkout: 'Тяжёлая тренировка' },
      demo: 'Демо-метки',
      saved: 'Хранится только на этом устройстве',
    },
    impact: {
      title: 'Твои метки',
      sentence: (tag, n, metric, a, b, d) => `После дней с меткой «${tag}» (${n} дн.) ${metric} на следующее утро в среднем была ${a}, после остальных дней ${b} (${d}).`,
      notEnough: 'Пока мало дней: отметь фактор хотя бы 3 раза и продолжай чек-ин каждое утро.',
      note: 'Это закономерность в твоих днях, а не доказательство причины.',
      metric: { readiness: 'готовность', sleep: 'оценка сна', stress: 'оценка спокойствия (7 = спокойно)' },
    },
    calib: { title: (d, of) => `Калибровка нормы · день ${d} из ${of}`, sub: 'Твои обычные диапазоны появляются по мере чек-инов. Пока у чисел нет личного сравнения.' },
    device: {
      demo: (m, p) => `Демо-устройство · синхр. ${m} мин назад · ${p}%`,
      check: { today: 'Чек-ин сегодня сделан', yesterday: 'Последний чек-ин: вчера', ago: (n) => `Последний чек-ин: ${n} дн. назад`, none: 'Чек-инов ещё нет' },
    },
    hypno: { show: 'Показать ночь', hide: 'Скрыть ночь', title: 'Стадии сна за ночь', demo: 'Демо-ночь', axis: 'Время' },
  },
  lv: {
    range: { min: 'Min', usualMax: 'Parastais maks', usualMin: 'Parastais min', max: 'Maks' },
    phase: { label: 'Diennakts laiks', morning: 'Rīts', afternoon: 'Diena', evening: 'Vakars' },
    morning: {
      green: 'Ķermenis ir atjaunojies. Piemērota diena intensīvam treniņam.',
      yellow: 'Mierīga diena. Turi plānu un nepievieno liekas slodzes.',
      red: 'Šodien mierīgāk. Plāns ir atvieglots; ja kaut kas sāp, pasaki treneram, ārstam vai skolas medmāsai.',
      none: 'Veic rīta čeku, un Lotus sastādīs plānu šai dienai.',
    },
    afternoon: {
      heroTitle: 'Dienas līdzsvars',
      stress: 'Dienas stresa līdzsvars',
      strain: 'Dienas slodze',
      calm: 'Mierīgi',
      mid: 'Mēreni',
      high: 'Augsts',
      none: 'Čeka vēl nav',
      advice: {
        overload: 'Slodze ir virs produktīvās zonas. Atlikušo dienu pavadi viegli.',
        stress: 'Šodien stress ir augsts. Pirms treniņa pavelc elpu un turi treniņu vieglu.',
        ok: (from, to) => `Temps ir labs. Šodienas slodzi turi robežās ${from}–${to}.`,
        none: 'Veic čeku, lai saņemtu tempa plānu atlikušajai dienai.',
      },
    },
    evening: {
      heroTitle: 'Miega ieteikums',
      bedtime: 'Kad iet gulēt',
      window: (a, b) => `${a} – ${b}`,
      basis: 'Aprēķins 8–9 stundu miegam. Vispārējs ieteikums pusaudžiem: 8–10 stundas.',
      wakeLabel: 'Rīt es mostos plkst.',
      wakeSet: 'Norādīt mošanās laiku',
      advice: 'Mierīgs vakars un ekrāni ārā 30 minūtes pirms miega palīdz šīs nakts atjaunošanās procesam.',
      windDown: 'Miera pulsa pazemināšanās',
      windDownNow: (now, resting) => `Tagad ${now} k/min, par ${Math.max(0, now - resting)} virs miera pulsa ${resting}`,
      windDownNone: 'Pulsa pazemināšanās redzama ar valkājamu ierīci. Līdz tam Lotus atjaunošanos vērtē pēc tava čeka.',
    },
    tags: {
      title: 'Kas ietekmēja dienu?',
      sub: 'Atzīmē, kas bija. Lotus salīdzinās tavus nākamos rītus ar šo faktoru un bez tā.',
      names: { lateMeal: 'Vēla maltīte', alcohol: 'Alkohols', caffeine: 'Kofeīns', sauna: 'Pirts', highStress: 'Stiprs stress', hardWorkout: 'Smags treniņš' },
      demo: 'Demo atzīmes',
      saved: 'Saglabāts tikai šajā ierīcē',
    },
    impact: {
      title: 'Tavas atzīmes',
      sentence: (tag, n, metric, a, b, d) => `Pēc dienām ar atzīmi “${tag}” (${n} d.) ${metric} nākamajā rītā vidēji bija ${a}, pēc pārējām dienām ${b} (${d}).`,
      notEnough: 'Pagaidām par maz dienu: atzīmē faktoru vismaz 3 reizes un turpini čeku katru rītu.',
      note: 'Tā ir likumsakarība tavās dienās, nevis cēloņa pierādījums.',
      metric: { readiness: 'gatavība', sleep: 'miega vērtējums', stress: 'miera vērtējums (7 = mierīgi)' },
    },
    calib: { title: (d, of) => `Normas kalibrēšana · ${d}. diena no ${of}`, sub: 'Tavi parastie diapazoni parādās, veicot čekus. Līdz tam skaitļiem nav personiska salīdzinājuma.' },
    device: {
      demo: (m, p) => `Demo ierīce · sinhr. pirms ${m} min · ${p}%`,
      check: { today: 'Čeks šodien veikts', yesterday: 'Pēdējais čeks: vakar', ago: (n) => `Pēdējais čeks: pirms ${n} d.`, none: 'Čeku vēl nav' },
    },
    hypno: { show: 'Rādīt nakti', hide: 'Slēpt nakti', title: 'Miega fāzes naktī', demo: 'Demo nakts', axis: 'Laiks' },
  },
};

// components/np/infoCopy.ts — the "(i)" explanations of every metric (RU / LV / EN).
// Three parts per metric, always in this order: what it means · how to read it (the personal baseline is filled in
// by the screen from the athlete's OWN data, never written here) · what to do with it. No diagnoses, no medical advice:
// anything about pain or health goes to the coach, a doctor or the school nurse.

import type { Lang } from '@/lib/i18n/translations';

export type InfoKey = 'readiness' | 'sleep' | 'load' | 'stress' | 'heart' | 'hrv' | 'stages' | 'temp' | 'resp' | 'trend' | 'health' | 'compare' | 'bedtime' | 'strain' | 'tags' | 'hypno' | 'recovery' | 'consistency' | 'vo2' | 'acwr' | 'why' | 'streak' | 'calib';

export type InfoItem = { title: string; what: string; tip: string };

export type InfoCopy = {
  open: string;
  close: string;
  sections: { what: string; baseline: string; todo: string };
  baseline: { usual: string; now: string; avg30: string; avg60: string; none: string };
  items: Record<InfoKey, InfoItem>;
};

export const INFO: Record<Lang, InfoCopy> = {
  en: {
    open: 'What does this mean?',
    close: 'Close',
    sections: { what: 'What this metric means', baseline: 'Your personal baseline', todo: 'What to do with it' },
    baseline: { usual: 'Your usual range', now: 'Now', avg30: '30-day average', avg60: '60-day average', none: 'Your baseline appears after a few check-ins — it is built only from your own days.' },
    items: {
      readiness: {
        title: 'Readiness',
        what: 'A 0–100 score of how ready your body is to train today. It combines your check-in (sleep, fatigue, stress, soreness), your recent load and your calendar.',
        tip: 'Green days are for the hard sessions, yellow days for steady work, and on red days the plan eases off. The number is a guide — you and your coach decide.',
      },
      sleep: {
        title: 'Sleep',
        what: 'How rested you felt, rated 1–7 in the morning check-in (7 = best). Sleep is the biggest single lever for recovery between sessions.',
        tip: 'A fixed bedtime and a screen-free last half hour move this number more than anything else. If it stays low for several days, tell your coach.',
      },
      load: {
        title: 'Training load',
        what: 'The Load Index compares what you trained recently with what your body is used to. 41–75 is the productive zone; above 75 you are adding more than you can absorb.',
        tip: 'In the light zone you can add a little; in the optimal zone keep the plan; above the zone take an easier day before the next hard one.',
      },
      stress: {
        title: 'Stress & wellness',
        what: 'Your own rating of mental stress (1–7, 7 = calm) together with the wellness percentage from the check-in. School weeks and exams count as load too.',
        tip: 'Short walks, breathing breaks and sleep help. During exam weeks the app already lowers the target — tell your coach if it feels too much.',
      },
      heart: {
        title: 'Resting heart rate',
        what: 'How slowly your heart beats at rest. As fitness grows and recovery is good it tends to drift down; a jump up after a hard day or poor sleep is a sign to ease off.',
        tip: 'Look at the trend over weeks, not one reading. Colours on the bars: grey = idle, blue = rest, yellow = cardio, pink = peak effort.',
      },
      hrv: {
        title: 'HRV (heart-rate variability)',
        what: 'HRV shows how well your nervous system recovers from stress. Higher than your usual means you are well recovered; lower for several days means you are carrying fatigue.',
        tip: 'Compare yourself only with your own range. Several days below it: prioritise sleep and an easier session.',
      },
      stages: {
        title: 'Sleep stages',
        what: 'Deep sleep restores the body, REM sleep supports memory and mood, light sleep is the transition, awake is the time you spent awake in bed. Shares are of the total time in bed.',
        tip: 'A steady bedtime helps all stages. Late caffeine and screens mostly cut into deep and REM.',
      },
      temp: {
        title: 'Skin temperature',
        what: 'The deviation of your skin temperature from your own normal during sleep. Small changes are normal; a bigger shift can come with illness or a very hard day.',
        tip: 'A bigger shift together with low readiness is a reason to rest and, if you feel unwell, to see the school nurse or a doctor.',
      },
      resp: {
        title: 'Respiratory rate',
        what: 'Breaths per minute during sleep. It is very stable for each person, so a change from your usual is more informative than the number itself.',
        tip: 'Treat it as a background signal; it matters when it moves together with other metrics.',
      },
      trend: {
        title: 'Readiness balance',
        what: 'Your readiness for each day against your usual range (the middle half of your last 28 days). Staying inside the band means a steady, well-balanced week.',
        tip: 'Days above the band are your best days for hard work; days below it call for recovery. Tap a day to read its value.',
      },
      health: {
        title: 'Lotus health score',
        what: 'A long-term picture of your recovery habits, built from your check-ins over time, not from a single day.',
        tip: 'Small daily habits move it slowly and reliably: check in every morning, sleep regularly, and keep load inside the optimal zone.',
      },
      compare: {
        title: '30 and 60-day averages',
        what: 'Your recent average against your longer-term average. The hatched bar is the target zone you are aiming for.',
        tip: 'A 30-day average well above the 60-day one means you are ramping up quickly — make sure recovery keeps pace.',
      },
      bedtime: {
        title: 'Bedtime guidance',
        what: 'A bedtime window worked back from the time you wake up, for 8–9 hours of sleep. The common guideline for teenagers is 8–10 hours.',
        tip: 'Going to bed inside the window on most nights matters more than one perfect night. Keep the wake-up time steady, weekends too.',
      },
      strain: {
        title: 'Daytime balance',
        what: 'Stress balance is how calm you felt in this morning’s check-in (1–7, higher is calmer). Activity strain is your Load Index: today’s load against what your body is used to.',
        tip: 'High stress and high strain together mean the evening should be light. If strain is low and stress is calm, there is room to train.',
      },
      tags: {
        title: 'Factor tags',
        what: 'Tags are the things that may shape your recovery: a late meal, caffeine, a sauna, a hard session. Lotus compares the mornings after tagged days with the other mornings.',
        tip: 'Tag honestly for a few weeks. A pattern appears only after at least 3 tagged days, and it shows a link in your own days, not a proven cause.',
      },
      hypno: {
        title: 'Night detail',
        what: 'The sleep stages in the order they happened: deep at the bottom, awake at the top. A healthy night has several cycles, with deep sleep mostly early and REM mostly late.',
        tip: 'Short awake moments are normal. Many long ones, or a night with no deep sleep, are worth a talk with your coach or school nurse.',
      },
      recovery: {
        title: 'Recovery rate',
        what: 'The share of your check-in days that landed in the green readiness zone.',
        tip: 'Raise it with regular sleep and by keeping load inside the optimal zone, not by skipping check-ins.',
      },
      consistency: {
        title: 'Training consistency',
        what: 'How many days you checked in out of the days in the period.',
        tip: 'A short check-in every morning is what makes every other number personal to you.',
      },
      vo2: {
        title: 'VO2 max',
        what: 'An estimate of how much oxygen your body can use at full effort, a measure of aerobic fitness. It needs a wearable, so Lotus shows it only on demo accounts.',
        tip: 'It rises slowly with steady aerobic training over weeks and months.',
      },
      acwr: {
        title: 'Stress balance (ACWR)',
        what: 'Your last 7 days of training against your last 28 days. The sweet spot is a gentle build-up; a sudden jump is the usual path to overuse.',
        tip: 'If the ratio jumps, add rest or lighter sessions before the next hard day.',
      },
      why: {
        title: 'Why this score',
        what: 'The deductions and bonuses behind today’s readiness: your check-in answers, recent load and calendar. Nothing is hidden or estimated.',
        tip: 'Change what you can change: sleep, food, rest between sessions. The coach and you decide the plan, not the number.',
      },
      streak: {
        title: 'Check-in streak',
        what: 'How many days in a row you checked in. Only the check-in counts, not the zone colour.',
        tip: 'An honest “I feel bad” counts the same as a green day, and it is the most useful check-in.',
      },
      calib: {
        title: 'Baseline calibration',
        what: 'Your personal ranges (what is usual for you) need about 14 check-in days to settle. Until then Lotus has little to compare today against.',
        tip: 'Check in every morning and answer honestly. The ranges, averages and “usual” bands appear and sharpen day by day.',
      },
    },
  },
  ru: {
    open: 'Что это значит?',
    close: 'Закрыть',
    sections: { what: 'Что означает эта метрика', baseline: 'Твоя личная норма', todo: 'Что с этим делать' },
    baseline: { usual: 'Твой обычный диапазон', now: 'Сейчас', avg30: 'Среднее за 30 дней', avg60: 'Среднее за 60 дней', none: 'Твоя норма появится после нескольких чек-инов: она строится только по твоим собственным дням.' },
    items: {
      readiness: {
        title: 'Готовность',
        what: 'Оценка от 0 до 100: насколько тело готово тренироваться сегодня. Учитывает чек-ин (сон, усталость, стресс, боль в мышцах), недавнюю нагрузку и календарь.',
        tip: 'В зелёные дни — тяжёлые тренировки, в жёлтые — ровная работа, в красные план смягчается. Число — подсказка, решаете вы с тренером.',
      },
      sleep: {
        title: 'Сон',
        what: 'Насколько ты выспался: оценка от 1 до 7 в утреннем чек-ине (7 — лучше всего). Сон — главный рычаг восстановления между тренировками.',
        tip: 'Фиксированное время отбоя и полчаса без экрана перед сном двигают это число сильнее всего. Если оно несколько дней низкое — скажи тренеру.',
      },
      load: {
        title: 'Тренировочная нагрузка',
        what: 'Индекс нагрузки сравнивает, сколько ты тренировался недавно, с тем, к чему привык организм. 41–75 — продуктивная зона; выше 75 нагрузки больше, чем организм успевает переварить.',
        tip: 'В лёгкой зоне можно добавить, в оптимальной — держать план, выше зоны — взять более лёгкий день перед следующим тяжёлым.',
      },
      stress: {
        title: 'Стресс и самочувствие',
        what: 'Твоя оценка стресса (1–7, 7 — спокойно) вместе с процентом самочувствия из чек-ина. Учебные недели и экзамены тоже считаются нагрузкой.',
        tip: 'Помогают короткие прогулки, дыхательные паузы и сон. В экзаменационные недели приложение само снижает цель — скажи тренеру, если это слишком много.',
      },
      heart: {
        title: 'Пульс покоя',
        what: 'Насколько редко бьётся сердце в покое. С ростом формы и хорошим восстановлением он обычно снижается; скачок вверх после тяжёлого дня или плохого сна — повод сбавить.',
        tip: 'Смотри на тренд за недели, а не на одно измерение. Цвета столбиков: серый — покой без активности, синий — отдых, жёлтый — кардио, розовый — пик усилия.',
      },
      hrv: {
        title: 'HRV (вариабельность пульса)',
        what: 'HRV показывает, насколько хорошо нервная система восстанавливается после стресса. Выше обычного — ты хорошо восстановился; ниже несколько дней подряд — копится усталость.',
        tip: 'Сравнивай себя только со своим диапазоном. Несколько дней ниже него — приоритет сон и более лёгкая тренировка.',
      },
      stages: {
        title: 'Фазы сна',
        what: 'Глубокий сон восстанавливает тело, REM поддерживает память и настроение, лёгкий — переход между фазами, бодрствование — время, проведённое без сна в постели. Доли считаются от всего времени в постели.',
        tip: 'Ровное время отбоя помогает всем фазам. Поздний кофеин и экраны чаще всего отнимают глубокий сон и REM.',
      },
      temp: {
        title: 'Температура кожи',
        what: 'Отклонение температуры кожи от твоей собственной нормы во сне. Небольшие колебания нормальны; заметный сдвиг бывает при болезни или очень тяжёлом дне.',
        tip: 'Заметный сдвиг вместе с низкой готовностью — повод отдохнуть, а при плохом самочувствии обратиться к школьной медсестре или врачу.',
      },
      resp: {
        title: 'Частота дыхания',
        what: 'Вдохов в минуту во сне. У каждого человека она очень стабильна, поэтому изменение относительно твоей нормы важнее самого числа.',
        tip: 'Это фоновый сигнал: он важен, когда меняется вместе с другими метриками.',
      },
      trend: {
        title: 'Баланс готовности',
        what: 'Твоя готовность по дням на фоне твоего обычного диапазона (середина значений за последние 28 дней). Если ты внутри полосы — неделя ровная и сбалансированная.',
        tip: 'Дни выше полосы — лучшие для тяжёлой работы, ниже — для восстановления. Нажми на день, чтобы увидеть значение.',
      },
      health: {
        title: 'Индекс здоровья Lotus',
        what: 'Долгосрочная картина твоих привычек восстановления, собранная по чек-инам за долгое время, а не за один день.',
        tip: 'Медленно и надёжно её двигают маленькие привычки: чек-ин каждое утро, регулярный сон и нагрузка в оптимальной зоне.',
      },
      compare: {
        title: 'Средние за 30 и 60 дней',
        what: 'Твоё недавнее среднее рядом с долгосрочным. Штрихованная полоса — целевая зона, к которой ты стремишься.',
        tip: 'Если среднее за 30 дней заметно выше, чем за 60, ты быстро наращиваешь нагрузку — следи, чтобы восстановление успевало.',
      },
      bedtime: {
        title: 'Подсказка ко сну',
        what: 'Окно отхода ко сну, рассчитанное от времени подъёма на 8–9 часов сна. Общая рекомендация для подростков: 8–10 часов.',
        tip: 'Важнее ложиться в окно большинство ночей, чем одна идеальная ночь. Держи время подъёма ровным, и в выходные тоже.',
      },
      strain: {
        title: 'Баланс дня',
        what: 'Баланс стресса: насколько спокойно ты чувствовал себя в утреннем чек-ине (1–7, выше значит спокойнее). Нагрузка дня: индекс нагрузки, то есть сегодняшняя нагрузка относительно привычной для тела.',
        tip: 'Высокий стресс и высокая нагрузка вместе: вечер должен быть лёгким. Низкая нагрузка и спокойствие: есть запас для тренировки.',
      },
      tags: {
        title: 'Метки факторов',
        what: 'Метки: то, что может влиять на восстановление, например поздний ужин, кофеин, сауна, тяжёлая тренировка. Lotus сравнивает утра после дней с меткой и остальные утра.',
        tip: 'Отмечай честно несколько недель. Закономерность появится не раньше 3 дней с меткой, и это связь в твоих днях, а не доказанная причина.',
      },
      hypno: {
        title: 'Ночь подробно',
        what: 'Стадии сна в порядке их появления: глубокий внизу, бодрствование наверху. В здоровую ночь несколько циклов, глубокий сон чаще в начале, REM чаще в конце.',
        tip: 'Короткие пробуждения нормальны. Много долгих или ночь без глубокого сна: повод поговорить с тренером или школьной медсестрой.',
      },
      recovery: {
        title: 'Скорость восстановления',
        what: 'Доля дней с чек-ином, которые попали в зелёную зону готовности.',
        tip: 'Повышай регулярным сном и нагрузкой в оптимальной зоне, а не пропуском чек-инов.',
      },
      consistency: {
        title: 'Регулярность',
        what: 'Сколько дней из периода ты сделал чек-ин.',
        tip: 'Короткий чек-ин каждое утро делает все остальные числа личными для тебя.',
      },
      vo2: {
        title: 'VO2 max',
        what: 'Оценка того, сколько кислорода тело использует при полном усилии, показатель аэробной формы. Нужно носимое устройство, поэтому Lotus показывает это только на демо-аккаунтах.',
        tip: 'Растёт медленно, при ровных аэробных тренировках неделями и месяцами.',
      },
      acwr: {
        title: 'Баланс стресса (ACWR)',
        what: 'Последние 7 дней тренировок относительно последних 28. Хорошо, когда нагрузка нарастает плавно; резкий скачок обычный путь к перегрузке.',
        tip: 'Если отношение подскочило, добавь отдых или лёгкие сессии перед следующим тяжёлым днём.',
      },
      why: {
        title: 'Почему такая оценка',
        what: 'Вычеты и бонусы за сегодняшней готовностью: ответы чек-ина, недавняя нагрузка и календарь. Ничего не скрыто и не выдумано.',
        tip: 'Меняй то, что можешь: сон, еду, отдых между сессиями. План решаете вы с тренером, а не число.',
      },
      streak: {
        title: 'Серия чек-инов',
        what: 'Сколько дней подряд ты делал чек-ин. Считается только сам чек-ин, а не цвет зоны.',
        tip: 'Честное «мне плохо» считается так же, как зелёный день, и это самый полезный чек-ин.',
      },
      calib: {
        title: 'Калибровка нормы',
        what: 'Твоим личным диапазонам (что для тебя обычно) нужно около 14 дней чек-инов. До этого Lotus почти не с чем сравнивать сегодняшний день.',
        tip: 'Делай чек-ин каждое утро и отвечай честно. Диапазоны, средние и полосы «обычного» появляются и уточняются день за днём.',
      },
    },
  },
  lv: {
    open: 'Ko tas nozīmē?',
    close: 'Aizvērt',
    sections: { what: 'Ko šis rādītājs nozīmē', baseline: 'Tava personīgā norma', todo: 'Ko ar to darīt' },
    baseline: { usual: 'Tavs parastais diapazons', now: 'Tagad', avg30: '30 dienu vidējais', avg60: '60 dienu vidējais', none: 'Tava norma parādīsies pēc dažām pašsajūtas atzīmēm — tā tiek veidota tikai no taviem pašu datiem.' },
    items: {
      readiness: {
        title: 'Gatavība',
        what: 'Vērtējums no 0 līdz 100: cik ķermenis ir gatavs treniņam šodien. Tajā ņemta vērā pašsajūtas atzīme (miegs, nogurums, stress, muskuļu sāpes), nesenā slodze un kalendārs.',
        tip: 'Zaļajās dienās — smagi treniņi, dzeltenajās — vienmērīgs darbs, sarkanajās plāns kļūst maigāks. Skaitlis ir ieteikums — lemj tu kopā ar treneri.',
      },
      sleep: {
        title: 'Miegs',
        what: 'Cik izgulējies juties: vērtējums no 1 līdz 7 rīta atzīmē (7 — vislabāk). Miegs ir galvenais atjaunošanās instruments starp treniņiem.',
        tip: 'Fiksēts došanās gulēt laiks un pusstunda bez ekrāna pirms miega šo skaitli ietekmē visvairāk. Ja tas dažas dienas ir zems, pastāsti treneram.',
      },
      load: {
        title: 'Treniņu slodze',
        what: 'Slodzes indekss salīdzina, cik daudz trenējies nesen, ar to, pie kā pieradis organisms. 41–75 ir produktīvā zona; virs 75 slodze ir lielāka, nekā organisms spēj uzņemt.',
        tip: 'Vieglajā zonā drīkst pielikt, optimālajā — turēt plānu, virs zonas — pirms nākamā smagā treniņa paņemt vieglāku dienu.',
      },
      stress: {
        title: 'Stress un pašsajūta',
        what: 'Tavs stresa vērtējums (1–7, 7 — mierīgi) kopā ar pašsajūtas procentiem no atzīmes. Mācību nedēļas un eksāmeni arī skaitās slodze.',
        tip: 'Palīdz īsas pastaigas, elpošanas pauzes un miegs. Eksāmenu nedēļās lietotne pati samazina mērķi — pastāsti treneram, ja tas ir par daudz.',
      },
      heart: {
        title: 'Atpūtas pulss',
        what: 'Cik reti sirds pukst miera stāvoklī. Pieaugot formai un labi atjaunojoties, tas parasti samazinās; lēciens uz augšu pēc smagas dienas vai slikta miega ir iemesls samazināt tempu.',
        tip: 'Skaties tendenci nedēļu griezumā, nevis vienu mērījumu. Joslu krāsas: pelēka — miers, zila — atpūta, dzeltena — kardio, rozā — maksimāls piepūles brīdis.',
      },
      hrv: {
        title: 'HRV (pulsa mainīgums)',
        what: 'HRV rāda, cik labi nervu sistēma atjaunojas pēc stresa. Virs parastā — esi labi atjaunojies; vairākas dienas zem parastā — krājas nogurums.',
        tip: 'Salīdzini sevi tikai ar savu diapazonu. Vairākas dienas zem tā — prioritāte miegam un vieglākam treniņam.',
      },
      stages: {
        title: 'Miega fāzes',
        what: 'Dziļais miegs atjauno ķermeni, REM atbalsta atmiņu un garastāvokli, vieglais ir pāreja starp fāzēm, nomoda laiks ir laiks, ko pavadi gultā nomodā. Daļas rēķinātas no kopējā laika gultā.',
        tip: 'Vienmērīgs gulētiešanas laiks palīdz visām fāzēm. Vēls kofeīns un ekrāni visbiežāk sagrauj dziļo miegu un REM.',
      },
      temp: {
        title: 'Ādas temperatūra',
        what: 'Ādas temperatūras novirze no tavas paša normas miega laikā. Nelielas svārstības ir normālas; lielāka novirze var būt slimības vai ļoti smagas dienas dēļ.',
        tip: 'Lielāka novirze kopā ar zemu gatavību ir iemesls atpūsties, bet, ja jūties slikti, vērsties pie skolas medmāsas vai ārsta.',
      },
      resp: {
        title: 'Elpošanas biežums',
        what: 'Elpas minūtē miega laikā. Katram cilvēkam tas ir ļoti stabils, tāpēc izmaiņas pret tavu normu ir svarīgākas par pašu skaitli.',
        tip: 'Tas ir fona signāls: svarīgs, kad mainās kopā ar citiem rādītājiem.',
      },
      trend: {
        title: 'Gatavības līdzsvars',
        what: 'Tava gatavība pa dienām uz tava parastā diapazona fona (pēdējo 28 dienu vidējā puse). Ja esi joslas iekšienē, nedēļa ir vienmērīga un līdzsvarota.',
        tip: 'Dienas virs joslas ir labākās smagam darbam, zem tās — atjaunošanās. Pieskaries dienai, lai redzētu vērtību.',
      },
      health: {
        title: 'Lotus veselības indekss',
        what: 'Ilgtermiņa ainava par taviem atjaunošanās ieradumiem, kas veidota no pašsajūtas atzīmēm ilgākā laikā, nevis par vienu dienu.',
        tip: 'Lēni un droši to virza mazi ieradumi: atzīme katru rītu, regulārs miegs un slodze optimālajā zonā.',
      },
      compare: {
        title: '30 un 60 dienu vidējie',
        what: 'Tavs nesenais vidējais līdzās ilgtermiņa vidējam. Svītrotā josla ir mērķa zona, uz kuru tiecies.',
        tip: 'Ja 30 dienu vidējais ir ievērojami augstāks par 60 dienu, slodzi palielini ātri — raugies, lai atjaunošanās tiek līdzi.',
      },
      bedtime: {
        title: 'Miega ieteikums',
        what: 'Gulētiešanas laika logs, rēķināts no mošanās laika 8–9 stundu miegam. Vispārējs ieteikums pusaudžiem: 8–10 stundas.',
        tip: 'Svarīgāk ir iet gulēt logā lielāko daļu nakšu nekā vienu ideālu nakti. Turi mošanās laiku stabilu, arī brīvdienās.',
      },
      strain: {
        title: 'Dienas līdzsvars',
        what: 'Stresa līdzsvars ir tas, cik mierīgi juties rīta čekā (1–7, augstāks nozīmē mierīgāk). Dienas slodze ir slodzes indekss: šodienas slodze pret ierasto.',
        tip: 'Augsts stress un augsta slodze kopā nozīmē vieglu vakaru. Zema slodze un miers nozīmē, ka ir rezerve treniņam.',
      },
      tags: {
        title: 'Faktoru atzīmes',
        what: 'Atzīmes ir lietas, kas var ietekmēt atjaunošanos: vēla maltīte, kofeīns, pirts, smags treniņš. Lotus salīdzina rītus pēc atzīmētām dienām ar pārējiem rītiem.',
        tip: 'Atzīmē godīgi dažas nedēļas. Likumsakarība parādās pēc vismaz 3 atzīmētām dienām, un tā ir saistība tavās dienās, nevis pierādīts cēlonis.',
      },
      hypno: {
        title: 'Nakts sīkāk',
        what: 'Miega fāzes tādā secībā, kādā tās notika: dziļais miegs apakšā, nomoda laiks augšā. Veselīgā naktī ir vairāki cikli, dziļais miegs biežāk agri, REM biežāk vēlāk.',
        tip: 'Īsi pamodināšanās brīži ir normāli. Daudz garu vai nakts bez dziļā miega ir iemesls aprunāties ar treneri vai skolas medmāsu.',
      },
      recovery: {
        title: 'Atjaunošanās ātrums',
        what: 'Čeka dienu daļa, kas nonāca zaļajā gatavības zonā.',
        tip: 'Paaugstini ar regulāru miegu un slodzi optimālajā zonā, nevis izlaižot čekus.',
      },
      consistency: {
        title: 'Regularitāte',
        what: 'Cik dienās no perioda tu veici čeku.',
        tip: 'Īss čeks katru rītu padara visus pārējos skaitļus personiskus.',
      },
      vo2: {
        title: 'VO2 max',
        what: 'Novērtējums, cik daudz skābekļa ķermenis izmanto pilnā piepūlē, aerobās formas rādītājs. Vajag valkājamu ierīci, tāpēc Lotus to rāda tikai demo kontos.',
        tip: 'Aug lēni, ar vienmērīgiem aerobiem treniņiem nedēļām un mēnešiem.',
      },
      acwr: {
        title: 'Stresa līdzsvars (ACWR)',
        what: 'Pēdējās 7 dienas pret pēdējām 28. Labi, kad slodze aug mierīgi; straujš lēciens ir ierastais ceļš uz pārslodzi.',
        tip: 'Ja attiecība strauji pieaug, pievieno atpūtu vai vieglākus treniņus pirms nākamās smagās dienas.',
      },
      why: {
        title: 'Kāpēc šāds vērtējums',
        what: 'Atskaitījumi un bonusi aiz šodienas gatavības: čeka atbildes, nesenā slodze un kalendārs. Nekas nav slēpts vai izdomāts.',
        tip: 'Maini to, ko vari: miegu, ēdienu, atpūtu starp treniņiem. Plānu lemjat jūs ar treneri, nevis skaitlis.',
      },
      streak: {
        title: 'Čeku sērija',
        what: 'Cik dienas pēc kārtas veici čeku. Skaitās tikai pats čeks, nevis zonas krāsa.',
        tip: 'Godīgs „jūtos slikti” skaitās tāpat kā zaļa diena, un tas ir noderīgākais čeks.',
      },
      calib: {
        title: 'Normas kalibrēšana',
        what: 'Taviem personīgajiem diapazoniem (kas tev ir ierasts) vajag apmēram 14 čeku dienu. Līdz tam Lotus ir maz, ar ko salīdzināt šodienu.',
        tip: 'Veic čeku katru rītu un atbildi godīgi. Diapazoni, vidējie un „ierastās” joslas parādās un kļūst precīzāki diena pēc dienas.',
      },
    },
  },
};

'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  PersonSimpleRun,
  Barbell,
  SwimmingPool,
  SoccerBall,
  Basketball,
  Bicycle,
  Leaf,
  DotsThree,
  CheckCircle,
  WarningCircle,
  Warning,
  ArrowLeft,
  type Icon,
} from '@phosphor-icons/react';
import type { ParsedQuestion } from '@/lib/questions-parser';

type Lang = 'ru' | 'lv' | 'en';

const LABELS: Record<Lang, { next: string; back: string; done: string; questionOf: (i: number, n: number) => string }> = {
  ru: { next: 'Далее', back: 'Назад', done: 'Готово', questionOf: (i, n) => `Вопрос ${i} из ${n}` },
  lv: { next: 'Tālāk', back: 'Atpakaļ', done: 'Gatavs', questionOf: (i, n) => `Jautājums ${i} no ${n}` },
  en: { next: 'Next', back: 'Back', done: 'Done', questionOf: (i, n) => `Question ${i} of ${n}` },
};

type Category = 'cardio' | 'strength' | 'lowImpact' | 'intervals' | 'mobility';

const CATEGORY_LABEL: Record<Lang, Record<Category, string>> = {
  ru: { cardio: 'Кардио', strength: 'Сила', lowImpact: 'Без ударной нагрузки', intervals: 'Интервалы', mobility: 'Мобильность' },
  lv: { cardio: 'Kardio', strength: 'Spēks', lowImpact: 'Bez triecienslodzes', intervals: 'Intervāli', mobility: 'Kustīgums' },
  en: { cardio: 'Cardio', strength: 'Strength', lowImpact: 'Low impact', intervals: 'Intervals', mobility: 'Mobility' },
};

// Options come from the AI as free text in ru/lv/en, so icons are matched by
// keyword. Anything unrecognised simply renders without an icon.
const ICON_RULES: { re: RegExp; icon: Icon; category?: Category }[] = [
  { re: /бег|run|skrie/i, icon: PersonSimpleRun, category: 'cardio' },
  { re: /зал|gym|zāl|сил|strength|spēk/i, icon: Barbell, category: 'strength' },
  { re: /плав|swim|peld/i, icon: SwimmingPool, category: 'lowImpact' },
  { re: /баскет|basket/i, icon: Basketball, category: 'intervals' },
  { re: /команд|team|komand|футбол|soccer|football|futbol/i, icon: SoccerBall, category: 'intervals' },
  { re: /вело|bike|cycl|ritene|velo/i, icon: Bicycle, category: 'cardio' },
  { re: /йог|yoga|jog|растяж|stretch|mobil|stiep/i, icon: Leaf, category: 'mobility' },
  { re: /друг|other|cit/i, icon: DotsThree },
  { re: /^(нет|no|none|nē)\b/i, icon: CheckCircle },
  { re: /немного|a little|nedaudz/i, icon: WarningCircle },
  { re: /^(да|yes|jā)\b|problem|проблем|problēm/i, icon: Warning },
];

function matchOption(text: string) {
  return ICON_RULES.find((r) => r.re.test(text.trim()));
}

const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const;

// Direction-aware so going back exits the way it came in (custom = +1 / -1).
const SLIDE = {
  enter: (d: number) => ({ opacity: 0, x: 16 * d }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: -16 * d }),
};
const FADE = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

/**
 * Renders a <questions> block (parsed by lib/questions-parser.ts) as a
 * one-question-at-a-time card. Choice options become tappable activity
 * cards when we can recognise them, otherwise compact pills; numeric
 * questions become a slider. Once the last question is answered, all Q/A
 * pairs are compiled into one summary and handed to onComplete, which the
 * chat page sends as the athlete's next message.
 */
export default function QuickReplyQuestions({
  questions,
  lang,
  onComplete,
}: {
  questions: ParsedQuestion[];
  lang: Lang;
  onComplete: (summary: string) => void;
}) {
  const L = LABELS[lang];
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<(string | number)[]>(() =>
    questions.map((q) => (q.type === 'slider' ? Math.round(((q.min ?? 1) + (q.max ?? 7)) / 2) : ''))
  );
  const [submitted, setSubmitted] = useState(false);

  if (submitted || questions.length === 0) return null;

  const current = questions[step];
  const isLast = step === questions.length - 1;

  function complete(finalAnswers: (string | number)[]) {
    setSubmitted(true);
    const summary = questions
      .map((q, i) => {
        const a = finalAnswers[i];
        const value = q.type === 'slider' ? `${a}${q.unit ? ' ' + q.unit : ''}` : String(a);
        return `${q.text} ${value}`;
      })
      .join('\n');
    onComplete(summary);
  }

  function goTo(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function handleChoice(option: string) {
    const updated = [...answers];
    updated[step] = option;
    setAnswers(updated);
    // Let the selected state register visually before advancing.
    setTimeout(() => (step === questions.length - 1 ? complete(updated) : goTo(step + 1)), 220);
  }

  function handleSlider(value: number) {
    const updated = [...answers];
    updated[step] = value;
    setAnswers(updated);
  }

  const options = current.type === 'choice' ? current.options ?? [] : [];
  const matched = options.map(matchOption);
  const asCards = options.length > 0 && matched.filter(Boolean).length >= Math.ceil(options.length / 2);

  return (
    <div className="mt-4 overflow-hidden rounded-2xl bg-black/30 p-4 ring-1 ring-inset ring-white/[0.08]">
      {/* Sequence progress: the questions really are a sequence, so segments fit. */}
      <div className="mb-3 flex items-center gap-3">
        <div className="flex flex-1 gap-1" aria-hidden>
          {questions.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-[#CCFF00]"
                initial={false}
                animate={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
                transition={reduce ? { duration: 0 } : SPRING}
              />
            </div>
          ))}
        </div>
        <span className="shrink-0 text-[11px] text-zinc-500">{L.questionOf(step + 1, questions.length)}</span>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          variants={reduce ? FADE : SLIDE}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduce ? { duration: 0.15 } : SPRING}
        >
          <p className="mb-4 text-[15px] font-medium leading-snug tracking-[-0.01em] text-zinc-50">{current.text}</p>

          {current.type === 'choice' && asCards && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {options.map((opt, i) => {
                const m = matched[i];
                const Icon = m?.icon;
                const selected = answers[step] === opt;
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                    className={`group flex flex-col items-start gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset transition-colors ${
                      selected
                        ? 'bg-[#CCFF00]/10 ring-[#CCFF00]/60 shadow-[0_0_0_1px_rgba(204,255,0,0.25),0_10px_30px_-10px_rgba(204,255,0,0.45)]'
                        : 'bg-white/[0.03] ring-white/[0.08] hover:bg-white/[0.06] hover:ring-white/20'
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        selected ? 'bg-[#CCFF00] text-zinc-950' : 'bg-white/[0.06] text-zinc-200'
                      }`}
                    >
                      {Icon ? <Icon size={20} weight={selected ? 'fill' : 'regular'} /> : <DotsThree size={20} />}
                    </span>
                    <span>
                      <span className="block text-sm font-medium text-zinc-50">{opt}</span>
                      {m?.category && (
                        <span className="mt-0.5 block text-[11px] text-zinc-500">{CATEGORY_LABEL[lang][m.category]}</span>
                      )}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          )}

          {current.type === 'choice' && !asCards && (
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const selected = answers[step] === opt;
                return (
                  <motion.button
                    key={opt}
                    type="button"
                    onClick={() => handleChoice(opt)}
                    whileTap={reduce ? undefined : { scale: 0.96 }}
                    className={`rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors ${
                      selected
                        ? 'bg-[#CCFF00] text-zinc-950 ring-[#CCFF00]'
                        : 'bg-white/[0.04] text-zinc-200 ring-white/10 hover:ring-white/25'
                    }`}
                  >
                    {opt}
                  </motion.button>
                );
              })}
            </div>
          )}

          {current.type === 'slider' && (
            <div>
              <div className="mb-3 flex items-end justify-center gap-2">
                <span className="font-mono text-5xl font-light tabular-nums tracking-[-0.04em] text-zinc-50">
                  {answers[step]}
                </span>
                {current.unit && <span className="pb-1.5 text-sm text-zinc-400">{current.unit}</span>}
              </div>
              <input
                type="range"
                min={current.min}
                max={current.max}
                value={Number(answers[step]) || current.min}
                onChange={(e) => handleSlider(Number(e.target.value))}
                aria-label={current.text}
                className="w-full accent-[#CCFF00]"
              />
              <div className="mt-1 flex justify-between font-mono text-[11px] tabular-nums text-zinc-500">
                <span>{current.min}</span>
                <span>{current.max}</span>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goTo(Math.max(0, step - 1))}
          disabled={step === 0}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 transition-opacity hover:text-zinc-200 disabled:pointer-events-none disabled:opacity-0"
        >
          <ArrowLeft size={12} />
          {L.back}
        </button>

        {current.type === 'slider' && (
          <motion.button
            type="button"
            onClick={() => (isLast ? complete(answers) : goTo(step + 1))}
            whileTap={reduce ? undefined : { scale: 0.96 }}
            className="rounded-full bg-[#CCFF00] px-5 py-2 text-sm font-medium text-zinc-950"
          >
            {isLast ? L.done : L.next}
          </motion.button>
        )}
      </div>
    </div>
  );
}

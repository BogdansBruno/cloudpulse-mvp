'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  X,
  SoccerBall,
  Basketball,
  PersonSimpleRun,
  SwimmingPool,
  Barbell,
  DotsThree,
  Trophy,
  GraduationCap,
  WarningOctagon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type SportKey = 'football' | 'basketball' | 'athletics' | 'swimming' | 'gym' | 'other';

// `value` is what gets stored in the profile (unchanged from before, so
// existing rows stay consistent); the label is translated for display.
const SPORTS: { key: SportKey; value: string; icon: Icon }[] = [
  { key: 'football', value: 'Football', icon: SoccerBall },
  { key: 'basketball', value: 'Basketball', icon: Basketball },
  { key: 'athletics', value: 'Athletics', icon: PersonSimpleRun },
  { key: 'swimming', value: 'Swimming', icon: SwimmingPool },
  { key: 'gym', value: 'Gym / General fitness', icon: Barbell },
  { key: 'other', value: 'Other', icon: DotsThree },
];

const AGES = ['13-15', '16-18'];
const TOTAL_STEPS = 3;
const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const;

// Direction-aware so "Back" exits the way the step came in.
const SLIDE = {
  enter: (d: number) => ({ opacity: 0, x: 24 * d }),
  center: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: -24 * d }),
};
const FADE = { enter: { opacity: 0 }, center: { opacity: 1 }, exit: { opacity: 0 } };

function tileClass(selected: boolean) {
  return `relative flex flex-col items-start gap-3 rounded-2xl p-4 text-left ring-1 ring-inset transition-[background-color,box-shadow] duration-200 ${
    selected
      ? 'bg-[#CCFF00]/[0.08] ring-[#CCFF00]/70 shadow-[0_0_0_1px_rgba(204,255,0,0.25),0_12px_32px_-12px_rgba(204,255,0,0.45)]'
      : 'bg-white/[0.03] ring-white/[0.08] hover:bg-white/[0.06] hover:ring-white/20'
  }`;
}

function DateList({
  label,
  icon: IconCmp,
  dates,
  onChange,
  addLabel,
  removeLabel,
}: {
  label: string;
  icon: Icon;
  dates: string[];
  onChange: (d: string[]) => void;
  addLabel: string;
  removeLabel: string;
}) {
  const [draft, setDraft] = useState('');
  const add = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft) || dates.includes(draft)) return;
    onChange([...dates, draft].sort());
    setDraft('');
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <IconCmp size={16} className="text-zinc-400" />
        {label}
      </p>
      <div className="flex gap-2">
        <input
          type="date"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={label}
          className="min-w-0 flex-1 rounded-xl bg-white/[0.05] px-3.5 py-2.5 font-mono text-sm tabular-nums text-zinc-50 ring-1 ring-inset ring-white/10 [color-scheme:dark] focus:outline-none focus:ring-[#CCFF00]/50"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/[0.06] px-3.5 text-sm font-medium text-zinc-100 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
        >
          <Plus size={14} weight="bold" />
          {addLabel}
        </button>
      </div>
      {dates.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {dates.map((d) => (
            <span
              key={d}
              className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] py-1 pl-3 pr-1 font-mono text-xs tabular-nums text-zinc-200 ring-1 ring-inset ring-white/10"
            >
              {d.split('-').reverse().join('.')}
              <button
                type="button"
                onClick={() => onChange(dates.filter((x) => x !== d))}
                aria-label={`${removeLabel} ${d}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
              >
                <X size={11} weight="bold" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const o = t.onboarding;
  const reduce = useReducedMotion();
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [age, setAge] = useState('');
  const [sport, setSport] = useState('');
  const [matchDates, setMatchDates] = useState<string[]>([]);
  const [examDates, setExamDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goTo = (next: number) => {
    setDir(next > step ? 1 : -1);
    setError(null);
    setStep(next);
  };

  const handleNext = async () => {
    setError(null);

    if (step === 1 && !age) {
      setError(o.errAge);
      return;
    }
    if (step === 2 && !sport) {
      setError(o.errSport);
      return;
    }

    if (step < TOTAL_STEPS) {
      goTo(step + 1);
      return;
    }

    setLoading(true);
    try {
      // Same pattern as chat/checkin: attach the Supabase session when one
      // exists, otherwise the server falls back to dev mode.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          age: age ? Number(age.split('-')[0]) : undefined, // lower bound of the bracket
          sport,
          matchDates,
          examDates,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.content || o.errSave);
      }

      router.push('/checkin');
    } catch (err) {
      setError(err instanceof Error ? err.message : o.errGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-14">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-md">
        {/* Step progress: the steps really are a sequence */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-zinc-400">{o.stepOf(step, TOTAL_STEPS)}</span>
            <span className="text-zinc-500">{o.title}</span>
          </div>
          <div className="flex gap-1.5" aria-hidden>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                  className="h-full rounded-full bg-[#CCFF00]"
                  initial={false}
                  animate={{ width: i < step ? '100%' : '0%' }}
                  transition={reduce ? { duration: 0 } : SPRING}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] bg-zinc-900/50 p-6 ring-1 ring-inset ring-white/10 backdrop-blur-2xl md:p-7">
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
              {step === 1 && (
                <>
                  <h1 className="mb-6 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-zinc-50">{o.ageQ}</h1>
                  <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label={o.ageQ}>
                    {AGES.map((option) => {
                      const selected = age === option;
                      return (
                        <motion.button
                          key={option}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setAge(option)}
                          whileTap={reduce ? undefined : { scale: 0.96 }}
                          className={`${tileClass(selected)} py-6`}
                        >
                          <span
                            className={`font-mono text-4xl font-light tabular-nums tracking-[-0.04em] ${
                              selected ? 'text-[#CCFF00]' : 'text-zinc-50'
                            }`}
                          >
                            {option}
                          </span>
                          <span className="text-xs text-zinc-400">{o.ageUnit}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h1 className="mb-6 text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-zinc-50">{o.sportQ}</h1>
                  <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={o.sportQ}>
                    {SPORTS.map(({ key, value, icon: IconCmp }) => {
                      const selected = sport === value;
                      return (
                        <motion.button
                          key={key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSport(value)}
                          whileTap={reduce ? undefined : { scale: 0.96 }}
                          className={tileClass(selected)}
                        >
                          <span
                            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                              selected ? 'bg-[#CCFF00] text-zinc-950' : 'bg-white/[0.06] text-zinc-200'
                            }`}
                          >
                            <IconCmp size={20} weight={selected ? 'fill' : 'regular'} />
                          </span>
                          <span className="text-sm font-medium leading-snug text-zinc-50">{o.sports[key]}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-zinc-50">{o.datesTitle}</h1>
                  <p className="mb-6 mt-2 text-sm leading-relaxed text-zinc-400">{o.datesBody}</p>
                  <div className="space-y-5">
                    <DateList
                      label={o.matchDates}
                      icon={Trophy}
                      dates={matchDates}
                      onChange={setMatchDates}
                      addLabel={o.add}
                      removeLabel={o.remove}
                    />
                    <DateList
                      label={o.examDates}
                      icon={GraduationCap}
                      dates={examDates}
                      onChange={setExamDates}
                      addLabel={o.add}
                      removeLabel={o.remove}
                    />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {error && (
            <div className="mt-5 flex gap-2.5 rounded-2xl bg-[#FF4D5E]/[0.08] p-3.5 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
              <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-7 flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                aria-label={o.back}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/[0.05] text-zinc-300 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.09] hover:text-zinc-50"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <motion.button
              type="button"
              onClick={handleNext}
              disabled={loading}
              whileTap={reduce || loading ? undefined : { scale: 0.97 }}
              className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#CCFF00] text-base font-semibold text-zinc-950 shadow-[0_0_30px_-6px_rgba(204,255,0,0.45),inset_0_1px_0_rgba(255,255,255,0.45)] transition-opacity disabled:opacity-60"
            >
              {loading ? o.saving : step === TOTAL_STEPS ? o.start : o.next}
              {!loading && <ArrowRight size={18} weight="bold" />}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}

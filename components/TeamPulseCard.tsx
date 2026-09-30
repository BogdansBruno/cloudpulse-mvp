'use client';

// "Team pulse" on /coach (lib/team-pulse.ts, supabase/sql/15 team_pulse()).
// Only totals reach this card — the database counts and hides groups under 3.

import { useEffect, useState } from 'react';
import { Heartbeat, TrendUp, TrendDown, Equals, Lightbulb, LockSimple } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { EXTRA } from '@/lib/i18n/extra';
import { HUB } from '@/components/PerformancePanel';
import {
  parsePulse,
  pulseLevel,
  pulseSuggestions,
  pulseTrend,
  type PulseCount,
  type PulseDay,
  type PulseLevel,
} from '@/lib/team-pulse';

const LEVEL_COLOR: Record<Exclude<PulseLevel, 'too_few'>, string> = { calm: HUB.lime, watch: HUB.amber, high: HUB.red };

export default function TeamPulseCard({
  today,
  refreshKey = 0,
  examWindowToday = 0,
}: {
  today: string;
  refreshKey?: number;
  /** Athletes in their exam window today (from the exam storm), for the suggestion. */
  examWindowToday?: number;
}) {
  const { lang } = useLanguage();
  const t = EXTRA[lang].pulse;
  const [days, setDays] = useState<PulseDay[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('team_pulse', { p_days: 8 }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        setFailed(true); // SQL 15 not run yet: the card simply stays hidden
        return;
      }
      setFailed(false);
      setDays(parsePulse(data as unknown[]));
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (failed || !days) return null;
  const d = days.find((x) => x.date === today);
  if (!d || d.teamSize === 0) return null;

  const level = pulseLevel(d);
  const trend = pulseTrend(days, today);
  const suggestions = pulseSuggestions(level, examWindowToday);
  const color = level === 'too_few' ? '#A1A1AA' : LEVEL_COLOR[level];
  const show = (c: PulseCount) => (c === null ? '—' : c === 'fewer' ? t.fewer : t.ofChecked(String(c), d.checkedIn));

  const stats: { label: string; value: PulseCount }[] = [
    { label: t.stress, value: d.stressHigh },
    { label: t.sleep, value: d.sleepPoor },
    { label: t.fatigue, value: d.fatigueHigh },
    { label: t.soreness, value: d.sorenessHigh },
  ];

  return (
    <section className="rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
            <Heartbeat size={18} weight="fill" style={{ color }} />
            {t.title}
          </h2>
          <p className="mt-0.5 text-xs text-zinc-400">{t.subtitle}</p>
        </div>
        {level !== 'too_few' && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ backgroundColor: `${color}1F`, color, boxShadow: `inset 0 0 0 1px ${color}40` }}
          >
            {t.levels[level]}
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-zinc-300">{t.checkedIn(d.checkedIn, d.teamSize)}</p>

      {level === 'too_few' ? (
        <p className="mt-3 flex gap-2 rounded-2xl bg-white/[0.03] p-3 text-sm leading-relaxed text-zinc-400 ring-1 ring-inset ring-white/[0.06]">
          <LockSimple size={16} weight="fill" className="mt-0.5 shrink-0" />
          {t.tooFew}
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/[0.03] px-3 py-2 ring-1 ring-inset ring-white/[0.06]">
                <p className="text-[11px] text-zinc-400">{s.label}</p>
                <p className="mt-1 font-mono text-base tabular-nums text-zinc-50">{show(s.value)}</p>
              </div>
            ))}
          </div>

          {trend && (
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-300">
              {trend === 'higher' ? (
                <TrendUp size={14} weight="bold" style={{ color: HUB.amber }} />
              ) : trend === 'lower' ? (
                <TrendDown size={14} weight="bold" style={{ color: HUB.lime }} />
              ) : (
                <Equals size={14} weight="bold" className="text-zinc-400" />
              )}
              {t.trend[trend]}
            </p>
          )}
        </>
      )}

      {/* Last 8 days: share of strained athletes; hidden days stay empty. */}
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] text-zinc-500">{t.week}</p>
        <div className="flex h-12 items-end gap-1.5" aria-hidden>
          {days.map((x) => {
            const lvl = pulseLevel(x);
            const n = x.strained === 'fewer' ? 1.5 : typeof x.strained === 'number' ? x.strained : 0;
            const h = lvl === 'too_few' ? 0 : Math.max(0.08, n / Math.max(1, x.checkedIn));
            const c = lvl === 'too_few' ? 'transparent' : LEVEL_COLOR[lvl];
            return (
              <span
                key={x.date}
                className={`flex-1 rounded-md ${lvl === 'too_few' ? 'border border-dashed border-white/15' : ''} ${x.date === today ? 'ring-1 ring-white/40' : ''}`}
                style={{ height: lvl === 'too_few' ? '100%' : `${Math.round(h * 100)}%`, backgroundColor: c, opacity: x.date === today ? 1 : 0.6 }}
              />
            );
          })}
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06]">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Lightbulb size={14} weight="fill" className="text-[#CCFF00]" />
            {t.suggestionsTitle}
          </p>
          <ul className="mt-2 space-y-1.5">
            {suggestions.map((s) => (
              <li key={s} className="flex gap-2 text-sm leading-relaxed text-zinc-300">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CCFF00]" />
                {t.suggestions[s]}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">{t.privacy}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{t.notMood}</p>
    </section>
  );
}

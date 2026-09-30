'use client';

// Home widget "My home workout · AI Guard" (chat page). Shows today's plan in
// one glance and opens /training. Same data as the page (lib/use-today-plan),
// refreshed right after a new check-in.

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTodayPlan } from '@/lib/use-today-plan';
import { COACH_LABELS } from '@/adp/src/components/labels';
import { HUB } from '@/components/PerformancePanel';

export default function HomeWorkoutCard({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const { lang } = useLanguage();
  const t = COACH_LABELS[lang];
  const { state } = useTodayPlan(lang);

  const summary =
    state.kind === 'ok'
      ? state.view.mode === 'none'
        ? t.modes.none
        : `${t.modes[state.view.mode]} · ${t.widgetSummary(state.view.totalMinutes, state.view.blocks.length)}`
      : state.kind === 'no_checkin'
        ? t.widgetNoCheckin
        : null;

  const href = state.kind === 'no_checkin' ? '/checkin' : '/training';

  if (compact) {
    return (
      <Link
        href={href}
        className={`flex items-center gap-3 rounded-2xl bg-white/[0.03] px-3.5 py-2.5 ring-1 ring-inset ring-white/[0.08] ${className}`}
      >
        <ShieldCheck size={18} weight="fill" style={{ color: HUB.lime }} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-zinc-50">{t.widgetTitle}</span>
          <span className="block truncate text-xs text-zinc-400">{summary ?? '…'}</span>
        </span>
        <ArrowRight size={16} weight="bold" className="shrink-0 text-zinc-400" />
      </Link>
    );
  }

  const drills = state.kind === 'ok' ? state.view.blocks.flatMap((b) => b.drills).slice(0, 3) : [];

  return (
    <div className={`rounded-3xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.08] ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} weight="fill" style={{ color: HUB.lime }} />
        <p className="flex-1 text-sm font-semibold text-zinc-50">{t.widgetTitle}</p>
        <span className="rounded-full bg-[#CCFF00]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#CCFF00]">
          AI Guard
        </span>
      </div>

      {state.kind === 'loading' && <div className="mt-3 h-12 animate-pulse rounded-2xl bg-white/[0.04]" />}
      {summary && <p className="mt-2 text-xs leading-relaxed text-zinc-400">{summary}</p>}
      {drills.length > 0 && (
        <ul className="mt-2.5 space-y-1">
          {drills.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-[13px] text-zinc-200">
              <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" aria-hidden />
              <span className="truncate">{d.name}</span>
            </li>
          ))}
        </ul>
      )}

      {state.kind !== 'loading' && state.kind !== 'error' && (
        <Link href={href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#CCFF00]">
          {state.kind === 'no_checkin' ? t.toCheckin : t.widgetOpen}
          <ArrowRight size={14} weight="bold" />
        </Link>
      )}
    </div>
  );
}

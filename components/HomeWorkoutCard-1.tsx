'use client';

// Home widget "My home workout · AI Guard" (chat page). Shows today's plan in
// one glance and opens /training. Same data as the page (lib/use-today-plan),
// refreshed right after a new check-in. ADP "Dark Editorial" look: editorial
// glass card, micro-label caps, a wide capsule CTA.

import Link from 'next/link';
import { ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTodayPlan } from '@/lib/use-today-plan';
import { COACH_LABELS } from '@/adp/src/components/labels';
import LiquidGlassCard from '@/adp/src/components/ui/LiquidGlassCard';
import { MICRO_LABEL, SLATE_300, SLATE_400 } from '@/adp/src/components/ui/typography';

const TEAL = '#2DD4BF';

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
        className={`flex items-center gap-3 rounded-full border border-white/[0.12] px-4 py-2.5 backdrop-blur-2xl ${className}`}
        style={{ background: 'rgba(22,23,33,0.75)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.18)' }}
      >
        <ShieldCheck size={18} weight="fill" style={{ color: TEAL }} className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-white">{t.widgetTitle}</span>
          <span className="block truncate text-xs" style={{ color: SLATE_300 }}>
            {summary ?? '…'}
          </span>
        </span>
        <ArrowRight size={16} weight="bold" className="shrink-0 text-white/70" />
      </Link>
    );
  }

  const drills = state.kind === 'ok' ? state.view.blocks.flatMap((b) => b.drills).slice(0, 3) : [];

  return (
    <LiquidGlassCard tone="editorial" radius={28} className={`p-5 ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} weight="fill" style={{ color: TEAL, filter: `drop-shadow(0 0 6px ${TEAL}88)` }} />
        <p className="flex-1 text-sm font-semibold text-white">{t.widgetTitle}</p>
        <span className={`rounded-full px-2.5 py-1 ${MICRO_LABEL}`} style={{ color: TEAL, background: `${TEAL}1A`, border: `1px solid ${TEAL}4D` }}>
          AI Guard
        </span>
      </div>

      {state.kind === 'loading' && <div className="mt-3 h-12 animate-pulse rounded-2xl bg-white/[0.05]" />}
      {summary && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: SLATE_300 }}>
          {summary}
        </p>
      )}
      {drills.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {drills.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-[13px] text-white">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: SLATE_400 }} aria-hidden />
              <span className="truncate">{d.name}</span>
            </li>
          ))}
        </ul>
      )}

      {state.kind !== 'loading' && state.kind !== 'error' && (
        <Link
          href={href}
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/10 py-3.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-[0.98]"
        >
          {state.kind === 'no_checkin' ? t.toCheckin : t.widgetOpen}
          <ArrowRight size={14} weight="bold" />
        </Link>
      )}
    </LiquidGlassCard>
  );
}

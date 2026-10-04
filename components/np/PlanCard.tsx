'use client';

// components/np/PlanCard.tsx — "my workout for today" (ADP AI Guard) as a v3 card, for the chat sidebar.
// Same data as /training (lib/use-today-plan), refreshed right after a new check-in. The button is a
// glass link, never the primary action of the screen.

import Link from 'next/link';
import type { ReactElement } from 'react';
import { ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTodayPlan } from '@/lib/use-today-plan';
import { COACH_LABELS } from '@/adp/src/components/labels';

export default function PlanCard({ compact = false, className = '' }: { compact?: boolean; className?: string }): ReactElement {
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
      <Link href={href} className={`np-card flex items-center gap-3 px-4 py-3 ${className}`}>
        <ShieldCheck size={20} weight="fill" className="shrink-0 text-np-sleep" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-np-text">{t.widgetTitle}</span>
          <span className="block truncate text-xs text-np-text-2">{summary ?? '…'}</span>
        </span>
        <ArrowRight size={16} weight="bold" className="shrink-0 text-np-text-3" aria-hidden />
      </Link>
    );
  }

  const drills = state.kind === 'ok' ? state.view.blocks.flatMap((b) => b.drills).slice(0, 3) : [];

  return (
    <section className={`np-card p-5 ${className}`}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} weight="fill" className="text-np-sleep" aria-hidden />
        <h2 className="flex-1 text-sm font-semibold text-np-text" style={{ fontFamily: 'inherit' }}>
          {t.widgetTitle}
        </h2>
        <span className="np-pill np-pill-ai">AI Guard</span>
      </div>
      {state.kind === 'loading' && <div className="mt-3 h-12 animate-pulse rounded-np-ctrl bg-white/5" />}
      {summary && <p className="mt-2 text-xs leading-relaxed text-np-text-2">{summary}</p>}
      {drills.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {drills.map((d) => (
            <li key={d.id} className="flex items-center gap-2 text-[13px] text-np-text">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-np-text-3" aria-hidden />
              <span className="truncate">{d.name}</span>
            </li>
          ))}
        </ul>
      )}
      {state.kind !== 'loading' && state.kind !== 'error' && (
        <Link href={href} className="np-btn-glass mt-4 flex h-11 w-full items-center justify-center gap-1.5 rounded-np-ctrl text-sm font-medium">
          {state.kind === 'no_checkin' ? t.toCheckin : t.widgetOpen}
          <ArrowRight size={14} weight="bold" aria-hidden />
        </Link>
      )}
    </section>
  );
}

'use client';

// components/np/PlanAdjustCard.tsx — "today's plan was changed" on Today. When the engine's ceiling for the day is
// below green (yellow, red, blocked), the plan from the ADP coach is already the gentle one; this card says so out loud,
// with the reasons and the limits, and links to /training. It changes nothing by itself: the plan comes from the same
// /api/adp-coach as the training page, so the two can never disagree.

import Link from 'next/link';
import type { ReactElement } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ShieldCheck } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useTodayPlan } from '@/lib/use-today-plan';
import { COACH_LABELS } from '@/adp/src/components/labels';
import { STRAIN } from '@/lib/strain-copy';

const COLOR = { yellow: '#F5B83D', red: '#FF3D5A', blocked: '#FF3D5A' } as const;

export default function PlanAdjustCard({ className = '' }: { className?: string }): ReactElement | null {
  const { lang } = useLanguage();
  const reduce = useReducedMotion();
  const { state } = useTodayPlan(lang);
  if (state.kind !== 'ok') return null;
  const v = state.view;
  const ceiling = v.engine.ceiling;
  if (ceiling === 'green') return null;

  const t = COACH_LABELS[lang];
  const c = STRAIN[lang].plan;
  const color = COLOR[ceiling];
  const reasons = v.limits.reasons.slice(0, 3);

  return (
    <motion.section
      aria-labelledby="plan-adjust-title"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`np-card relative overflow-hidden p-4 ${className}`}
      style={{ boxShadow: `inset 3px 0 0 ${color}` }}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} weight="fill" style={{ color }} aria-hidden />
        <h2 id="plan-adjust-title" className="flex-1 text-sm font-semibold text-np-text">
          {c.title}
        </h2>
      </div>
      <p className="mt-1.5 text-[13px] text-np-text-2">{c.changed}</p>

      <div className="mt-3 rounded-np-ctrl px-3 py-2" style={{ background: `${color}1F` }}>
        <p className="text-[11px] uppercase tracking-wide text-np-text-3">{c.to}</p>
        <p className="mt-0.5 text-[14px] font-semibold text-np-text">{t.modes[v.mode]}</p>
        {v.mode !== 'none' && <p className="mt-0.5 text-xs text-np-text-2">{c.limit(v.limits.maxMinutes, v.limits.maxRpe)}</p>}
      </div>

      {reasons.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] uppercase tracking-wide text-np-text-3">{c.why}</p>
          <ul className="mt-1 space-y-1">
            {reasons.map((r) => (
              <li key={r} className="flex items-start gap-2 text-[13px] text-np-text">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                <span>{t.reasons[r]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link href="/training" className="np-btn-glass mt-3 inline-flex min-h-11 items-center gap-1.5 px-4 text-[13px] font-semibold">
        {c.open}
        <ArrowRight size={14} weight="bold" aria-hidden />
      </Link>
    </motion.section>
  );
}

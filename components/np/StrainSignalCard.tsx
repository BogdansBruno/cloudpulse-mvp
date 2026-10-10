'use client';

// components/np/StrainSignalCard.tsx — the overload signal on Today (lib/strain-signal.ts).
// A transparent rule: it names the factors that line up, no percentages, no forecast. Shown only at "watch" or "high".
// The Safety Guard is never touched; with pain the only line is "doctor, school nurse or physio".

import type { ReactElement } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Warning } from '@phosphor-icons/react';
import type { Lang } from '@/lib/i18n/translations';
import { STRAIN } from '@/lib/strain-copy';
import type { StrainSignal } from '@/lib/strain-signal';

const AMBER = '#F5B83D';
const CORAL = '#FF3D5A';

export default function StrainSignalCard({ lang, signal, className = '' }: { lang: Lang; signal: StrainSignal | null; className?: string }): ReactElement | null {
  const reduce = useReducedMotion();
  if (!signal || signal.level === 'none') return null;
  const c = STRAIN[lang].signal;
  const high = signal.level === 'high';
  const color = high ? CORAL : AMBER;
  return (
    <motion.section
      aria-labelledby="strain-title"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`np-card relative overflow-hidden p-4 ${className}`}
      style={{ boxShadow: `inset 3px 0 0 ${color}` }}
    >
      <div className="flex items-center gap-2">
        <Warning size={18} weight="fill" style={{ color }} aria-hidden />
        <h2 id="strain-title" className="flex-1 text-sm font-semibold text-np-text">
          {c.title}
        </h2>
      </div>
      <p className="mt-1.5 text-[13px] font-medium text-np-text">{signal.spike && signal.factors.length < 3 ? c.spike : high ? c.high : c.watch}</p>
      <ul className="mt-2 space-y-1">
        {signal.factors.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-np-text-2">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
            <span>{c.factors[f]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[13px] leading-relaxed text-np-text">{high ? c.advice.high : c.advice.watch}</p>
      {high && <p className="mt-1 text-xs text-np-text-2">{c.coachLine}</p>}
      <p className="mt-2 text-xs leading-relaxed text-np-text-3">
        {c.rule} {c.painLine}
      </p>
    </motion.section>
  );
}

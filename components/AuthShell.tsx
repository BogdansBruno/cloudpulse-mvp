'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { LockSimple, Lightning } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// Shared full-screen shell for /login and /signup: deep charcoal ground,
// a faint LED grid, and a soft lime/cyan glow behind a glass card. Kept
// separate from the form itself so both pages draw from one visual system.
export default function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-grid-dots opacity-40" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(204,255,0,0.10), transparent 60%), radial-gradient(ellipse 40% 40% at 70% 70%, rgba(0,240,255,0.06), transparent 60%)',
        }}
      />

      <motion.div
        initial={reduce ? undefined : { opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.55 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-6">
          <Link href="/chat" className="flex items-center gap-2 mb-3">
            <div className="h-9 w-9 rounded-xl bg-[#CCFF00] text-zinc-950 flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.35)]">
              <Lightning size={18} weight="fill" />
            </div>
            <span className="text-white font-semibold tracking-tight text-lg">CloudPulse</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-zinc-400">
            <LockSimple size={11} weight="fill" className="text-[#CCFF00]" />
            {t.auth.encrypted} · {t.auth.brandTag}
          </span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl shadow-black/50 p-7 sm:p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

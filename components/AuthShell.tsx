'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { LotusMark } from '@/components/np/Lotus';
import { motion, useReducedMotion } from 'motion/react';
import { LockSimple } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// Shared full-screen shell for /login and /signup: deep charcoal ground,
// a faint LED grid, and a soft lime/cyan glow behind a glass card. Kept
// separate from the form itself so both pages draw from one visual system.
export default function AuthShell({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0D11] flex items-center justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+3rem)] pt-[calc(env(safe-area-inset-top)+3rem)]">
      <div className="absolute inset-0 bg-grid-dots opacity-40" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(184,242,60,0.09), transparent 60%), radial-gradient(ellipse 40% 40% at 70% 70%, rgba(142,140,255,0.07), transparent 60%)',
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
            <LotusMark size={34} />
            <span className="text-white font-semibold tracking-tight text-lg">Lotus</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-zinc-400">
            <LockSimple size={11} weight="fill" className="text-[#B8F23C]" />
            {t.auth.encrypted} · {t.auth.brandTag}
          </span>
        </div>

        <div className="np-card p-7 shadow-2xl shadow-black/50 sm:p-8">
          {children}
        </div>
        <p className="mt-5 text-center text-[11px] text-zinc-500">
          <Link href="/privacy" className="underline decoration-white/20 underline-offset-2 hover:text-zinc-300">
            {t.auth.privacyLink}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

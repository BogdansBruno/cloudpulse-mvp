'use client';

// components/np/CalcOverlay.tsx — the beat between the last check-in question and the result:
// "Lotus is calculating your daily readiness…" over a pulsing Lotus orb (soft light, three rings that
// breathe outward, a lotus in the middle). It only dresses the real wait for the engine (and holds for
// a short minimum so the moment reads as intentional, not as a flicker) — the score itself is never
// faked or shown early. With reduced motion the orb is still.

import { motion } from 'motion/react';
import type { ReactElement } from 'react';
import { Icon } from './icons';
import { useReducedMotion } from './ui';

export default function CalcOverlay({ title, sub }: { title: string; sub: string }): ReactElement {
  const reduce = useReducedMotion();
  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-[#0B0D11]/95 px-8 text-center backdrop-blur-md"
    >
      <div className="relative h-44 w-44">
        <span aria-hidden className="np-ambient-pulse absolute -inset-6 rounded-full bg-[#2FD8F0]/30 blur-2xl" />
        {!reduce &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute inset-0 rounded-full border border-[#2FD8F0]/50"
              initial={{ scale: 0.55, opacity: 0.7 }}
              animate={{ scale: 1.55, opacity: 0 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: 'easeOut' }}
            />
          ))}
        <motion.span
          aria-hidden
          className="absolute inset-7 rounded-full"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #CFEBFB 0%, #2FD8F0 42%, #1D5B86 100%)',
            boxShadow: '0 0 48px rgb(47 216 240 / 0.65), inset 0 0 22px rgb(255 255 255 / 0.35)',
          }}
          animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
          transition={reduce ? undefined : { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <span aria-hidden className="absolute inset-0 flex items-center justify-center text-[#0B0D11]">
          <Icon name="lotus" size={44} stroke={1.5} />
        </span>
      </div>
      <h2 className="np-editorial mt-10 max-w-xs text-[26px] font-semibold leading-tight text-white">{title}</h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">{sub}</p>
    </motion.div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Lightning, PersonSimpleRun, Users, House, ArrowRight, Flask, WarningOctagon, LockSimple } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import AccessGate from '@/components/AccessGate';
import type { DemoRole } from '@/lib/demo';

// ---------------------------------------------------------------------------
// /demo — the jury's front door. One click signs in as a made-up athlete,
// coach or parent (server route /api/demo/login holds the password). Demo
// accounts are fenced off from real testers in the database
// (09_demo_sandbox.sql), and their data resets daily and on demand.
// ---------------------------------------------------------------------------

type LoginResponse = { access_token: string; refresh_token: string; home: string };

function DemoPicker() {
  const { t, lang, setLang } = useLanguage();
  const d = t.demo;
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<DemoRole | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/demo/login')
      .then((r) => r.json())
      .then((body: { enabled?: boolean }) => setEnabled(Boolean(body.enabled)))
      .catch(() => setEnabled(false));
  }, []);

  async function enter(role: DemoRole) {
    setBusy(role);
    setError(false);
    try {
      const res = await fetch('/api/demo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('login failed');
      const body = (await res.json()) as LoginResponse;
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
      if (sessionError) throw sessionError;
      window.location.href = body.home;
    } catch {
      setError(true);
      setBusy(null);
    }
  }

  const roles: { role: DemoRole; icon: Icon; title: string; desc: string; color: string }[] = [
    { role: 'athlete', icon: PersonSimpleRun, title: d.athleteTitle, desc: d.athleteDesc, color: '#FF4D5E' },
    { role: 'coach', icon: Users, title: d.coachTitle, desc: d.coachDesc, color: '#CCFF00' },
    { role: 'parent', icon: House, title: d.parentTitle, desc: d.parentDesc, color: '#00F0FF' },
  ];

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-x-clip bg-[#07080A] px-4 py-8">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#CCFF00]/[0.06] blur-[140px]" />

      <div className="relative w-full max-w-2xl">
        <header className="mb-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#CCFF00] text-zinc-950">
              <Lightning size={15} weight="fill" />
            </span>
            CloudPulse
          </span>
          <div className="flex gap-0.5 rounded-full border border-white/5 bg-black/20 p-1 text-xs">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  lang === l.code ? 'bg-[#CCFF00] text-zinc-950' : 'text-zinc-400'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </header>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
        >
          <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] text-zinc-50 md:text-5xl">{d.title}</h1>
          <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-zinc-400">{d.subtitle}</p>

          <p className="mt-5 flex gap-2.5 rounded-2xl bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-300 ring-1 ring-inset ring-white/[0.08]">
            <Flask size={18} weight="fill" className="mt-0.5 shrink-0 text-[#CCFF00]" />
            {d.note}
          </p>

          {enabled === false && (
            <p className="mt-6 flex gap-3 rounded-2xl bg-white/[0.03] p-4 text-sm text-zinc-300 ring-1 ring-inset ring-white/[0.08]">
              <LockSimple size={18} weight="fill" className="mt-0.5 shrink-0 text-zinc-400" />
              {d.disabled}
            </p>
          )}

          {error && (
            <p className="mt-6 flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
              <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
              {d.error}
            </p>
          )}

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {roles.map(({ role, icon: IconCmp, title, desc, color }, i) => (
              <motion.button
                key={role}
                type="button"
                onClick={() => enter(role)}
                disabled={enabled !== true || busy !== null}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.45, delay: reduce ? 0 : 0.05 * (i + 1) }}
                whileTap={reduce ? undefined : { scale: 0.98 }}
                className="group flex flex-col rounded-3xl bg-white/[0.03] p-5 text-left ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${color}1F`, color }}
                >
                  <IconCmp size={22} weight="fill" />
                </span>
                <span className="mt-4 text-lg font-semibold text-zinc-50">{title}</span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-400">{desc}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#CCFF00]">
                  {busy === role ? d.entering : d.enter}
                  {busy !== role && <ArrowRight size={15} weight="bold" />}
                </span>
              </motion.button>
            ))}
          </div>

          <p className="mt-6 text-xs leading-relaxed text-zinc-500">{d.realDataNote}</p>
        </motion.div>
      </div>
    </main>
  );
}

export default function DemoPage() {
  return (
    <AccessGate>
      <DemoPicker />
    </AccessGate>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { LockSimple, ShieldCheck, ShieldWarning, WarningOctagon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { zoneMeta } from '@/components/PerformancePanel';

// ---------------------------------------------------------------------------
// Parent view. Reads ONLY through the parent_dashboard() database function
// (supabase/sql/06_parent_access.sql): parents have no access to the
// checkins or profiles tables. Without the athlete's consent the function
// returns nothing but the link itself; with consent — today's zone and
// whether heavy training is restricted. No scores, answers or pain details.
// ---------------------------------------------------------------------------

type Zone = 'green' | 'yellow' | 'red';

type ParentRow = {
  link_id: string;
  athlete_label: string | null;
  consent: boolean;
  checked_in: boolean | null;
  zone: Zone | null;
  restricted: boolean | null;
};

export default function ParentPage() {
  const { t } = useLanguage();
  const p = t.parent;
  const reduce = useReducedMotion();
  const [rows, setRows] = useState<ParentRow[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc('parent_dashboard');
      if (cancelled) return;
      if (rpcError) setError(true);
      else setRows((data as ParentRow[] | null) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';
  const statusText = (z: Zone) => (z === 'green' ? p.statusGreen : z === 'yellow' ? p.statusYellow : p.statusRed);

  return (
    <div className="relative min-h-[calc(100dvh-4.5rem)] shrink-0 overflow-x-clip bg-[#07080A] px-4 py-8 md:py-12">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-[#CCFF00]/[0.05] blur-[140px]" />

      <div className="relative mx-auto max-w-lg">
        <header className="mb-6">
          <h1 className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-4xl">
            {p.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{p.subtitle}</p>
        </header>

        {error && (
          <div className="mb-6 flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
            <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
            <span>{p.errLoad}</span>
          </div>
        )}

        {!rows && !error && (
          <div className="space-y-3" aria-busy>
            <p className="text-sm text-zinc-500">{p.loading}</p>
            <div className="h-40 animate-pulse rounded-3xl bg-white/[0.03]" />
          </div>
        )}

        {rows && rows.length === 0 && <p className={`${card} text-sm leading-relaxed text-zinc-300`}>{p.empty}</p>}

        {rows && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row, i) => {
              const name = row.athlete_label || p.athleteFallback;
              const meta = row.zone ? zoneMeta(row.zone) : null;

              return (
                <motion.section
                  key={row.link_id}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.5, delay: reduce ? 0 : i * 0.06 }}
                  className={card}
                  style={meta ? { backgroundColor: `${meta.color}12`, boxShadow: `inset 0 0 0 1px ${meta.color}40` } : undefined}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold tracking-[-0.01em] text-zinc-50">{name}</h2>
                    <span className="text-xs text-zinc-500">{p.todayLabel}</span>
                  </div>

                  {!row.consent && (
                    <div className="flex gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400">
                        <LockSimple size={19} weight="fill" />
                      </span>
                      <div>
                        <p className="text-[15px] font-medium text-zinc-100">{p.noConsentTitle}</p>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{p.noConsentBody(name)}</p>
                      </div>
                    </div>
                  )}

                  {row.consent && !row.checked_in && <p className="text-[15px] text-zinc-300">{p.noCheckin}</p>}

                  {row.consent && row.checked_in && meta && row.zone && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3.5">
                        <span
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: meta.color, color: '#07080A' }}
                        >
                          <meta.Icon size={28} weight="fill" />
                        </span>
                        <p className="text-xl font-semibold leading-tight tracking-[-0.01em]" style={{ color: meta.color }}>
                          {statusText(row.zone)}
                        </p>
                      </div>
                      {row.restricted && (
                        <p className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                          <ShieldWarning size={18} weight="fill" className="mt-0.5 shrink-0" style={{ color: meta.color }} />
                          {p.restricted}
                        </p>
                      )}
                    </div>
                  )}
                </motion.section>
              );
            })}

            <section className={`${card} flex gap-3`}>
              <ShieldCheck size={20} weight="fill" className="mt-0.5 shrink-0 text-[#CCFF00]" />
              <div>
                <h2 className="text-sm font-semibold text-zinc-200">{p.privacyTitle}</h2>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">{p.privacyBody}</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

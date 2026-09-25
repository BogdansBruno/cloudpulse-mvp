'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { LockSimple, ProhibitInset, Lightning } from '@phosphor-icons/react';
import { supabase, signOut } from '@/lib/supabase';
import { checkAccess, type AccessStatus } from '@/lib/access-control';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { HUB } from '@/components/PerformancePanel';

const POLL_MS = 20_000;

// Wraps every page under app/(main). Checks the owner's kill switch and
// ban list once on load, then keeps polling quietly so a lockdown flipped
// mid-session takes effect without waiting for a refresh.
export default function AccessGate({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<AccessStatus | 'loading'>('loading');
  const emailRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? null;
      emailRef.current = email;
      const result = await checkAccess(email);
      if (cancelled) return;
      setStatus(result);
      if (result.blocked && result.reason === 'banned') {
        await signOut();
      }
    }

    run();
    const interval = setInterval(run, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (status === 'loading') return null;

  if (status.blocked) {
    const banned = status.reason === 'banned';
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080A] px-4">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 30%, ${banned ? HUB.red : HUB.amber}14, transparent 60%)`,
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
          className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-8 text-center shadow-2xl shadow-black/40"
        >
          <div
            className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${banned ? HUB.red : HUB.amber}1F`, color: banned ? HUB.red : HUB.amber }}
          >
            {banned ? <ProhibitInset size={26} weight="fill" /> : <LockSimple size={26} weight="fill" />}
          </div>
          <h1 className="text-lg font-semibold text-white mb-2">
            {banned ? t.access.bannedTitle : t.access.lockdownTitle}
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed mb-6">
            {banned ? t.access.bannedBody : t.access.lockdownBody}
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-950 rounded-xl px-4 py-2.5"
            style={{ backgroundColor: HUB.lime }}
          >
            <Lightning size={14} weight="fill" />
            {t.access.backToLogin}
          </a>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

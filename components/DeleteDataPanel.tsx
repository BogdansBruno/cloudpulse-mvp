'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash, WarningOctagon, CheckCircle } from '@phosphor-icons/react';
import { supabase, signOut } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { DELETE_DATA } from '@/lib/privacy-copy';
import type { Lang } from '@/lib/i18n/translations';

// One-tap data deletion (plus one confirmation tap, so it cannot happen by
// accident). Calls public.delete_my_data() (supabase/sql/17): it records the
// request and removes check-ins, sessions, profile and everything linked to
// the profile. Public page /privacy shows it too; signed-out visitors are
// asked to sign in first.
export default function DeleteDataPanel({ langOverride }: { langOverride?: Lang }) {
  const { lang: ctxLang } = useLanguage();
  const lang = langOverride ?? ctxLang;
  const d = DELETE_DATA[lang];
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [step, setStep] = useState<'idle' | 'confirm' | 'working' | 'done' | 'failed'>('idle');

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(!!data.session);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run() {
    setStep('working');
    const { data, error } = await supabase.rpc('delete_my_data');
    const ok = !error && !!data && typeof data === 'object' && (data as { ok?: boolean }).ok === true;
    if (!ok) {
      setStep('failed');
      return;
    }
    setStep('done');
    window.setTimeout(async () => {
      await signOut();
      window.location.href = '/login';
    }, 1800);
  }

  return (
    <section className="np-card p-5">
      <h2 className="mb-2 flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <Trash size={18} weight="fill" className="text-[#FF3D5A]" />
        {d.title}
      </h2>
      <p className="mb-4 text-sm leading-relaxed text-zinc-400">{d.body}</p>

      {signedIn === false && (
        <p className="text-sm text-zinc-300">
          {d.signInFirst}{' '}
          <Link href="/login" className="font-medium text-[#B8F23C] hover:brightness-110">
            {d.signIn}
          </Link>
        </p>
      )}

      {signedIn && step === 'idle' && (
        <button
          type="button"
          onClick={() => setStep('confirm')}
          className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FF3D5A]/15 px-5 text-sm font-semibold text-[#FF3D5A] ring-1 ring-inset ring-[#FF3D5A]/40 transition-colors hover:bg-[#FF3D5A]/25"
        >
          {d.button}
        </button>
      )}

      {signedIn && (step === 'confirm' || step === 'working') && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-200">{d.confirmBody}</p>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={step === 'working'}
              onClick={run}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-[#FF3D5A] px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {step === 'working' ? d.working : d.confirmButton}
            </button>
            <button
              type="button"
              disabled={step === 'working'}
              onClick={() => setStep('idle')}
              className="inline-flex h-12 items-center justify-center rounded-2xl bg-white/[0.06] px-4 text-sm font-medium text-zinc-200 ring-1 ring-inset ring-white/10 disabled:opacity-60"
            >
              {d.cancel}
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <p className="inline-flex items-center gap-2 text-sm text-zinc-100">
          <CheckCircle size={18} weight="fill" className="text-[#B8F23C]" />
          {d.done}
        </p>
      )}
      {step === 'failed' && (
        <div className="space-y-3">
          <p className="inline-flex items-start gap-2 text-sm text-zinc-200">
            <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF3D5A]" />
            {d.failed}
          </p>
          <button
            type="button"
            onClick={() => setStep('confirm')}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-white/[0.06] px-4 text-sm font-medium text-zinc-200 ring-1 ring-inset ring-white/10"
          >
            {d.button}
          </button>
        </div>
      )}
    </section>
  );
}

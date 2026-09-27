'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Flask, ArrowsClockwise } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';

// ---------------------------------------------------------------------------
// Thin strip under the nav, shown only to demo accounts (profiles.is_demo).
// Reminds the jury the data is made up and lets them wipe whatever they
// clicked — reset_demo() re-creates the demo team exactly as seeded.
// ---------------------------------------------------------------------------

export default function DemoBanner() {
  const { t } = useLanguage();
  const d = t.demo;
  const [isDemo, setIsDemo] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase.from('profiles').select('is_demo').eq('id', uid).maybeSingle();
      if (!cancelled) setIsDemo(profile?.is_demo === true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reset() {
    setResetting(true);
    setFailed(false);
    const { error } = await supabase.rpc('reset_demo');
    if (error) {
      setFailed(true);
      setResetting(false);
      return;
    }
    window.location.reload();
  }

  if (!isDemo) return null;

  return (
    <div className="px-3 pt-2 md:px-6">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-[#CCFF00]/[0.08] px-4 py-2 text-xs text-zinc-200 ring-1 ring-inset ring-[#CCFF00]/25">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Flask size={14} weight="fill" className="text-[#CCFF00]" />
          {d.bannerText}
        </span>
        <span className="ml-auto flex items-center gap-3">
          {failed && <span className="text-[#FF4D5E]">{d.resetError}</span>}
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className="inline-flex items-center gap-1 font-semibold text-[#CCFF00] disabled:opacity-60"
          >
            <ArrowsClockwise size={13} weight="bold" className={resetting ? 'animate-spin' : undefined} />
            {resetting ? d.resetting : d.reset}
          </button>
          <Link href="/demo" className="text-zinc-400 hover:text-zinc-200">
            {d.switchRole}
          </Link>
        </span>
      </div>
    </div>
  );
}

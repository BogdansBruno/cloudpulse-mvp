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
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 rounded-np-ctrl border border-np-warn/30 bg-np-warn/10 px-4 py-2 text-xs text-np-text">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <Flask size={14} weight="fill" className="text-np-warn" aria-hidden />
          {d.bannerText}
        </span>
        <span className="ml-auto flex items-center gap-3">
          {failed && <span className="text-np-danger">{d.resetError}</span>}
          <button
            type="button"
            onClick={reset}
            disabled={resetting}
            className="inline-flex items-center gap-1 font-semibold text-np-text underline-offset-2 hover:underline disabled:opacity-60"
          >
            <ArrowsClockwise size={13} weight="bold" className={resetting ? 'animate-spin' : undefined} />
            {resetting ? d.resetting : d.reset}
          </button>
          <Link href="/demo" className="text-np-text-2 hover:text-np-text">
            {d.switchRole}
          </Link>
        </span>
      </div>
    </div>
  );
}

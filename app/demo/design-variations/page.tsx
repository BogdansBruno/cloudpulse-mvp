'use client';

// /demo/design-variations — the ADP design studio: three design directions
// (Performance Dark, Gen-Z Energy, Clean Health) over the same demo athlete,
// with a side-by-side compare mode.
//
// A thin page: everything lives in adp/src/design-explorer. No Supabase, no AI
// call, nothing stored, so the main demo cannot be affected. Not linked from
// the navigation — open it by URL (add #nike, #apple or #compare to jump).

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import AccessGate from '@/components/AccessGate';
import DesignStudio from '@/adp/src/design-explorer/DesignStudio';

function Studio() {
  const { lang, setLang } = useLanguage();
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <DesignStudio
      lang={lang}
      origin={origin}
      langSwitch={
        <div className="flex shrink-0 gap-0.5 rounded-full bg-white/[0.06] p-1 text-xs">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`rounded-full px-2.5 py-1 font-semibold ${lang === l.code ? 'bg-white text-zinc-950' : 'text-zinc-400'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      }
    />
  );
}

export default function DesignVariationsPage() {
  return (
    <AccessGate>
      <Studio />
    </AccessGate>
  );
}

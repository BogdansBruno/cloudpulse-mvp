'use client';

// /demo/design-variations — the ADP design studio: five design directions
// (Liquid Glass — the flagship, opens first — Night Feed, Performance Dark,
// Gen-Z Energy, Clean Health) over the same demo athlete,
// with a side-by-side compare mode.
//
// A thin page: everything lives in adp/src/design-explorer. No Supabase, no AI
// call, nothing stored, so the main demo cannot be affected. Not linked from
// the navigation — open it by URL (add #glass, #feed, #whoop, #nike, #apple or #compare to jump).

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import AccessGate from '@/components/AccessGate';
import DesignStudio from '@/adp/src/design-explorer/DesignStudio';
import LiquidGlassButton from '@/adp/src/components/ui/LiquidGlassButton';

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
        <div className="flex shrink-0 gap-1">
          {LANGS.map((l) => (
            <LiquidGlassButton key={l.code} size="sm" selected={lang === l.code} onClick={() => setLang(l.code)} className="min-w-[40px] text-xs">
              {l.label}
            </LiquidGlassButton>
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

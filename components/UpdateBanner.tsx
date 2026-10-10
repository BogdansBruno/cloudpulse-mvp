'use client';

// components/UpdateBanner.tsx — "a new version is available". An installed web app stays in memory when you switch away
// from it, so it keeps showing the old build after a deploy. This asks /api/version when the app comes back to the front
// (and every 5 minutes while it is open); if the live deploy differs from the one this page was built with, a bar offers
// "Update". Nothing reloads by itself, so a half-filled check-in is never lost. Production only; offline checks are ignored.

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';

const BUILD = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const CHECK_MS = 5 * 60 * 1000;

const COPY = {
  ru: { text: 'Доступна новая версия Lotus', button: 'Обновить' },
  lv: { text: 'Pieejama jauna Lotus versija', button: 'Atjaunot' },
  en: { text: 'A new version of Lotus is available', button: 'Update' },
} as const;

export default function UpdateBanner() {
  const { lang } = useLanguage();
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || BUILD === 'dev') return;
    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const body = (await res.json()) as { id?: unknown };
        if (!stopped && typeof body.id === 'string' && body.id !== 'dev' && body.id !== BUILD) setStale(true);
      } catch {
        // offline or a weak signal: try again next time
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    void check();
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(check, CHECK_MS);
    return () => {
      stopped = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (!stale) return null;
  const c = COPY[lang];

  async function update() {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
    } catch {
      // the reload below is enough: pages are loaded network-first
    }
    window.location.reload();
  }

  return (
    <div
      role="status"
      className="fixed inset-x-3 z-[100] flex items-center gap-3 rounded-2xl bg-[#12151B] px-4 py-3 text-sm text-white shadow-lg ring-1 ring-inset ring-white/15"
      style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}
    >
      <span className="min-w-0 flex-1">{c.text}</span>
      <button onClick={update} className="min-h-11 shrink-0 rounded-full bg-[#B8F23C] px-4 text-[13px] font-semibold text-[#0B0D11] active:scale-[0.98]">
        {c.button}
      </button>
    </div>
  );
}

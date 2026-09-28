'use client';

import { useEffect, useState } from 'react';
import { DeviceMobile, DownloadSimple, X } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import {
  getDeferredInstallPrompt,
  setDeferredInstallPrompt,
  isIosSafari,
  isStandalone,
  INSTALLABLE_EVENT,
} from '@/lib/pwa';

// "Install CloudPulse" card on /progress. Shown only when installing is
// actually possible: an install prompt is waiting (Chrome / Edge / Samsung
// Internet on Android), or iOS Safari (manual steps). Hidden once installed
// or after the athlete closes it.

const DISMISS_KEY = 'cloudpulse.installDismissed';

type Mode = 'prompt' | 'ios' | null;

function currentMode(): Mode {
  if (isStandalone()) return null;
  try {
    if (localStorage.getItem(DISMISS_KEY) === '1') return null;
  } catch {
    // no storage: just show it
  }
  if (getDeferredInstallPrompt()) return 'prompt';
  if (isIosSafari()) return 'ios';
  return null;
}

export default function InstallAppCard({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const o = t.offline;
  const [mode, setMode] = useState<Mode>(null);

  useEffect(() => {
    const update = () => setMode(currentMode());
    update();
    window.addEventListener(INSTALLABLE_EVENT, update);
    return () => window.removeEventListener(INSTALLABLE_EVENT, update);
  }, []);

  if (!mode) return null;

  async function install() {
    const e = getDeferredInstallPrompt();
    if (!e) return;
    await e.prompt();
    await e.userChoice.catch(() => undefined);
    setDeferredInstallPrompt(null); // a prompt can only be used once
    setMode(currentMode());
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setMode(null);
  }

  return (
    <section
      className={`relative flex gap-4 rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl ${className}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#CCFF00]/[0.12] text-[#CCFF00]">
        <DeviceMobile size={22} weight="fill" />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        <h2 className="text-base font-semibold tracking-[-0.01em] text-zinc-50">{o.installTitle}</h2>
        <p className="mt-1 text-sm leading-relaxed text-zinc-400">{o.installBody}</p>
        {mode === 'prompt' ? (
          <button
            type="button"
            onClick={install}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#CCFF00] px-4 py-2 text-sm font-semibold text-zinc-950"
          >
            <DownloadSimple size={15} weight="bold" />
            {o.installButton}
          </button>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">{o.installIos}</p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={o.installClose}
        className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-500 hover:bg-white/[0.06] hover:text-zinc-300"
      >
        <X size={14} weight="bold" />
      </button>
    </section>
  );
}

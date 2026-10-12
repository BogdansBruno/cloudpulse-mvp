'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, WarningOctagon } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { GUARDIAN } from '@/lib/privacy-copy';
import { SheetButton } from '@/components/np/BottomSheet';
import { readGuardianStatus, recordGuardianConfirmation, sharingLocked, type GuardianStatus } from '@/lib/guardian';

// Tick-box for a parent or guardian. Two uses:
//   - onboarding: `controlled` (value + onChange), saved with the profile;
//   - sharing cards: it reads the athlete's status itself and, while sharing
//     is locked, shows the box and saves the confirmation on tick.
// Renders nothing for adults, for unknown age, and when the database has no
// guardian column yet (supabase/sql/17 not run).

export function useSharingLock() {
  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    readGuardianStatus()
      .then((s) => {
        if (!cancelled) setStatus(s);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return {
    loaded,
    locked: sharingLocked(status),
    unlock: () => setStatus((s) => (s ? { ...s, consentAt: new Date().toISOString() } : s)),
  };
}

export function GuardianBox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { lang } = useLanguage();
  const g = GUARDIAN[lang];
  return (
    <label
      className={`flex items-start gap-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ${
        checked ? 'ring-[#B8F23C]/40' : 'ring-white/10'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[#B8F23C]"
      />
      <span className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-200">
        <span className="mb-1 flex items-center gap-1.5 font-medium text-zinc-50">
          <ShieldCheck size={16} weight="fill" className="text-[#B8F23C]" />
          <span className="min-w-0 flex-1">{g.title}</span>
          <SheetButton title={g.title} label={g.moreLabel} closeLabel={g.close}>
            <p className="text-[15px] leading-relaxed text-white/85">{g.body}</p>
            <ul className="mt-4 space-y-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
              {g.points.map((pt) => (
                <li key={pt} className="flex gap-2.5 text-[14px] leading-relaxed text-white/80">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#B8F23C]" />
                  <span className="min-w-0">{pt}</span>
                </li>
              ))}
            </ul>
            <Link href="/privacy" className="mt-4 inline-flex min-h-11 items-center text-sm text-zinc-300 underline decoration-white/20 underline-offset-2">
              {g.privacyLink}
            </Link>
          </SheetButton>
        </span>
        {g.checkbox}
      </span>
    </label>
  );
}

// Used inside the Parent / School sharing cards.
export default function GuardianGate({ onUnlocked }: { onUnlocked: () => void }) {
  const { lang } = useLanguage();
  const g = GUARDIAN[lang];
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onTick(v: boolean) {
    setChecked(v);
    if (!v) return;
    setSaving(true);
    setFailed(false);
    const ok = await recordGuardianConfirmation();
    setSaving(false);
    if (ok) onUnlocked();
    else {
      setChecked(false);
      setFailed(true);
    }
  }

  return (
    <div className="mb-4 space-y-2">
      <p className="text-xs leading-relaxed text-zinc-400">{g.lockedHint}</p>
      <GuardianBox checked={checked} onChange={onTick} disabled={saving} />
      {failed && (
        <p className="inline-flex items-center gap-1.5 text-xs text-zinc-200">
          <WarningOctagon size={14} weight="fill" className="text-[#FF3D5A]" />
          {g.saveFailed}
        </p>
      )}
    </div>
  );
}

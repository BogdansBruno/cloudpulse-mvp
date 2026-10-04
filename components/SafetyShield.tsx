'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldWarning, WarningOctagon } from '@phosphor-icons/react';
import { toDataURL } from 'qrcode';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Shield Safety Pass — shown on /checkin when today's check-in carries a
// restriction. The level and codes come from /api/pass, which reads the row
// the DB trigger computed (same formulas as the engine). This component
// never decides anything itself: it only displays what the engine decided.
//   block   (red)    — Safety Guard block: pain, match day, day before/after
//   caution (orange) — ACWR > 1.5 without a hard block (engine: advice, not block)
// ---------------------------------------------------------------------------

type PassCode =
  | 'PAIN_REPORTED'
  | 'MATCH_DAY'
  | 'PRE_MATCH'
  | 'POST_MATCH'
  | 'LOAD_SPIKE'
  | 'RTP_RESTRICTED'
  | 'RTP_AWAITING_CLEARANCE';

type PassResponse =
  | { status: 'no_checkin' | 'clear'; date: string }
  | {
      status: 'block' | 'caution';
      date: string;
      codes: PassCode[];
      acwr: number | null;
      painZone: string | null;
      rtp?: { cleanDays: number; required: number } | null;
      passId: string | null;
      token: string | null;
    };

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

export function formatPassDate(iso: string, lang: Lang) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatPassId(id: string) {
  return `${id.slice(0, 4)}-${id.slice(4)}`;
}

// Page-level spacing lives here so /checkin gets no empty gap when there is no pass.
function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 pt-6 md:pt-8">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}

export default function SafetyShield({ refreshKey = 0 }: { refreshKey?: number }) {
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const [pass, setPass] = useState<PassResponse | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(false);
      // Offline the pass can't be fetched or verified; the offline strip
      // already says so, and a load error here would only add noise.
      if (!navigator.onLine) return;
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return; // not signed in: nothing to show

        const res = await fetch('/api/pass', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('pass request failed');
        const body = (await res.json()) as PassResponse;
        if (cancelled) return;
        setPass(body);

        if ((body.status === 'block' || body.status === 'caution') && body.token) {
          const url = `${window.location.origin}/pass?t=${encodeURIComponent(body.token)}`;
          const dataUrl = await toDataURL(url, {
            margin: 1,
            width: 240,
            errorCorrectionLevel: 'M',
            color: { dark: '#07080A', light: '#FFFFFF' },
          });
          if (!cancelled) setQr(dataUrl);
        } else {
          setQr(null);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <Frame>
        <div className="np-card flex gap-3 p-4 text-sm text-np-text-2">
          <WarningOctagon size={18} className="mt-0.5 shrink-0" aria-hidden />
          <span>{t.shield.loadError}</span>
        </div>
      </Frame>
    );
  }

  if (!pass || (pass.status !== 'block' && pass.status !== 'caution')) return null;

  const isBlock = pass.status === 'block';
  // v3 colour job: zone colours are text, icon and a 2px line — never a filled panel.
  const color = isBlock ? '#FF3D00' : '#FFD600';

  const directive = (code: PassCode) => {
    switch (code) {
      case 'PAIN_REPORTED':
        return t.shield.dirPain(pass.painZone);
      case 'MATCH_DAY':
        return t.shield.dirMatchDay;
      case 'PRE_MATCH':
        return t.shield.dirPreMatch;
      case 'POST_MATCH':
        return t.shield.dirPostMatch;
      case 'LOAD_SPIKE':
        return t.shield.dirLoad(pass.acwr !== null ? pass.acwr.toFixed(2) : '—');
      case 'RTP_RESTRICTED':
        return t.shield.dirRtp(pass.rtp?.cleanDays ?? 0, pass.rtp?.required ?? 2);
      case 'RTP_AWAITING_CLEARANCE':
        return t.shield.dirRtpAwaiting;
    }
  };

  return (
    <Frame>
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      className="np-card overflow-hidden"
      style={{ borderColor: `${color}66`, boxShadow: `0 0 28px -12px ${color}` }}
      aria-label={t.shield.title}
    >
      <div className="flex items-center gap-3 border-b border-np-line px-5 py-4" style={{ borderTop: `2px solid ${color}` }}>
        <ShieldWarning size={30} weight="fill" className="shrink-0" style={{ color }} aria-hidden />
        <div className="min-w-0">
          <p className="np-overline">{t.shield.title}</p>
          <p className="text-xl font-bold leading-tight tracking-tight text-np-text">{isBlock ? t.shield.blockedHeading : t.shield.cautionHeading}</p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <ul className="space-y-2.5">
          {pass.codes.map((code) => (
            <li key={code} className="flex gap-2.5 text-[15px] leading-relaxed text-np-text">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
              <span>{directive(code)}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-3 rounded-np-card border border-np-line bg-np-surface-2 p-4 sm:flex-row sm:items-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
            <img src={qr} alt="Safety Pass QR" width={176} height={176} className="h-44 w-44 shrink-0 rounded-xl" />
          ) : (
            <p className="text-sm text-np-text-2">{t.shield.qrUnavailable}</p>
          )}
          <div className="text-center sm:text-left">
            <p className="text-sm leading-relaxed text-np-text-2">{t.shield.showToTeacher}</p>
            <p className="mt-2 text-xs text-np-text-3">{t.shield.validUntil(formatPassDate(pass.date, lang))}</p>
            {pass.passId && (
              <p className="np-num mt-1 font-mono text-xs text-np-text-3">
                {t.shield.passId}: {formatPassId(pass.passId)}
              </p>
            )}
          </div>
        </div>
      </div>
    </motion.section>
    </Frame>
  );
}

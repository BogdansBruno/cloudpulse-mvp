'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ShieldWarning } from '@phosphor-icons/react';
import { toDataURL } from 'qrcode';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { setNotice } from '@/components/np/notices';
import { cardClass, CARD_THEME } from '@/components/np/cardTheme';

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
// On Today it sits inside the page column (`inline`), so it brings no padding of its own.
function Frame({ children, inline }: { children: ReactNode; inline?: boolean }) {
  if (inline) return <div className="mb-4">{children}</div>;
  return (
    <div className="px-4 pt-6 md:pt-8">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>
  );
}

/** What /api/pass said, for pages that must stay quiet (or celebrate) depending on it. `unknown` = offline / failed / signed out. */
export type PassState = 'clear' | 'no_checkin' | 'caution' | 'block' | 'unknown';

export default function SafetyShield({
  refreshKey = 0,
  inline = false,
  onStatus,
}: {
  refreshKey?: number;
  inline?: boolean;
  onStatus?: (s: PassState) => void;
}) {
  const { t, lang } = useLanguage();
  const report = useRef(onStatus);
  report.current = onStatus;
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
      if (!navigator.onLine) {
        report.current?.('unknown');
        return;
      }
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          report.current?.('unknown');
          return; // not signed in: nothing to show
        }

        const res = await fetch('/api/pass', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('pass request failed');
        const body = (await res.json()) as PassResponse;
        if (cancelled) return;
        setPass(body);
        report.current?.(body.status);

        if ((body.status === 'block' || body.status === 'caution') && body.token) {
          const url = `${window.location.origin}/pass?t=${encodeURIComponent(body.token)}`;
          const dataUrl = await toDataURL(url, {
            margin: 1,
            width: 240,
            errorCorrectionLevel: 'M',
            color: { dark: '#0B0D11', light: '#FFFFFF' },
          });
          if (!cancelled) setQr(dataUrl);
        } else {
          setQr(null);
        }
      } catch {
        if (!cancelled) {
          setError(true);
          report.current?.('unknown');
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // A failed check is a quiet notice (dot on the profile avatar, spelled out in Settings), not a banner.
  useEffect(() => {
    setNotice('passCheck', error);
    return () => setNotice('passCheck', false);
  }, [error]);
  if (error) return null;

  if (!pass || (pass.status !== 'block' && pass.status !== 'caution')) return null;

  const isBlock = pass.status === 'block';
  // v3 colour job: zone colours are text, icon and a 2px line — never a filled panel.
  // Lotus: a block is the crimson alert card, a caution the amber one.
  const theme = isBlock ? 'alert' : 'activity';
  const color = CARD_THEME[theme].accent;

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
    <Frame inline={inline}>
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
      className={`${cardClass(theme)} overflow-hidden`}
      style={{ borderColor: `${color}55`, boxShadow: `inset 0 1px 0 0 rgba(255,255,255,0.1), 0 0 32px -14px ${color}` }}
      aria-label={t.shield.title}
    >
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06]">
            <ShieldWarning size={20} weight="fill" style={{ color }} />
          </span>
          <p className="min-w-0 text-[11px] font-medium uppercase tracking-widest text-white/75">{t.shield.title}</p>
        </div>
        <p className="np-editorial mt-4 text-[26px] leading-tight">{isBlock ? t.shield.blockedHeading : t.shield.cautionHeading}</p>
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

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-black/25 p-4 sm:flex-row sm:items-center">
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

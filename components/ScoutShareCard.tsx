'use client';

// "Passport for scouts" on /progress (lib/scout-cv.ts, supabase/sql/15).
// The athlete creates a link; a linked parent switches it on. The link is
// shown ONCE — only its hash is stored.

import { useCallback, useEffect, useState } from 'react';
import { IdentificationCard, Copy, Check, LinkBreak, Eye, ClockCountdown } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { Lang } from '@/lib/i18n/translations';
import { EXTRA } from '@/lib/i18n/extra';
import { HUB } from '@/components/PerformancePanel';
import {
  SCOUT_DAY_OPTIONS,
  parseShares,
  scoutUrl,
  shareStatus,
  type ScoutShare,
  type ShareStatus,
} from '@/lib/scout-cv';

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };
const STATUS_COLOR: Record<ShareStatus, string> = { pending: HUB.amber, active: HUB.lime, expired: '#71717A', revoked: '#71717A' };
const KNOWN_ERRORS = ['NO_PARENT_LINK', 'TOO_MANY_LINKS', 'BAD_NAME', 'BAD_RECIPIENT'] as const;

export default function ScoutShareCard({ className = '' }: { className?: string }) {
  const { lang } = useLanguage();
  const t = EXTRA[lang].scout;
  const [shares, setShares] = useState<ScoutShare[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [name, setName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [days, setDays] = useState<number>(14);
  const [showReadiness, setShowReadiness] = useState(true);
  const [showHealth, setShowHealth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.rpc('my_scout_shares');
    if (e) {
      setAvailable(false); // SQL 15 not run yet
      return;
    }
    setAvailable(true);
    setShares(parseShares(data as unknown[]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!available) return null;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric' });

  async function create() {
    setBusy(true);
    setError(null);
    setFresh(null);
    const { data, error: e } = await supabase.rpc('create_scout_share', {
      p_display_name: name.trim(),
      p_recipient: recipient.trim(),
      p_days: days,
      p_show_readiness: showReadiness,
      p_show_health: showHealth,
    });
    setBusy(false);
    if (e) {
      const code = KNOWN_ERRORS.find((k) => e.message.includes(k));
      setError(code ? t.errors[code] : t.errors.GENERIC);
      return;
    }
    const row = Array.isArray(data) ? (data[0] as { token?: string } | undefined) : undefined;
    if (row?.token) setFresh(scoutUrl(window.location.origin, row.token));
    setName('');
    setRecipient('');
    load();
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked: the link stays visible to copy by hand
    }
  }

  async function revoke(id: string) {
    await supabase.rpc('revoke_scout_share', { p_id: id });
    load();
  }

  const field =
    'w-full rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-sm text-zinc-50 placeholder-zinc-500 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-[#CCFF00]/50';

  return (
    <section className={`rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl ${className}`}>
      <h2 className="inline-flex items-center gap-2 text-base font-semibold tracking-[-0.01em] text-zinc-50">
        <IdentificationCard size={18} weight="fill" className="text-[#CCFF00]" />
        {t.title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-zinc-400">{t.subtitle}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">{t.nameLabel}</span>
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder={t.namePlaceholder} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-zinc-400">{t.recipientLabel}</span>
          <input
            value={recipient}
            maxLength={80}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={t.recipientPlaceholder}
            className={field}
          />
        </label>
      </div>

      <div className="mt-3">
        <span className="mb-1 block text-xs text-zinc-400">{t.daysLabel}</span>
        <div className="flex flex-wrap gap-2">
          {SCOUT_DAY_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              aria-pressed={days === n}
              className={`rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset transition-colors ${
                days === n ? 'bg-[#CCFF00] font-semibold text-zinc-950 ring-[#CCFF00]' : 'text-zinc-300 ring-white/10 hover:bg-white/5'
              }`}
            >
              {t.days(n)}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="mt-4 space-y-2">
        <legend className="mb-1 text-xs text-zinc-400">{t.includesTitle}</legend>
        <label className="flex items-start gap-2.5 text-sm text-zinc-300">
          <input type="checkbox" checked disabled className="mt-0.5 accent-[#CCFF00]" />
          {t.includeDiscipline}
        </label>
        <label className="flex items-start gap-2.5 text-sm text-zinc-200">
          <input type="checkbox" checked={showReadiness} onChange={(e) => setShowReadiness(e.target.checked)} className="mt-0.5 accent-[#CCFF00]" />
          {t.includeReadiness}
        </label>
        <label className="flex items-start gap-2.5 text-sm text-zinc-200">
          <input type="checkbox" checked={showHealth} onChange={(e) => setShowHealth(e.target.checked)} className="mt-0.5 accent-[#CCFF00]" />
          <span>
            {t.includeHealth}
            <span className="block text-xs text-zinc-500">{t.healthHint}</span>
          </span>
        </label>
      </fieldset>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">{t.noGrades}</p>

      {error && <p className="mt-3 rounded-xl bg-[#FF4D5E]/[0.08] p-3 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">{error}</p>}

      <button
        type="button"
        onClick={create}
        disabled={busy || !name.trim() || !recipient.trim()}
        className="mt-4 inline-flex h-11 items-center rounded-2xl bg-[#CCFF00] px-5 text-sm font-semibold text-zinc-950 disabled:opacity-50"
      >
        {busy ? t.creating : t.create}
      </button>

      {fresh && (
        <div className="mt-4 rounded-2xl bg-[#CCFF00]/[0.07] p-3 ring-1 ring-inset ring-[#CCFF00]/30">
          <p className="text-xs leading-relaxed text-zinc-200">{t.copyOnce}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-black/40 px-2.5 py-1.5 text-xs text-[#CCFF00]">{fresh}</code>
            <button
              type="button"
              onClick={() => copy(fresh)}
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-50"
            >
              {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
              {copied ? t.copied : t.copy}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {shares && shares.length === 0 && <li className="text-sm text-zinc-500">{t.empty}</li>}
        {shares?.map((s) => {
          const st = shareStatus(s);
          return (
            <li key={s.id} className="rounded-2xl bg-white/[0.02] px-3 py-2.5 ring-1 ring-inset ring-white/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-words text-sm font-medium text-zinc-100">{s.recipient}</span>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ color: STATUS_COLOR[st], backgroundColor: `${STATUS_COLOR[st]}1A` }}
                >
                  {t.status[st]}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-x-3 text-xs text-zinc-500">
                  <span className="inline-flex items-center gap-1">
                    <ClockCountdown size={12} />
                    {t.until(fmt(s.expiresAt))}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} />
                    {t.views(s.viewCount)}
                  </span>
                </span>
              {(st === 'pending' || st === 'active') && (
                <button
                  type="button"
                  onClick={() => revoke(s.id)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                >
                  <LinkBreak size={13} />
                  {t.revoke}
                </button>
              )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

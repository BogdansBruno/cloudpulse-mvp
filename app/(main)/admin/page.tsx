'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Power, Trash, Plus, WarningOctagon } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { isAdminEmail, setLockdown, banUser, unbanUser } from '@/lib/access-control';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { HUB } from '@/components/PerformancePanel';

type BannedRow = { email: string; reason: string | null; banned_at: string };

export default function AdminPage() {
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [lockdown, setLockdownState] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [banned, setBanned] = useState<BannedRow[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadAll() {
    const [{ data: control }, { data: bans }] = await Promise.all([
      supabase.from('app_control').select('lockdown').eq('id', 1).maybeSingle(),
      supabase.from('banned_users').select('email, reason, banned_at').order('banned_at', { ascending: false }),
    ]);
    setLockdownState(!!control?.lockdown);
    setBanned(bans ?? []);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ?? null;
      const ok = isAdminEmail(email);
      setAllowed(ok);
      if (ok) await loadAll();
      setReady(true);
    })();
  }, []);

  async function toggleLockdown() {
    setToggling(true);
    setError('');
    try {
      await setLockdown(!lockdown);
      setLockdownState(!lockdown);
    } catch {
      setError(t.admin.saveError);
    } finally {
      setToggling(false);
    }
  }

  async function handleBan(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setBusy(true);
    setError('');
    try {
      await banUser(newEmail, newReason);
      setNewEmail('');
      setNewReason('');
      await loadAll();
    } catch {
      setError(t.admin.saveError);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnban(email: string) {
    setBusy(true);
    try {
      await unbanUser(email);
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!allowed) {
    return (
      <div className="min-h-[calc(100dvh-4.5rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <WarningOctagon size={32} className="mx-auto mb-3 text-zinc-500" />
          <p className="text-sm text-zinc-400">{t.admin.notAllowed}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-4.5rem)] px-4 py-8 md:py-12">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${HUB.lime}1F`, color: HUB.lime }}
          >
            <ShieldCheck size={22} weight="fill" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">{t.admin.title}</h1>
            <p className="text-sm text-zinc-500">{t.admin.subtitle}</p>
          </div>
        </div>

        {/* Kill switch */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: lockdown ? `${HUB.red}1F` : 'rgba(255,255,255,0.06)', color: lockdown ? HUB.red : '#a1a1aa' }}
              >
                <Power size={18} weight="bold" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{t.admin.lockdownLabel}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{lockdown ? t.admin.lockdownOn : t.admin.lockdownOff}</p>
              </div>
            </div>
            <button
              onClick={toggleLockdown}
              disabled={toggling}
              className="relative h-8 w-14 rounded-full transition-colors shrink-0 disabled:opacity-50"
              style={{ backgroundColor: lockdown ? HUB.red : 'rgba(255,255,255,0.12)' }}
            >
              <motion.span
                className="absolute top-1 h-6 w-6 rounded-full bg-white shadow"
                animate={{ left: lockdown ? 28 : 4 }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.3 }}
              />
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-4 leading-relaxed">{t.admin.lockdownHint}</p>
        </div>

        {/* Ban list */}
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-2xl p-6">
          <p className="text-sm font-medium text-white mb-4">{t.admin.banListTitle}</p>

          <form onSubmit={handleBan} className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder={t.admin.banPlaceholderEmail}
              className="flex-1 rounded-xl bg-zinc-950/60 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#CCFF00]/40"
              required
            />
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder={t.admin.banPlaceholderReason}
              className="sm:w-48 rounded-xl bg-zinc-950/60 border border-white/10 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#CCFF00]/40"
            />
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
              style={{ backgroundColor: HUB.lime }}
            >
              <Plus size={15} weight="bold" />
              {t.admin.banButton}
            </button>
          </form>

          {error && <p className="text-xs text-[#FF4D5E] mb-3">{error}</p>}

          <AnimatePresence initial={false}>
            {banned.length === 0 ? (
              <p className="text-xs text-zinc-600">{t.admin.noBans}</p>
            ) : (
              <ul className="space-y-2">
                {banned.map((row) => (
                  <motion.li
                    key={row.email}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between gap-3 rounded-xl bg-black/20 border border-white/5 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-zinc-200 truncate">{row.email}</p>
                      {row.reason && <p className="text-xs text-zinc-600 truncate">{row.reason}</p>}
                    </div>
                    <button
                      onClick={() => handleUnban(row.email)}
                      disabled={busy}
                      className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-[#FF4D5E] hover:bg-[#FF4D5E]/10 transition-colors disabled:opacity-50"
                      aria-label={t.admin.unbanButton}
                    >
                      <Trash size={15} />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, useReducedMotion } from 'motion/react';
import { Lightning, UsersThree, CheckCircle, WarningOctagon, ArrowRight, Eye, SignOut } from '@phosphor-icons/react';
import { supabase, signOut } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import AccessGate from '@/components/AccessGate';
import {
  ATHLETE_LABEL_MAX,
  cleanAthleteLabel,
  formatInviteCode,
  isValidInviteCode,
  joinErrorCode,
  joinPath,
  normalizeInviteCode,
  type JoinErrorCode,
} from '@/lib/invite';

// ---------------------------------------------------------------------------
// /join/<code> — where the coach's QR code lands. The athlete signs in (or
// signs up), sees exactly what the coach will be able to see, picks the name
// the coach sees, and joins. The database does the real work in join_team():
// the athlete can only add THEMSELVES, never someone else (08_team_invites.sql).
// ---------------------------------------------------------------------------

type Stage =
  | { kind: 'loading' }
  | { kind: 'signedOut' }
  | { kind: 'error'; code: JoinErrorCode }
  | { kind: 'form'; teamName: string }
  | { kind: 'already'; teamName: string }
  | { kind: 'joined'; teamName: string };

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // a malformed %-sequence just fails the code check below
  }
}

type PreviewRow = { team_name: string; already_member: boolean };
type JoinRow = { team_id: string; team_name: string };

function JoinFlow() {
  const { t, lang, setLang } = useLanguage();
  const reduce = useReducedMotion();
  const params = useParams<{ code: string }>();
  const code = normalizeInviteCode(safeDecode(params?.code ?? ''));
  const inv = t.invite;

  const [stage, setStage] = useState<Stage>({ kind: 'loading' });
  const [email, setEmail] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<JoinErrorCode | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isValidInviteCode(code)) {
        setStage({ kind: 'error', code: 'INVALID_CODE' });
        return;
      }

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (!cancelled) setStage({ kind: 'signedOut' });
        return;
      }
      if (!cancelled) setEmail(user.email ?? null);

      // Coaches and parents can't join as athletes — say so before the form.
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (profile?.role && profile.role !== 'athlete') {
        if (!cancelled) setStage({ kind: 'error', code: 'NOT_ATHLETE' });
        return;
      }

      const { data: rows, error } = await supabase.rpc('team_invite_preview', { p_code: code });
      if (cancelled) return;
      if (error) {
        setStage({ kind: 'error', code: 'UNKNOWN' });
        return;
      }
      const row = (rows as PreviewRow[] | null)?.[0];
      if (!row) setStage({ kind: 'error', code: 'INVALID_CODE' });
      else if (row.already_member) setStage({ kind: 'already', teamName: row.team_name });
      else setStage({ kind: 'form', teamName: row.team_name });
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanAthleteLabel(label);
    if (!clean) {
      setFormError('BAD_LABEL');
      return;
    }
    setBusy(true);
    setFormError(null);
    const { data, error } = await supabase.rpc('join_team', { p_code: code, p_label: clean });
    setBusy(false);
    if (error) {
      const c = joinErrorCode(error.message);
      // A dead code or wrong account replaces the form; a bad label stays inline.
      if (c === 'BAD_LABEL' || c === 'UNKNOWN') setFormError(c);
      else setStage({ kind: 'error', code: c });
      return;
    }
    const joined = (data as JoinRow[] | null)?.[0];
    setStage({ kind: 'joined', teamName: joined?.team_name ?? '' });
  }

  // New athletes finish onboarding first; returning ones go straight to check-in.
  async function handleContinue() {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    let dest = '/onboarding';
    if (userId) {
      const { data: profile } = await supabase.from('profiles').select('sport').eq('id', userId).maybeSingle();
      if (profile?.sport) dest = '/checkin';
    }
    window.location.href = dest;
  }

  async function handleSwitchAccount() {
    await signOut();
    window.location.href = `/login?next=${encodeURIComponent(joinPath(code))}`;
  }

  const errorText: Record<JoinErrorCode, string> = {
    INVALID_CODE: inv.errInvalid,
    NOT_ATHLETE: inv.errNotAthlete,
    OWN_TEAM: inv.errOwnTeam,
    BAD_LABEL: inv.errLabel,
    NOT_AUTHENTICATED: inv.signInToJoin,
    UNKNOWN: inv.errGeneric,
  };

  const next = encodeURIComponent(joinPath(code));
  const card = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';
  const primaryBtn =
    'inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#CCFF00] text-[15px] font-semibold text-zinc-950 shadow-[0_0_30px_-6px_rgba(204,255,0,0.45)] transition-opacity disabled:opacity-50';

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-x-clip bg-[#07080A] px-4 py-8">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-[#CCFF00]/[0.06] blur-[140px]" />

      <div className="relative w-full max-w-md">
        <header className="mb-8 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[15px] font-semibold text-white">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#CCFF00] text-zinc-950">
              <Lightning size={15} weight="fill" />
            </span>
            CloudPulse
          </span>
          <div className="flex gap-0.5 rounded-full border border-white/5 bg-black/20 p-1 text-xs">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-full px-2.5 py-1 font-semibold ${
                  lang === l.code ? 'bg-[#CCFF00] text-zinc-950' : 'text-zinc-400'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </header>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.45 }}
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CCFF00]/10 text-[#CCFF00]">
              <UsersThree size={22} weight="fill" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em] text-zinc-50">{inv.joinTitle}</h1>
              <p className="text-sm text-zinc-400">{inv.joinSubtitle}</p>
            </div>
          </div>

          {stage.kind === 'loading' && <p className="text-sm text-zinc-400">{inv.checking}</p>}

          {stage.kind === 'signedOut' && (
            <section className={card}>
              <p className="text-xs text-zinc-500">{inv.codeLabel}</p>
              <p className="mt-1 font-mono text-2xl tracking-[0.12em] text-zinc-50">{formatInviteCode(code)}</p>
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-300">{inv.signInToJoin}</p>
              <div className="mt-5 space-y-2">
                <Link href={`/signup?next=${next}`} className={primaryBtn}>
                  {inv.createAccount}
                  <ArrowRight size={18} weight="bold" />
                </Link>
                <Link
                  href={`/login?next=${next}`}
                  className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-white/[0.04] text-[15px] font-medium text-zinc-200 ring-1 ring-inset ring-white/10"
                >
                  {inv.signIn}
                </Link>
              </div>
            </section>
          )}

          {stage.kind === 'error' && (
            <section className="flex gap-3 rounded-3xl bg-[#FF4D5E]/[0.08] p-5 text-[15px] leading-relaxed text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
              <WarningOctagon size={20} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
              <span>{errorText[stage.code]}</span>
            </section>
          )}

          {stage.kind === 'already' && (
            <section className={card}>
              <p className="flex items-center gap-2 text-[15px] text-zinc-100">
                <CheckCircle size={20} weight="fill" className="text-[#CCFF00]" />
                {inv.alreadyMember(stage.teamName)}
              </p>
              <button type="button" onClick={handleContinue} className={`${primaryBtn} mt-5`}>
                {inv.continue}
                <ArrowRight size={18} weight="bold" />
              </button>
            </section>
          )}

          {stage.kind === 'joined' && (
            <section className={card}>
              <p className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
                <CheckCircle size={24} weight="fill" className="text-[#CCFF00]" />
                {inv.joinedTitle(stage.teamName)}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{inv.joinedBody}</p>
              <button type="button" onClick={handleContinue} className={`${primaryBtn} mt-5`}>
                {inv.continue}
                <ArrowRight size={18} weight="bold" />
              </button>
            </section>
          )}

          {stage.kind === 'form' && (
            <form onSubmit={handleJoin} className="space-y-3">
              <section className={card}>
                <p className="text-xs text-zinc-500">{inv.teamLabel}</p>
                <p className="mt-1 text-xl font-semibold text-zinc-50">{stage.teamName}</p>

                <label className="mt-5 block">
                  <span className="text-sm font-medium text-zinc-200">{inv.labelField}</span>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    maxLength={ATHLETE_LABEL_MAX}
                    placeholder={inv.labelPlaceholder}
                    autoComplete="nickname"
                    className="mt-2 w-full rounded-xl bg-white/[0.05] px-3.5 py-3 text-[15px] text-zinc-50 placeholder-zinc-500 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-[#CCFF00]/50"
                  />
                  <span className="mt-1.5 block text-xs text-zinc-500">{inv.labelHint}</span>
                </label>
              </section>

              <section className={card}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <Eye size={16} weight="fill" className="text-zinc-400" />
                  {inv.coachSeesTitle}
                </h2>
                <ul className="mt-3 space-y-2">
                  {inv.coachSees.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-zinc-300">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#CCFF00]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500">{inv.leaveHint}</p>

                <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="h-5 w-5 shrink-0 accent-[#CCFF00]"
                  />
                  {inv.agree}
                </label>
              </section>

              {formError && (
                <div className="flex gap-3 rounded-2xl bg-[#FF4D5E]/[0.08] p-4 text-sm text-zinc-200 ring-1 ring-inset ring-[#FF4D5E]/30">
                  <WarningOctagon size={18} weight="fill" className="mt-0.5 shrink-0 text-[#FF4D5E]" />
                  <span>{errorText[formError]}</span>
                </div>
              )}

              <button type="submit" disabled={!agreed || busy || !label.trim()} className={primaryBtn}>
                {busy ? inv.joining : inv.join}
                {!busy && <ArrowRight size={18} weight="bold" />}
              </button>
            </form>
          )}

          {email && stage.kind !== 'loading' && stage.kind !== 'joined' && (
            <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-500">
              {inv.signedInAs(email)}
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="inline-flex items-center gap-1 text-zinc-300 underline-offset-2 hover:underline"
              >
                <SignOut size={12} />
                {inv.switchAccount}
              </button>
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <AccessGate>
      <JoinFlow />
    </AccessGate>
  );
}

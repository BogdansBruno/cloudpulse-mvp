'use client';

// adp/src/screens/AICoachScreen.tsx
//
// "My workout for today" — the athlete's plan, built from today's check-in.
//
// Purely presentational: the page fetches a PlanView from /api/adp-coach and
// passes it in. What the screen always shows, whatever the plan:
//   - the Safety Guard plaque: how many rules the plan was checked against
//     and today's engine limit — an honest claim, not "zero risk";
//   - who wrote it: the AI (checked by code) or the engine's rules alone;
//   - why the day looks like this, in plain words (from the limit reasons,
//     never invented by the screen);
//   - the stop rule, and the referral line for any zone we leave alone;
//   - that doses are a draft for the S&C coach.

import { useId, type ReactElement } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../components/labels';
import { SEVERITY_COLOR } from '../components/sorenessMap';
import type { BlockRole, PlanView } from '../services/planView';

export type AICoachScreenState =
  | { kind: 'loading' }
  | { kind: 'no_checkin' }
  | { kind: 'error' }
  | { kind: 'ok'; view: PlanView };

export type AICoachScreenProps = {
  state: AICoachScreenState;
  lang: AdpLang;
  onRetry?: () => void;
  checkinHref?: string;
  className?: string;
};

const LIME = '#CCFF00';
const AMBER = '#FFB020';
const RED = '#FF4D5E';

const CEILING_COLOR = { green: LIME, yellow: AMBER, red: RED, blocked: RED } as const;
const ROLE_COLOR: Readonly<Record<BlockRole, string>> = { relief: AMBER, prehab: LIME, general: '#A1A1AA' };

function ShieldIcon({ color }: { color: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} aria-hidden>
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10v-6l-8-3Z" fill={color} fillOpacity={0.18} stroke={color} strokeWidth={1.6} />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CARD = 'rounded-3xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.08] backdrop-blur-2xl';

export default function AICoachScreen({ state, lang, onRetry, checkinHref = '/checkin', className = '' }: AICoachScreenProps): ReactElement {
  const t = COACH_LABELS[lang];
  const zones = SORENESS_LABELS[lang];
  const titleId = useId();

  const header = (
    <header>
      <h1 id={titleId} className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-50 md:text-4xl">
        {t.title}
      </h1>
    </header>
  );

  if (state.kind === 'loading') {
    return (
      <section className={`space-y-3 ${className}`} aria-labelledby={titleId} aria-busy>
        {header}
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${CARD} h-28 animate-pulse`} />
        ))}
      </section>
    );
  }

  if (state.kind === 'no_checkin' || state.kind === 'error') {
    const noCheckin = state.kind === 'no_checkin';
    return (
      <section className={`space-y-4 ${className}`} aria-labelledby={titleId}>
        {header}
        <div className={CARD}>
          <p className="text-base font-semibold text-zinc-50">{noCheckin ? t.noCheckinTitle : t.error}</p>
          {noCheckin && <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{t.noCheckinBody}</p>}
          <div className="mt-4">
            {noCheckin ? (
              <a
                href={checkinHref}
                className="inline-flex h-11 items-center rounded-2xl bg-[#CCFF00] px-5 text-sm font-semibold text-zinc-950"
              >
                {t.toCheckin}
              </a>
            ) : (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex h-11 items-center rounded-2xl bg-white/10 px-5 text-sm font-semibold text-zinc-50 hover:bg-white/15"
              >
                {t.retry}
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const v = state.view;
  const ceilingColor = CEILING_COLOR[v.engine.ceiling];
  const sideWord = (s: string) => (s === 'center' ? '' : ` · ${zones.sides[s as 'left' | 'right' | 'both']}`);

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby={titleId}>
      {header}

      {/* Mode + totals */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1 text-sm font-medium ring-1 ring-inset ring-white/[0.08]"
          style={{ color: ceilingColor }}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ceilingColor }} aria-hidden />
          {t.modes[v.mode]}
        </span>
        {v.mode !== 'none' && (
          <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-sm tabular-nums text-zinc-300 ring-1 ring-inset ring-white/[0.08]">
            {t.total(v.totalMinutes, v.limits.maxRpe)}
          </span>
        )}
      </div>

      {/* Safety Guard plaque */}
      <div className="flex gap-3 rounded-3xl bg-[#CCFF00]/[0.06] p-4 ring-1 ring-inset ring-[#CCFF00]/25">
        <span className="mt-0.5 shrink-0">
          <ShieldIcon color={LIME} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-50">{t.guardTitle}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-300">{t.guardBody(v.rulesChecked, t.ceiling[v.engine.ceiling])}</p>
          <p className="mt-2 inline-flex rounded-full bg-black/30 px-2.5 py-0.5 text-[11px] font-medium text-zinc-400 ring-1 ring-inset ring-white/10">
            {v.source === 'ai' ? t.sourceAi : t.sourceRules}
          </p>
        </div>
      </div>

      {/* Why */}
      <div className={CARD}>
        <h2 className="text-sm font-semibold text-zinc-50">{t.whyTitle}</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-200">{v.explanation}</p>
        <ul className="mt-3 space-y-1.5">
          {(v.limits.reasons.length === 0 ? [null] : v.limits.reasons).map((r, i) => (
            <li key={r ?? i} className="flex gap-2 text-sm leading-relaxed text-zinc-400">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" aria-hidden />
              {r === null ? t.noReasons : t.reasons[r]}
            </li>
          ))}
        </ul>
        {v.soreness.map.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {v.soreness.map.map((z) => (
              <li
                key={`${z.zoneId}:${z.side}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-zinc-200 ring-1 ring-inset ring-white/10"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[z.severity] }} aria-hidden />
                {zones.zones[z.zoneId]}
                {sideWord(z.side)} · {z.severity}/5
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Nothing today */}
      {v.mode === 'none' && (
        <div className={CARD}>
          <p className="text-sm leading-relaxed text-zinc-200">{t.noneBody}</p>
        </div>
      )}

      {/* Timeline */}
      {v.blocks.length > 0 && (
        <ol className={`${CARD} space-y-0`}>
          {v.blocks.map((b, i) => {
            const color = ROLE_COLOR[b.role];
            const last = i === v.blocks.length - 1;
            return (
              <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
                {!last && <span className="absolute left-[15px] top-9 bottom-0 w-px bg-white/10" aria-hidden />}
                <span
                  className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-sm font-semibold tabular-nums"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color }}>
                    {t.roles[b.role]}
                    {b.targetZone && b.role === 'relief' && <span className="normal-case tracking-normal"> · {zones.zones[b.targetZone]}</span>}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3">
                    <p className="text-sm text-zinc-400">{t.kinds[b.kind]}</p>
                    <p className="font-mono text-xs tabular-nums text-zinc-500">
                      {b.minutes} {t.min} · {t.effort(b.rpeCap)}
                    </p>
                  </div>
                  {b.drills.map((d) => (
                    <div key={d.id} className="mt-2 rounded-2xl bg-black/25 p-3 ring-1 ring-inset ring-white/[0.06]">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <p className="text-[15px] font-semibold text-zinc-50">{d.name}</p>
                        <p className="font-mono text-xs tabular-nums text-zinc-300">{t.dose(d.dose, d.perSide)}</p>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">{d.cue}</p>
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Zones we leave alone */}
      {v.soreness.referredZones.length > 0 && (
        <div className="rounded-3xl bg-[#FFB020]/[0.07] p-4 ring-1 ring-inset ring-[#FFB020]/30">
          <p className="text-sm font-semibold text-zinc-50">{t.referredTitle}</p>
          <p className="mt-1 text-sm text-zinc-200">{v.soreness.referredZones.map((z) => zones.zones[z]).join(', ')}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">{v.referral}</p>
        </div>
      )}

      {/* Stop rule + draft note */}
      <div className="rounded-3xl bg-white/[0.02] p-4 ring-1 ring-inset ring-white/[0.06]">
        <p className="text-[13px] leading-relaxed text-zinc-300">{v.stopRule}</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">{t.draftNote}</p>
      </div>
    </section>
  );
}

'use client';

// adp/src/screens/AICoachScreen.tsx
//
// "My workout for today" — the athlete's plan, built from today's check-in.
// Liquid Glass edition: every card is a LiquidGlassCard, every button a
// LiquidGlassButton (spring press), the current block carries a timer.
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
// The timer is a stopwatch only: nothing is saved or sent anywhere.

import { useId, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../components/labels';
import { SEVERITY_COLOR } from '../components/sorenessMap';
import GlassRing from '../components/ui/GlassRing';
import LiquidGlassButton from '../components/ui/LiquidGlassButton';
import LiquidGlassCard from '../components/ui/LiquidGlassCard';
import { mmss, useDrillTimer } from '../services/drillTimer';
import type { BlockRole, BlockView, PlanView } from '../services/planView';

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

// Status colours on dark glass (all ≥ 4.5:1 against the glass over the mesh).
const GOOD = '#34D399';
const WARN = '#FBBF24';
const BAD = '#FB7185';
const INFO = '#67E8F9';
const MUTED = '#CBD5E1';
const FAINT = '#94A3B8';

const CEILING_COLOR = { green: GOOD, yellow: WARN, red: BAD, blocked: BAD } as const;
const ROLE_COLOR: Readonly<Record<BlockRole, string>> = { relief: WARN, prehab: GOOD, general: INFO };

/** Inner pane inside a glass card. */
const WELL: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 18,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10)',
};

function tinted(color: string): CSSProperties {
  return {
    background: `linear-gradient(180deg, ${color}26, rgba(255,255,255,0.05))`,
    border: `1px solid ${color}55`,
  };
}

function Pill({ color, children }: { color?: string; children: ReactNode }): ReactElement {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-medium"
      style={{
        background: color ? `linear-gradient(180deg, ${color}2E, ${color}12)` : 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))',
        border: `1px solid ${color ? `${color}66` : 'rgba(255,255,255,0.16)'}`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
        color: color ?? '#F8FAFC',
      }}
    >
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} aria-hidden />}
      {children}
    </span>
  );
}

function ShieldIcon({ color }: { color: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden className="shrink-0" style={{ filter: `drop-shadow(0 0 6px ${color})` }}>
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10v-6l-8-3Z" fill={color} fillOpacity={0.16} stroke={color} strokeWidth={1.5} />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AICoachScreen({ state, lang, onRetry, checkinHref = '/checkin', className = '' }: AICoachScreenProps): ReactElement {
  const t = COACH_LABELS[lang];
  const titleId = useId();

  const header = (
    <header className="pb-1">
      <h1 id={titleId} className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white md:text-4xl" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.35)' }}>
        {t.title}
      </h1>
    </header>
  );

  if (state.kind === 'loading') {
    return (
      <section className={`space-y-3 ${className}`} aria-labelledby={titleId} aria-busy>
        {header}
        {[0, 1, 2].map((i) => (
          <LiquidGlassCard key={i} interactive={false} radius={28} className="h-28 animate-pulse" />
        ))}
      </section>
    );
  }

  if (state.kind === 'no_checkin' || state.kind === 'error') {
    const noCheckin = state.kind === 'no_checkin';
    return (
      <section className={`space-y-4 ${className}`} aria-labelledby={titleId}>
        {header}
        <LiquidGlassCard radius={28} className="p-5">
          <p className="text-base font-semibold text-white">{noCheckin ? t.noCheckinTitle : t.error}</p>
          {noCheckin && (
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: MUTED }}>
              {t.noCheckinBody}
            </p>
          )}
          <div className="mt-4">
            {noCheckin ? (
              <LiquidGlassButton variant="primary" size="lg" onClick={() => window.location.assign(checkinHref)}>
                {t.toCheckin}
              </LiquidGlassButton>
            ) : (
              <LiquidGlassButton size="lg" onClick={onRetry}>
                {t.retry}
              </LiquidGlassButton>
            )}
          </div>
        </LiquidGlassCard>
      </section>
    );
  }

  return <PlanScreen view={state.view} lang={lang} header={header} titleId={titleId} className={className} />;
}

function PlanScreen({ view: v, lang, header, titleId, className }: { view: PlanView; lang: AdpLang; header: ReactNode; titleId: string; className: string }): ReactElement {
  const t = COACH_LABELS[lang];
  const zones = SORENESS_LABELS[lang];
  const timer = useDrillTimer(v.blocks);
  const ceilingColor = CEILING_COLOR[v.engine.ceiling];
  const sideWord = (s: string) => (s === 'center' ? '' : ` · ${zones.sides[s as 'left' | 'right' | 'both']}`);

  return (
    <section className={`space-y-3 ${className}`} aria-labelledby={titleId}>
      {header}

      {/* Mode + totals */}
      <div className="flex flex-wrap items-center gap-2 pb-1">
        <Pill color={ceilingColor}>{t.modes[v.mode]}</Pill>
        {v.mode !== 'none' && (
          <Pill>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{t.total(v.totalMinutes, v.limits.maxRpe)}</span>
          </Pill>
        )}
      </div>

      {/* Safety Guard plaque */}
      <LiquidGlassCard radius={28} className="p-4" style={tinted(GOOD)}>
        <div className="flex gap-3">
          <span className="mt-0.5">
            <ShieldIcon color={GOOD} />
          </span>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-white">{t.guardTitle}</p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>
              {t.guardBody(v.rulesChecked, t.ceiling[v.engine.ceiling])}
            </p>
            <p className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium" style={{ color: MUTED, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {v.source === 'ai' ? t.sourceAi : t.sourceRules}
            </p>
          </div>
        </div>
      </LiquidGlassCard>

      {/* Why */}
      <LiquidGlassCard radius={28} className="p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: FAINT }}>
          {t.whyTitle}
        </h2>
        <p className="mt-2 text-[16px] leading-relaxed text-white">{v.explanation}</p>
        <ul className="mt-3 space-y-1.5">
          {(v.limits.reasons.length === 0 ? [null] : v.limits.reasons).map((r, i) => (
            <li key={r ?? i} className="flex gap-2 text-sm leading-relaxed" style={{ color: MUTED }}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: FAINT }} aria-hidden />
              {r === null ? t.noReasons : t.reasons[r]}
            </li>
          ))}
        </ul>
        {v.soreness.map.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {v.soreness.map.map((z) => (
              <li key={`${z.zoneId}:${z.side}`}>
                <Pill>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[z.severity], boxShadow: `0 0 8px ${SEVERITY_COLOR[z.severity]}` }} aria-hidden />
                  {zones.zones[z.zoneId]}
                  {sideWord(z.side)} · {z.severity}/5
                </Pill>
              </li>
            ))}
          </ul>
        )}
      </LiquidGlassCard>

      {/* Nothing today */}
      {v.mode === 'none' && (
        <LiquidGlassCard radius={28} className="p-5">
          <p className="text-sm leading-relaxed text-white">{t.noneBody}</p>
        </LiquidGlassCard>
      )}

      {/* Session: one glass card per block, the current one carries the timer */}
      {v.blocks.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1 pt-2">
            <p className="text-[13px] font-medium" style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
              {t.timer.progress(timer.finished.size, v.blocks.length)}
            </p>
            <LiquidGlassButton size="sm" onClick={timer.reset}>
              {t.timer.restart}
            </LiquidGlassButton>
          </div>
          <ol className="space-y-3">
            {v.blocks.map((b, i) => (
              <li key={i}>
                <BlockCard
                  block={b}
                  index={i}
                  lang={lang}
                  current={i === timer.index}
                  done={timer.finished.has(i)}
                  onSelect={() => timer.select(i)}
                  timer={i === timer.index ? timer : null}
                />
              </li>
            ))}
          </ol>
        </>
      )}

      {/* Zones we leave alone */}
      {v.soreness.referredZones.length > 0 && (
        <LiquidGlassCard radius={28} className="p-4" style={tinted(WARN)}>
          <p className="text-sm font-semibold text-white">{t.referredTitle}</p>
          <p className="mt-1 text-sm text-white">{v.soreness.referredZones.map((z) => zones.zones[z]).join(', ')}</p>
          <p className="mt-2 text-[13px] leading-relaxed" style={{ color: '#FDE68A' }}>
            {v.referral}
          </p>
        </LiquidGlassCard>
      )}

      {/* Stop rule + draft note */}
      <LiquidGlassCard radius={28} interactive={false} className="p-4">
        <p className="text-[13px] leading-relaxed" style={{ color: MUTED }}>
          {v.stopRule}
        </p>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: FAINT }}>
          {t.draftNote} {t.timer.note}
        </p>
      </LiquidGlassCard>
    </section>
  );
}

type Timer = ReturnType<typeof useDrillTimer>;

function BlockCard({
  block: b,
  index,
  lang,
  current,
  done,
  onSelect,
  timer,
}: {
  block: BlockView;
  index: number;
  lang: AdpLang;
  current: boolean;
  done: boolean;
  onSelect: () => void;
  timer: Timer | null;
}): ReactElement {
  const t = COACH_LABELS[lang];
  const zones = SORENESS_LABELS[lang];
  const color = ROLE_COLOR[b.role];

  return (
    <LiquidGlassCard radius={28} className="p-4" style={current ? { border: `1px solid ${color}80` } : undefined}>
      <button type="button" onClick={onSelect} className="flex w-full items-start gap-3 text-left" aria-current={current ? 'step' : undefined}>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
          style={{
            background: done ? color : `${color}26`,
            color: done ? '#0B1024' : color,
            border: `1px solid ${color}66`,
            boxShadow: current ? `0 0 16px -2px ${color}` : 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {done ? '✓' : index + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color }}>
            {current && !done ? `${t.timer.now} · ` : ''}
            {t.roles[b.role]}
            {b.targetZone && b.role === 'relief' && <span className="normal-case tracking-normal"> · {zones.zones[b.targetZone]}</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="text-sm" style={{ color: MUTED }}>
              {t.kinds[b.kind]}
            </span>
            <span className="text-xs" style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
              {b.minutes} {t.min} · {t.effort(b.rpeCap)}
            </span>
          </span>
        </span>
      </button>

      {timer && (
        <div className="mt-4 flex items-center gap-4 p-4" style={WELL}>
          <GlassRing value={timer.total - timer.left} max={timer.total} size={92} color={color}>
            <span className="text-[20px] font-light text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {mmss(timer.left)}
            </span>
          </GlassRing>
          <div className="flex flex-wrap gap-2">
            <LiquidGlassButton variant="primary" onClick={timer.toggle}>
              {timer.running ? t.timer.pause : timer.left < timer.total ? t.timer.resume : t.timer.start}
            </LiquidGlassButton>
            <LiquidGlassButton onClick={timer.next}>{t.timer.done}</LiquidGlassButton>
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2">
        {b.drills.map((d) => (
          <div key={d.id} className="p-3" style={WELL}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="text-[15px] font-semibold" style={{ color: done ? FAINT : '#FFFFFF' }}>
                {d.name}
              </p>
              <p className="text-xs" style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                {t.dose(d.dose, d.perSide)}
              </p>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: MUTED }}>
              {d.cue}
            </p>
          </div>
        ))}
      </div>
    </LiquidGlassCard>
  );
}

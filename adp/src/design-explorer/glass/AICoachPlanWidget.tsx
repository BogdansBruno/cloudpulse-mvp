'use client';

// Liquid Glass — home plan as an airy timeline: a glowing hairline with
// nodes, each block a row of glass pills (role, minutes, effort cap); the
// current block opens into a frosted pane with a thin timer ring.

import type { ReactElement } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../../components/labels';
import type { PlanView } from '../../services/planView';
import LiquidGlassButton from '../../components/ui/LiquidGlassButton';
import LiquidGlassCard from '../../components/ui/LiquidGlassCard';
import { DX } from '../copy';
import { mmss, useDrillTimer } from '../shared';
import { THEMES, zoneColor } from '../themeStyles';
import { GlassPill, GlowRing, Label, WELL } from './ui';

const t = THEMES.glass;

export default function AICoachPlanWidget({ lang, plan }: { lang: AdpLang; plan: PlanView }): ReactElement {
  const L = COACH_LABELS[lang];
  const Z = SORENESS_LABELS[lang];
  const c = DX[lang].plan;
  const timer = useDrillTimer(plan.blocks);
  const roleColor = (r: string) => (r === 'relief' ? t.colors.warn : r === 'prehab' ? t.colors.good : t.colors.info);

  return (
    <LiquidGlassCard className="p-6">

      {/* Guard */}
      <div className="flex items-center gap-3 px-3.5 py-3" style={{ ...WELL, background: `linear-gradient(180deg, ${t.colors.good}22, ${t.colors.good}0A)`, border: `1px solid ${t.colors.good}40` }}>
        <svg width="26" height="26" viewBox="0 0 24 24" className="shrink-0" aria-hidden style={{ filter: `drop-shadow(0 0 6px ${t.colors.good})` }}>
          <path d="M12 2.5 4 5.5v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10v-6l-8-3Z" fill={t.colors.good} fillOpacity={0.14} stroke={t.colors.good} strokeWidth={1.4} />
          <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">{c.guard}</p>
          <p className="text-[12px] font-light" style={{ color: t.colors.textMuted }}>
            {c.rules(plan.rulesChecked)} · {L.ceiling[plan.engine.ceiling]}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{L.title}</h3>
        <GlassPill color={zoneColor(t, plan.engine.ceiling)}>{L.modes[plan.mode]}</GlassPill>
      </div>
      <p className="mt-1 text-[14px] font-light" style={{ color: t.colors.textMuted }}>
        {L.total(plan.totalMinutes, plan.limits.maxRpe)}
      </p>

      {/* Timeline */}
      <ol className="relative mt-6">
        <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-px" style={{ background: 'linear-gradient(180deg, rgba(103,232,249,0.7), rgba(129,140,248,0.35) 60%, rgba(255,255,255,0.08))' }} />
        {plan.blocks.map((b, i) => {
          const done = timer.finished.has(i);
          const on = i === timer.index;
          const rc = roleColor(b.role);
          return (
            <li key={i} className="relative pb-3 pl-9 last:pb-0">
              <span
                aria-hidden
                className="absolute left-[5px] top-[14px] flex h-[13px] w-[13px] items-center justify-center rounded-full"
                style={{
                  background: done ? t.colors.good : on ? '#FFFFFF' : 'rgba(10,15,36,0.9)',
                  border: `1.5px solid ${done ? t.colors.good : on ? '#FFFFFF' : rc}`,
                  boxShadow: on ? `0 0 14px ${rc}, 0 0 0 4px ${rc}33` : done ? `0 0 10px ${t.colors.good}` : 'none',
                }}
              />
              <button
                type="button"
                onClick={() => timer.select(i)}
                className="w-full px-3.5 py-3 text-left transition-colors"
                style={on ? { ...WELL, background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.18)' } : { borderRadius: t.radius.inner, border: '1px solid transparent' }}
                aria-current={on ? 'step' : undefined}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-[15px] font-medium leading-snug" style={{ color: done ? t.colors.textFaint : t.colors.text, textDecoration: done ? 'line-through' : 'none', textDecorationColor: 'rgba(255,255,255,0.3)' }}>
                    {b.drills.map((d) => d.name).join(' + ')}
                  </span>
                  <span className="shrink-0 text-[14px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {b.minutes} {L.min}
                  </span>
                </span>
                <span className="mt-2 flex flex-wrap gap-1.5">
                  <GlassPill color={rc}>{L.roles[b.role]}</GlassPill>
                  <GlassPill>RPE ≤ {b.rpeCap}</GlassPill>
                  {b.targetZone && b.role === 'relief' && <GlassPill>{Z.zones[b.targetZone]}</GlassPill>}
                </span>
              </button>

              {on && (
                <div className="mt-2 flex items-center gap-4 p-4" style={WELL}>
                  <GlowRing value={timer.total - timer.left} max={Math.max(1, timer.total)} size={96} stroke={4} color={rc}>
                    <span className="text-[20px] font-light" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {mmss(timer.left)}
                    </span>
                  </GlowRing>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-light" style={{ color: t.colors.textMuted }}>
                      {b.drills.map((d) => L.dose(d.dose, d.perSide)).join(' · ')}
                    </p>
                    {b.drills[0]?.cue && (
                      <p className="mt-1 text-[12px] font-light leading-relaxed" style={{ color: t.colors.textFaint }}>
                        {b.drills[0].cue}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <LiquidGlassButton variant="primary" size="sm" onClick={timer.toggle}>
                        {timer.running ? c.pause : timer.left < timer.total ? c.resume : c.start}
                      </LiquidGlassButton>
                      <LiquidGlassButton size="sm" onClick={timer.next}>
                        {c.next}
                      </LiquidGlassButton>
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 p-4" style={WELL}>
        <p className="text-[14px] leading-relaxed">{plan.explanation}</p>
        <p className="mt-2 text-[13px] font-light leading-relaxed" style={{ color: t.colors.textMuted }}>
          {plan.stopRule}
        </p>
      </div>
      <p className="mt-3 text-[11px] font-light" style={{ color: t.colors.textFaint }}>
        {L.draftNote}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <Label>{c.blocksDone(timer.finished.size, plan.blocks.length)}</Label>
        <LiquidGlassButton size="sm" onClick={timer.reset}>
          {c.reset}
        </LiquidGlassButton>
      </div>
    </LiquidGlassCard>
  );
}

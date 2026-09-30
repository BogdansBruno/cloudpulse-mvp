'use client';

// Night Feed — the home session as a feed of timeline cards: one floating
// card per block, a dot on the rail, the current card opens with the timer.

import type { ReactElement } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../../components/labels';
import type { PlanView } from '../../services/planView';
import { DX } from '../copy';
import { mmss, useDrillTimer } from '../shared';
import { THEMES, zoneColor } from '../themeStyles';
import { Caps, FeedCard, GlowRing, METRIC, PILL_BTN } from './ui';

const t = THEMES.feed;

export default function AICoachPlanWidget({ lang, plan }: { lang: AdpLang; plan: PlanView }): ReactElement {
  const L = COACH_LABELS[lang];
  const Z = SORENESS_LABELS[lang];
  const c = DX[lang].plan;
  const timer = useDrillTimer(plan.blocks);
  const roleGrad = (r: string): [string, string] => (r === 'relief' ? METRIC.load : r === 'prehab' ? METRIC.good : METRIC.sleep);
  const done = timer.finished.size;

  return (
    <div className="space-y-3" style={{ color: t.colors.text, fontFamily: t.font.body }}>
      <FeedCard glow={zoneColor(t, plan.engine.ceiling)} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Caps color={zoneColor(t, plan.engine.ceiling)}>{L.modes[plan.mode]}</Caps>
            <h3 className="mt-1.5 text-[20px] font-semibold leading-tight tracking-[-0.01em]">{L.title}</h3>
            <p className="mt-1 text-[14px]" style={{ color: t.colors.textMuted }}>
              {L.total(plan.totalMinutes, plan.limits.maxRpe)}
            </p>
          </div>
          <GlowRing value={done} max={Math.max(1, plan.blocks.length)} size={54} stroke={4} gradient={METRIC.good}>
            <span className="text-[13px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {done}/{plan.blocks.length}
            </span>
          </GlowRing>
        </div>
        <div className="mt-4 flex items-center gap-2 px-3 py-2 text-[12px]" style={{ background: `${t.colors.good}14`, border: `1px solid ${t.colors.good}33`, borderRadius: t.radius.pill }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.colors.good, boxShadow: `0 0 8px ${t.colors.good}` }} />
          <span className="font-semibold">{c.guard}</span>
          <span style={{ color: t.colors.textMuted }}>
            · {c.rules(plan.rulesChecked)} · {L.ceiling[plan.engine.ceiling]}
          </span>
        </div>
      </FeedCard>

      <ol className="relative space-y-3 pl-5">
        <span aria-hidden className="absolute bottom-6 left-[5px] top-6 w-px" style={{ background: t.colors.border }} />
        {plan.blocks.map((b, i) => {
          const on = i === timer.index;
          const fin = timer.finished.has(i);
          const g = roleGrad(b.role);
          return (
            <li key={i} className="relative">
              <span
                aria-hidden
                className="absolute -left-5 top-6 h-[11px] w-[11px] rounded-full"
                style={{ background: fin ? g[0] : on ? '#FFFFFF' : '#0A0B0E', border: `1.5px solid ${fin || on ? g[0] : t.colors.border}`, boxShadow: on ? `0 0 12px ${g[0]}` : 'none' }}
              />
              <FeedCard glow={on ? g[0] : undefined} className="p-0">
                <button type="button" onClick={() => timer.select(i)} className="flex w-full items-start justify-between gap-3 p-4 text-left" aria-current={on ? 'step' : undefined}>
                  <span className="min-w-0">
                    <Caps color={g[0]}>
                      {L.roles[b.role]}
                      {b.targetZone && b.role === 'relief' ? ` · ${Z.zones[b.targetZone]}` : ''}
                    </Caps>
                    <span className="mt-1 block text-[15px] font-medium leading-snug" style={{ color: fin ? t.colors.textFaint : t.colors.text }}>
                      {b.drills.map((d) => d.name).join(' + ')}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[18px] font-semibold leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {b.minutes}
                      <span className="ml-0.5 text-[12px] font-normal" style={{ color: t.colors.textFaint }}>
                        {L.min}
                      </span>
                    </span>
                    <span className="mt-1 block text-[11px] uppercase tracking-widest" style={{ color: t.colors.textFaint }}>
                      RPE ≤ {b.rpeCap}
                    </span>
                  </span>
                </button>
                {on && (
                  <div className="flex items-center gap-4 px-4 pb-4">
                    <GlowRing value={timer.total - timer.left} max={Math.max(1, timer.total)} size={84} stroke={4} gradient={g}>
                      <span className="text-[17px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {mmss(timer.left)}
                      </span>
                    </GlowRing>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px]" style={{ color: t.colors.textMuted }}>
                        {b.drills.map((d) => L.dose(d.dose, d.perSide)).join(' · ')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" onClick={timer.toggle} className="px-4 py-1.5 text-[14px] font-semibold" style={{ background: g[0], color: '#0A0B0E', borderRadius: t.radius.pill }}>
                          {timer.running ? c.pause : timer.left < timer.total ? c.resume : c.start}
                        </button>
                        <button type="button" onClick={timer.next} className="px-4 py-1.5 text-[14px] font-medium" style={PILL_BTN}>
                          {c.next}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </FeedCard>
            </li>
          );
        })}
      </ol>

      <FeedCard className="p-5">
        <p className="text-[14px] leading-relaxed">{plan.explanation}</p>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
          {plan.stopRule}
        </p>
        <p className="mt-2 text-[12px]" style={{ color: t.colors.textFaint }}>
          {L.draftNote}
        </p>
        <button type="button" onClick={timer.reset} className="mt-3 text-[13px] font-medium" style={{ color: t.colors.info }}>
          {c.reset}
        </button>
      </FeedCard>
    </div>
  );
}

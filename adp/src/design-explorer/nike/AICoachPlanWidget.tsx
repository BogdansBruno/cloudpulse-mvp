'use client';

// Gen-Z Energy — home plan as a playlist: a big "now playing" block with a
// giant italic timer, progress stripes, step cards with hard shadows.

import type { ReactElement } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../../components/labels';
import type { PlanView } from '../../services/planView';
import { DX } from '../copy';
import { mmss, useDrillTimer } from '../shared';
import { THEMES, cardStyle } from '../themeStyles';

const t = THEMES.nike;

export default function AICoachPlanWidget({ lang, plan }: { lang: AdpLang; plan: PlanView }): ReactElement {
  const L = COACH_LABELS[lang];
  const Z = SORENESS_LABELS[lang];
  const c = DX[lang].plan;
  const timer = useDrillTimer(plan.blocks);
  const current = plan.blocks[timer.index];
  const display = { fontStyle: 'italic' as const, fontWeight: 900, textTransform: 'uppercase' as const };
  const roleBg = (r: string) => (r === 'relief' ? t.colors.warn : r === 'prehab' ? t.colors.good : t.colors.info);
  const progress = timer.total > 0 ? (timer.total - timer.left) / timer.total : 0;

  return (
    <section className="space-y-4" style={{ fontFamily: t.font.body, color: t.colors.text }}>
      {/* Guard sticker */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ background: t.colors.good, color: '#120A2A', border: '2px solid #000', borderRadius: t.radius.pill, boxShadow: t.shadow.raised }}>
        <span className="text-sm tracking-tight" style={display}>
          ✓ {c.guard}
        </span>
        <span className="text-xs font-bold">{c.rules(plan.rulesChecked)} · {L.ceiling[plan.engine.ceiling]}</span>
      </div>

      {/* Now playing */}
      {current && (
        <div className="p-5" style={{ ...cardStyle(t), background: t.gradients.accent }}>
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 text-[11px] tracking-tight" style={{ ...display, background: roleBg(current.role), color: '#120A2A', border: '2px solid #000', borderRadius: t.radius.pill }}>
              {c.now} · {L.roles[current.role]}
            </span>
            <span className="text-xs font-bold">{L.modes[plan.mode]}</span>
          </div>
          <p className="mt-3 text-[64px] leading-[0.85] tracking-[-0.05em]" style={{ ...display, fontVariantNumeric: 'tabular-nums' }}>
            {mmss(timer.left)}
          </p>
          <p className="mt-2 text-lg leading-tight tracking-tight" style={display}>
            {current.drills.map((d) => d.name).join(' + ')}
          </p>
          <p className="mt-1 text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {current.drills.map((d) => L.dose(d.dose, d.perSide)).join(' · ')}
          </p>
          <div className="mt-4 h-3 overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)', border: '2px solid #000', borderRadius: t.radius.pill }}>
            <div className="h-full" style={{ width: `${progress * 100}%`, background: t.gradients.hero, transition: 'width 900ms linear' }} />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={timer.toggle}
              className="flex-1 py-3 text-base tracking-tight active:translate-x-[2px] active:translate-y-[2px]"
              style={{ ...display, background: '#FFFFFF', color: '#120A2A', border: '2px solid #000', borderRadius: t.radius.pill, boxShadow: t.shadow.raised }}
            >
              {timer.running ? c.pause : timer.left < timer.total ? c.resume : c.start}
            </button>
            <button
              type="button"
              onClick={timer.next}
              className="px-5 py-3 text-base tracking-tight active:translate-x-[2px] active:translate-y-[2px]"
              style={{ ...display, background: t.colors.accent, color: '#120A2A', border: '2px solid #000', borderRadius: t.radius.pill, boxShadow: t.shadow.raised }}
            >
              {c.next} ›
            </button>
          </div>
        </div>
      )}

      {/* Progress stripes */}
      <div className="flex gap-1.5" aria-label={c.blocksDone(timer.finished.size, plan.blocks.length)}>
        {plan.blocks.map((_b, i) => (
          <span
            key={i}
            className="h-2.5 flex-1"
            style={{
              background: timer.finished.has(i) ? t.colors.good : i === timer.index ? t.colors.accent : 'rgba(255,255,255,0.14)',
              border: '2px solid #000',
              borderRadius: t.radius.pill,
            }}
          />
        ))}
      </div>

      {/* Steps */}
      <ol className="space-y-3">
        {plan.blocks.map((b, i) => {
          const done = timer.finished.has(i);
          const on = i === timer.index;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => timer.select(i)}
                className="flex w-full items-center gap-3 p-3 text-left"
                style={{ ...cardStyle(t), borderRadius: t.radius.inner, boxShadow: on ? t.shadow.card : t.shadow.raised, background: on ? t.colors.surfaceAlt : t.colors.surface, opacity: done ? 0.6 : 1 }}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center text-lg" style={{ ...display, background: roleBg(b.role), color: '#120A2A', border: '2px solid #000', borderRadius: 12 }}>
                  {done ? '✓' : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{b.drills.map((d) => d.name).join(' + ')}</span>
                  <span className="block text-[11px] font-semibold" style={{ color: t.colors.textMuted }}>
                    {L.roles[b.role]}
                    {b.targetZone && b.role === 'relief' ? ` · ${Z.zones[b.targetZone]}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-right text-sm" style={display}>
                  {b.minutes}′
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="p-4" style={{ ...cardStyle(t), borderRadius: t.radius.inner, boxShadow: t.shadow.raised }}>
        <p className="text-sm font-semibold leading-relaxed">{plan.explanation}</p>
        <p className="mt-2 text-xs font-semibold leading-relaxed" style={{ color: t.colors.textMuted }}>
          {plan.stopRule}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: t.colors.textFaint }}>
          {L.draftNote}
        </p>
        <button type="button" onClick={timer.reset} className="mt-2 text-xs font-bold" style={{ color: t.colors.textMuted }}>
          {c.reset}
        </button>
      </div>
    </section>
  );
}

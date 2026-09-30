'use client';

// Performance Dark — home plan: Safety Guard strip, the current block with a
// big tabular timer and a progress arc, a dense timeline below.

import type { ReactElement } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../../components/labels';
import type { PlanView } from '../../services/planView';
import { DX } from '../copy';
import { Ring, mmss, useDrillTimer } from '../shared';
import { THEMES, cardStyle, zoneColor } from '../themeStyles';

const t = THEMES.whoop;

export default function AICoachPlanWidget({ lang, plan }: { lang: AdpLang; plan: PlanView }): ReactElement {
  const L = COACH_LABELS[lang];
  const Z = SORENESS_LABELS[lang];
  const c = DX[lang].plan;
  const timer = useDrillTimer(plan.blocks);
  const current = plan.blocks[timer.index];
  const mono = { fontFamily: t.font.mono, fontVariantNumeric: 'tabular-nums' as const };
  const roleColor = (r: string) => (r === 'relief' ? t.colors.warn : r === 'prehab' ? t.colors.good : t.colors.info);

  return (
    <section className="overflow-hidden" style={cardStyle(t)}>
      <div className="flex items-center justify-between gap-3 px-5 py-2.5" style={{ background: `${t.colors.accent}10`, borderBottom: `1px solid ${t.colors.border}` }}>
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.colors.accent }}>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: t.colors.accent }} />
          {c.guard}
        </span>
        <span className="text-[11px]" style={{ ...mono, color: t.colors.textMuted }}>
          {c.rules(plan.rulesChecked)} · {L.ceiling[plan.engine.ceiling]}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: t.colors.textMuted }}>
            {L.modes[plan.mode]}
          </p>
          <p className="text-xs" style={{ ...mono, color: zoneColor(t, plan.engine.ceiling) }}>
            {L.total(plan.totalMinutes, plan.limits.maxRpe)}
          </p>
        </div>

        {current && (
          <div className="mt-4 flex items-center gap-4">
            <Ring value={timer.total - timer.left} max={Math.max(1, timer.total)} size={112} stroke={8} color={roleColor(current.role)} track={t.colors.track}>
              <span className="text-2xl" style={{ ...mono, color: t.colors.text }}>
                {mmss(timer.left)}
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em]" style={{ color: t.colors.textFaint }}>
                {c.left}
              </span>
            </Ring>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: roleColor(current.role) }}>
                {c.now} · {L.roles[current.role]}
              </p>
              <p className="mt-1 text-base font-semibold leading-tight">{current.drills.map((d) => d.name).join(' + ')}</p>
              <p className="mt-1 text-xs" style={{ ...mono, color: t.colors.textMuted }}>
                {current.drills.map((d) => L.dose(d.dose, d.perSide)).join(' · ')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={timer.toggle}
                  className="px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
                  style={{ background: t.colors.accent, color: t.colors.onAccent, borderRadius: 8 }}
                >
                  {timer.running ? c.pause : timer.left < timer.total ? c.resume : c.start}
                </button>
                <button
                  type="button"
                  onClick={timer.next}
                  className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]"
                  style={{ border: `1px solid ${t.colors.border}`, color: t.colors.text, borderRadius: 8 }}
                >
                  {c.next}
                </button>
                <button type="button" onClick={timer.reset} className="px-2 text-xs" style={{ color: t.colors.textFaint }}>
                  {c.reset}
                </button>
              </div>
            </div>
          </div>
        )}

        <ol className="mt-5 space-y-px overflow-hidden" style={{ background: t.colors.border, borderRadius: t.radius.inner }}>
          {plan.blocks.map((b, i) => {
            const done = timer.finished.has(i);
            const on = i === timer.index;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => timer.select(i)}
                  className="grid w-full grid-cols-[28px_1fr_auto] items-center gap-3 px-3 py-2.5 text-left"
                  style={{ background: on ? t.colors.surfaceAlt : t.colors.surface }}
                >
                  <span className="text-xs" style={{ ...mono, color: done ? t.colors.good : on ? t.colors.accent : t.colors.textFaint }}>
                    {done ? '✓' : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px]" style={{ color: done ? t.colors.textMuted : t.colors.text }}>
                      {b.drills.map((d) => d.name).join(' + ')}
                    </span>
                    <span className="block text-[10px] uppercase tracking-[0.14em]" style={{ color: roleColor(b.role) }}>
                      {L.roles[b.role]}
                      {b.targetZone && b.role === 'relief' ? ` · ${Z.zones[b.targetZone]}` : ''}
                    </span>
                  </span>
                  <span className="text-right text-[11px]" style={{ ...mono, color: t.colors.textMuted }}>
                    {b.minutes}′ · RPE {b.rpeCap}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <p className="mt-4 text-[13px] leading-relaxed" style={{ color: t.colors.textMuted }}>
          {plan.explanation}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: t.colors.textFaint }}>
          {plan.stopRule} {L.draftNote}
        </p>
        <p className="mt-2 text-[11px]" style={{ ...mono, color: t.colors.textFaint }}>
          {c.blocksDone(timer.finished.size, plan.blocks.length)}
        </p>
      </div>
    </section>
  );
}

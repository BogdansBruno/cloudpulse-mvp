'use client';

// Clean Health — home plan: quiet guard banner, one focused timer card with
// a thin progress line, a grouped list like a settings screen.

import type { ReactElement } from 'react';
import { COACH_LABELS, SORENESS_LABELS, type AdpLang } from '../../components/labels';
import type { PlanView } from '../../services/planView';
import { DX } from '../copy';
import { Ring, mmss, useDrillTimer } from '../shared';
import { THEMES, cardStyle, zoneColor } from '../themeStyles';

const t = THEMES.apple;

export default function AICoachPlanWidget({ lang, plan }: { lang: AdpLang; plan: PlanView }): ReactElement {
  const L = COACH_LABELS[lang];
  const Z = SORENESS_LABELS[lang];
  const c = DX[lang].plan;
  const timer = useDrillTimer(plan.blocks);
  const current = plan.blocks[timer.index];
  const roleColor = (r: string) => (r === 'relief' ? t.colors.warn : r === 'prehab' ? t.colors.good : t.colors.info);

  return (
    <section className="p-6" style={cardStyle(t)}>
      <div className="flex items-center gap-3 p-3" style={{ background: `${t.colors.good}12`, borderRadius: t.radius.inner }}>
        <svg width="28" height="28" viewBox="0 0 24 24" className="shrink-0" aria-hidden>
          <path d="M12 2.5 4 5.5v6c0 5 3.4 8.9 8 10 4.6-1.1 8-5 8-10v-6l-8-3Z" fill={t.colors.good} fillOpacity={0.16} stroke={t.colors.good} strokeWidth={1.6} />
          <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke={t.colors.good} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="min-w-0">
          <p className="text-[15px] font-semibold">{c.guard}</p>
          <p className="text-[13px]" style={{ color: t.colors.textMuted }}>
            {L.guardBody(plan.rulesChecked, L.ceiling[plan.engine.ceiling])}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{L.title}</h3>
        <span className="text-[13px]" style={{ color: zoneColor(t, plan.engine.ceiling) }}>
          {L.modes[plan.mode]}
        </span>
      </div>
      <p className="text-[15px]" style={{ color: t.colors.textMuted }}>
        {L.total(plan.totalMinutes, plan.limits.maxRpe)}
      </p>

      {current && (
        <div className="mt-5 flex items-center gap-5 p-5" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner }}>
          <Ring value={timer.total - timer.left} max={Math.max(1, timer.total)} size={104} stroke={8} color={roleColor(current.role)} track="#E6E9EE">
            <span className="text-[22px] font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {mmss(timer.left)}
            </span>
          </Ring>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium" style={{ color: roleColor(current.role) }}>
              {c.now} · {L.roles[current.role]}
            </p>
            <p className="mt-0.5 text-[17px] font-semibold leading-snug">{current.drills.map((d) => d.name).join(' + ')}</p>
            <p className="mt-0.5 text-[13px]" style={{ color: t.colors.textMuted }}>
              {current.drills.map((d) => L.dose(d.dose, d.perSide)).join(' · ')}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: t.colors.textFaint }}>
              {current.drills[0]?.cue}
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={timer.toggle} className="px-5 py-2 text-[15px] font-semibold" style={{ background: t.colors.accent, color: t.colors.onAccent, borderRadius: t.radius.pill }}>
                {timer.running ? c.pause : timer.left < timer.total ? c.resume : c.start}
              </button>
              <button type="button" onClick={timer.next} className="px-4 py-2 text-[15px] font-medium" style={{ background: '#FFFFFF', color: t.colors.text, borderRadius: t.radius.pill, boxShadow: '0 1px 3px rgba(15,23,42,0.10)' }}>
                {c.next}
              </button>
            </div>
          </div>
        </div>
      )}

      <ul className="mt-5 overflow-hidden" style={{ background: t.colors.surfaceAlt, borderRadius: t.radius.inner }}>
        {plan.blocks.map((b, i) => {
          const done = timer.finished.has(i);
          const on = i === timer.index;
          return (
            <li key={i} style={{ borderTop: i ? `1px solid ${t.colors.border}` : undefined }}>
              <button type="button" onClick={() => timer.select(i)} className="flex w-full items-center gap-3 px-4 py-3 text-left" style={{ background: on ? '#FFFFFF' : 'transparent' }}>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold"
                  style={{ background: done ? t.colors.good : `${roleColor(b.role)}1F`, color: done ? '#FFFFFF' : roleColor(b.role) }}
                >
                  {done ? '✓' : i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px]" style={{ color: done ? t.colors.textFaint : t.colors.text }}>
                    {b.drills.map((d) => d.name).join(' + ')}
                  </span>
                  <span className="block text-[12px]" style={{ color: t.colors.textFaint }}>
                    {L.roles[b.role]}
                    {b.targetZone && b.role === 'relief' ? ` · ${Z.zones[b.targetZone]}` : ''}
                  </span>
                </span>
                <span className="shrink-0 text-[13px]" style={{ color: t.colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {b.minutes} {L.min}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-5 text-[15px] leading-relaxed">{plan.explanation}</p>
      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: t.colors.textMuted }}>
        {plan.stopRule}
      </p>
      <p className="mt-1 text-[12px]" style={{ color: t.colors.textFaint }}>
        {L.draftNote}
      </p>
      <div className="mt-3 flex items-center justify-between text-[13px]" style={{ color: t.colors.textFaint }}>
        <span>{c.blocksDone(timer.finished.size, plan.blocks.length)}</span>
        <button type="button" onClick={timer.reset} style={{ color: t.colors.info }}>
          {c.reset}
        </button>
      </div>
    </section>
  );
}

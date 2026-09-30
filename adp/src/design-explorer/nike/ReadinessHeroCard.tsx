'use client';

// Gen-Z Energy — readiness hero: a hot gradient slab with a giant italic
// score, chunky factor pills, a burning check-in streak and badges.
// The streak counts CHECK-INS (honesty), never training days without rest.

import type { ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import { DX } from '../copy';
import { DEMO_STREAK, acwrState, type DemoReadiness } from '../demoData';
import { THEMES, cardStyle, zoneColor } from '../themeStyles';

const t = THEMES.nike;

export function Flame({ size = 44 }: { size?: number }): ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="dx-flame shrink-0" aria-hidden>
      <defs>
        <linearGradient id="dxFlameOuter" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF2BD6" />
          <stop offset="55%" stopColor="#FF6A13" />
          <stop offset="100%" stopColor="#FFE600" />
        </linearGradient>
      </defs>
      <path
        d="M24 3c2 7 9 11 11 19 2 7-2 16-11 20C15 38 11 30 13 23c1-5 5-8 5-13 3 3 4 6 4 9 3-5 3-11 2-16z"
        fill="url(#dxFlameOuter)"
        stroke="#000"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path className="dx-flame-core" d="M24 22c2 4 6 6 6 11 0 5-3 8-6 8s-7-3-6-8c1-3 3-5 3-8 2 1 3 3 3 5 1-2 1-5 0-8z" fill="#FFF3B0" />
    </svg>
  );
}

export default function ReadinessHeroCard({ lang, data }: { lang: AdpLang; data: DemoReadiness }): ReactElement {
  const c = DX[lang].readiness;
  const g = DX[lang].gamified;
  const acwr = acwrState(data.acwr);
  const display = { fontFamily: t.font.display, fontStyle: 'italic' as const, fontWeight: 900, textTransform: 'uppercase' as const };
  const scaleColor = (v: number) => (v <= 2 ? t.colors.bad : v <= 4 ? t.colors.warn : t.colors.good);

  const pills = [
    { label: c.acwr, value: data.acwr.toFixed(2), note: c.acwrState[acwr], color: acwr === 'ok' ? t.colors.good : acwr === 'spike' ? t.colors.bad : t.colors.warn },
    { label: c.hooper, value: `${data.hooper}`, note: '/28', color: data.hooper > 16 ? t.colors.bad : data.hooper > 12 ? t.colors.warn : t.colors.good },
    { label: c.sleep, value: c.scale7(data.sleep), note: '', color: scaleColor(data.sleep) },
    { label: c.stress, value: c.scale7(data.stress), note: '', color: scaleColor(data.stress) },
  ];

  const badges = [
    { key: 'week', label: g.badges.week, have: Math.min(DEMO_STREAK.days, DEMO_STREAK.weekGoal), need: DEMO_STREAK.weekGoal, bg: t.gradients.hero },
    { key: 'month', label: g.badges.month, have: DEMO_STREAK.days, need: DEMO_STREAK.monthGoal, bg: t.gradients.accent },
    { key: 'honest', label: g.badges.honest, have: 1, need: 1, bg: t.gradients.cool },
  ];

  return (
    <section className="space-y-4" style={{ fontFamily: t.font.body, color: t.colors.text }}>
      {/* Score slab */}
      <div className="relative overflow-hidden p-5" style={{ background: t.gradients.hero, border: `${t.borderWidth}px solid #000`, borderRadius: t.radius.card, boxShadow: t.shadow.card, color: '#120A2A' }}>
        <div className="flex items-start justify-between">
          <p className="text-sm tracking-tight" style={display}>
            {c.title}
          </p>
          <span className="px-2.5 py-1 text-[11px] tracking-tight" style={{ ...display, background: '#120A2A', color: zoneColor(t, data.zone), borderRadius: t.radius.pill }}>
            {c.zone[data.zone]}
          </span>
        </div>
        <p className="mt-1 leading-[0.8] tracking-[-0.06em]" style={{ ...display, fontSize: 132 }}>
          {data.score}
        </p>
        <p className="mt-2 text-[15px] font-bold">{c.zoneHint[data.zone]}</p>
        {/* Week as chunky blocks */}
        <div className="mt-4 flex items-end gap-1.5" aria-hidden>
          {data.week.map((d, i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                height: 8 + d.score * 0.4,
                background: i === data.week.length - 1 ? '#120A2A' : 'rgba(18,10,42,0.28)',
                border: '2px solid #120A2A',
                borderRadius: 6,
              }}
            />
          ))}
        </div>
      </div>

      {/* Factor pills */}
      <div className="grid grid-cols-2 gap-3">
        {pills.map((p) => (
          <div key={p.label} className="p-3" style={{ ...cardStyle(t), boxShadow: t.shadow.raised, borderRadius: t.radius.inner }}>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: t.colors.textMuted }}>
              {p.label}
            </p>
            <p className="mt-1 text-[28px] leading-none tracking-tight" style={{ ...display, color: p.color }}>
              {p.value}
              {p.note && (
                <span className="ml-1 text-xs not-italic" style={{ color: t.colors.textFaint }}>
                  {p.note}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Minus points as stickers */}
      <div className="flex flex-wrap gap-2">
        {data.penalties.map((p, i) => (
          <span
            key={p.code}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold"
            style={{ background: t.colors.surfaceAlt, border: '2px solid #000', borderRadius: t.radius.pill, boxShadow: t.shadow.raised, transform: `rotate(${i % 2 ? 1.2 : -1.2}deg)` }}
          >
            <span style={{ ...display, color: t.colors.bad }}>−{p.points}</span>
            {c.penalties[p.code]}
          </span>
        ))}
      </div>

      {/* Streak */}
      <div className="flex items-center gap-4 p-4" style={{ ...cardStyle(t), background: t.gradients.accent }}>
        <Flame size={56} />
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {g.streak}
          </p>
          <p className="text-[40px] leading-none tracking-tight" style={display}>
            {DEMO_STREAK.days}
          </p>
          <p className="text-xs font-bold">{g.streakDays(DEMO_STREAK.days)}</p>
        </div>
      </div>

      {/* Badges */}
      <div>
        <p className="mb-2 text-sm tracking-tight" style={display}>
          {g.badgesTitle}
        </p>
        <div className="grid grid-cols-3 gap-3">
          {badges.map((b) => {
            const earned = b.have >= b.need;
            return (
              <div key={b.key} className="flex flex-col items-center text-center">
                <div
                  className="dx-pop flex h-16 w-16 items-center justify-center"
                  style={{
                    background: earned ? b.bg : t.colors.surfaceAlt,
                    border: '2px solid #000',
                    borderRadius: 18,
                    boxShadow: t.shadow.raised,
                    transform: 'rotate(-6deg)',
                    opacity: earned ? 1 : 0.7,
                  }}
                >
                  <span className="text-lg tracking-tight" style={{ ...display, color: earned ? '#120A2A' : t.colors.textMuted, transform: 'rotate(6deg)' }}>
                    {earned ? '★' : g.progress(b.have, b.need)}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-bold leading-tight">{b.label}</p>
                <p className="text-[10px]" style={{ color: earned ? t.colors.good : t.colors.textFaint }}>
                  {earned ? g.earned : g.progress(b.have, b.need)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[11px]" style={{ color: t.colors.textFaint }}>
        {c.byCode}
      </p>
    </section>
  );
}

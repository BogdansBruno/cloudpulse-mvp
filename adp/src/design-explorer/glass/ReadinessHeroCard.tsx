'use client';

// Liquid Glass — readiness hero: a hairline glowing ring that breathes, a
// thin large number, glass tiles for the factors and a light sparkline for
// the week. Numbers stay high-contrast white; colour only marks the state.

import { useId, type ReactElement } from 'react';
import type { AdpLang } from '../../components/labels';
import LiquidGlassCard from '../../components/ui/LiquidGlassCard';
import { DX } from '../copy';
import { acwrState, type DemoReadiness } from '../demoData';
import { THEMES, zoneColor } from '../themeStyles';
import { GlassPill, GlowRing, Label, WELL } from './ui';

const t = THEMES.glass;

function Sparkline({ week }: { week: DemoReadiness['week'] }): ReactElement {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = 300;
  const H = 56;
  const pad = 6;
  const min = Math.min(...week.map((d) => d.score)) - 8;
  const max = Math.max(...week.map((d) => d.score)) + 4;
  const x = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, week.length - 1);
  const y = (v: number) => H - pad - ((v - min) / Math.max(1, max - min)) * (H - pad * 2);
  const line = week.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(d.score).toFixed(1)}`).join(' ');
  const last = week[week.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden>
      <defs>
        <linearGradient id={`sp${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#67E8F9" />
        </linearGradient>
        <linearGradient id={`spf${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#67E8F9" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#67E8F9" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${x(week.length - 1)} ${H} L${x(0)} ${H} Z`} fill={`url(#spf${uid})`} />
      <path d={line} fill="none" stroke={`url(#sp${uid})`} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {week.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.score)} r={i === week.length - 1 ? 3.6 : 2} fill={zoneColor(t, d.zone)} opacity={i === week.length - 1 ? 1 : 0.7} />
      ))}
      {last && <circle cx={x(week.length - 1)} cy={y(last.score)} r={8} fill={zoneColor(t, last.zone)} opacity={0.18} />}
    </svg>
  );
}

export default function ReadinessHeroCard({ lang, data }: { lang: AdpLang; data: DemoReadiness }): ReactElement {
  const c = DX[lang].readiness;
  const zc = zoneColor(t, data.zone);
  const acwr = acwrState(data.acwr);
  const scaleColor = (v: number) => (v <= 2 ? t.colors.bad : v <= 4 ? t.colors.warn : t.colors.good);

  const tiles = [
    { label: c.acwr, value: data.acwr.toFixed(2), sub: c.acwrState[acwr], color: acwr === 'ok' ? t.colors.good : acwr === 'spike' ? t.colors.bad : t.colors.warn, p: Math.min(data.acwr, 2) / 2 },
    { label: c.hooper, value: String(data.hooper), sub: '/ 28', color: data.hooper > 16 ? t.colors.bad : data.hooper > 12 ? t.colors.warn : t.colors.good, p: data.hooper / 28 },
    { label: c.sleep, value: c.scale7(data.sleep), sub: '', color: scaleColor(data.sleep), p: data.sleep / 7 },
    { label: c.stress, value: c.scale7(data.stress), sub: '', color: scaleColor(data.stress), p: data.stress / 7 },
  ];

  return (
    <LiquidGlassCard className="p-6">

      <header className="flex items-center justify-between">
        <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{c.title}</h3>
        <span className="text-[13px] font-light" style={{ color: t.colors.textMuted }}>
          {c.today}
        </span>
      </header>

      <div className="mt-6 flex flex-col items-center">
        <GlowRing value={data.score} size={t.ring.size} stroke={t.ring.stroke} color={zc}>
          <span className="text-[68px] font-extralight leading-none tracking-[-0.04em]" style={{ fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 18px rgba(0,0,0,0.35)' }}>
            {data.score}
          </span>
          <span className="mt-1.5 text-[12px] font-light tracking-[0.08em]" style={{ color: t.colors.textMuted }}>
            / 100
          </span>
        </GlowRing>
        <div className="mt-5">
          <GlassPill color={zc} strong>
            {c.zone[data.zone]}
          </GlassPill>
        </div>
        <p className="mt-2 text-[15px] font-medium">{c.zoneHint[data.zone]}</p>
      </div>

      <Label className="mt-7">{c.factorsTitle}</Label>
      <div className="mt-2.5 grid grid-cols-2 gap-2.5">
        {tiles.map((f) => (
          <div key={f.label} className="p-3.5" style={WELL}>
            <p className="truncate text-[12px] font-light" style={{ color: t.colors.textMuted }}>
              {f.label}
            </p>
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[26px] font-semibold leading-none tracking-[-0.02em]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {f.value}
              </span>
              {f.sub && (
                <span className="truncate text-[12px] font-light" style={{ color: t.colors.textMuted }}>
                  {f.sub}
                </span>
              )}
            </p>
            <div className="mt-2.5 h-[3px] overflow-hidden rounded-full" style={{ background: t.colors.track }}>
              <div className="h-full rounded-full" style={{ width: `${Math.round(f.p * 100)}%`, background: f.color, boxShadow: `0 0 10px ${f.color}` }} />
            </div>
          </div>
        ))}
      </div>

      <Label className="mt-6">{c.penaltiesTitle}</Label>
      <ul className="mt-2.5 space-y-2">
        {data.penalties.map((p) => (
          <li key={p.code} className="flex items-center justify-between gap-3 text-[14px]">
            <span className="min-w-0">{c.penalties[p.code]}</span>
            <GlassPill color={t.colors.bad}>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>−{p.points}</span>
            </GlassPill>
          </li>
        ))}
      </ul>

      <div className="mt-6 p-3" style={WELL}>
        <Sparkline week={data.week} />
      </div>
      <p className="mt-3 text-[12px] font-light" style={{ color: t.colors.textFaint }}>
        {c.byCode}
      </p>
    </LiquidGlassCard>
  );
}

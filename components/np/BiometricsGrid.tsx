'use client';

// components/np/BiometricsGrid.tsx — HRV, resting HR, SpO2, skin temperature,
// respiratory rate. Each tile: status pill, value, a 14-day sparkline over the
// athlete's own normal range (shaded band) and today as a glowing dot placed
// exactly at today's value — inside or outside the band.
// ADP has no wearable source yet: without `items` the grid shows an honest
// empty state; demo values must be passed with `demo`.

import type { ReactElement } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import { LOCALE, NP, type BioKey, type BioStatus } from './copy';
import { Icon, type IconName } from './icons';
import { DemoTag, Overline } from './ui';

export type Biometric = {
  k: BioKey;
  /** Today. Equals the last point of `hist`. */
  value: number;
  /** Personal normal range (14 days). */
  lo: number;
  hi: number;
  /** Last 14 days, oldest → today. */
  hist: number[];
  dp: number;
  /** Show + / − (skin temperature deviation). */
  signed?: boolean;
};

const ICON: Record<BioKey, IconName> = { hrv: 'pulse', rhr: 'heart', spo2: 'drop', temp: 'thermo', resp: 'wind' };
const STATUS: Record<BioStatus, { pill: string; dot: string; glow: string }> = {
  good: { pill: 'np-pill-good', dot: '#00E676', glow: 'rgb(0 230 118 / 0.9)' },
  warn: { pill: 'np-pill-warn', dot: '#FFD600', glow: 'rgb(255 214 0 / 0.9)' },
  bad: { pill: 'np-pill-danger', dot: '#FF3D00', glow: 'rgb(255 61 0 / 0.9)' },
};
// mobile: 2 columns, HRV spans both; ≥640px: 6 columns → 3 + 3 / 2 + 2 + 2
const SPAN = ['col-span-2 sm:col-span-3', 'sm:col-span-3', 'sm:col-span-2', 'sm:col-span-2', 'sm:col-span-2'];

export function bioStatus(m: Pick<Biometric, 'value' | 'lo' | 'hi'>): BioStatus {
  if (m.value >= m.lo && m.value <= m.hi) return 'good';
  const pad = (m.hi - m.lo) * 0.1;
  return m.value >= m.lo - pad && m.value <= m.hi + pad ? 'warn' : 'bad';
}

function format(lang: Lang, v: number, dp: number, withSign = false): string {
  const s = new Intl.NumberFormat(LOCALE[lang], { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(Math.abs(v));
  if (!withSign) return v < 0 ? `−${s}` : s;
  return (v > 0 ? '+' : v < 0 ? '−' : '') + s;
}

function Spark({ m, status, tall }: { m: Biometric; status: BioStatus; tall: boolean }): ReactElement {
  const H = 32;
  const all = [...m.hist, m.lo, m.hi];
  const lo = Math.min(...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.18 || 1;
  const y = (v: number) => H - 2 - ((v - (lo - pad)) / (hi + pad - (lo - pad))) * (H - 4);
  const x = (i: number) => (m.hist.length > 1 ? (i / (m.hist.length - 1)) * 100 : 100);
  const d = m.hist.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join('');
  const S = STATUS[status];
  return (
    <span className={`relative mt-3 block ${tall ? 'h-12' : 'h-9'}`} aria-hidden>
      <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none">
        <rect x="0" y={y(m.hi)} width="100" height={y(m.lo) - y(m.hi)} fill="rgb(0 230 118 / 0.09)" />
        <line x1="0" x2="100" y1={y(m.hi)} y2={y(m.hi)} stroke="rgb(0 230 118 / 0.25)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <line x1="0" x2="100" y1={y(m.lo)} y2={y(m.lo)} stroke="rgb(0 230 118 / 0.25)" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        <path d={d} stroke="#A3A9B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-np-surface"
        style={{ left: '100%', top: `${((y(m.value) / H) * 100).toFixed(1)}%`, background: S.dot, boxShadow: `0 0 10px ${S.glow}` }}
      />
    </span>
  );
}

export default function BiometricsGrid({ lang, items, demo = false, compact = false }: { lang: Lang; items: Biometric[] | null; demo?: boolean; compact?: boolean }): ReactElement {
  const t = NP[lang];
  const statuses = items?.map(bioStatus) ?? [];
  const good = statuses.filter((s) => s === 'good').length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-np-text" aria-hidden>
            <Icon name="watch" size={16} />
          </span>
          <Overline>{t.bio.title}</Overline>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items && (
            <span className={`np-pill ${good === items.length ? 'np-pill-good' : 'np-pill-warn'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${good === items.length ? 'bg-np-good' : 'bg-np-warn'}`} aria-hidden />
              {t.bio.badge(good, items.length)}
            </span>
          )}
          {items && demo && <DemoTag>{t.demoWearable}</DemoTag>}
        </div>
      </div>

      {items ? (
        <>
          <p className="mt-1.5 text-xs text-np-text-3">{t.bio.note}</p>
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6 sm:gap-3">
            {items.map((m, i) => {
              const s = statuses[i];
              const big = i === 0 && !compact;
              return (
                <li key={m.k} className={`np-enter flex min-w-0 flex-col rounded-np-ctrl border border-np-line bg-np-surface-2/40 p-3.5 sm:p-4 ${compact ? 'sm:col-span-3' : SPAN[i]}`} style={{ ['--np-i' as string]: i }}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-np-text" aria-hidden>
                      <Icon name={ICON[m.k]} size={16} />
                    </span>
                    <span className={`np-pill ${STATUS[s].pill} min-w-0 px-2`}>
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS[s].dot }} aria-hidden />
                      <span className="truncate">{t.bio.status[s]}</span>
                    </span>
                  </span>
                  <span className="mt-3 truncate text-xs font-medium text-np-text-2">{t.bio.names[m.k]}</span>
                  <span className="mt-1.5 flex items-baseline gap-1">
                    <span className={`np-num ${big ? 'text-4xl' : 'text-[28px]'}`}>{format(lang, m.value, m.dp, m.signed)}</span>
                    <span className="text-xs text-np-text-3">{t.bio.units[m.k]}</span>
                  </span>
                  <Spark m={m} status={s} tall={big} />
                  <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-np-text-3">
                    <span className="truncate">
                      {t.bio.norm} {format(lang, m.lo, m.dp, m.signed)}…{format(lang, m.hi, m.dp, m.signed)}
                    </span>
                    <span className="shrink-0 max-sm:hidden">{t.bio.days14}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="mt-3 rounded-np-ctrl border border-dashed border-np-line-strong px-4 py-4 text-xs leading-5 text-np-text-3">{t.bio.empty}</p>
      )}
    </div>
  );
}

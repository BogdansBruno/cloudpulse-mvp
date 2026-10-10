'use client';

// /my-health — "My Health": long-term trends (Lotus, step 8). Third tab of the dock.
//
//   period toggle   30 Days · 90 Days · 1 Year
//   hero            Lotus Health Score ring + cardio age        (demo accounts)
//                   Average Readiness ring + check-in count     (everyone else, from the engine)
//   trend charts    HRV Baseline + Resting HR Trend             (demo accounts, wearable values)
//                   Readiness Baseline + Training Load Trend    (everyone else, real engine data)
//   2×2 grid        VO2 Max · Recovery Rate · Training Consistency · Stress Balance
//   insight         Lotus Monthly Insight
//
// Lotus has no wearable source yet. Cardio age, VO2 Max, HRV, resting HR and the "top 10 %" claim
// need one, so only the jury demo accounts see them (components/np/demo.ts), always tagged
// "Demo · needs a wearable". Real athletes see numbers computed from their own check-ins and
// sessions (GET /api/checkin, at most 90 days) and one honest empty card for the wearable part.
// Every badge and sentence is computed from the numbers on the screen; nothing is estimated.

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { loadIndex, usualDailyLoad } from '@/lib/load-index';
import { APP } from '@/components/np/appCopy';
import { LOCALE } from '@/components/np/copy';
import { HOME } from '@/components/np/homeCopy';
import { HEALTH, type HealthRange } from '@/components/np/healthCopy';
import { Icon } from '@/components/np/icons';
import AreaTrend, { type AreaPoint } from '@/components/np/AreaTrend';
import { makeExplain, type Metric } from '@/components/np/chartInsight';
import { ScoreRing } from '@/components/np/ScoreRing';
import { CARD_THEME, cardClass, type CardTheme } from '@/components/np/cardTheme';
import { DEMO_HEALTH, demoSeries } from '@/components/np/demo';
import { acwrBand } from '@/components/np/Telemetry';
import { LT, STATUS_GRADIENT, STATUS_HEX, chipStyle, loadStatus, scoreStatus, type Status } from '@/components/np/status';
import { useHistory } from '@/components/np/useHistory';
import { InfoButton, type InfoBaseline } from '@/components/np/InfoSheet';
import CompareBars from '@/components/np/CompareBars';
import { CalibrationBanner } from '@/components/np/DayStatus';
import { INFO } from '@/components/np/infoCopy';
import { useAccount, useIsDemo } from '@/components/np/useAccount';
import { useMode } from '@/components/np/useMode';
import { MODE } from '@/components/np/modeCopy';
import { CheckinBanner } from '@/components/np/CheckinPowered';

const RANGES: HealthRange[] = ['d30', 'd90', 'y1'];
const DAYS: Record<HealthRange, number> = { d30: 30, d90: 90, y1: 365 };
/** Lotus keeps 90 days of engine history for now (GET /api/checkin cap). */
const HISTORY_DAYS = 90;
/** positive trends (mint teal); in-range / high values use LT.optimal (sky blue) */
const MINT = LT.good;

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const nums = (xs: (number | null)[]): number[] => xs.filter((v): v is number => v !== null);

function quartiles(xs: number[]): { lo: number; hi: number } | null {
  if (xs.length < 5) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (p: number) => {
    const pos = (s.length - 1) * p;
    const a = Math.floor(pos);
    const b = Math.ceil(pos);
    return s[a] + (s[b] - s[a]) * (pos - a);
  };
  return { lo: Math.round(q(0.25)), hi: Math.round(q(0.75)) };
}

const iso = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function lastDates(n: number): string[] {
  const t = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(t);
    d.setDate(t.getDate() - (n - 1 - i));
    return iso(d);
  });
}

type Series = { dates: string[]; ends: string[]; values: (number | null)[] };

/** Mean of `size` consecutive days, aligned to today so the newest bucket is full. size 1 = daily. */
function bucketSeries(dates: string[], values: (number | null)[], size: number): Series {
  if (size <= 1) return { dates, ends: dates, values };
  const od: string[] = [];
  const oe: string[] = [];
  const ov: (number | null)[] = [];
  for (let end = values.length; end > 0; end -= size) {
    const from = Math.max(0, end - size);
    od.unshift(dates[from]);
    oe.unshift(dates[end - 1]);
    ov.unshift(mean(nums(values.slice(from, end))));
  }
  return { dates: od, ends: oe, values: ov };
}

/** Chart points with x ticks: day of month every 5 days for a month; month names for longer ranges. */
function toPoints(s: Series, locale: string, yearly: boolean): AreaPoint[] {
  const day = (iso8: string) => new Date(`${iso8}T12:00:00`);
  const short = (iso8: string) => day(iso8).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const n = s.dates.length;
  const monthly = n > 31;
  const monthStarts: number[] = [];
  if (monthly) for (let i = 1; i < n; i++) if (day(s.dates[i]).getMonth() !== day(s.dates[i - 1]).getMonth()) monthStarts.push(i);
  const shown = new Set<number>();
  if (monthly) {
    (yearly ? monthStarts.filter((_, k) => k % 2 === 0) : monthStarts).forEach((i) => shown.add(i));
    if (!monthStarts.length || monthStarts[0] > 5) shown.add(0);
  }
  return s.dates.map((d, i) => ({
    label: s.dates[i] === s.ends[i] ? short(d) : `${short(d)} – ${short(s.ends[i])}`,
    value: s.values[i],
    tick: monthly ? (shown.has(i) ? day(d).toLocaleDateString(locale, { month: 'short' }) : undefined) : (n - 1 - i) % 5 === 0 ? String(day(d).getDate()) : undefined,
  }));
}

function statusColor(s: Status): string {
  return STATUS_HEX[s];
}

function Pill({ color, children }: { color: string; children: ReactNode }): ReactElement {
  return (
    <span className="inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium leading-4" style={chipStyle(color)}>
      {children}
    </span>
  );
}

function ChartCard({
  title,
  sub,
  value,
  unit,
  badge,
  subline,
  children,
  foot,
  theme,
  info,
}: {
  title: string;
  sub: string;
  value: string;
  unit?: string;
  badge?: { text: string; color: string } | null;
  subline?: string;
  children: ReactNode;
  foot?: string;
  theme: CardTheme;
  info?: ReactNode;
}): ReactElement {
  return (
    <section className={`np-enter mt-4 p-5 ${cardClass(theme)}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="np-editorial text-[22px] leading-tight text-white">{title}</h2>
        {info}
      </div>
      <p className="mt-0.5 text-[13px] text-np-text-3">{sub}</p>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <div>
          <p className="flex items-baseline gap-1.5">
            <span className="text-4xl font-light leading-none tracking-tight text-white">{value}</span>
            {unit && <span className="text-sm text-np-text-3">{unit}</span>}
          </p>
          {subline && <p className="mt-1.5 font-mono text-[11px] text-np-text-3">{subline}</p>}
        </div>
        {badge && <Pill color={badge.color}>{badge.text}</Pill>}
      </div>
      <div className="mt-3">{children}</div>
      {foot && <p className="mt-2 text-center font-mono text-[11px] text-np-text-3">{foot}</p>}
    </section>
  );
}

function Tile({
  name,
  value,
  unit,
  badge,
  caption,
  small,
  theme,
  info,
  children,
}: {
  name: string;
  value: string;
  unit?: string;
  badge?: { text: string; color: string } | null;
  caption?: string;
  /** the value is a word, not a number */
  small?: boolean;
  theme: CardTheme;
  info?: ReactNode;
  children?: ReactNode;
}): ReactElement {
  return (
    <div className={`flex min-w-0 flex-col p-4 ${cardClass(theme)}`}>
      <div className="flex min-h-[28px] items-start justify-between gap-1">
        <p className="text-[11px] font-medium uppercase leading-[14px] tracking-widest text-white/75">{name}</p>
        {info}
      </div>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-1">
        <span className={`${small ? 'np-editorial text-[22px]' : 'text-[26px] font-semibold'} leading-none tracking-tight text-white`}>{value}</span>
        {unit && <span className="text-[11px] text-np-text-3">{unit}</span>}
      </p>
      <div className="mt-2.5 min-h-[24px]">{badge && <Pill color={badge.color}>{badge.text}</Pill>}</div>
      {children}
      {caption && <p className="mt-auto pt-2 text-[11px] leading-snug text-np-text-3">{caption}</p>}
    </div>
  );
}

export default function MyHealthPage(): ReactElement {
  const { lang } = useLanguage();
  // data to action under the long-range charts (components/np/chartInsight.ts)
  const exp = (pts: AreaPoint[], metric: Metric, band: { lo: number; hi: number } | null | undefined, unit?: string) =>
    makeExplain({ lang, metric, labels: pts.map((p) => p.label), values: pts.map((p) => p.value), band: band ?? null, unit, maxItems: 30 });
  const hc = HOME[lang];
  const c = HEALTH[lang];
  const st = hc.today.status;
  const acwrText = APP[lang].v3.telemetry.acwrBand;
  const locale = lang === 'en' ? 'en-US' : LOCALE[lang];
  const nf = (v: number, dp = 0) => v.toLocaleString(locale, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const signed = (v: number, dp = 0) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${nf(Math.abs(v), dp)}`;

  const [range, setRange] = useState<HealthRange>('d30');
  const isDemo = useIsDemo();
  const { role } = useAccount();
  const { isPro } = useMode(role);
  const mm = MODE[lang];
  const { history, error } = useHistory(HISTORY_DAYS);
  const days = DAYS[range];
  const size = days <= 30 ? 1 : days <= 90 ? 3 : 7;
  const sub = c.trend[range];
  const ratioStatus = (r: number): Status => scoreStatus(r * 100);
  const pctStatus = (p: number): Status => scoreStatus(p);

  // ----- demo wearable trends (jury demo accounts only) -----
  const demo = useMemo(() => {
    const dates = lastDates(days);
    const hrv = toPoints(bucketSeries(dates, demoSeries('hrv', days), size), locale, range === 'y1');
    const rhr = toPoints(bucketSeries(dates, demoSeries('rhr', days), size), locale, range === 'y1');
    const m30 = demoSeries('rhr', 30);
    const rhrDelta = Math.round(DEMO_HEALTH.rhrNow - (mean(m30) ?? DEMO_HEALTH.rhrNow));
    const slope = mean(m30.slice(-7))! - mean(m30.slice(0, 7))!;
    return { hrv, rhr, rhrDelta, trend: slope < -1 ? ('down' as const) : slope > 1 ? ('up' as const) : ('steady' as const) };
  }, [days, size, range, locale]);

  // ----- real engine data (everyone) -----
  const real = useMemo(() => {
    if (!history || history.length === 0) return null;
    const eff = Math.min(days, history.length);
    const cur = history.slice(-eff);
    const prev = history.length >= eff * 2 ? history.slice(-eff * 2, -eff) : [];
    const checked = cur.filter((p) => p.hasCheckin);
    const scores = checked.map((p) => p.score);
    const prevScores = prev.filter((p) => p.hasCheckin).map((p) => p.score);
    const avg = mean(scores);
    const prevAvg = prevScores.length >= 3 ? mean(prevScores) : null;
    const greens = checked.filter((p) => p.zone === 'green').length;
    const idx = cur.map((p) => loadIndex(p.dailyLoad ?? null, usualDailyLoad(p.chronicLoad)));
    const dates = cur.map((p) => p.date);
    const rsize = eff <= 30 ? 1 : 3;
    const lastAcwr = [...history].reverse().find((p) => p.acwr !== null)?.acwr ?? null;
    // 30- and 60-day averages for the comparison bars and the (i) sheets, only with >= 5 real values
    type Pt = (typeof history)[number];
    const avgN = (fn: (p: Pt) => number | null, n: number) => {
      const xs = nums(history.slice(-n).map(fn));
      return xs.length >= 5 ? mean(xs) : null;
    };
    const rdyFn = (p: Pt) => (p.hasCheckin ? p.score : null);
    const ldFn = (p: Pt) => loadIndex(p.dailyLoad ?? null, usualDailyLoad(p.chronicLoad));
    return {
      cmp: { r30: avgN(rdyFn, 30), r60: avgN(rdyFn, 60), l30: avgN(ldFn, 30), l60: avgN(ldFn, 60) },
      eff,
      checked: checked.length,
      avg: avg === null ? null : Math.round(avg),
      delta: avg !== null && prevAvg !== null ? Math.round(avg - prevAvg) : null,
      greens,
      recoveryPct: checked.length ? Math.round((greens / checked.length) * 100) : null,
      readiness: toPoints(bucketSeries(dates, cur.map((p) => (p.hasCheckin ? p.score : null)), rsize), locale, false),
      usual: quartiles(scores),
      load: toPoints(bucketSeries(dates, idx, rsize), locale, false),
      loadAvg: mean(nums(idx)),
      loadN: nums(idx).length,
      acwr: lastAcwr,
    };
  }, [history, days, locale]);

  // ----- (i) sheets: baselines come only from the athlete's own days (or the labelled demo series) -----
  const m0 = (xs: number[]) => String(Math.round(mean(xs) ?? 0));
  const hrv60 = useMemo(() => demoSeries('hrv', 60), []);
  const rhr60 = useMemo(() => demoSeries('rhr', 60), []);
  const rd = (v: number | null | undefined): string | null => (v == null ? null : String(Math.round(v)));
  const baseHrv: InfoBaseline = { usual: `${DEMO_HEALTH.hrv.lo} – ${DEMO_HEALTH.hrv.hi}`, now: String(DEMO_HEALTH.hrv.now), avg30: m0(hrv60.slice(-30)), avg60: m0(hrv60) };
  const baseRhr: InfoBaseline = { usual: '48 – 58', now: String(DEMO_HEALTH.rhrNow), avg30: m0(rhr60.slice(-30)), avg60: m0(rhr60) };
  const baseReady: InfoBaseline = { usual: real?.usual ? `${real.usual.lo} – ${real.usual.hi}` : null, avg30: rd(real?.cmp.r30), avg60: rd(real?.cmp.r60) };
  const baseLoad: InfoBaseline = { usual: '41 – 75', avg30: rd(real?.cmp.l30), avg60: rd(real?.cmp.l60) };
  const infoFor = (k: Parameters<typeof InfoButton>[0]['k'], accent: string, baseline?: InfoBaseline, insight?: string | null) => <InfoButton k={k} accent={accent} baseline={baseline} insight={insight} />;

  // ----- hero -----
  const heroTitle = isDemo ? c.hero.demoTitle : c.hero.realTitle;
  const heroValue = isDemo ? DEMO_HEALTH.score : real?.avg ?? null;
  // ring colour on the Lotus score scale (85 / 70 / 60)
  const heroStatus: Status = heroValue !== null ? scoreStatus(heroValue) : 'optimal';
  const heroColors = STATUS_GRADIENT[heroStatus];
  const heroGlow = heroColors[1];

  const hero = (
    <section aria-labelledby="mh-hero-t" className={`np-enter relative mt-5 overflow-hidden p-6 ${cardClass('readiness')}`}>
      <span aria-hidden className="pointer-events-none absolute -left-16 -top-12 h-52 w-52 rounded-full bg-[#8E8CFF]/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -right-10 h-60 w-60 rounded-full blur-3xl" style={{ backgroundColor: `${heroGlow}33` }} />
      <InfoButton
        k="health"
        accent={heroColors[1]}
        className="absolute right-4 top-4 z-10"
        baseline={isDemo ? { now: String(DEMO_HEALTH.score) } : { now: heroValue !== null ? String(heroValue) : null, avg30: rd(real?.cmp.r30), avg60: rd(real?.cmp.r60) }}
      />
      <div className="relative flex flex-col items-center text-center">
        <h2 id="mh-hero-t" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-np-text-3">
          {heroTitle}
        </h2>
        {isDemo && <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-np-text-3">{hc.today.heart.demoTag}</p>}
        <div className="mt-4">
          <ScoreRing value={heroValue} unit="/ 100" colors={heroColors} size={156} label={c.hero.ring(heroValue)} valueClassName="font-mono text-5xl font-bold tracking-tight" />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {isDemo ? (
            <>
              <Pill color={LT.optimal}>{c.hero.cardioAge(DEMO_HEALTH.cardioAge)}</Pill>
              <Pill color={LT.optimal}>{c.hero.vsCalendar(signed(DEMO_HEALTH.ageDelta))}</Pill>
            </>
          ) : real ? (
            <Pill color={statusColor(ratioStatus(real.checked / real.eff))}>{c.hero.logged(real.checked, real.eff)}</Pill>
          ) : null}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#D1D5DB]">
          {isDemo ? c.hero.top(DEMO_HEALTH.topPct) : real && real.checked > 0 ? c.hero.realSummary(real.greens, real.checked) : error ? c.loadError : real ? c.hero.noData : ''}
        </p>
      </div>
    </section>
  );

  // ----- trend charts -----
  const hrvNow = DEMO_HEALTH.hrv;
  const hrvIn = hrvNow.now >= hrvNow.lo && hrvNow.now <= hrvNow.hi;
  const demoCharts = (
    <>
      <ChartCard
        theme="readiness"
        title={c.hrv.title}
        sub={`${sub} · ${hc.today.heart.demoTag}`}
        value={nf(hrvNow.now)}
        unit={hc.vitals.unit.ms}
        badge={hrvIn ? { text: c.hrv.balanced, color: LT.optimal } : { text: c.hrv.outside, color: STATUS_HEX.attention }}
        foot={c.hrv.band(hrvNow.lo, hrvNow.hi)}
        info={infoFor('hrv', CARD_THEME.readiness.accent, baseHrv)}
      >
        <AreaTrend points={demo.hrv} band={{ lo: hrvNow.lo, hi: hrvNow.hi }} min={46} max={84} color={CARD_THEME.readiness.accent} unit={hc.vitals.unit.ms} label={c.hrv.title} explain={exp(demo.hrv, 'high', { lo: hrvNow.lo, hi: hrvNow.hi }, hc.vitals.unit.ms)} />
      </ChartCard>
      <ChartCard
        theme="sleep"
        title={c.rhr.title}
        sub={`${sub} · ${hc.today.heart.demoTag}`}
        value={nf(DEMO_HEALTH.rhrNow)}
        unit={hc.vitals.unit.bpm}
        subline={c.rhr.vsAvg(signed(demo.rhrDelta))}
        badge={{ text: c.rhr[demo.trend], color: demo.trend === 'down' ? MINT : demo.trend === 'up' ? STATUS_HEX.attention : STATUS_HEX.fair }}
        info={infoFor('heart', CARD_THEME.sleep.accent, baseRhr)}
      >
        <AreaTrend points={demo.rhr} yTicks={[48, 56, 64]} min={44} max={68} color={CARD_THEME.sleep.accent} unit={hc.vitals.unit.bpm} label={c.rhr.title} />
      </ChartCard>
    </>
  );

  const realCharts = real && (
    <>
      <ChartCard
        theme="readiness"
        title={c.ready.title}
        sub={sub}
        value={real.avg !== null ? nf(real.avg) : '—'}
        badge={
          real.avg === null
            ? null
            : real.delta !== null
              ? { text: c.ready.vsPrev(signed(real.delta)), color: real.delta >= 0 ? MINT : STATUS_HEX.attention }
              : { text: st[heroStatus], color: statusColor(heroStatus) }
        }
        foot={real.usual ? c.ready.band(real.usual.lo, real.usual.hi) : undefined}
        info={infoFor('trend', CARD_THEME.readiness.accent, baseReady)}
      >
        {real.checked > 0 ? <AreaTrend points={real.readiness} band={real.usual} yTicks={real.usual ? undefined : [25, 50, 75]} min={0} max={100} color={CARD_THEME.readiness.accent} label={c.ready.title} explain={exp(real.readiness, 'high', real.usual)} /> : <p className="py-6 text-sm text-white/75">{c.ready.noData}</p>}
      </ChartCard>
      <ChartCard
        theme="activity"
        title={c.load.title}
        sub={sub}
        value={real.loadAvg !== null ? nf(real.loadAvg) : '—'}
        subline={c.load.caption}
        badge={real.loadAvg !== null ? { text: st[loadStatus(real.loadAvg)], color: statusColor(loadStatus(real.loadAvg)) } : null}
        foot={c.load.band}
        info={infoFor('load', CARD_THEME.activity.accent, baseLoad)}
      >
        {real.loadN > 0 ? <AreaTrend points={real.load} band={{ lo: 41, hi: 75 }} min={0} max={120} color={CARD_THEME.activity.accent} label={c.load.title} explain={exp(real.load, 'load', { lo: 41, hi: 75 })} /> : <p className="py-6 text-sm text-white/75">{c.load.noData}</p>}
      </ChartCard>
    </>
  );

  // ----- "now against your history": 30-day average, 60-day average and the goal (hatched) -----
  const cmpCopy = INFO[lang].items.compare;
  const cmpBlock = (key: string, title: string, bars: ReactNode) => (
    <div key={key} className="first:mt-0 mt-6">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/70">{title}</p>
      {bars}
    </div>
  );
  const compare = (isDemo || real) && (
    <section className={`np-enter mt-4 p-5 ${cardClass('stress')}`}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="np-editorial text-[22px] leading-tight text-white">{cmpCopy.title}</h2>
        {infoFor('compare', CARD_THEME.stress.accent)}
      </div>
      {isDemo && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-np-text-3">{hc.today.heart.demoTag}</p>}
      <div className="mt-4">
        {isDemo ? (
          <>
            {cmpBlock('hrv', c.hrv.title, <CompareBars avg30={mean(hrv60.slice(-30))} avg60={mean(hrv60)} goalRange={{ lo: DEMO_HEALTH.hrv.lo, hi: DEMO_HEALTH.hrv.hi }} max={100} unit={hc.vitals.unit.ms} color={CARD_THEME.readiness.accent} tags={['heart', 'nerves']} label={c.hrv.title} />)}
            {cmpBlock('rhr', c.rhr.title, <CompareBars avg30={mean(rhr60.slice(-30))} avg60={mean(rhr60)} goalRange={{ lo: 48, hi: 58 }} max={80} unit={hc.vitals.unit.bpm} color={CARD_THEME.sleep.accent} tags={['heart']} label={c.rhr.title} />)}
          </>
        ) : (
          real && (
            <>
              {cmpBlock('ready', c.ready.title, <CompareBars avg30={real.cmp.r30} avg60={real.cmp.r60} goalRange={{ lo: 75, hi: 100 }} max={100} color={CARD_THEME.readiness.accent} tags={['recovery']} label={c.ready.title} />)}
              {cmpBlock('load', c.load.title, <CompareBars avg30={real.cmp.l30} avg60={real.cmp.l60} goalRange={{ lo: 41, hi: 75 }} max={120} color={CARD_THEME.activity.accent} tags={['muscles', 'heart']} label={c.load.title} />)}
            </>
          )
        )}
      </div>
    </section>
  );

  const wearEmpty = (
    <div className="np-enter mt-4 flex gap-3 np-card p-5">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#2FD8F0]">
        <Icon name="watch" size={19} />
      </span>
      <p className="text-sm leading-relaxed text-white/75">{c.wearEmpty}</p>
    </div>
  );

  // ----- 2×2 grid -----
  const segs = c.grid.vo2.scale;
  const vo2Idx = 3; // demo: "High"
  const acwrB = real?.acwr != null ? acwrBand(real.acwr) : null;
  const acwrStatus: Record<'low' | 'sweet' | 'caution' | 'spike', Status> = { low: 'light', sweet: 'optimal', caution: 'fair', spike: 'attention' };
  const [dLogged, dPlanned] = DEMO_HEALTH.consistency[range];

  const grid = (
    <div className="np-enter mt-4 grid grid-cols-2 gap-3">
      {isDemo ? (
        <Tile theme="readiness" name={c.grid.vo2.name} value={nf(DEMO_HEALTH.vo2)} unit={c.grid.vo2.unit} badge={{ text: c.grid.vo2.high, color: LT.optimal }} info={infoFor('vo2', CARD_THEME.readiness.accent, { now: String(DEMO_HEALTH.vo2) })}>
          <div className="mt-1" aria-hidden>
            <div className="flex gap-1">
              {segs.map((s, i) => (
                <span key={s} className="h-1.5 flex-1 rounded-full" style={i === vo2Idx ? { backgroundColor: LT.optimal, boxShadow: `0 0 8px ${LT.optimal}` } : { backgroundColor: LT.neutral, opacity: i < vo2Idx ? 0.3 : 0.1 }} />
              ))}
            </div>
            <p className="mt-1.5 flex justify-between text-[10px] text-np-text-3">
              <span>{segs[0]}</span>
              <span>{segs[4]}</span>
            </p>
          </div>
        </Tile>
      ) : (
        <Tile theme="readiness" name={c.grid.vo2.name} value="—" unit={c.grid.vo2.unit} caption={c.grid.vo2.empty} info={infoFor('vo2', CARD_THEME.readiness.accent)} />
      )}

      {(() => {
        const pct = isDemo ? DEMO_HEALTH.recoveryPct : real?.recoveryPct ?? null;
        return <Tile theme="sleep" name={c.grid.recovery.name} value={pct === null ? '—' : nf(pct)} unit={pct === null ? undefined : '%'} badge={pct === null ? null : { text: st[pctStatus(pct)], color: statusColor(pctStatus(pct)) }} caption={c.grid.recovery.caption} info={infoFor('recovery', CARD_THEME.sleep.accent, pct === null ? undefined : { now: `${pct}%` })} />;
      })()}

      {(() => {
        const a = isDemo ? dLogged : real?.checked ?? null;
        const b = isDemo ? dPlanned : real?.eff ?? null;
        return (
          <Tile
            theme="activity"
            name={c.grid.consistency.name}
            value={a === null || b === null ? '—' : `${nf(a)} / ${nf(b)}`}
            unit={a === null ? undefined : c.grid.consistency.unit}
            badge={a === null || b === null ? null : { text: st[ratioStatus(a / b)], color: statusColor(ratioStatus(a / b)) }}
            caption={c.grid.consistency.caption}
            info={infoFor('consistency', CARD_THEME.activity.accent, a === null || b === null ? undefined : { now: `${a} / ${b}` })}
          />
        );
      })()}

      {isDemo ? (
        <Tile theme="stress" name={c.grid.stress.name} value={c.grid.stress.demoValue} small badge={{ text: st.optimal, color: LT.optimal }} caption={c.grid.stress.demoCaption} info={infoFor('acwr', CARD_THEME.stress.accent)} />
      ) : (
        <Tile
          theme="stress"
          name={c.grid.stress.name}
          value={acwrB ? c.grid.stress.bands[acwrB] : '—'}
          small
          badge={acwrB ? { text: acwrText[acwrB], color: statusColor(acwrStatus[acwrB]) } : null}
          caption={real?.acwr != null ? (isPro ? c.grid.stress.caption(nf(real.acwr, 2)) : mm.load[acwrB as 'low' | 'sweet' | 'caution' | 'spike']) : undefined}
          info={infoFor('acwr', CARD_THEME.stress.accent, real?.acwr != null ? { now: nf(real.acwr, 2) } : undefined)}
        />
      )}
    </div>
  );

  // ----- insight -----
  const PERIOD_WORD: Record<'en' | 'ru' | 'lv', Record<HealthRange, string>> = {
    en: { d30: '30 days', d90: '90 days', y1: 'year' },
    ru: { d30: '30 дней', d90: '90 дней', y1: 'год' },
    lv: { d30: '30 dienās', d90: '90 dienās', y1: 'gadā' },
  };
  const insightText = isDemo
    ? c.insight.demo(PERIOD_WORD[lang][range])
    : real && real.avg !== null
      ? real.delta !== null
        ? c.insight.real(real.eff, real.avg, real.delta, real.checked)
        : c.insight.realNoPrev(real.eff, real.avg, real.greens, real.checked)
      : real
        ? c.insight.noData
        : '';
  const insight = (
    <section aria-labelledby="mh-insight-t" className={`np-enter relative mt-4 overflow-hidden p-5 ${cardClass('stress')}`}>
      <span aria-hidden className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-[#2FD8F0]/20 blur-2xl" />
      <InfoButton k="health" accent={CARD_THEME.readiness.accent} className="absolute right-4 top-4 z-10" />
      <div className="relative flex gap-3.5 pr-8">
        <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.06] text-[#A9D8F2]" style={{ boxShadow: '0 0 22px rgb(47 216 240 / 0.4)' }}>
          <Icon name="sparkle" size={21} />
        </span>
        <div className="min-w-0">
          <h2 id="mh-insight-t" className="text-lg font-light text-white" style={{ fontFamily: 'inherit' }}>
            {c.insight.title[range]}
          </h2>
          {isDemo && <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-np-text-3">{hc.today.heart.demoTag}</p>}
          <p className="np-journal mt-2 text-[17px] text-white/85">{insightText}</p>
        </div>
      </div>
    </section>
  );

  const loading = !isDemo && !history && !error;

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-8 pt-4 md:px-8 md:pt-8">
      <h1 className="sr-only">{c.title}</h1>

      <div role="radiogroup" aria-label={c.period} className="grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {RANGES.map((rg) => (
          <button
            key={rg}
            type="button"
            role="radio"
            aria-checked={range === rg}
            onClick={() => setRange(rg)}
            className={`h-9 whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
              range === rg ? 'border-white/20 bg-white/15 text-white shadow-sm' : 'border-transparent text-white/75 hover:text-white'
            }`}
          >
            {c.range[rg]}
          </button>
        ))}
      </div>
      {!isDemo && (
        <div className="mt-4 space-y-3">
          <CheckinBanner lang={lang} showNeeds />
          <CalibrationBanner lang={lang} history={history} />
        </div>
      )}
      {!isDemo && range === 'y1' && <p className="mt-2 text-center text-[11px] text-np-text-3">{c.limit}</p>}

      {loading ? (
        <div aria-busy className="mt-5 space-y-4">
          {[260, 200, 200].map((h) => (
            <div key={h} className="animate-pulse np-card" style={{ height: h }} />
          ))}
        </div>
      ) : (
        <>
          {hero}
          {isDemo ? demoCharts : (
            <>
              {wearEmpty}
              {error ? <p className="mt-4 text-sm text-white/75">{c.loadError}</p> : realCharts}
            </>
          )}
          {compare}
          {grid}
          {insight}
          <p className="mt-5 px-2 text-center text-[11px] leading-relaxed text-np-text-3">{c.note}</p>
        </>
      )}
    </div>
  );
}

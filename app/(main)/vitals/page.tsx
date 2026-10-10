'use client';

// /vitals — "Vitals & Recovery" (Lotus, step 6).
//
//   period toggle   Today · 7 Days · 30 Days
//   Check-in & training load (everyone, real engine data from GET /api/checkin):
//       Readiness · Wellness (Hooper → %) · Load Index · ACWR — value, status / Δ to the previous
//       period, a sparkline of the period
//   Readiness Balance — the readiness curve over the period on the athlete's own usual range
//       (middle half of the last 28 check-in days; needs ≥ 5), interactive
//   Wearable vitals (Resting HR · HRV · Skin temp · Resp. rate) and the HRV Balance curve:
//       Lotus has no wearable source yet. Real athletes see one honest empty card; the jury demo
//       accounts see labelled demo values (components/np/demo.ts), always tagged "Demo · needs a wearable".
//
// Every badge and sentence is computed from the numbers shown; nothing is estimated.

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { loadIndex, usualDailyLoad } from '@/lib/load-index';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { APP } from '@/components/np/appCopy';
import { LOCALE } from '@/components/np/copy';
import { HOME } from '@/components/np/homeCopy';
import { Icon } from '@/components/np/icons';
import MetricCard from '@/components/np/MetricCard';
import RangeSlider from '@/components/np/RangeSlider';
import { CARD_THEME, cardClass } from '@/components/np/cardTheme';
import { CARDS } from '@/components/np/cardCopy';
import BandChart, { type BandPoint } from '@/components/np/BandChart';
import DeviationBars from '@/components/np/DeviationBars';
import { InfoButton, type InfoBaseline } from '@/components/np/InfoSheet';
import type { InfoKey } from '@/components/np/infoCopy';
import { DEMO_BIOMETRICS, demoSeries } from '@/components/np/demo';
import { HrvWidget, RespWidget, RhrWidget, TempWidget } from '@/components/np/VitalWidgets';
import { UX } from '@/components/np/uxCopy';
import { CalibrationBanner } from '@/components/np/DayStatus';
import { isoDay, tagImpacts, useTags } from '@/components/np/tags';
import { makeExplain } from '@/components/np/chartInsight';
import { todayUtc } from '@/lib/checkin-streak';
import { acwrBand, wellnessPct } from '@/components/np/Telemetry';
import { STATUS_HEX, chipStyle, loadStatus, scoreStatus, sleepStatus, type Status } from '@/components/np/status';
import { useHistory } from '@/components/np/useHistory';
import { useAccount, useIsDemo } from '@/components/np/useAccount';
import { useMode } from '@/components/np/useMode';
import { MODE } from '@/components/np/modeCopy';
import { CheckinBanner, CheckinSignals } from '@/components/np/CheckinPowered';

type Range = 'today' | 7 | 30;
const RANGES: Range[] = ['today', 7, 30];

const mean = (xs: number[]): number | null => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

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

function Pill({ color, children }: { color: string; children: ReactNode }): ReactElement {
  return (
    <span className="inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium leading-4" style={chipStyle(color)}>
      {children}
    </span>
  );
}

function Section({ title, sub, tag, children }: { title: string; sub?: string; tag?: string; children: ReactNode }): ReactElement {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-light text-white" style={{ fontFamily: 'inherit' }}>
        {title}
      </h2>
      {sub && <p className="mt-0.5 text-[13px] text-np-text-3">{sub}</p>}
      {tag && <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-np-text-3">{tag}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function VitalsPage(): ReactElement {
  const { lang } = useLanguage();
  const hc = HOME[lang];
  const vc = hc.vitals;
  const ux = UX[lang];
  const st = hc.today.status;
  const acwrText = APP[lang].v3.telemetry.acwrBand;
  const locale = lang === 'en' ? 'en-US' : LOCALE[lang];
  const nf = (v: number, dp = 0) => v.toLocaleString(locale, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const signed = (v: number, dp = 0) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${nf(Math.abs(v), dp)}`;

  const [range, setRange] = useState<Range>(7);
  const { history, error } = useHistory(60);
  const isDemo = useIsDemo();
  const { role } = useAccount();
  const { isPro } = useMode(role);
  const mm = MODE[lang];
  const tags = useTags(todayUtc(), isDemo);
  const impactReady = useMemo(() => tagImpacts(history, tags.all, tags.active, 'readiness', lang), [history, tags.all, tags.active, lang]);
  const impactSleep = useMemo(() => tagImpacts(history, tags.all, tags.active, 'sleep', lang), [history, tags.all, tags.active, lang]);

  const days = range === 'today' ? 1 : range;
  const chartDays = range === 'today' ? 7 : range;

  const view = useMemo(() => {
    if (!history || history.length === 0) return null;
    const idx = (p: ReadinessHistoryPoint) => loadIndex(p.dailyLoad ?? null, usualDailyLoad(p.chronicLoad));
    const well = (p: ReadinessHistoryPoint) => (p.hasCheckin ? wellnessPct(p.hooperScore) : null);
    const ready = (p: ReadinessHistoryPoint) => (p.hasCheckin ? p.score : null);
    const cur = history.slice(-days);
    const prev = history.length >= days * 2 ? history.slice(-days * 2, -days) : [];
    const win = history.slice(-chartDays);
    const nums = (xs: (number | null)[]) => xs.filter((v): v is number => v !== null);
    const last = history[history.length - 1];
    const lastAcwr = [...history].reverse().find((p) => p.acwr !== null)?.acwr ?? null;
    const usual = quartiles(nums(history.slice(-28).map(ready)));
    const checked = win.filter((p) => p.hasCheckin);
    // personal baseline for the (i) sheet: 30- and 60-day averages, shown only with ≥ 5 real values
    const avgs = (fn: (p: ReadinessHistoryPoint) => number | null) => {
      const a = nums(history.slice(-30).map(fn));
      const b = nums(history.map(fn));
      return { a30: a.length >= 5 ? mean(a) : null, a60: b.length >= 5 ? mean(b) : null };
    };
    return {
      base: {
        ready: avgs(ready),
        load: avgs(idx),
        sleep: avgs((p) => (p.hasCheckin ? p.sleepQuality : null)),
        stress: avgs((p) => (p.hasCheckin ? p.stress : null)),
      },
      readiness: { cur: mean(nums(cur.map(ready))), prev: mean(nums(prev.map(ready))), n: nums(cur.map(ready)).length, spark: win.map(ready), zone: last.hasCheckin ? last.zone : null },
      wellness: { cur: mean(nums(cur.map(well))), prev: mean(nums(prev.map(well))), spark: win.map(well) },
      load: { cur: mean(nums(cur.map(idx))), prev: mean(nums(prev.map(idx))), spark: win.map(idx) },
      sleep: { cur: mean(nums(cur.map((p) => (p.hasCheckin ? p.sleepQuality : null)))), prev: mean(nums(prev.map((p) => (p.hasCheckin ? p.sleepQuality : null)))) },
      stress: { cur: mean(nums(cur.map((p) => (p.hasCheckin ? p.stress : null)))) },
      acwr: { cur: lastAcwr, spark: win.map((p) => p.acwr) },
      chart: win.map<BandPoint>((p) => {
        const d = new Date(`${p.date}T12:00:00`);
        return { label: chartDays > 10 ? String(d.getDate()) : d.toLocaleDateString(locale, { weekday: 'short' }), value: ready(p) };
      }),
      dates: win.map((p) => p.date),
      usual,
      usualN: nums(history.slice(-28).map(ready)).length,
      inBand: usual ? checked.filter((p) => p.score >= usual.lo && p.score <= usual.hi).length : 0,
      checkedN: checked.length,
    };
  }, [history, days, chartDays, locale]);

  const delta = (c: number | null, p: number | null) => (c !== null && p !== null ? Math.round(c - p) : null);
  const deltaBadge = (d: number | null) => (d === null ? null : { text: vc.vsPrev(signed(d)), color: d >= 0 ? STATUS_HEX.good : STATUS_HEX.attention });
  const caption = (n: number) => (range === 'today' ? undefined : vc.avgOf(n));

  // ----- real cards: tinted Readiness · Sleep · Training load · Stress & Wellness (check-in + engine data) -----
  const r = view?.readiness;
  const cc = CARDS[lang];
  const A = CARD_THEME;
  /** accent for the good states of a card, the status colour otherwise */
  const tone = (s: Status, accent: string): string => (s === 'optimal' || s === 'good' ? accent : STATUS_HEX[s]);
  const zoneOf = (v: number) => (v >= 75 ? 'green' : v >= 50 ? 'yellow' : 'red') as 'green' | 'yellow' | 'red';
  const big = (text: string, unit?: string) => (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[44px] font-light leading-none tracking-tight text-white">{text}</span>
      {unit && <span className="text-sm text-np-text-3">{unit}</span>}
    </span>
  );
  const serif = (text: string) => <p className="np-editorial mt-2 text-[26px] leading-tight">{text}</p>;

  const rdy = r && r.cur !== null ? Math.round(r.cur) : null;
  const rdyStatus: Status | null = rdy !== null ? scoreStatus(rdy) : null;
  const slp = view?.sleep.cur ?? null;
  const slpStatus: Status | null = slp !== null ? sleepStatus(Math.round(slp)) : null;
  const ld = view?.load.cur ?? null;
  const ldStatus: Status | null = ld !== null ? loadStatus(ld) : null;
  const str = view?.stress.cur ?? null;
  const strKey: 'calm' | 'mid' | 'high' | null = str === null ? null : str >= 6 ? 'calm' : str >= 4 ? 'mid' : 'high';
  const wl = view?.wellness.cur ?? null;
  const prevD = (c: number | null, p: number | null) => deltaBadge(delta(c, p));

  // (i) sheet: the athlete's own baseline, only what really exists
  const rangeWord = range === 'today' ? vc.range.today : range === 7 ? vc.range.d7 : vc.range.d30;
  const baseOf = (b: { a30: number | null; a60: number | null } | undefined, now: number | null, usual?: { lo: number; hi: number } | null, dp = 0) => ({
    usual: usual ? `${usual.lo} – ${usual.hi}` : null,
    now: now !== null ? nf(now, dp) : null,
    avg30: b?.a30 != null ? nf(b.a30, dp) : null,
    avg60: b?.a60 != null ? nf(b.a60, dp) : null,
  });
  const info = (k: InfoKey, accent: string, baseline?: InfoBaseline, insight?: string | null, impact?: string[]) => (
    <InfoButton k={k} accent={accent} baseline={baseline} insight={insight} impact={impact} />
  );
  const pinOf = (status?: string) => (status ? `${status} · ${rangeWord}` : undefined);

  const realTiles = view && r && (
    <div className="flex flex-col gap-4">
      <MetricCard
        theme="readiness"
        icon="sprout"
        label={vc.tile.readiness}
        status={rdyStatus ? st[rdyStatus] : undefined}
        statusColor={rdyStatus ? tone(rdyStatus, A.readiness.accent) : undefined}
        right={range === 'today' ? undefined : (() => { const b = prevD(r.cur, r.prev); return b ? <Pill color={b.color}>{b.text}</Pill> : undefined; })()}
        info={info('readiness', A.readiness.accent, baseOf(view.base.ready, rdy, view.usual), view.usual && view.checkedN > 0 ? vc.readyChart.insight(view.inBand, view.checkedN) : null, impactReady)}
      >
        {big(rdy !== null ? nf(rdy) : '—')}
        {rdy !== null && serif(hc.today.headline[zoneOf(rdy)])}
        <div className="mt-4">
          <RangeSlider value={rdy} min={0} max={100} range={view.usual} color={A.readiness.accent} label={`${vc.tile.readiness} ${rdy ?? '—'}`} pin={pinOf(rdyStatus ? st[rdyStatus] : undefined)} />
        </div>
        <p className="mt-2 text-[11px] text-np-text-3">{view.usual ? cc.usual(view.usual.lo, view.usual.hi) : cc.noUsual} · {caption(days) ?? hc.today.rings.readiness}</p>
      </MetricCard>

      <MetricCard theme="sleep" icon="moon" label={cc.sleepTitle} status={slpStatus ? st[slpStatus] : undefined} statusColor={slpStatus ? tone(slpStatus, A.sleep.accent) : undefined}
        info={info('sleep', A.sleep.accent, baseOf(view.base.sleep, slp, null, 1), null, impactSleep)}
        right={range === 'today' ? undefined : (() => { const d = view.sleep.cur !== null && view.sleep.prev !== null ? Math.round((view.sleep.cur - view.sleep.prev) * 10) / 10 : null; return d === null ? undefined : <Pill color={d >= 0 ? STATUS_HEX.good : STATUS_HEX.attention}>{vc.vsPrev(signed(d, 1))}</Pill>; })()}
      >
        {big(slp !== null ? nf(slp, range === 'today' ? 0 : 1) : '—', slp !== null ? '/7' : undefined)}
        {slpStatus && serif(cc.sleepLine[slpStatus === 'good' ? 'good' : slpStatus === 'fair' ? 'fair' : 'attention'])}
        <div className="mt-4">
          <RangeSlider value={slp} min={1} max={7} color={A.sleep.accent} label={`${cc.sleepTitle} ${slp !== null ? nf(slp, 1) : '—'} / 7`} endLabels={['1', '7']} pin={pinOf(slpStatus ? st[slpStatus] : undefined)} />
        </div>
        <p className="mt-2 text-[11px] text-np-text-3">{hc.today.sleep.ratingBadge(slp !== null ? Math.round(slp) : 0).replace(/: .*/, '')} · {caption(days) ?? ''}</p>
      </MetricCard>

      <MetricCard theme="activity" icon="bolt" label={cc.loadTitle} status={ldStatus ? st[ldStatus] : undefined} statusColor={ldStatus ? tone(ldStatus, A.activity.accent) : undefined} className="scroll-mt-24" style={undefined} info={info('load', A.activity.accent, { ...baseOf(view.base.load, ld), usual: '41 – 75' })}>
        <span id="load" />
        {big(ld !== null ? nf(ld) : '—')}
        {ldStatus && serif(cc.loadLine[ldStatus === 'attention' ? 'attention' : ldStatus === 'light' ? 'light' : 'optimal'])}
        <div className="mt-4">
          <RangeSlider value={ld !== null ? Math.round(ld) : null} min={0} max={120} range={{ lo: 41, hi: 75 }} color={A.activity.accent} label={`${vc.tile.load} ${ld !== null ? Math.round(ld) : '—'}, ${cc.target}`} pin={pinOf(ldStatus ? st[ldStatus] : undefined)} />
        </div>
        <p className="mt-2 text-[11px] text-np-text-3">
          {view.acwr.cur !== null ? (isPro ? `${cc.target} · ${vc.tile.acwr} ${nf(view.acwr.cur, 2)} · ${acwrText[acwrBand(view.acwr.cur)]}` : mm.load[acwrBand(view.acwr.cur)]) : `${cc.target} · ${caption(days) ?? ''}`}
        </p>
      </MetricCard>

      <MetricCard theme="stress" icon="heart" label={cc.stress.title} status={strKey ? cc.stress[strKey] : undefined} statusColor={strKey ? (strKey === 'high' ? STATUS_HEX.attention : A.stress.accent) : undefined} info={info('stress', A.stress.accent, baseOf(view.base.stress, str, null, 1))}>
        {big(str !== null ? nf(str, range === 'today' ? 0 : 1) : '—', str !== null ? '/7' : undefined)}
        {strKey && serif(cc.stress[strKey])}
        <div className="mt-4">
          <RangeSlider value={str} min={1} max={7} color={A.stress.accent} label={`${cc.stress.title} ${str !== null ? nf(str, 1) : '—'} / 7`} endLabels={['1', '7']} pin={pinOf(strKey ? cc.stress[strKey] : undefined)} />
        </div>
        <p className="mt-2 text-[11px] text-np-text-3">
          {cc.stress.scale}
          {wl !== null ? ` · ${cc.stress.wellness} ${nf(wl)}%` : ''}
        </p>
      </MetricCard>
    </div>
  );

  // data to action: the explanation card under each chart (what happened · why · what to do), tags of the day before as context
  const fullDay = (d: Date) => d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
  const explainReady = view
    ? makeExplain({
    lang,
    metric: 'high',
    labels: view.dates.map((d) => fullDay(new Date(`${d}T12:00:00`))),
    values: view.chart.map((p) => p.value),
    dates: view.dates,
    tags: tags.all,
    tagLag: 1,
    band: view.usual,
  })
    : undefined;

  const readinessChart = view && (
    <div className={`p-5 ${cardClass('readiness')}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-light text-white" style={{ fontFamily: 'inherit' }}>
          {vc.readyChart.title}
        </h3>
        <span className="flex items-center gap-2">
          {view.usual && <span className="font-mono text-[11px] text-np-text-3">{vc.readyChart.band(view.usual.lo, view.usual.hi)}</span>}
          {info('trend', A.readiness.accent, baseOf(view.base.ready, rdy, view.usual), view.usual && view.checkedN > 0 ? vc.readyChart.insight(view.inBand, view.checkedN) : null)}
        </span>
      </div>
      <div className="mt-3">
        <BandChart points={view.chart} band={view.usual} min={0} max={100} color="#2FD8F0" colorAt={(v) => STATUS_HEX[scoreStatus(Math.round(v))]} label={vc.readyChart.title} explain={explainReady} />
      </div>
      <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-white/75">
        <Icon name="sparkle" size={15} className="mt-0.5 shrink-0 text-np-text-3" />
        {view.checkedN === 0 ? vc.readyChart.noData : view.usual ? vc.readyChart.insight(view.inBand, view.checkedN) : vc.readyChart.noBand(view.usualN)}
      </p>
    </div>
  );

  // ----- demo wearable tiles (jury demo accounts only) -----
  const bio = (k: string) => DEMO_BIOMETRICS.find((b) => b.k === k)!;
  const win = (h: number[]) => h.slice(-Math.min(h.length, chartDays));
  const rhr = bio('rhr');
  const hrv = bio('hrv');
  const temp = bio('temp');
  const resp = bio('resp');
  const inRange = (b: { value: number; lo: number; hi: number }) => b.value >= b.lo && b.value <= b.hi;
  const rhrDelta = Math.round(rhr.value - (mean(win(rhr.hist)) ?? rhr.value));
  const hrvWeek = hrv.hist.slice(-7);
  const hrvIn = hrvWeek.filter((v) => v >= hrv.lo && v <= hrv.hi).length;
  const today = new Date();
  const hrvPoints: BandPoint[] = hrvWeek.map((v, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (hrvWeek.length - 1 - i));
    return { label: d.toLocaleDateString(locale, { weekday: 'short' }), value: v };
  });

  // data to action: the explanation card under each chart (what happened · why · what to do), tags of the day before as context
  const explainHrv = makeExplain({
    lang,
    metric: 'high',
    labels: hrvWeek.map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (hrvWeek.length - 1 - i));
      return fullDay(d);
    }),
    values: hrvWeek,
    dates: hrvWeek.map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (hrvWeek.length - 1 - i));
      return isoDay(d);
    }),
    tags: tags.all,
    tagLag: 1,
    band: { lo: hrv.lo, hi: hrv.hi },
    unit: vc.unit.ms,
  });

  // demo baselines: the 60-day demo series behind My Health, so the numbers agree across screens
  const hrv60 = demoSeries('hrv', 60);
  const rhr60 = demoSeries('rhr', 60);
  const m0 = (xs: number[]) => Math.round(mean(xs) ?? 0);
  const hrvBase = { usual: `${hrv.lo} – ${hrv.hi}`, now: nf(hrv.value), avg30: nf(m0(hrv60.slice(-30))), avg60: nf(m0(hrv60)) };
  const rhrBase = { usual: `${rhr.lo} – ${rhr.hi}`, now: nf(rhr.value), avg30: nf(m0(rhr60.slice(-30))), avg60: nf(m0(rhr60)) };
  const tempBase = { usual: `${signed(temp.lo, 1)} – ${signed(temp.hi, 1)}`, now: signed(temp.value, 1) };
  const respBase = { usual: `${nf(resp.lo, 1)} – ${nf(resp.hi, 1)}`, now: nf(resp.value, 1) };

  const demoWear = (
    <>
      <div className="grid grid-cols-2 gap-3">
        <RhrWidget
          name={vc.tile.rhr}
          value={nf(rhr.value)}
          unit={vc.unit.bpm}
          badge={{ text: vc.vsAvg(`${signed(rhrDelta)} ${vc.unit.bpm}`), color: rhrDelta <= 0 ? STATUS_HEX.good : STATUS_HEX.attention }}
          trend={win(rhr.hist)}
          usual={{ min: `${rhr.lo} ${vc.unit.bpm}`, max: `${rhr.hi} ${vc.unit.bpm}`, minWord: ux.range.min, maxWord: ux.range.usualMax }}
          info={info('heart', '#3FE0A8', rhrBase)}
        />
        <HrvWidget
          name={vc.tile.hrv}
          value={nf(hrv.value)}
          unit={vc.unit.ms}
          num={hrv.value}
          badge={inRange(hrv) ? { text: vc.balanced, color: STATUS_HEX.optimal } : { text: st.attention, color: STATUS_HEX.attention }}
          lo={hrv.lo}
          hi={hrv.hi}
          loText={`${hrv.lo} ${vc.unit.ms}`}
          hiText={`${hrv.hi} ${vc.unit.ms}`}
          words={[ux.range.usualMin, ux.range.usualMax]}
          pin={`${hrv.value} ${vc.unit.ms}`}
          info={info('hrv', '#2FD8F0', hrvBase, vc.hrvChart.insight(hrvIn, hrvWeek.length))}
        />
        <TempWidget
          name={vc.tile.temp}
          value={`${signed(temp.value, 1)}°C`}
          state={inRange(temp) ? vc.normal : st.attention}
          color={inRange(temp) ? STATUS_HEX.good : STATUS_HEX.attention}
          usual={`${signed(temp.lo, 1)} – ${signed(temp.hi, 1)}°C`}
          info={info('temp', '#3FE0A8', tempBase)}
        />
        <RespWidget
          name={vc.tile.resp}
          value={nf(resp.value, 1)}
          num={resp.value}
          unit={vc.unit.rpm}
          lo={resp.lo}
          hi={resp.hi}
          loText={nf(resp.lo, 1)}
          hiText={nf(resp.hi, 1)}
          words={[ux.range.usualMin, ux.range.usualMax]}
          info={info('resp', '#3FE0A8', respBase)}
        />
      </div>
      <div className={`mt-4 p-5 ${cardClass('readiness')}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-light text-white" style={{ fontFamily: 'inherit' }}>
            {vc.hrvChart.title}
          </h3>
          <span className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-white/40">{vc.hrvChart.band(hrv.lo, hrv.hi)}</span>
            {info('hrv', A.readiness.accent, hrvBase, vc.hrvChart.insight(hrvIn, hrvWeek.length))}
          </span>
        </div>
        <div className="mt-3">
          <DeviationBars points={hrvPoints} baseline={(hrv.lo + hrv.hi) / 2} unit={vc.unit.ms} label={vc.hrvChart.title} explain={explainHrv} />
        </div>
        <p className="mt-4 flex gap-2 text-[13px] leading-relaxed text-white/75">
          <Icon name="sparkle" size={15} className="mt-0.5 shrink-0 text-np-text-3" />
          {vc.hrvChart.insight(hrvIn, hrvWeek.length)}
        </p>
      </div>
    </>
  );

  const wearEmpty = (
    <div className="flex gap-3 np-card p-5">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#2FD8F0]">
        <Icon name="watch" size={19} />
      </span>
      <p className="text-sm leading-relaxed text-white/75">{vc.wearEmpty}</p>
    </div>
  );

  const checkinSection = (
    <Section title={vc.checkinTitle} sub={vc.checkinSub}>
      {error ? <p className="text-sm text-white/75">{hc.today.loadError}</p> : realTiles}
      <div className="mt-4">{readinessChart}</div>
      {!isDemo && <CheckinSignals lang={lang} history={history} className="mt-4" />}
    </Section>
  );
  const wearSection = (
    <Section title={vc.wearTitle} tag={isDemo ? hc.today.heart.demoTag : undefined}>
      {isDemo ? demoWear : wearEmpty}
    </Section>
  );

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-8 pt-4 md:px-8 md:pt-8">
      <h1 className="np-editorial text-2xl font-semibold text-white">{vc.title}</h1>
      {!isDemo && (
        <div className="mt-3 space-y-3">
          <CheckinBanner lang={lang} />
          <CalibrationBanner lang={lang} history={history} />
        </div>
      )}

      <div role="radiogroup" aria-label={vc.period} className="mt-4 grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {RANGES.map((rg) => (
          <button
            key={String(rg)}
            type="button"
            role="radio"
            aria-checked={range === rg}
            onClick={() => setRange(rg)}
            className={`h-9 rounded-full text-[13px] font-medium transition-colors ${range === rg ? 'bg-white/15 text-white' : 'text-white/75 hover:text-white'}`}
          >
            {rg === 'today' ? vc.range.today : rg === 7 ? vc.range.d7 : vc.range.d30}
          </button>
        ))}
      </div>

      {isDemo ? (
        <>
          {wearSection}
          {checkinSection}
        </>
      ) : (
        <>
          {checkinSection}
          {wearSection}
        </>
      )}
    </div>
  );
}

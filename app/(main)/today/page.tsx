'use client';

// /today — the athlete's home (Lotus mobile).
//
//   Safety Guard (pain / match / load spike) first, then the four metric chips and the hero card,
//   then everything the old CloudPulse dashboard had: "Why this score" (the engine's deductions),
//   the coach's signal / reply, Return after pain, the check-in streak — and the Lotus cards
//   (heart, sleep, training load).
//
//   date (MON, OCT 5) · editorial headline by the engine zone ("Ready for action")
//   one big Readiness ring (engine score 0–100, 1.5× the others) on a glowing cyan / amber / red backdrop by the
//   engine zone, with two compact capsules under it: Sleep (check-in rating 1–7) and Load (ADP Load Index
//   0–100), each with a 7-day sparkline and a "+12% vs avg" tag computed from the athlete's own history.
//   Readiness 80–100 with no Safety Guard restriction → "Prime Condition" and a button to today's workout.
//   a short daily insight built from the same numbers (zone, Δ to the athlete's average, load target)
//   Resting Heart Rate & HRV (components/np/HeartCard): empty state until a wearable exists; labelled
//   demo values only for the jury demo accounts
//   Sleep Quality & Stages (components/np/SleepStagesCard): the check-in sleep rating; stages only as
//   labelled demo values on the jury demo accounts
//   Training load: today's Load Index and target (the list continues under the dock)
//
// Every number comes from GET /api/checkin (the readiness engine). No check-in today → empty rings,
// a short explanation and the way to the check-in. Nothing is estimated: there is no HRV or step data
// for real athletes, so their screen never shows such numbers.

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { baselineDelta, loadIndex, targetLoadRange, usualDailyLoad } from '@/lib/load-index';
import { todayUtc } from '@/lib/checkin-streak';
import SafetyShield, { type PassState } from '@/components/SafetyShield';
import CoachReplyCard from '@/components/CoachReplyCard';
import RtpAthleteCard from '@/components/RtpAthleteCard';
import CheckinStreakCard from '@/components/CheckinStreakCard';
import WhyScoreCard from '@/components/np/WhyScoreCard';
import { LOCALE } from '@/components/np/copy';
import { HOME } from '@/components/np/homeCopy';
import { Icon } from '@/components/np/icons';
import { ScoreRing } from '@/components/np/ScoreRing';
import { STATUS_GRADIENT, STATUS_HEX, chipStyle, loadStatus, scoreStatus, sleepStatus, type Status } from '@/components/np/status';
import Aura from '@/components/np/Aura';
import MetricChips from '@/components/np/MetricChips';
import { MetricHeader } from '@/components/np/MetricCard';
import { CARD_THEME, cardClass } from '@/components/np/cardTheme';
import { CARDS } from '@/components/np/cardCopy';
import { acwrBand, wellnessPct } from '@/components/np/Telemetry';
import { useHistory } from '@/components/np/useHistory';
import HeartCard from '@/components/np/HeartCard';
import SleepStagesCard from '@/components/np/SleepStagesCard';
import { DEMO_SLEEP, demoHeartDay } from '@/components/np/demo';
import { useAccount, useIsDemo } from '@/components/np/useAccount';
import { useMode } from '@/components/np/useMode';
import { MODE, GO_HEX, goOf } from '@/components/np/modeCopy';
import GoArc from '@/components/np/GoArc';
import SafetyQuickBar from '@/components/np/SafetyQuickBar';
import { CheckinBanner, CheckinSignals } from '@/components/np/CheckinPowered';
import Sparkline from '@/components/np/Sparkline';
import { pctVsAvg } from '@/components/np/trend';
import { POLISH } from '@/components/np/polishCopy';
import { InfoButton } from '@/components/np/InfoSheet';
import { CalibrationBanner, DeviceStatus } from '@/components/np/DayStatus';
import StrainSignalCard from '@/components/np/StrainSignalCard';
import PlanAdjustCard from '@/components/np/PlanAdjustCard';
import { strainInputFromPenalties, strainSignal } from '@/lib/strain-signal';
import { AfternoonHero, EveningHero, PhaseSwitch, phaseOf } from '@/components/np/PhaseHeroes';
import TagBar from '@/components/np/TagBar';
import { tagImpacts, useTags } from '@/components/np/tags';
import { UX, type Phase } from '@/components/np/uxCopy';

export default function TodayPage(): ReactElement {
  const { lang } = useLanguage();
  const tc = HOME[lang].today;
  const { history, error } = useHistory(35);
  const today = todayUtc();
  const pc = POLISH[lang].today;
  const [pass, setPass] = useState<PassState | null>(null);
  const isDemo = useIsDemo();
  const { role } = useAccount();
  const { isPro } = useMode(role);
  const mm = MODE[lang];
  // minutes since local midnight, read after mount (server and client must agree on the first render)
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const d = new Date();
    setNowMin(d.getHours() * 60 + d.getMinutes());
  }, []);

  // time of day: the phone's clock decides, the switch lets you look at the other two (tap the automatic one to go back)
  const ux = UX[lang];
  const [phaseOverride, setPhaseOverride] = useState<Phase | null>(null);
  const tags = useTags(today, isDemo);

  const day = useMemo(() => {
    const last = history?.[history.length - 1];
    if (!history || !last || last.date !== today) return null;
    const idx = history.length - 1;
    const checked = last.hasCheckin;
    const earlier = history
      .slice(Math.max(0, idx - 28), idx)
      .filter((p) => p.hasCheckin)
      .map((p) => p.score);
    // the athlete's own baseline for the (i) sheet: 30-day averages and the usual readiness range, only with ≥ 5 real values
    const mean = (xs: number[]) => (xs.length >= 5 ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    const scores30 = history.slice(-30).filter((p) => p.hasCheckin).map((p) => p.score);
    const loads30 = history.slice(-30).flatMap((p) => {
      const v = loadIndex(p.dailyLoad ?? null, usualDailyLoad(p.chronicLoad));
      return v === null ? [] : [v];
    });
    const sorted = [...earlier].sort((a, b) => a - b);
    const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p))];
    return {
      avgReady: mean(scores30),
      avgLoad: mean(loads30),
      usualReady: sorted.length >= 5 ? { lo: Math.round(q(0.25)), hi: Math.round(q(0.75)) } : null,
      readiness: checked ? last.score : null,
      stress: checked ? last.stress : null,
      stressSeries: history.slice(-7).map((p) => (p.hasCheckin ? p.stress : null)),
      zone: checked ? last.zone : null,
      sleep: checked ? last.sleepQuality : null,
      wellness: checked ? wellnessPct(last.hooperScore) : null,
      load: loadIndex(last.dailyLoad ?? null, usualDailyLoad(last.chronicLoad)),
      delta: checked ? (baselineDelta(last.score, earlier)?.delta ?? null) : null,
      // last 7 days (oldest → today): sleep rating on check-in days, Load Index on every day with a usual day
      sleepSeries: history.slice(-7).map((p) => (p.hasCheckin ? p.sleepQuality : null)),
      loadSeries: history.slice(-7).map((p) => loadIndex(p.dailyLoad ?? null, usualDailyLoad(p.chronicLoad))),
      // Pro telemetry strip: the engine's own numbers for today
      strainSignal: checked ? strainSignal(strainInputFromPenalties(last.acwr, last.zone, last.penaltyCodes)) : null,
      tele: { acwr: last.acwr, monotony: last.monotony, hooper: checked ? last.hooperScore : null, acute: last.acuteLoad, chronic: last.chronicLoad },
    };
  }, [history, today]);

  const readiness = day?.readiness ?? null;
  const zone = day?.zone ?? null;
  const sleep = day?.sleep ?? null;
  const load = day?.load ?? null;
  const wellness = day?.wellness ?? null;
  const cc = CARDS[lang];
  const target = targetLoadRange(readiness);

  const sleepSeries = day?.sleepSeries ?? [];
  const loadSeries = day?.loadSeries ?? [];
  const sleepPct = pctVsAvg(sleep, sleepSeries.slice(0, -1));
  const loadPct = pctVsAvg(load, loadSeries.slice(0, -1));
  const readyStatus: Status | null = readiness !== null ? scoreStatus(readiness) : null;
  // the engine's red zone (< 50) always wears neon crimson on the ring, the pill and the glow
  const redZone = zone === 'red';
  const readyHex = redZone ? '#FF3D5A' : readyStatus ? STATUS_HEX[readyStatus] : '#C3C5C7';
  // "Prime Condition": a great day AND the Safety Guard confirmed nothing restricts it (never shown while the pass is unknown)
  const prime = readiness !== null && readiness >= 80 && zone === 'green' && pass === 'clear' && target !== null;

  // high strain (low readiness or an overload day): the terracotta aura joins the calm canvas
  const strain = (readiness !== null && scoreStatus(readiness) === 'attention') || (load !== null && loadStatus(load) === 'attention');

  const autoPhase: Phase | null = nowMin === null ? null : phaseOf(nowMin);
  // a red day keeps Readiness in front by default, whatever the hour
  const phase: Phase = phaseOverride ?? (redZone ? 'morning' : (autoPhase ?? 'morning'));
  const impactReady = useMemo(() => tagImpacts(history, tags.all, tags.active, 'readiness', lang), [history, tags.all, tags.active, lang]);
  const impactSleep = useMemo(() => tagImpacts(history, tags.all, tags.active, 'sleep', lang), [history, tags.all, tags.active, lang]);
  const windDown = (() => {
    if (!isDemo || nowMin === null) return null;
    const d = demoHeartDay(nowMin);
    const p = d.points[d.points.length - 1];
    return p ? { now: p.bpm, resting: d.restingBpm } : null;
  })();

  const dateLabel = new Date(`${today}T12:00:00`)
    .toLocaleDateString(lang === 'en' ? 'en-US' : LOCALE[lang], { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();

  const heroNode = (
      <section aria-labelledby="today-headline" className={`np-enter relative overflow-hidden p-5 sm:p-6 ${cardClass(redZone ? 'alert' : 'readiness')}`}>
        <InfoButton
          k="readiness"
          accent={readyHex}
          className="absolute right-4 top-4 z-10"
          baseline={{
            usual: day?.usualReady ? `${day.usualReady.lo} – ${day.usualReady.hi}` : null,
            now: readiness !== null ? String(readiness) : null,
            avg30: day?.avgReady != null ? String(Math.round(day.avgReady)) : null,
          }}
          insight={readiness !== null && zone && target ? tc.insight(zone, readiness, day?.delta ?? null, target) : null}
          impact={impactReady}
        />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-widest text-np-text-3">{dateLabel}</p>
          <h1 id="today-headline" className="np-editorial mt-2 text-2xl font-semibold text-white">
            {zone ? tc.headline[zone] : tc.noCheckinHeadline}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-white/75">{ux.morning[zone ?? 'none']}</p>

          <div className="mt-4 flex flex-col items-center gap-2 text-center">
            <GoArc
              value={readiness}
              zone={zone}
              size={232}
              label={tc.ringLabel(tc.rings.readiness, readiness, 100)}
              names={{ push: mm.go.push.name, steady: mm.go.steady.name, recover: mm.go.recover.name }}
            />
            <span className="text-[11px] font-medium uppercase tracking-widest text-white/75">{tc.rings.readiness}</span>
            {goOf(zone) ? (
              <div className="lt-cluster mt-1">
                <span className="px-3 py-1 text-[12px] font-bold" style={{ backgroundColor: `${GO_HEX[goOf(zone)!]}26`, color: GO_HEX[goOf(zone)!] }}>
                  {mm.go[goOf(zone)!].name}
                </span>
                {readyStatus && (
                  <span className="border border-white/10 px-3 py-1 text-[12px] font-semibold text-white/80" style={{ borderLeftWidth: 0 }}>
                    {tc.status[readyStatus]}
                  </span>
                )}
              </div>
            ) : (
              <span aria-hidden className="h-[26px]" />
            )}
            {goOf(zone) && <p className="max-w-[300px] text-[14px] leading-snug text-white/80">{mm.go[goOf(zone)!].line}</p>}
          </div>

          {/* Sleep and Load: compact capsules with the last 7 days and the change against the athlete's own average */}
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {[
              { key: 'sleep', name: tc.rings.sleep, value: sleep, max: 7, unit: '/7', status: sleep !== null ? sleepStatus(sleep) : null, series: sleepSeries, pct: sleepPct, href: '/vitals', good: 'up' as const },
              { key: 'load', name: tc.rings.load, value: load, max: 100, unit: undefined, status: load !== null ? loadStatus(load) : null, series: loadSeries, pct: loadPct, href: '/vitals#load', good: 'none' as const },
            ].map((r) => {
              const th = CARD_THEME[r.key === 'sleep' ? 'sleep' : 'activity'];
              const color = r.status ? STATUS_HEX[r.status] : '#C3C5C7';
              const tone = r.pct === null || Math.abs(r.pct) < 3 ? '#FFFFFF' : r.good === 'up' ? (r.pct > 0 ? '#3FE0A8' : '#FF7A59') : '#FFFFFF';
              return (
                <li key={r.key} className="min-w-0">
                  <Link
                    href={r.href}
                    className={`group flex h-full flex-col gap-2 rounded-2xl border p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] transition-colors ${th.bg} ${th.border}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <ScoreRing
                        value={r.value}
                        max={r.max}
                        size={52}
                        stroke={5}
                        pad={5}
                        colors={r.status ? STATUS_GRADIENT[r.status] : ['#C3C5C7', '#C3C5C7']}
                        valueClassName="text-[15px] font-medium tracking-tight"
                        label={tc.ringLabel(r.name, r.value, r.max)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-medium uppercase tracking-widest text-white/75">{r.name}</span>
                        <span
                          className="mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-4 tracking-wider"
                          style={r.status ? chipStyle(color) : { color: '#C3C5C7' }}
                        >
                          {r.status ? tc.status[r.status] : '—'}
                        </span>
                      </span>
                    </span>
                    <Sparkline values={r.series} color={color} />
                    <span className="flex items-center justify-between gap-1 text-[11px] text-white/75">
                      <span className="truncate">{pc.last7}</span>
                      {r.pct !== null && (
                        <span
                          className="shrink-0 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ color: tone, borderColor: `${tone}40`, backgroundColor: `${tone}14` }}
                        >
                          {Math.abs(r.pct) < 3 ? pc.onAvg : pc.vsAvg(r.pct)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {isPro && day?.tele && (
            <dl className="mt-4 grid grid-cols-5 gap-px overflow-hidden rounded-[14px_14px_14px_5px] border border-white/10 bg-white/10 text-center" aria-label={mm.proStrip.title}>
              {[
                [mm.proStrip.acwr, day.tele.acwr !== null ? day.tele.acwr.toFixed(2) : null],
                [mm.proStrip.mono, day.tele.monotony !== null ? day.tele.monotony.toFixed(2) : null],
                [mm.proStrip.hooper, day.tele.hooper !== null ? String(day.tele.hooper) : null],
                [mm.proStrip.acute, String(Math.round(day.tele.acute))],
                [mm.proStrip.chronic, String(Math.round(day.tele.chronic))],
              ].map(([k, v]) => (
                <div key={k} className="bg-[#12151B] px-1 py-2.5">
                  <dt className="truncate text-[9px] font-semibold uppercase tracking-wider text-white/50">{k}</dt>
                  <dd className="mt-1 font-mono text-[13px] text-white">{v ?? '—'}</dd>
                </div>
              ))}
            </dl>
          )}

          {prime && target && readiness !== null ? (
            <div className="mt-5 rounded-2xl border border-[#B8F23C]/30 bg-gradient-to-br from-[#B8F23C]/[0.16] via-[#3FE0A8]/[0.08] to-transparent p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#3FE0A8]">
                <Icon name="sparkle" size={13} />
                {pc.prime.tag}
              </p>
              <p className="np-editorial mt-2 text-[26px] leading-tight text-white">{pc.prime.title}</p>
              <p className="mt-2 text-[14px] leading-relaxed text-white/80" aria-live="polite">
                {pc.prime.body(readiness, day?.delta ?? null, target.from, target.to)}
              </p>
              <Link
                href="/training"
                className="np-btn-primary mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] shadow-[0_0_24px_rgba(184,242,60,0.3)]"
              >
                <Icon name="dumbbell" size={18} stroke={1.75} />
                {pc.prime.cta}
              </Link>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/75">
                <Icon name="sparkle" size={13} />
                {tc.insightTitle}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed text-white/90" aria-live="polite">
                {readiness !== null && zone && target ? tc.insight(zone, readiness, day?.delta ?? null, target) : error ? tc.loadError : tc.noCheckin}
              </p>
              {readiness === null && (history !== null || error) && (
                <Link
                  href="/checkin"
                  className="np-btn-primary mt-4 inline-flex h-12 items-center gap-2 rounded-full px-6 text-sm shadow-[0_0_24px_rgba(184,242,60,0.3)]"
                >
                  <Icon name="plus" size={16} stroke={1.75} />
                  {tc.cta}
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
  );
  const coachNode = (
    <>
      {/* coach signal / reply, return after pain, check-in streak — each hides itself when it has nothing to say */}
      <div className="mt-4 space-y-4 empty:hidden">
        <CoachReplyCard />
        <div id="rtp-plan" className="empty:hidden">
          <RtpAthleteCard />
        </div>
        <CheckinStreakCard showCta={readiness === null} />
      </div>

    </>
  );
  const whyNode = (
    <>
      {/* why this score: the engine's own deductions for today (hidden without a check-in) */}
      <WhyScoreCard date={today} score={readiness} />

    </>
  );
  const heartNode = (
    <>
      {/* heart rate & HRV: labelled demo values for the jury demo accounts, an honest empty state otherwise */}
      {isDemo ? (
        <HeartCard lang={lang} demo={isDemo} tags={tags.active} data={nowMin !== null ? demoHeartDay(nowMin) : null} />
      ) : (
        <CheckinSignals lang={lang} history={history} className="mt-4" />
      )}

    </>
  );
  const sleepNode = (
    <>
      {/* sleep: the check-in rating for everyone; stages only as labelled demo values on demo accounts */}
      <SleepStagesCard lang={lang} demo={isDemo} stages={isDemo ? DEMO_SLEEP.stages : null} rating={sleep} bedtime={isDemo ? DEMO_SLEEP.bedtime : null} impact={impactSleep} ratings={isDemo ? null : sleepSeries} />

    </>
  );
  const loadNode = (
    <>
      {/* training load: the amber "activity" card (the list continues under the dock) */}
      <Link href="/vitals#load" className={`np-enter group mt-4 block p-5 sm:p-6 ${cardClass('activity')}`} style={{ ['--np-i' as string]: 3 }}>
        <MetricHeader
          theme="activity"
          icon="bolt"
          label={cc.loadTitle}
          status={load !== null ? tc.status[loadStatus(load)] : undefined}
          statusColor={load !== null ? (loadStatus(load) === 'optimal' ? '#FFC53D' : STATUS_HEX[loadStatus(load)]) : undefined}
          right={
            <>
              <InfoButton
                k="load"
                accent={CARD_THEME.activity.accent}
                baseline={{ usual: target ? `${target.from} – ${target.to}` : '41 – 75', now: load !== null ? String(load) : null, avg30: day?.avgLoad != null ? String(Math.round(day.avgLoad)) : null }}
              />
              <Icon name="chevR" size={18} className="mt-2 text-white/75 transition-transform group-hover:translate-x-0.5" />
            </>
          }
        />
        <p className="mt-4 flex items-baseline gap-3">
          <span className="text-4xl font-light tracking-tight text-white">{load ?? '—'}</span>
          {load !== null && <span className="np-editorial text-[22px] leading-tight text-white/90">{cc.loadLine[loadStatus(load) === 'attention' ? 'attention' : loadStatus(load) === 'light' ? 'light' : 'optimal']}</span>}
        </p>
        <p className="mt-2 text-sm text-np-text-3">
          {isPro || day?.tele?.acwr == null
            ? `${target ? tc.loadCard.target(target.from, target.to) : tc.loadCard.none} · ${tc.loadCard.scale}`
            : mm.load[acwrBand(day.tele.acwr)]}
        </p>
      </Link>
    </>
  );
  const tagNode = <TagBar lang={lang} active={tags.active} onToggle={tags.toggle} demo={isDemo} impact={impactReady} />;
  const afternoonNode = (
    <AfternoonHero
      lang={lang}
      stress={day?.stress ?? null}
      stressSeries={day?.stressSeries ?? []}
      load={load}
      loadSeries={loadSeries}
      target={target}
      statusWord={tc.status}
      loadBaseline={{ usual: target ? `${target.from} – ${target.to}` : '41 – 75', now: load !== null ? String(load) : null, avg30: day?.avgLoad != null ? String(Math.round(day.avgLoad)) : null }}
    />
  );
  const eveningNode = <EveningHero lang={lang} demoWake={isDemo ? DEMO_SLEEP.bedtime.to : null} windDown={windDown} />;

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-8 pt-4 md:px-8 md:pt-8">
      {strain && <Aura mode="strain" />}
      <SafetyQuickBar lang={lang} redZone={redZone} pass={pass} />
      <div id="safety-pass">
        <SafetyShield inline onStatus={setPass} />
      </div>
      {zone !== null && <PlanAdjustCard className="mb-4" />}
      <StrainSignalCard lang={lang} signal={day?.strainSignal ?? null} className="mb-4" />
      <DeviceStatus lang={lang} demo={isDemo} history={history} today={today} />
      <CalibrationBanner lang={lang} history={history} />
      {!isDemo && <CheckinBanner lang={lang} showNeeds className="mb-4" />}

      <MetricChips
        label={cc.chips.label}
        href="/vitals"
        chips={[
          { key: 'readiness', label: tc.rings.readiness, value: readiness, icon: 'sprout', theme: 'readiness' },
          { key: 'sleep', label: tc.rings.sleep, value: sleep, icon: 'moon', theme: 'sleep' },
          { key: 'load', label: tc.rings.load, value: load, icon: 'bolt', theme: 'activity' },
          { key: 'wellness', label: cc.chips.wellness, value: wellness, unit: '%', icon: 'heart', theme: 'stress' },
        ]}
      />

      <PhaseSwitch lang={lang} phase={phase} auto={autoPhase} onPick={setPhaseOverride} />

      {/* the hero of the hour first; the coach / return-to-play messages always stay right under it */}
      {phase === 'morning' && (
        <div className="mt-4">
          {heroNode}
          {coachNode}
          {whyNode}
          {tagNode}
          {heartNode}
          {sleepNode}
          {loadNode}
        </div>
      )}
      {phase === 'afternoon' && (
        <div className="mt-4">
          {afternoonNode}
          {coachNode}
          {loadNode}
          {tagNode}
          <div className="mt-4">{heroNode}</div>
          {whyNode}
          {heartNode}
          {sleepNode}
        </div>
      )}
      {phase === 'evening' && (
        <div className="mt-4">
          {eveningNode}
          {coachNode}
          {sleepNode}
          {heartNode}
          {tagNode}
          {loadNode}
          <div className="mt-4">{heroNode}</div>
          {whyNode}
        </div>
      )}
    </div>
  );
}

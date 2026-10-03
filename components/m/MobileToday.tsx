'use client';

// components/m/MobileToday.tsx — "Сегодня", v3 "Night Performance" (mobile-first).
//
//   sticky glass header   date + "Сегодня"
//   ReadinessRing         engine score + zone (green ≥ 75, yellow 50–74, red < 50),
//                         change vs the athlete's own average
//   CoachInsight          instant summary from the engine numbers + link to the AI coach
//   LoadIndexGauge        ADP Load Index 0–100 + today's target corridor (lib/load-index.ts)
//   SleepCard             check-in sleep rating; stages only with a wearable (or labelled demo)
//   BiometricsGrid        HRV / RHR / SpO2 / skin temp / resp — wearable only (or labelled demo)
//   Plan                  the screen's ONE accent button
//   BottomTabBar          full-width fixed glass bar; "QR-допуск" opens SafetyPassSheet
//
// Every engine number comes in through props (/api/checkin). Wearable data is
// optional and never invented here.

import Link from 'next/link';
import type { ReactElement, ReactNode } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import type { PenaltyCode } from '@/lib/readiness-engine';
import { baselineDelta, loadIndex, targetLoadRange, usualDailyLoad } from '@/lib/load-index';
import BiometricsGrid, { type Biometric } from '@/components/np/BiometricsGrid';
import CoachInsight from '@/components/np/CoachInsight';
import LoadIndexGauge from '@/components/np/LoadIndexGauge';
import ReadinessRing from '@/components/np/ReadinessRing';
import SleepCard, { type SleepStages } from '@/components/np/SleepCard';
import { NP } from '@/components/np/copy';
import { npInter } from '@/components/np/font';
import { buildInsight } from '@/components/np/insight';
import { Card, DemoTag } from '@/components/np/ui';
import BottomTabBar from './BottomTabBar';
import { LOCALE, M, type Zone } from './copy';

export type TodayData = {
  score: number | null;
  zone: Zone | null;
  /** Check-in scale 1..7, 7 = best. */
  sleep: number | null;
  acwr: number | null;
  /** Sum of session loads over the last 7 days (AU). */
  acuteLoad: number | null;
  /** Usual week = mean weekly load over 28 days (AU). */
  chronicLoad: number | null;
  /** Session load of today only (AU) → Load Index. */
  dailyLoad?: number | null;
  /** Session load of yesterday (AU) → "yesterday's load" in the summary. */
  yesterdayLoad?: number | null;
  /** Scores of earlier days with a check-in, oldest → newest (for "vs your average"). */
  previousScores?: number[];
  /** Engine penalty codes of today. */
  penaltyCodes?: PenaltyCode[];
};

export type WearableData = {
  sleep?: { stages: SleepStages; bedtime?: { from: string; to: string }; consistency?: number; sleepHrv?: number } | null;
  biometrics?: Biometric[] | null;
  /** true = placeholder values, shown with a "Demo · needs a wearable" tag. */
  demo: boolean;
};

export default function MobileToday({
  lang,
  data,
  wearable = null,
  demo = false,
  onOpenPass,
  checkinHref = '/checkin',
  trainingHref = '/training',
  chatHref = '/chat',
  overlay,
}: {
  lang: Lang;
  /** null = no check-in today yet. */
  data: TodayData | null;
  /** Optional wearable values; null = no wearable connected. */
  wearable?: WearableData | null;
  /** Show a "Demo" tag in the header (demo athlete). */
  demo?: boolean;
  onOpenPass: () => void;
  checkinHref?: string;
  trainingHref?: string;
  chatHref?: string;
  /** Sheets/modals (SafetyPassSheet) rendered inside the same font scope. */
  overlay?: ReactNode;
}): ReactElement {
  const c = M[lang];
  const t = NP[lang];
  const dateText = new Date().toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' });
  const hasCheckin = data !== null && data.score !== null;

  const usualDay = usualDailyLoad(data?.chronicLoad);
  const index = loadIndex(data?.dailyLoad, usualDay);
  // Yesterday is measured against today's usual day — the 28-day base moves slowly.
  const yesterdayIndex = loadIndex(data?.yesterdayLoad, usualDay);
  const target = hasCheckin ? targetLoadRange(data?.score) : null;
  const delta = baselineDelta(data?.score, data?.previousScores ?? []);
  const insight = buildInsight({
    score: data?.score ?? null,
    zone: data?.zone ?? null,
    delta: delta?.delta ?? null,
    yesterdayIndex,
    acwr: data?.acwr ?? null,
    penalties: data?.penaltyCodes ?? [],
    locale: LOCALE[lang],
  });

  return (
    <div className={`${npInter.className} np-app min-h-dvh`}>
      <header className="np-glass sticky top-0 z-30 border-b border-np-line pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-[480px] items-end justify-between gap-3 px-5 pb-3 pt-4 sm:max-w-2xl">
          <div className="min-w-0">
            <p className="np-overline truncate first-letter:uppercase">{dateText}</p>
            <h1 className="mt-1 text-2xl font-bold leading-8 tracking-[-0.01em]" style={{ fontFamily: 'inherit' }}>
              {c.today}
            </h1>
          </div>
          {demo && <DemoTag>{t.demo}</DemoTag>}
        </div>
      </header>

      <main className="mx-auto max-w-[480px] space-y-4 px-4 pb-[calc(env(safe-area-inset-bottom)+120px)] pt-4 sm:max-w-2xl">
        <Card className="relative overflow-hidden px-4 py-6" index={0}>
          <ReadinessRing lang={lang} score={data?.score ?? null} zone={data?.zone ?? null} delta={delta} size={232} />
        </Card>

        <Card className="p-4 sm:p-5" index={1}>
          <CoachInsight lang={lang} input={insight} chatHref={chatHref} />
        </Card>

        <Card className="p-4 sm:p-5" index={2}>
          <LoadIndexGauge lang={lang} index={index} target={target} dailyLoad={data?.dailyLoad ?? null} usualDay={usualDay} />
        </Card>

        <Card className="p-4 sm:p-5" index={3}>
          <SleepCard
            lang={lang}
            quality={data?.sleep ?? null}
            stages={wearable?.sleep?.stages ?? null}
            bedtime={wearable?.sleep?.bedtime ?? null}
            consistency={wearable?.sleep?.consistency ?? null}
            sleepHrv={wearable?.sleep?.sleepHrv ?? null}
            demo={wearable?.demo ?? false}
          />
        </Card>

        <Card className="p-4 sm:p-5" index={4}>
          <BiometricsGrid lang={lang} items={wearable?.biometrics ?? null} demo={wearable?.demo ?? false} />
        </Card>

        <Card className="p-5" index={5}>
          <h2 className="text-sm font-semibold" style={{ fontFamily: 'inherit' }}>
            {hasCheckin ? c.planTitle : c.doCheckin}
          </h2>
          <p className="mt-1 text-sm text-np-text-2">{hasCheckin ? c.planBody : c.noCheckin}</p>
          {/* The ONE accent action of the screen. */}
          <Link href={hasCheckin ? trainingHref : checkinHref} className="np-btn-primary mt-5 flex h-12 w-full items-center justify-center rounded-np-ctrl text-sm font-semibold">
            {hasCheckin ? c.startTraining : c.doCheckin}
          </Link>
        </Card>
      </main>

      <BottomTabBar lang={lang} active="today" onPass={onOpenPass} />
      {overlay}
    </div>
  );
}

'use client';

// components/m/MobileToday.tsx — "Сегодня", Dark Minimal (mobile-first).
//
//   header        date (overline) + "Сегодня"
//   ReadinessCard thin arc, 40px score, status, ONE sentence of advice
//   Metrics       one card, three thin sliders: Сон · ACWR · Нагрузка 7 дней
//   Plan          the screen's ONE accent button (or "Пройти чек-ин")
//   BottomTabBar  fixed, 64px; "QR-допуск" opens SafetyPassSheet
//
// Every number comes in through props from the engine (/api/checkin);
// nothing is computed here except the load norm band = 0.8–1.3 × usual week,
// the same band the engine uses for ACWR.

import Link from 'next/link';
import { Inter } from 'next/font/google';
import type { ReactElement, ReactNode } from 'react';
import type { Lang } from '@/lib/i18n/translations';
import BottomTabBar from './BottomTabBar';
import MetricSlider from './MetricSlider';
import ReadinessCard from './ReadinessCard';
import { LOCALE, M, type Zone } from './copy';

const inter = Inter({ subsets: ['latin', 'latin-ext', 'cyrillic'], display: 'swap' });

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
};

const ACWR_NORM = { from: 0.8, to: 1.3 };

export default function MobileToday({
  lang,
  data,
  onOpenPass,
  checkinHref = '/checkin',
  trainingHref = '/training',
  overlay,
}: {
  lang: Lang;
  /** null = no check-in today yet. */
  data: TodayData | null;
  onOpenPass: () => void;
  checkinHref?: string;
  trainingHref?: string;
  /** Sheets/modals (SafetyPassSheet) rendered inside the same font scope. */
  overlay?: ReactNode;
}): ReactElement {
  const c = M[lang];
  const nf = new Intl.NumberFormat(LOCALE[lang]);
  const raw = new Date().toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' });
  const words = { inNorm: c.inNorm, belowNorm: c.belowNorm, aboveNorm: c.aboveNorm };
  const hasCheckin = data !== null && data.score !== null;
  const chronic = data?.chronicLoad ?? null;
  const loadNorm = chronic && chronic > 0 ? { from: chronic * ACWR_NORM.from, to: chronic * ACWR_NORM.to } : null;

  return (
    <div className={`${inter.className} ds-app min-h-dvh bg-ds-bg text-ds-text`}>
      <main className="mx-auto max-w-[480px] space-y-4 px-4 pb-[calc(64px+env(safe-area-inset-bottom)+24px)] pt-6">
        <header className="px-2 pb-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ds-text-3">{raw}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-[-0.01em]" style={{ fontFamily: 'inherit' }}>
            {c.today}
          </h1>
        </header>

        <ReadinessCard lang={lang} score={data?.score ?? null} zone={data?.zone ?? null} />

        <section className="rounded-card border border-ds-line bg-ds-surface p-6" aria-labelledby="metrics-title">
          <h2 id="metrics-title" className="mb-4 text-[11px] font-medium uppercase tracking-[0.06em] text-ds-text-3">
            {c.metrics}
          </h2>
          <div className="divide-y divide-ds-line">
            <MetricSlider
              label={c.sleep}
              valueText={data?.sleep != null ? String(data.sleep) : null}
              unit="/ 7"
              min={1}
              max={7}
              value={data?.sleep ?? null}
              norm={{ from: 5, to: 7 }}
              normText={c.norm('5–7')}
              words={words}
            />
            <MetricSlider
              label={c.acwr}
              valueText={data?.acwr != null ? data.acwr.toFixed(2) : null}
              min={0}
              max={2}
              value={data?.acwr ?? null}
              norm={ACWR_NORM}
              normText={c.norm('0.8–1.3')}
              words={words}
            />
            <MetricSlider
              label={c.load}
              valueText={data?.acuteLoad != null ? nf.format(Math.round(data.acuteLoad)) : null}
              unit={c.loadUnit}
              min={0}
              max={loadNorm ? (chronic as number) * 2 : Math.max(1, (data?.acuteLoad ?? 0) * 1.5)}
              value={data?.acuteLoad ?? null}
              norm={loadNorm}
              normText={loadNorm ? c.norm(`${nf.format(Math.round(loadNorm.from))}–${nf.format(Math.round(loadNorm.to))}`) : c.noBase}
              words={words}
            />
          </div>
        </section>

        <section className="rounded-card border border-ds-line bg-ds-surface p-6">
          <h2 className="text-sm font-semibold">{hasCheckin ? c.planTitle : c.doCheckin}</h2>
          <p className="mt-1 text-sm text-ds-text-2">{hasCheckin ? c.planBody : c.noCheckin}</p>
          {/* The ONE accent action of the screen. */}
          <Link
            href={hasCheckin ? trainingHref : checkinHref}
            className="mt-6 flex h-11 w-full items-center justify-center rounded-ctrl bg-ds-accent text-sm font-semibold text-ds-bg transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-accent"
          >
            {hasCheckin ? c.startTraining : c.doCheckin}
          </Link>
        </section>
      </main>

      <BottomTabBar lang={lang} active="today" onPass={onOpenPass} />
      {overlay}
    </div>
  );
}

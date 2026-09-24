'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { generateInsight, insightMessage } from '@/lib/generate-insight';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';

type HistoryPoint = ReadinessHistoryPoint;

const ZONE_BAR: Record<HistoryPoint['zone'], string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

const ZONE_DOT: Record<HistoryPoint['zone'], string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
};

const ZONE_TEXT: Record<HistoryPoint['zone'], string> = {
  green: 'text-emerald-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
};

const INSIGHT_STYLES: Record<'warning' | 'info' | 'positive', { border: string; bg: string; text: string; icon: string }> = {
  warning: { border: 'border-red-800', bg: 'bg-red-950/40', text: 'text-red-200', icon: '⚠️' },
  positive: { border: 'border-emerald-800', bg: 'bg-emerald-950/40', text: 'text-emerald-200', icon: '✨' },
  info: { border: 'border-slate-700', bg: 'bg-slate-800/60', text: 'text-gray-300', icon: '💡' },
};

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

// Lightweight inline SVG line chart for the ACWR trend — no charting
// library needed for one line + a shaded "safe zone" band.
function AcwrChart({ history }: { history: HistoryPoint[] }) {
  const { t } = useLanguage();
  const points = history.filter((p) => p.acwr !== null) as (HistoryPoint & { acwr: number })[];

  if (points.length < 2) {
    return <div className="text-sm text-gray-500 py-8 text-center">{t.progress.insightNotEnoughData}</div>;
  }

  const W = 600;
  const H = 160;
  const maxVal = Math.max(2, ...points.map((p) => p.acwr)) * 1.1;
  const xStep = W / (history.length - 1 || 1);

  const yFor = (v: number) => H - (v / maxVal) * H;
  const bandTop = yFor(1.3);
  const bandBottom = yFor(0.8);

  const coords = history.map((p, i) => {
    if (p.acwr === null) return null;
    return { x: i * xStep, y: yFor(p.acwr) };
  });

  const pathD = coords
    .map((c, i) => (c ? `${coords[i - 1] === null || i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}` : null))
    .filter(Boolean)
    .join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-40">
      <rect x={0} y={bandTop} width={W} height={bandBottom - bandTop} fill="#10b981" opacity={0.12} />
      <line x1={0} x2={W} y1={yFor(1)} y2={yFor(1)} stroke="#10b981" strokeOpacity={0.35} strokeDasharray="4 4" />
      <path d={pathD} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) =>
        c ? <circle key={i} cx={c.x} cy={c.y} r={2.5} fill="#34d399" /> : null
      )}
    </svg>
  );
}

export default function ProgressPage() {
  const { t } = useLanguage();
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch('/api/checkin?days=30', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (!res.ok) throw new Error('Failed to load history');
        const data = await res.json();
        if (!cancelled) setHistory(data.history ?? []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const last7 = history?.slice(-7) ?? [];
  const today = history?.[history.length - 1] ?? null;
  const avgScore7d = last7.length ? Math.round(last7.reduce((s, p) => s + p.score, 0) / last7.length) : null;
  const redDaysLast7 = last7.filter((p) => p.zone === 'red').length;
  const insight = history ? generateInsight(history) : null;
  const insightStyle = insight ? INSIGHT_STYLES[insight.severity] : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">{t.progress.title}</h1>
        <p className="text-gray-400 mb-6">{t.progress.subtitle}</p>

        {error && (
          <div className="rounded-lg bg-red-950/60 border border-red-800 p-4 text-sm text-red-300 mb-6">{error}</div>
        )}

        {!history && !error && <div className="text-gray-400">{t.common.loading}</div>}

        {history && history.length > 0 && insight && insightStyle && (
          <div className={`mb-6 rounded-lg border ${insightStyle.border} ${insightStyle.bg} p-4 flex gap-3`}>
            <span className="text-lg leading-none">{insightStyle.icon}</span>
            <p className={`text-sm ${insightStyle.text}`}>{insightMessage(insight, t.progress)}</p>
          </div>
        )}

        {history && history.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <p className="text-gray-400 text-sm mb-2">{t.progress.today}</p>
                <p className={`text-4xl font-bold ${today ? ZONE_TEXT[today.zone] : 'text-gray-500'}`}>
                  {today?.score ?? '—'}
                </p>
                <p className="text-gray-500 text-xs mt-1">Readiness Score</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <p className="text-gray-400 text-sm mb-2">{t.progress.avg7d}</p>
                <p className="text-4xl font-bold text-blue-400">{avgScore7d ?? '—'}</p>
              </div>

              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <p className="text-gray-400 text-sm mb-2">{t.progress.redDays}</p>
                <p className="text-4xl font-bold text-red-400">{redDaysLast7}</p>
                <p className="text-gray-500 text-xs mt-1">{t.progress.perWeek}</p>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">{t.progress.last30}</h2>
              <div className="flex items-end gap-1 h-40">
                {history.map((point) => (
                  <div
                    key={point.date}
                    className="flex-1 h-full flex flex-col justify-end group relative"
                    title={`${formatDayLabel(point.date)} · ${point.score}`}
                  >
                    <div
                      className={`${ZONE_BAR[point.zone]} rounded-t transition-all opacity-80 group-hover:opacity-100`}
                      style={{ height: `${Math.max(point.score, 4)}%` }}
                    />
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                      {formatDayLabel(point.date)}: {point.score}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatDayLabel(history[0].date)}</span>
                <span>{formatDayLabel(history[history.length - 1].date)}</span>
              </div>
              <div className="flex gap-4 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${ZONE_DOT.green}`} /> {t.progress.zoneGreen}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${ZONE_DOT.yellow}`} /> {t.progress.zoneYellow}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${ZONE_DOT.red}`} /> {t.progress.zoneRed}
                </span>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-6">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-xl font-bold text-white">{t.progress.acwrTitle}</h2>
                <span className="text-xs text-gray-500">{t.progress.acwrSweetSpot}</span>
              </div>
              <AcwrChart history={history} />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{formatDayLabel(history[0].date)}</span>
                <span>{formatDayLabel(history[history.length - 1].date)}</span>
              </div>
            </div>

            {redDaysLast7 >= 2 && (
              <div className="mt-6 bg-red-950/40 border border-red-800 rounded-lg p-6">
                <h2 className="text-lg font-bold text-red-300 mb-2">{t.progress.slowDownTitle}</h2>
                <p className="text-red-200/80 text-sm">{t.progress.slowDownBody(redDaysLast7)}</p>
              </div>
            )}
          </>
        )}

        {history && history.length === 0 && (
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 text-gray-400">
            {t.progress.empty}{' '}
            <a href="/checkin" className="text-emerald-400 underline">
              {t.progress.emptyLink}
            </a>
            .
          </div>
        )}
      </div>
    </div>
  );
}

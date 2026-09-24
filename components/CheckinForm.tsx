'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';

type ScaleField = 'sleepQuality' | 'stress' | 'fatigue' | 'soreness';

type ReadinessResult = {
  score: number;
  zone: 'green' | 'yellow' | 'red';
  acwr: number | null;
  penalties: { reason: string; points: number }[];
  inconsistencyFlags: string[];
  isPainBlocked: boolean;
};

type SafetyViolation = { code: string; message: string; severity: 'block' | 'warning' };

type CheckinApiResponse = {
  readiness: ReadinessResult;
  safetyViolations: SafetyViolation[];
};

const ZONE_STYLES: Record<ReadinessResult['zone'], { ring: string; glow: string; text: string }> = {
  green: { ring: 'ring-emerald-500', glow: 'from-emerald-500/20 to-emerald-500/5', text: 'text-emerald-400' },
  yellow: { ring: 'ring-yellow-500', glow: 'from-yellow-500/20 to-yellow-500/5', text: 'text-yellow-400' },
  red: { ring: 'ring-red-500', glow: 'from-red-500/20 to-red-500/5', text: 'text-red-400' },
};

export default function CheckinForm() {
  const router = useRouter();
  const { t } = useLanguage();

  const SCALE_LABELS: Record<ScaleField, { title: string; low: string; high: string }> = {
    sleepQuality: { title: t.checkin.sleep, low: t.checkin.sleepLow, high: t.checkin.sleepHigh },
    stress: { title: t.checkin.stress, low: t.checkin.stressLow, high: t.checkin.stressHigh },
    fatigue: { title: t.checkin.fatigue, low: t.checkin.fatigueLow, high: t.checkin.fatigueHigh },
    soreness: { title: t.checkin.soreness, low: t.checkin.sorenessLow, high: t.checkin.sorenessHigh },
  };

  const ZONE_LABEL: Record<ReadinessResult['zone'], string> = {
    green: t.progress.zoneGreen,
    yellow: t.progress.zoneYellow,
    red: t.progress.zoneRed,
  };

  const [values, setValues] = useState<Record<ScaleField, number>>({
    sleepQuality: 4,
    stress: 4,
    fatigue: 4,
    soreness: 4,
  });
  const [painFlag, setPainFlag] = useState(false);
  const [painZone, setPainZone] = useState('');
  const [trainedToday, setTrainedToday] = useState(false);
  const [rpe, setRpe] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckinApiResponse | null>(null);

  function setScale(field: ScaleField, value: number) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Same pattern as the chat page: attach the Supabase session when one
      // exists, otherwise the server falls back to its dev-mode bypass.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...values,
          painFlag,
          painZone: painFlag && painZone.trim() ? painZone.trim() : undefined,
          session: trainedToday ? { rpe, durationMinutes } : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.content || 'Could not submit check-in');
      }

      const data: CheckinApiResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    const zoneStyle = ZONE_STYLES[result.readiness.zone];
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div
            className={`rounded-2xl bg-slate-800 border border-slate-700 ring-2 ${zoneStyle.ring} bg-gradient-to-b ${zoneStyle.glow} p-8 text-center`}
          >
            <div className={`text-6xl font-bold ${zoneStyle.text}`}>{result.readiness.score}</div>
            <div className={`mt-2 text-sm font-medium ${zoneStyle.text}`}>{ZONE_LABEL[result.readiness.zone]}</div>
          </div>

          {result.safetyViolations.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.safetyViolations.map((v, i) => (
                <div key={i} className="rounded-lg bg-red-950/60 border border-red-800 p-3 text-sm text-red-300">
                  🚫 {v.message}
                </div>
              ))}
            </div>
          )}

          {result.readiness.inconsistencyFlags.length > 0 && (
            <div className="mt-4 space-y-2">
              {result.readiness.inconsistencyFlags.map((flag, i) => (
                <div key={i} className="rounded-lg bg-blue-950/60 border border-blue-800 p-3 text-sm text-blue-300">
                  🤔 {flag}
                </div>
              ))}
            </div>
          )}

          {result.readiness.penalties.length > 0 && (
            <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Why this score</div>
              <ul className="space-y-1 text-sm text-gray-300">
                {result.readiness.penalties.map((p, i) => (
                  <li key={i}>
                    −{p.points} · {p.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => router.push('/chat')}
            className="mt-6 w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-medium transition"
          >
            {t.checkin.toPlan}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="max-w-md w-full bg-slate-800 rounded-lg p-8 border border-slate-700 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">{t.checkin.title}</h1>
          <p className="text-gray-400 text-sm mt-1">{t.checkin.subtitle}</p>
        </div>

        {(Object.keys(SCALE_LABELS) as ScaleField[]).map((field) => (
          <div key={field}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-200">{SCALE_LABELS[field].title}</span>
              <span className="text-emerald-400 font-semibold">{values[field]}/7</span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              value={values[field]}
              onChange={(e) => setScale(field, Number(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{SCALE_LABELS[field].low}</span>
              <span>{SCALE_LABELS[field].high}</span>
            </div>
          </div>
        ))}

        <div className="border-t border-slate-700 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
            <input
              type="checkbox"
              checked={painFlag}
              onChange={(e) => setPainFlag(e.target.checked)}
              className="accent-red-500"
            />
            {t.checkin.painFlag}
          </label>
          {painFlag && (
            <input
              type="text"
              placeholder={t.checkin.painZonePlaceholder}
              value={painZone}
              onChange={(e) => setPainZone(e.target.value)}
              className="mt-2 w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          )}
        </div>

        <div className="border-t border-slate-700 pt-4">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
            <input
              type="checkbox"
              checked={trainedToday}
              onChange={(e) => setTrainedToday(e.target.checked)}
              className="accent-emerald-500"
            />
            {t.checkin.trainedToday}
          </label>
          {trainedToday && (
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-200">RPE</span>
                  <span className="text-emerald-400 font-semibold">{rpe}/10</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>
              <div>
                <label className="text-sm block mb-1 text-gray-200">Duration (min)</label>
                <input
                  type="number"
                  min={5}
                  max={300}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-950/60 border border-red-800 p-3 text-sm text-red-300">{error}</div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-3 font-medium disabled:opacity-50 transition"
        >
          {submitting ? t.common.loading : t.checkin.submit}
        </button>
      </form>
    </div>
  );
}

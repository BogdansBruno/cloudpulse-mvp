'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const SPORTS = ['Football', 'Basketball', 'Athletics', 'Swimming', 'Gym / General fitness', 'Other'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [age, setAge] = useState('');
  const [sport, setSport] = useState('');
  const [matchDaysText, setMatchDaysText] = useState(''); // comma-separated ISO dates, simplest MVP input
  const [examDaysText, setExamDaysText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseDates(text: string): string[] {
    return text
      .split(',')
      .map((d) => d.trim())
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  }

  const handleNext = async () => {
    setError(null);

    if (step === 1 && !age) {
      setError('Выбери возраст');
      return;
    }
    if (step === 2 && !sport) {
      setError('Выбери вид спорта');
      return;
    }

    if (step === 3) {
      setLoading(true);
      try {
        // Same pattern as chat/checkin: attach the Supabase session when
        // one exists, otherwise the server falls back to dev mode.
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            age: age ? Number(age.split('-')[0]) : undefined, // store the lower bound of the bracket
            sport,
            matchDates: parseDates(matchDaysText),
            examDates: parseDates(examDaysText),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.content || 'Не удалось сохранить профиль');
        }

        router.push('/checkin');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Что-то пошло не так');
      } finally {
        setLoading(false);
      }
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">CloudPulse</h1>
        <p className="text-gray-400 mb-8">Настроим твой профиль</p>

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Сколько тебе лет?</h2>
            <div className="space-y-2">
              {['13-15', '16-18'].map((option) => (
                <button
                  key={option}
                  onClick={() => setAge(option)}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    age === option ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Каким спортом занимаешься?</h2>
            <div className="space-y-2">
              {SPORTS.map((option) => (
                <button
                  key={option}
                  onClick={() => setSport(option)}
                  className={`w-full py-3 rounded-lg font-medium transition ${
                    sport === option ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Матчи и экзамены</h2>
            <p className="text-gray-400 text-sm mb-4">
              Это опционально, но именно это позволяет CloudPulse снижать нагрузку перед экзаменами и защищать тебя вокруг матчей. Можно пропустить и добавить позже.
            </p>
            <label className="text-sm text-gray-300 block mb-1">Даты матчей (через запятую, ГГГГ-ММ-ДД)</label>
            <input
              type="text"
              placeholder="2026-09-20, 2026-09-27"
              value={matchDaysText}
              onChange={(e) => setMatchDaysText(e.target.value)}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-gray-500 mb-4"
            />
            <label className="text-sm text-gray-300 block mb-1">Даты экзаменов (через запятую, ГГГГ-ММ-ДД)</label>
            <input
              type="text"
              placeholder="2026-10-01"
              value={examDaysText}
              onChange={(e) => setExamDaysText(e.target.value)}
              className="w-full rounded-lg bg-slate-700 border border-slate-600 px-3 py-2 text-sm text-white placeholder-gray-500"
            />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-950/60 border border-red-800 p-3 text-sm text-red-300">{error}</div>
        )}

        <button
          onClick={handleNext}
          disabled={loading}
          className="w-full mt-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50 transition"
        >
          {loading ? 'Сохраняю…' : step === 3 ? 'Начать' : 'Далее'}
        </button>
      </div>
    </div>
  );
}

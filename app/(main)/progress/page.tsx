'use client';

import { useState, useEffect } from 'react';

interface ProgressData {
  streak: number;
  completedThisWeek: number;
  completedThisMonth: number;
  totalSessions: number;
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressData>({
    streak: 5,
    completedThisWeek: 3,
    completedThisMonth: 12,
    totalSessions: 42,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Your Progress</h1>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-gray-400 text-sm mb-2">Current Streak</p>
            <p className="text-4xl font-bold text-emerald-400">{progress.streak}</p>
            <p className="text-gray-500 text-xs mt-1">days in a row</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-gray-400 text-sm mb-2">This Week</p>
            <p className="text-4xl font-bold text-blue-400">{progress.completedThisWeek}</p>
            <p className="text-gray-500 text-xs mt-1">sessions completed</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-gray-400 text-sm mb-2">This Month</p>
            <p className="text-4xl font-bold text-purple-400">{progress.completedThisMonth}</p>
            <p className="text-gray-500 text-xs mt-1">sessions completed</p>
          </div>

          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <p className="text-gray-400 text-sm mb-2">All Time</p>
            <p className="text-4xl font-bold text-yellow-400">{progress.totalSessions}</p>
            <p className="text-gray-500 text-xs mt-1">total sessions</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Weekly Activity</h2>
          <div className="space-y-3">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <div key={day} className="flex items-center gap-3">
                <span className="w-10 text-gray-400 text-sm font-medium">{day}</span>
                <div className="flex-1 bg-slate-700 rounded h-8 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full transition-all"
                    style={{ width: `${[60, 80, 100, 70, 90, 45, 0][idx]}%` }}
                  ></div>
                </div>
                <span className="w-8 text-right text-gray-400 text-sm">
                  {[60, 80, 100, 70, 90, 45, 0][idx]}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 bg-slate-800 rounded-lg p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">Keep it up! 🔥</h2>
          <p className="text-gray-400">
            You're doing amazing! Keep your streak alive by completing your sessions. Remember, consistency is key to building strong habits.
          </p>
        </div>
      </div>
    </div>
  );
}
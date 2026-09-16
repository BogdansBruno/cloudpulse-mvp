'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // If logged in, redirect to chat
        window.location.href = '/chat';
      } else {
        // If not logged in, redirect to login
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">CloudPulse</h1>
        <p className="text-gray-400">Loading your fitness journey...</p>
      </div>
    </div>
  );
}
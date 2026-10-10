'use client';

// components/np/useAccount.ts — who is signed in, for the shell header / rail and the Settings page.
// First letter of the e-mail only: no name or photo is shown (GDPR minimisation).

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/access-control';
import type { NavRole } from './nav';

/** navigator.onLine, live. The offline queue (lib/offline-queue.ts) keeps check-ins until the network is back. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener('online', on);
    window.addEventListener('offline', on);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', on);
    };
  }, []);
  return online;
}

export function useAccount(): { role: NavRole; isAdmin: boolean; initial: string } {
  const [role, setRole] = useState<NavRole>('athlete');
  const [isAdmin, setIsAdmin] = useState(false);
  const [initial, setInitial] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (cancelled) return;
      setIsAdmin(isAdminEmail(user?.email));
      setInitial((user?.email ?? '').trim().charAt(0).toUpperCase());
      if (!user?.id) return;
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (cancelled) return;
          if (profile?.role === 'coach') setRole('coach');
          else if (profile?.role === 'parent') setRole('parent');
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { role, isAdmin, initial };
}

/** True for the public jury demo accounts (profiles.is_demo, see lib/demo.ts). Only they may see
 *  labelled demo wearable values (components/np/demo.ts); real athletes never do. */
export function useIsDemo(): boolean {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return;
      const { data: profile } = await supabase.from('profiles').select('is_demo').eq('id', uid).maybeSingle();
      if (!cancelled) setDemo(profile?.is_demo === true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return demo;
}

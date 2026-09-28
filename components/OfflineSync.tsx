'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WifiSlash, CloudArrowUp, CheckCircle } from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { todayUtc } from '@/lib/checkin-streak';
import {
  readQueue,
  removeFromQueue,
  pendingFor,
  storedUserId,
  syncOutcome,
  withTimeout,
  QUEUE_EVENT,
  SYNCED_EVENT,
} from '@/lib/offline-queue';

// ---------------------------------------------------------------------------
// Lives in the main layout. Shows a thin strip when the phone is offline or
// has check-ins waiting, and sends queued check-ins (lib/offline-queue.ts)
// when the page loads with a connection and whenever the connection returns.
// Only the signed-in user's items are sent; the server re-checks the date.
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const REQUEST_TIMEOUT_MS = 15_000;

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function countFor(store: Storage | null): number {
  if (!store) return 0;
  const uid = storedUserId(store, SUPABASE_URL);
  return uid ? readQueue(store).filter((q) => q.userId === uid).length : 0;
}

export default function OfflineSync() {
  const { t } = useLanguage();
  const o = t.offline;
  // Rendered only after AccessGate has loaded (client side), so reading
  // navigator/localStorage in the initial state can't cause a hydration mismatch.
  const [online, setOnline] = useState(() => navigator.onLine);
  const [pending, setPending] = useState(() => countFor(safeStorage()));
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const busy = useRef(false);

  const countPending = useCallback(() => setPending(countFor(safeStorage())), []);

  const flush = useCallback(async () => {
    const store = safeStorage();
    if (!store || busy.current || !navigator.onLine) return;
    const localUid = storedUserId(store, SUPABASE_URL);
    if (!localUid || readQueue(store).every((q) => q.userId !== localUid)) return;

    busy.current = true;
    setSyncing(true);
    let sent = 0;
    let expiredCount = 0;
    try {
      const { data } = await withTimeout(supabase.auth.getSession(), REQUEST_TIMEOUT_MS);
      const session = data.session;
      if (!session) return;

      const { send, expired } = pendingFor(readQueue(store), session.user.id, todayUtc());
      if (expired.length > 0) {
        removeFromQueue(store, expired.map((q) => q.id));
        expiredCount = expired.length;
      }

      for (const item of send) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
          const res = await fetch('/api/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ ...item.payload, date: item.date }),
            signal: controller.signal,
          });
          const outcome = syncOutcome(res.status);
          if (outcome === 'retry') break; // session or server trouble: try the rest later
          removeFromQueue(store, [item.id]);
          if (outcome === 'done') sent++;
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {
      // Lost the connection mid-way: whatever is left stays queued.
    } finally {
      busy.current = false;
      setSyncing(false);
      countPending();
      if (sent > 0) {
        window.dispatchEvent(new Event(SYNCED_EVENT));
        setNotice(o.synced(sent));
      } else if (expiredCount > 0) {
        setNotice(o.expired);
      }
    }
  }, [countPending, o]);

  useEffect(() => {
    flush();

    const goOnline = () => {
      setOnline(true);
      flush();
    };
    const goOffline = () => setOnline(false);
    const onQueue = () => countPending();
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener(QUEUE_EVENT, onQueue);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener(QUEUE_EVENT, onQueue);
    };
  }, [flush, countPending]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(id);
  }, [notice]);

  if (online && pending === 0 && !notice) return null;

  const strip =
    'mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-4 py-2 text-xs text-zinc-200 ring-1 ring-inset';

  return (
    <div className="px-3 pt-2 md:px-6" role="status" aria-live="polite">
      {!online ? (
        <div className={`${strip} bg-[#FFB020]/[0.08] ring-[#FFB020]/25`}>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <WifiSlash size={14} weight="bold" className="text-[#FFB020]" />
            {o.offlineBanner}
          </span>
          {pending > 0 && <span className="ml-auto text-zinc-400">{o.pending(pending)}</span>}
        </div>
      ) : pending > 0 ? (
        <div className={`${strip} bg-white/[0.04] ring-white/[0.1]`}>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <CloudArrowUp size={14} weight="bold" className="text-[#CCFF00]" />
            {o.pending(pending)}
          </span>
          <button
            type="button"
            onClick={flush}
            disabled={syncing}
            className="ml-auto font-semibold text-[#CCFF00] disabled:opacity-60"
          >
            {syncing ? o.sending : o.sendNow}
          </button>
        </div>
      ) : (
        notice && (
          <div className={`${strip} bg-[#CCFF00]/[0.08] ring-[#CCFF00]/25`}>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CheckCircle size={14} weight="fill" className="text-[#CCFF00]" />
              {notice}
            </span>
          </div>
        )
      )}
    </div>
  );
}

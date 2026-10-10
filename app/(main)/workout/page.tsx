'use client';

// /workout — Live session (Lotus, step 7). A full-screen modal without app chrome
// (components/np/nav.ts → isImmersiveRoute), readable from 2–3 m on the gym floor.
//
//   top bar      × close · LIVE SESSION badge (pulsing coral while running) · title with the suggested
//                zone focus (from today's readiness zone: green → 3, yellow → 2, red → 1) · elapsed time
//   hero         live heart rate from a Bluetooth strap in big mono digits, a pulse icon that beats
//                with each reading, the current zone badge
//   zone bar     zones 1–5 as % of max heart rate (Tanaka: 208 − 0.7 × age, age from the profile) with
//                a glowing cursor at the live value
//   metrics      time in zone 3+, Edwards TRIMP (minutes × zone number), average and max heart rate —
//                all computed from the readings of this session. No calories (needs weight and sex,
//                not collected — and not a number to push at teenagers) and no pace (no GPS).
//   sets         the set stopwatch / rest countdown (rest colour: red → amber → green) and set count
//   bottom bar   PAUSE / RESUME (glass) and HOLD TO END (1.5 s, progress ring) — the hold replaces the
//                "Finish?" dialog, so a pocket tap can't end the session.
//
// Heart rate: Web Bluetooth, standard Heart Rate service (0x180D). No sensor / no Web Bluetooth
// (Safari on iPhone) → "—" and a note; the timer works anyway. Readings stay on the phone: nothing
// is stored or sent. Gaps longer than 10 s (strap dropped) are not counted as time in a zone.
// Screen wake lock while the session runs, where the browser supports it.

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { APP } from '@/components/np/appCopy';
import { HOME } from '@/components/np/homeCopy';
import { Icon } from '@/components/np/icons';
import { useHistory } from '@/components/np/useHistory';
import { useReducedMotion } from '@/components/np/ui';
import { HR_ZONE_HEX, LT } from '@/components/np/status';

type Phase = 'idle' | 'work' | 'rest' | 'done';
type Ble = 'checking' | 'unsupported' | 'idle' | 'connecting' | 'connected' | 'lost' | 'error';

// ---- minimal Web Bluetooth typing (not in TypeScript's DOM lib) ----
type BtChar = EventTarget & { value?: DataView; startNotifications(): Promise<BtChar> };
type BtServer = { getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<BtChar> }> };
type BtDevice = EventTarget & { gatt?: { connect(): Promise<BtServer>; disconnect(): void; connected: boolean } };
type Bt = { requestDevice(o: { filters: { services: string[] }[] }): Promise<BtDevice> };
type WakeSentinel = { release(): Promise<void> };

const REST_PRESETS = [60, 90, 120, 180];
const HOLD_MS = 1500;
const MAX_GAP_MS = 10_000;
const CORAL = LT.engaged;
const CYAN = LT.good;

/** Zones as fractions of max heart rate. */
const ZONES = [
  { n: 1, lo: 0.5, hi: 0.6, color: HR_ZONE_HEX[0] },
  { n: 2, lo: 0.6, hi: 0.7, color: HR_ZONE_HEX[1] },
  { n: 3, lo: 0.7, hi: 0.8, color: HR_ZONE_HEX[2] },
  { n: 4, lo: 0.8, hi: 0.9, color: HR_ZONE_HEX[3] },
  { n: 5, lo: 0.9, hi: 1.0, color: HR_ZONE_HEX[4] },
] as const;

/** 0 = below zone 1, 1–5 = zone. */
function zoneOf(bpm: number, max: number): number {
  const f = bpm / max;
  if (f < 0.5) return 0;
  if (f >= 0.9) return 5;
  return ZONES.find((z) => f >= z.lo && f < z.hi)?.n ?? 0;
}

const pad = (n: number) => String(n).padStart(2, '0');
function hms(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
function ms(msv: number): string {
  const s = Math.max(0, Math.round(msv / 1000));
  return `${Math.floor(s / 60)}:${pad(s % 60)}`;
}

/** Heart Rate Measurement characteristic → bpm + R-R intervals (ms). */
function parseHr(dv: DataView): { bpm: number; rr: number[] } {
  const flags = dv.getUint8(0);
  const wide = (flags & 0x01) !== 0;
  const bpm = wide ? dv.getUint16(1, true) : dv.getUint8(1);
  let o = wide ? 3 : 2;
  if (flags & 0x08) o += 2; // energy expended
  const rr: number[] = [];
  if (flags & 0x10) {
    for (; o + 1 < dv.byteLength; o += 2) rr.push((dv.getUint16(o, true) / 1024) * 1000);
  }
  return { bpm, rr };
}

type HrStats = { n: number; sum: number; max: number; zoneMs: number[] };
const EMPTY_STATS: HrStats = { n: 0, sum: 0, max: 0, zoneMs: [0, 0, 0, 0, 0, 0] };

export default function WorkoutPage() {
  const { lang } = useLanguage();
  const w = APP[lang].workout;
  const lc = HOME[lang].live;
  const disclaimer = APP[lang].v3.disclaimerShort;
  const reduce = useReducedMotion();

  const [phase, setPhase] = useState<Phase>('idle');
  const [paused, setPaused] = useState(false);
  const [sets, setSets] = useState(0);
  const [restSec, setRestSec] = useState(90);
  const [now, setNow] = useState(() => Date.now());
  // timestamps (ms); pauses shift them forward so elapsed time excludes the pause
  const t0 = useRef<number | null>(null);
  const phaseAt = useRef<number>(0);
  const pausedAt = useRef<number | null>(null);
  const endedAt = useRef<number | null>(null);
  const restDoneSignalled = useRef(false);

  // max heart rate from the profile age (Tanaka); null without an age
  const [maxHr, setMaxHr] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const res = await fetch('/api/profile', { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        if (!res.ok) return;
        const { profile } = (await res.json()) as { profile?: { age?: number | null } };
        const age = profile?.age;
        if (!cancelled && typeof age === 'number' && age >= 8 && age <= 80) setMaxHr(Math.round(208 - 0.7 * age));
      } catch {
        // no zones then; the rest works
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // suggested focus from today's readiness zone (guidance only)
  const { history } = useHistory(1);
  const todayPoint = history?.[history.length - 1];
  const focus = todayPoint?.hasCheckin ? (todayPoint.zone === 'green' ? 3 : todayPoint.zone === 'yellow' ? 2 : 1) : null;

  // heart rate
  const [ble, setBle] = useState<Ble>('checking');
  const [bpm, setBpm] = useState<number | null>(null);
  const [beat, setBeat] = useState(0);
  const [stats, setStats] = useState<HrStats>(EMPTY_STATS);
  const lastSample = useRef<{ t: number; bpm: number } | null>(null);
  const device = useRef<BtDevice | null>(null);
  const counting = phase === 'work' || phase === 'rest';
  const countingRef = useRef(false);
  countingRef.current = counting && !paused;
  const maxHrRef = useRef<number | null>(null);
  maxHrRef.current = maxHr;

  const [infoOpen, setInfoOpen] = useState(false);

  // wake lock
  const wake = useRef<WakeSentinel | null>(null);
  const requestWake = useCallback(async () => {
    try {
      const wl = (navigator as unknown as { wakeLock?: { request(t: 'screen'): Promise<WakeSentinel> } }).wakeLock;
      if (!wl) return;
      wake.current = await wl.request('screen');
    } catch {
      // not available: fine
    }
  }, []);
  const releaseWake = useCallback(() => {
    void wake.current?.release().catch(() => {});
    wake.current = null;
  }, []);
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && countingRef.current) void requestWake();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [requestWake]);
  useEffect(() => releaseWake, [releaseWake]);

  useEffect(() => {
    const bt = (navigator as unknown as { bluetooth?: Bt }).bluetooth;
    setBle(bt && window.isSecureContext ? 'idle' : 'unsupported');
    return () => {
      device.current?.gatt?.disconnect();
    };
  }, []);

  // ticking clock while the session runs
  useEffect(() => {
    if (!counting || paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [counting, paused]);

  const elapsed = t0.current === null ? 0 : (endedAt.current ?? (paused && pausedAt.current ? pausedAt.current : now)) - t0.current;
  const inPhase = (paused && pausedAt.current ? pausedAt.current : now) - phaseAt.current;
  const restLeft = Math.max(0, restSec * 1000 - inPhase);
  const restFrac = phase === 'rest' ? Math.min(1, inPhase / (restSec * 1000)) : 0;
  const restOver = phase === 'rest' && restLeft === 0;
  // rest between sets: the calm lavender of the Lotus palette
  const restColor = LT.relax;

  useEffect(() => {
    if (restOver && !restDoneSignalled.current) {
      restDoneSignalled.current = true;
      try {
        navigator.vibrate?.(200);
      } catch {
        // no vibration: the colour and the words still say it
      }
    }
  }, [restOver]);

  const startSet = () => {
    const at = Date.now();
    if (t0.current === null) t0.current = at;
    phaseAt.current = at;
    setNow(at);
    setPhase('work');
    setPaused(false);
    void requestWake();
  };
  const endSet = () => {
    const at = Date.now();
    phaseAt.current = at;
    restDoneSignalled.current = false;
    setNow(at);
    setSets((n) => n + 1);
    setPhase('rest');
  };
  const togglePause = () => {
    const at = Date.now();
    if (!paused) {
      pausedAt.current = at;
      setPaused(true);
      releaseWake();
    } else {
      const gap = at - (pausedAt.current ?? at);
      if (t0.current !== null) t0.current += gap;
      phaseAt.current += gap;
      pausedAt.current = null;
      lastSample.current = null; // don't count the pause as zone time
      setNow(at);
      setPaused(false);
      void requestWake();
    }
  };
  // the hold-to-end loop calls this from an animation frame, so it reads the phase from a ref
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const finish = () => {
    endedAt.current = pausedAt.current ?? Date.now();
    if (phaseRef.current === 'work') setSets((n) => n + 1);
    setPhase('done');
    setPaused(false);
    releaseWake();
  };

  async function connect() {
    const bt = (navigator as unknown as { bluetooth?: Bt }).bluetooth;
    if (!bt) return;
    setBle('connecting');
    try {
      const dev = await bt.requestDevice({ filters: [{ services: ['heart_rate'] }] });
      device.current = dev;
      dev.addEventListener('gattserverdisconnected', () => {
        setBle('lost');
        setBpm(null);
        lastSample.current = null;
      });
      const server = await dev.gatt!.connect();
      const svc = await server.getPrimaryService('heart_rate');
      const ch = await svc.getCharacteristic('heart_rate_measurement');
      ch.addEventListener('characteristicvaluechanged', (e) => {
        const dv = (e.target as BtChar).value;
        if (!dv) return;
        const { bpm: b } = parseHr(dv);
        if (b <= 0) return;
        setBpm(b);
        setBeat((k) => k + 1);
        const t = Date.now();
        const prev = lastSample.current;
        lastSample.current = { t, bpm: b };
        if (!countingRef.current) return;
        setStats((s) => {
          const zoneMs = [...s.zoneMs];
          if (prev && t - prev.t <= MAX_GAP_MS && maxHrRef.current) zoneMs[zoneOf(prev.bpm, maxHrRef.current)] += t - prev.t;
          return { n: s.n + 1, sum: s.sum + b, max: Math.max(s.max, b), zoneMs };
        });
      });
      await ch.startNotifications();
      setBle('connected');
    } catch {
      setBle(device.current ? 'error' : 'idle');
    }
  }

  // ---- hold to end ----
  const [hold, setHold] = useState(0); // 0..1
  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef<number | null>(null);
  const stopHold = () => {
    if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
    holdRaf.current = null;
    holdStart.current = null;
    setHold(0);
  };
  const startHold = () => {
    if (holdStart.current !== null) return;
    holdStart.current = performance.now();
    const tick = () => {
      if (holdStart.current === null) return;
      const f = Math.min(1, (performance.now() - holdStart.current) / HOLD_MS);
      setHold(f);
      if (f >= 1) {
        stopHold();
        try {
          navigator.vibrate?.(40);
        } catch {
          // ignore
        }
        finish();
        return;
      }
      holdRaf.current = requestAnimationFrame(tick);
    };
    holdRaf.current = requestAnimationFrame(tick);
  };
  useEffect(() => () => stopHold(), []);
  const holdKey = (e: ReactKeyboardEvent<HTMLButtonElement>, down: boolean) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (down) startHold();
    else stopHold();
  };

  // ---- derived ----
  const zone = bpm !== null && maxHr ? zoneOf(bpm, maxHr) : null;
  const zoneInfo = zone ? ZONES[zone - 1] : null;
  const zoneName = (n: number) => lc.zoneNames[n - 1];
  const range = (n: number) => (maxHr ? [Math.round(ZONES[n - 1].lo * maxHr), Math.round(ZONES[n - 1].hi * maxHr) - 1] : [0, 0]);
  const avg = stats.n ? Math.round(stats.sum / stats.n) : null;
  const z3plus = stats.zoneMs[3] + stats.zoneMs[4] + stats.zoneMs[5];
  const trimp = Math.round(stats.zoneMs.reduce((acc, v, i) => acc + (v / 60000) * i, 0));
  const cursor = bpm !== null && maxHr ? Math.max(0, Math.min(1, (bpm / maxHr - 0.5) / 0.5)) : null;
  const hasHr = ble === 'connected' && bpm !== null;
  const running = counting && !paused;
  const status = phase === 'idle' ? lc.ready : paused ? lc.paused : lc.live;
  const heartColor = zoneInfo?.color ?? CORAL;

  const metric = (label: string, value: string, unit: string, hint?: string) => (
    <div className="np-card px-4 py-3">
      <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-np-text-3">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="font-mono text-xl font-semibold tracking-tight text-white">{value}</span>
        <span className="text-xs text-np-text-3">{unit}</span>
      </p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-np-text-3">{hint}</p>}
    </div>
  );

  // ---------------------------------------------------------------- done
  if (phase === 'done') {
    const min = Math.max(1, Math.round(elapsed / 60000));
    return (
      <div className="np-mesh-deep relative flex min-h-dvh flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#3FE0A8]/30 bg-[#3FE0A8]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#3FE0A8]">{lc.summary}</span>
            <Link href="/today" aria-label={w.exit} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80">
              <Icon name="close" size={18} />
            </Link>
          </div>
          <h1 className="np-editorial mt-6 text-3xl font-semibold text-white">{w.finished(min, sets)}</h1>
          <p className="mt-1 font-mono text-sm text-np-text-3">{hms(elapsed)}</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {metric(lc.avg, avg !== null ? String(avg) : '—', w.bpm, avg === null ? lc.noHr : undefined)}
            {metric(lc.max, stats.max ? String(stats.max) : '—', w.bpm, stats.max ? undefined : lc.noHr)}
            {metric(lc.inZone, maxHr && stats.n ? ms(z3plus) : '—', lc.min, maxHr ? undefined : lc.noAge)}
            {metric(lc.trimp, maxHr && stats.n ? String(trimp) : '—', '', lc.trimpHint)}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-white/75">{w.logHint}</p>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <Link href="/checkin" className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/15 text-base font-semibold text-white">
              {w.toCheckin}
              <Icon name="arrowR" size={18} stroke={1.75} />
            </Link>
            <Link href="/today" className="flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-medium text-white/80">
              {w.exit}
            </Link>
          </div>
          <p className="mt-6 text-center text-[11px] text-np-text-3">{disclaimer}</p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- live
  return (
    <div className="np-mesh-deep relative flex min-h-dvh flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-[calc(env(safe-area-inset-top)+16px)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {/* top bar */}
        <header className="flex items-center justify-between gap-3">
          <Link href="/today" aria-label={w.exit} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10">
            <Icon name="close" size={18} />
          </Link>
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${
              running ? 'border-[#F25CA8]/30 bg-[#F25CA8]/15 text-[#F25CA8]' : 'border-white/10 bg-white/5 text-white/75'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {running && !reduce && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#F25CA8] opacity-60" />}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${running ? 'bg-[#F25CA8]' : paused ? 'bg-[#8E8CFF]' : 'bg-white/50'}`} />
            </span>
            {status}
          </span>
          {ble === 'unsupported' || ble === 'checking' ? (
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              aria-expanded={infoOpen}
              aria-controls="wo-ble-note"
              aria-label={`${w.ble.noSensor}. ${w.info}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/75"
            >
              <Icon name="bluetooth" size={18} />
            </button>
          ) : (
            <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 ${ble === 'connected' ? 'text-[#B8F23C]' : 'text-white/75'}`}>
              <Icon name="bluetooth" size={18} />
            </span>
          )}
        </header>
        {infoOpen && (
          <p id="wo-ble-note" role="status" className="np-enter mt-3 rounded-2xl border border-white/10 bg-[#0B0D11]/90 p-3 text-xs leading-relaxed text-white/75">
            {w.ble.unsupported}
          </p>
        )}

        <div className="mt-3 text-center">
          <h1 className="text-base font-light text-white" style={{ fontFamily: 'inherit' }}>
            {lc.title}
            {focus && <span className="text-white/75"> • {lc.focus(focus)}</span>}
          </h1>
          <p className="mt-0.5 font-mono text-xl tracking-wider text-white/90" aria-label={`${w.elapsed} ${hms(elapsed)}`}>
            {hms(elapsed)}
          </p>
        </div>

        {/* hero heart rate */}
        <section className="mt-4 flex flex-col items-center" aria-live="off">
          <div className="flex items-center gap-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            {hasHr && !reduce && (
              <>
                <span aria-hidden className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${heartColor}55, transparent 70%)`, animation: 'np-breathe 2.4s ease-in-out infinite' }} />
                <span aria-hidden className="absolute inset-3 rounded-full" style={{ background: `radial-gradient(circle, ${CYAN}33, transparent 70%)`, animation: 'np-breathe 1.6s ease-in-out infinite' }} />
              </>
            )}
            <Icon
              key={beat}
              name="heart"
              size={36}
              active
              className="relative"
              style={{ color: hasHr ? heartColor : 'rgb(255 255 255 / 0.3)', filter: hasHr ? `drop-shadow(0 0 10px ${heartColor})` : undefined, animation: hasHr && !reduce ? 'np-breathe 0.45s ease-out 1' : undefined }}
            />
          </div>
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-[76px] font-bold leading-none tracking-tighter text-white" aria-label={hasHr ? `${bpm} ${w.bpm}` : w.ble.noSensor}>
              {hasHr ? bpm : '—'}
            </span>
            <span className="font-mono text-lg font-semibold text-white/75">BPM</span>
          </p>
          </div>
          <div className="mt-2 min-h-[28px]">
            {hasHr && maxHr ? (
              zone ? (
                <span className="rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider" style={{ color: zoneInfo!.color, borderColor: `${zoneInfo!.color}40`, backgroundColor: `${zoneInfo!.color}14` }}>
                  {lc.zone(zone, zoneName(zone), range(zone)[0], range(zone)[1])}
                </span>
              ) : (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-white/75">{lc.below}</span>
              )
            ) : ble === 'idle' || ble === 'lost' || ble === 'error' || ble === 'connecting' ? (
              <button
                type="button"
                onClick={connect}
                disabled={ble === 'connecting'}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-medium text-[#B8F23C] disabled:opacity-60"
              >
                <Icon name="bluetooth" size={16} />
                {ble === 'connecting' ? w.ble.connecting : ble === 'lost' ? w.ble.lost : ble === 'error' ? w.ble.error : w.ble.connect}
              </button>
            ) : !hasHr ? (
              <span className="text-xs text-np-text-3">{lc.noHr}</span>
            ) : (
              <span className="text-xs text-np-text-3">{lc.noAge}</span>
            )}
          </div>
        </section>

        {/* 5-zone bar */}
        <section className="mt-5" aria-label={lc.zonesNote}>
          <div className="relative">
            <div className="flex h-2.5 gap-1">
              {ZONES.map((z) => (
                <span key={z.n} className="h-full flex-1 overflow-hidden rounded-full bg-[#9AA7B8]/10">
                  <span className="block h-full w-full rounded-full" style={{ backgroundColor: z.color, opacity: zone === z.n ? 1 : 0.4, boxShadow: zone === z.n ? `0 0 12px ${z.color}` : undefined }} />
                </span>
              ))}
            </div>
            {cursor !== null && (
              <span
                aria-hidden
                className="absolute -top-2 h-[26px] w-[3px] -translate-x-1/2 rounded-full"
                style={{ left: `${cursor * 100}%`, backgroundColor: heartColor, filter: `drop-shadow(0 0 8px ${heartColor})`, transition: 'left 400ms ease-out' }}
              />
            )}
          </div>
          <div className="mt-2 flex font-mono text-[10px] text-white/75">
            {ZONES.map((z) => (
              <span key={z.n} className={`flex-1 text-center ${zone === z.n ? 'text-white' : ''}`}>
                Z{z.n}
              </span>
            ))}
          </div>
          {!maxHr && <p className="mt-2 text-center text-[11px] text-np-text-3">{lc.noAge}</p>}
        </section>

        {/* metrics */}
        <section className="mt-5 grid grid-cols-2 gap-2.5">
          {metric(lc.inZone, maxHr && stats.n ? ms(z3plus) : '—', lc.min)}
          {metric(lc.trimp, maxHr && stats.n ? String(trimp) : '—', '')}
          {metric(lc.avg, avg !== null ? String(avg) : '—', w.bpm)}
          {metric(lc.max, stats.max ? String(stats.max) : '—', w.bpm)}
        </section>
        {(ble === 'idle' || ble === 'lost' || ble === 'error' || ble === 'connecting') && <p className="mt-2 text-center text-[11px] text-np-text-3">{lc.noHr}</p>}

        {/* sets & rest */}
        {phase !== 'idle' && (
          <section className="mt-2.5 np-card px-4 py-3">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: phase === 'rest' ? restColor : 'var(--color-np-text-3)' }}>
                  {phase === 'rest' ? (restOver ? w.restDone : `${w.rest} · ${w.restLeft}`) : `${w.work} · ${w.set(sets + 1)}`}
                </p>
                <p className="mt-0.5 font-mono text-2xl font-semibold text-white" aria-live="polite">
                  {phase === 'rest' ? ms(restLeft) : ms(inPhase)}
                </p>
              </div>
              <button
                type="button"
                data-act="set"
                onClick={phase === 'work' ? endSet : startSet}
                disabled={paused}
                className="h-11 shrink-0 rounded-full border border-white/20 bg-white/10 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/15 disabled:opacity-50"
              >
                {phase === 'work' ? w.endSet : w.startSet}
              </button>
            </div>
            {phase === 'rest' && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#9AA7B8]/10">
                <span className="block h-full rounded-full" style={{ width: `${restFrac * 100}%`, backgroundColor: restColor, transition: 'width 250ms linear, background-color 600ms' }} />
              </div>
            )}
            {phase === 'rest' && (
              <div className="mt-3 flex items-center gap-2" role="radiogroup" aria-label={w.restSec}>
                <span className="mr-1 whitespace-nowrap text-[11px] text-np-text-3">{w.restSec}</span>
                {REST_PRESETS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={restSec === s}
                    onClick={() => setRestSec(s)}
                    className={`h-8 min-w-10 rounded-full border px-2 font-mono text-xs ${restSec === s ? 'border-white/20 bg-white/15 text-white' : 'border-white/10 text-white/75'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* bottom controls */}
        <footer className="mt-auto pt-4">
          {phase === 'idle' ? (
            <button
              type="button"
              data-act="primary"
              onClick={startSet}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 text-base font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white/15"
            >
              <Icon name="play" size={20} active />
              {lc.start}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                data-act="pause"
                onClick={togglePause}
                className="flex h-16 flex-1 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-white/15"
              >
                <Icon name={paused ? 'play' : 'pause'} size={20} active />
                {paused ? lc.resume : lc.pause}
              </button>
              <button
                type="button"
                aria-label={`${lc.holdEnd} (${lc.holdHint})`}
                title={lc.holdHint}
                onPointerDown={startHold}
                onPointerUp={stopHold}
                onPointerLeave={stopHold}
                onPointerCancel={stopHold}
                onKeyDown={(e) => holdKey(e, true)}
                onKeyUp={(e) => holdKey(e, false)}
                onContextMenu={(e) => e.preventDefault()}
                className="relative flex h-16 w-16 shrink-0 touch-none select-none items-center justify-center rounded-full border border-[#FF3D5A]/30 bg-[#FF3D5A]/15 text-[#FF3D5A]"
              >
                <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
                  <circle cx="32" cy="32" r="29" fill="none" stroke="rgb(248 113 113 / 0.15)" strokeWidth="3" />
                  <circle
                    cx="32"
                    cy="32"
                    r="29"
                    fill="none"
                    stroke="#FF3D5A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 29}
                    strokeDashoffset={2 * Math.PI * 29 * (1 - hold)}
                    style={{ filter: hold > 0 ? 'drop-shadow(0 0 6px #FF3D5A)' : undefined }}
                  />
                </svg>
                <Icon name="stop" size={20} active />
              </button>
            </div>
          )}
          <p className="mt-3 text-center text-[10px] leading-relaxed text-np-text-3">
            {phase !== 'idle' && <span className="text-white/75">{lc.holdEnd} · </span>}
            {maxHr ? `${lc.zonesNote} TRIMP = ${lc.trimpHint}.` : disclaimer}
          </p>
        </footer>
      </div>
    </div>
  );
}

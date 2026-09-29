'use client';

// ---------------------------------------------------------------------------
// Alert sound for /coach. Browsers block sound until the person has tapped
// the page, so the coach switches it on once with a button ("Включить звук");
// the choice is remembered and, after a reload, sound comes back with the
// first tap anywhere on the page.
//
// The tone is generated with the Web Audio API — no audio file to download,
// cache or fail to load offline. Phones also vibrate where the browser allows
// it (Android Chrome; iOS Safari ignores navigator.vibrate).
// ---------------------------------------------------------------------------

const PREF_KEY = 'cloudpulse.coachSound.v1';

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function audioCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof window & { webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function soundSupported(): boolean {
  return audioCtor() !== null;
}

/** Must be called from a tap/click handler. Resolves true if sound can play. */
export async function enableSound(): Promise<boolean> {
  const Ctor = audioCtor();
  if (!Ctor) return false;
  try {
    ctx ??= new Ctor();
    if (ctx.state !== 'running') await ctx.resume();
    return ctx.state === 'running';
  } catch {
    return false;
  }
}

export function soundReady(): boolean {
  return ctx !== null && ctx.state === 'running';
}

/** Two short tones (high → lower): noticeable, not a siren. */
export function playAlertTone(): void {
  if (!ctx || ctx.state !== 'running') return;
  const start = ctx.currentTime + 0.02;
  const tones: [number, number][] = [
    [880, start],
    [660, start + 0.22],
    [880, start + 0.6],
    [660, start + 0.82],
  ];
  for (const [freq, at] of tones) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(0.3, at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  }
}

export function vibrateAlert(): void {
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    // Not supported — the sound and the red card are enough.
  }
}

export function readSoundPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === 'on';
  } catch {
    return false;
  }
}

export function writeSoundPref(on: boolean): void {
  try {
    if (on) localStorage.setItem(PREF_KEY, 'on');
    else localStorage.removeItem(PREF_KEY);
  } catch {
    // Private mode etc. — the button simply has to be pressed again next time.
  }
}

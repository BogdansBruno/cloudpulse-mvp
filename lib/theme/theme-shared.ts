// Shared, server-safe theme constants. No 'use client' here on purpose:
// app/layout.tsx (a server component) imports THEME_INIT_SCRIPT from this
// file, and a server component can't read plain values out of a client module.

export type ThemeMode = 'light' | 'dark' | 'system' | 'scheduled';
export type ResolvedTheme = 'light' | 'dark';
export type ThemeSettings = { mode: ThemeMode; darkFrom: string; darkTo: string };

export const THEME_STORAGE_KEY = 'cloudpulse-theme';
// Dark stays the default so nothing changes for anyone who never opens the menu.
export const THEME_DEFAULTS: ThemeSettings = { mode: 'dark', darkFrom: '22:00', darkTo: '07:00' };

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** True when `now` falls inside the dark window. Handles windows that wrap
 *  past midnight (22:00 -> 07:00) as well as same-day ones (13:00 -> 15:00). */
export function isDarkAt(now: Date, darkFrom: string, darkTo: string) {
  const t = now.getHours() * 60 + now.getMinutes();
  const from = toMinutes(darkFrom);
  const to = toMinutes(darkTo);
  if (from === to) return true;
  return from < to ? t >= from && t < to : t >= from || t < to;
}

/**
 * Inline <head> script: applies the saved theme before first paint so a
 * light-theme user never sees a dark flash on load. Mirrors resolve() in
 * ThemeContext — kept as a plain string because it runs before React exists.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=JSON.parse(localStorage.getItem('${THEME_STORAGE_KEY}')||'null')||{};
var mode=s.mode||'dark',r='dark';
function m(x){var p=(x||'').split(':');return (+p[0]||0)*60+(+p[1]||0);}
if(mode==='light')r='light';
else if(mode==='system')r=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
else if(mode==='scheduled'){var d=new Date(),t=d.getHours()*60+d.getMinutes(),f=m(s.darkFrom||'22:00'),to=m(s.darkTo||'07:00');
var dark=f===to?true:(f<to?(t>=f&&t<to):(t>=f||t<to));r=dark?'dark':'light';}
document.documentElement.dataset.theme=r;document.documentElement.style.colorScheme=r;
}catch(e){document.documentElement.dataset.theme='dark';}})();`;

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  THEME_DEFAULTS,
  THEME_STORAGE_KEY,
  isDarkAt,
  type ResolvedTheme,
  type ThemeMode,
  type ThemeSettings,
} from './theme-shared';

export type { ResolvedTheme, ThemeMode, ThemeSettings };
export { isDarkAt };

type ThemeContextValue = {
  settings: ThemeSettings;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  setSchedule: (darkFrom: string, darkTo: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolve(settings: ThemeSettings, systemPrefersLight: boolean, now: Date): ResolvedTheme {
  switch (settings.mode) {
    case 'light':
      return 'light';
    case 'dark':
      return 'dark';
    case 'system':
      return systemPrefersLight ? 'light' : 'dark';
    case 'scheduled':
      return isDarkAt(now, settings.darkFrom, settings.darkTo) ? 'dark' : 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(THEME_DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [systemLight, setSystemLight] = useState(false);
  const [now, setNow] = useState(() => new Date());

  // Read saved settings once on the client (the head script already painted
  // the right theme; this just syncs React state to it).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object') setSettings({ ...THEME_DEFAULTS, ...saved });
    } catch {
      // unreadable storage — keep defaults
    }
    setLoaded(true);
  }, []);

  // Follow the OS setting live while in "system" mode.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    setSystemLight(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemLight(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Re-check the clock every 30s while scheduled, so the switch happens on
  // time even if the tab just sits open across 22:00.
  useEffect(() => {
    if (settings.mode !== 'scheduled') return;
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, [settings.mode]);

  const resolved = resolve(settings, systemLight, now);

  useEffect(() => {
    if (!loaded) return;
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;
  }, [resolved, loaded]);

  const persist = (next: ThemeSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // private mode — choice just won't survive a reload
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        settings,
        resolved,
        setMode: (mode) => persist({ ...settings, mode }),
        setSchedule: (darkFrom, darkTo) => persist({ ...settings, darkFrom, darkTo }),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

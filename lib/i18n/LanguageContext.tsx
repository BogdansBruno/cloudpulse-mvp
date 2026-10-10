'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translations, type Lang } from './translations';

const STORAGE_KEY = 'cloudpulse-lang';

/** The whole UI runs in this one language and every RU / LV / EN switcher is hidden.
 *  Set to null to bring the language choice back (all three dictionaries are still complete). */
export const LOCKED_LANG: Lang | null = 'en';
/** True when the user may switch the language (used to show / hide the switchers). */
export const LANG_SWITCH = LOCKED_LANG === null;

function detectDefaultLang(): Lang {
  if (typeof navigator === 'undefined') return 'en';
  const nav = navigator.language?.toLowerCase() ?? '';
  if (nav.startsWith('lv')) return 'lv';
  if (nav.startsWith('ru')) return 'ru';
  return 'en';
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (typeof translations)['en'];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Start from a stable default on the server / first client render so
  // hydration matches, then read the real saved preference once mounted.
  const [lang, setLangState] = useState<Lang>(LOCKED_LANG ?? 'ru');

  useEffect(() => {
    if (LOCKED_LANG) return; // one fixed language: ignore saved choices and the browser language
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved && translations[saved]) {
        setLangState(saved);
      } else {
        setLangState(detectDefaultLang());
      }
    } catch {
      // localStorage unavailable (private mode etc.) — keep the default.
    }
  }, []);

  const setLang = (next: Lang) => {
    if (LOCKED_LANG) return;
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — worst case the choice doesn't persist across reloads.
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}

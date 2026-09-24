'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import { signOut } from '@/lib/supabase';

export default function Nav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();

  const links = [
    { href: '/chat', label: t.nav.chat },
    { href: '/checkin', label: t.nav.checkin },
    { href: '/progress', label: t.nav.progress },
  ];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="max-w-5xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/chat" className="flex items-center gap-2 shrink-0">
            <span className="text-xl">💪</span>
            <span className="text-white font-bold tracking-tight">{t.nav.brand}</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'text-gray-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5 bg-slate-800 rounded-md p-0.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  lang === l.code ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSignOut}
            className="hidden sm:inline text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t.nav.signOut}
          </button>
        </div>
      </div>

      {/* Mobile page links */}
      <div className="sm:hidden flex items-center gap-1 px-4 pb-2">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

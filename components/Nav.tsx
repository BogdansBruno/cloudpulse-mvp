'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LANGS } from '@/lib/i18n/translations';
import { supabase, signOut } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/access-control';
import { Lightning, ShieldCheck } from '@phosphor-icons/react';

export default function Nav() {
  const pathname = usePathname();
  const { lang, setLang, t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(isAdminEmail(data.session?.user?.email));
    });
  }, []);

  const links = [
    { href: '/chat', label: t.nav.chat },
    { href: '/checkin', label: t.nav.checkin },
    { href: '/progress', label: t.nav.progress },
    ...(isAdmin ? [{ href: '/admin', label: t.admin.navLabel }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 md:px-6 md:pt-4">
      <nav className="max-w-5xl mx-auto rounded-2xl bg-[#0D0F13]/75 backdrop-blur-2xl border border-white/[0.08] shadow-xl shadow-black/20">
        <div className="px-4 md:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/chat" className="flex items-center gap-2 shrink-0">
              <div className="h-7 w-7 rounded-lg bg-[#CCFF00] text-zinc-950 flex items-center justify-center">
                <Lightning size={15} weight="fill" />
              </div>
              <span className="text-white font-semibold tracking-tight text-[15px]">{t.nav.brand}</span>
            </Link>

            <div className="hidden sm:flex items-center gap-1 bg-black/20 rounded-full p-1 border border-white/5">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-300 inline-flex items-center gap-1.5 ${
                      active ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {link.href === '/admin' && <ShieldCheck size={13} weight="fill" />}
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 bg-black/20 rounded-full p-1 border border-white/5 text-xs">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={`px-2.5 py-1 rounded-full font-semibold transition-all duration-300 ${
                    lang === l.code
                      ? 'bg-[#CCFF00] text-zinc-950'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleSignOut}
              className="hidden sm:inline text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {t.nav.signOut}
            </button>
          </div>
        </div>

        {/* Mobile page links */}
        <div className="sm:hidden flex items-center gap-1 px-3 pb-2.5">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  active ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

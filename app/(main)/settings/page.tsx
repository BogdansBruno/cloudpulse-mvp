'use client';

// /settings — the profile view (Lotus). Sign-out lives here, not in the top bar, so the dashboards
// stay focused on the metrics. Reached from the gear in the header and from the ☰ menu.
// The language card only shows while the language is not locked (lib/i18n/LanguageContext: LOCKED_LANG).

import Link from 'next/link';
import { signOut } from '@/lib/supabase';
import { LANGS } from '@/lib/i18n/translations';
import { LANG_SWITCH, useLanguage } from '@/lib/i18n/LanguageContext';
import { APP } from '@/components/np/appCopy';
import { Icon } from '@/components/np/icons';
import AiOrb from '@/components/np/AiOrb';
import { Card, Overline } from '@/components/np/ui';
import { NAV_HREF } from '@/components/np/nav';
import { useAccount, useOnline } from '@/components/np/useAccount';
import { useNotices } from '@/components/np/notices';
import { useMode, type Mode } from '@/components/np/useMode';
import { MODE } from '@/components/np/modeCopy';

export default function SettingsPage() {
  const { lang, setLang, t } = useLanguage();
  const copy = APP[lang];
  const sc = copy.settings;
  const { role, isAdmin, initial } = useAccount();
  const online = useOnline();
  const notices = useNotices();
  const { mode, setMode } = useMode(role);
  const mc = MODE[lang].mode;

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <div className="mx-auto w-full max-w-xl px-3 pb-12 pt-6 md:px-8 md:pt-12">
      <header className="flex items-center gap-3">
        <AiOrb size={44} />
        <h1 className="text-[32px] font-light leading-tight tracking-[-0.03em] text-np-text" style={{ fontFamily: 'inherit' }}>
          {sc.title}
        </h1>
      </header>

      <Card className="mt-8 p-6" index={0} labelledBy="st-account">
        <Overline id="st-account">{sc.account}</Overline>
        <div className="mt-4 flex items-center gap-4">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl font-light text-np-text shadow-[0_6px_18px_rgb(0_0_0/0.35)]">
            {initial || '·'}
            <span aria-hidden className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#0B0D11] ${online ? 'bg-np-good' : 'bg-np-warn'}`} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-light tracking-[-0.02em] text-np-text">{copy.shell.role[role]}</p>
            <p className="mt-0.5 text-sm text-np-text-3">
              {sc.status}: {online ? copy.shell.online : copy.shell.offline}
            </p>
          </div>
        </div>
        {notices.passCheck && (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm text-np-text-2">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#FFC53D]" />
            {t.shield.loadError}
          </p>
        )}
        <p className="np-caption mt-5">{sc.privacy}</p>
      </Card>

      <Card className="mt-4 p-6" index={1} labelledBy="st-mode">
        <Overline id="st-mode">{mc.title}</Overline>
        <div role="radiogroup" aria-labelledby="st-mode" className="mt-4 grid grid-cols-2 gap-2">
          {([
            ['athlete', mc.athlete, mc.athleteSub],
            ['pro', mc.pro, mc.proSub],
          ] as [Mode, string, string][]).map(([id, name, sub]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => setMode(id)}
              className={`lt-mode-opt min-h-[88px] p-4 text-left ${mode === id ? 'is-on' : ''}`}
            >
              <span className="block text-[15px] font-semibold tracking-tight text-np-text">{name}</span>
              <span className="mt-1 block text-[12px] leading-snug text-np-text-3">{sub}</span>
            </button>
          ))}
        </div>
        <p role="status" className="mt-4 text-[13px] font-medium text-np-text-2">
          {mc.now(mode)}
        </p>
        <p className="np-caption mt-2">{mc.hint}</p>
      </Card>

      {LANG_SWITCH && (
        <Card className="mt-4 p-6" index={2} labelledBy="st-lang">
          <Overline id="st-lang">{sc.languageTitle}</Overline>
          <div role="group" aria-label={copy.shell.language} className="mt-4 grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                aria-pressed={lang === l.code}
                className="np-chip h-12 text-sm font-semibold tracking-wide"
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="np-caption mt-4">{sc.languageHint}</p>
        </Card>
      )}

      {isAdmin && (
        <Link href={NAV_HREF.admin} className="np-btn-glass mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-full text-sm font-semibold">
          <Icon name="shield" size={18} />
          {sc.adminOpen}
        </Link>
      )}

      <button type="button" onClick={handleSignOut} className="np-btn-glass mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-full text-sm font-semibold">
        <Icon name="signout" size={18} />
        {t.nav.signOut}
      </button>
      <p className="np-caption mt-3 text-center">{sc.signOutHint}</p>
    </div>
  );
}

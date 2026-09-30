'use client';

// adp/src/design-explorer/DesignStudio.tsx
//
// The design studio: five complete design directions for ADP, drawn over the
// SAME demo athlete, so the team (and the jury) compare styles, not data.
//
//   [Liquid Glass] [Night Feed] [Performance Dark] [Gen-Z Energy] [Clean Health] [Compare]
//
// Liquid Glass is the flagship and opens first (DEFAULT_THEME).
//
// One soreness map is shared by every direction: mark a muscle in any of them
// and the plan (built by the real coach module, rules only) is rebuilt in all
// of them. No Supabase, no AI call, nothing stored.

import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { AdpLang } from '../components/labels';
import type { SorenessMap } from '../components/sorenessMap';
import type { PlanView } from '../services/planView';
import { DX } from './copy';
import { DEMO_READINESS, DEMO_SORENESS, buildDemoPlan } from './demoData';
import { DEFAULT_THEME, THEMES, THEME_ORDER, type ThemeId, type ThemeTokens } from './themeStyles';

import GlassReadiness from './glass/ReadinessHeroCard';
import GlassSoreness from './glass/SorenessSilhouetteWidget';
import GlassPass from './glass/SafetyPassBadge';
import GlassPlan from './glass/AICoachPlanWidget';
import { AmbientMesh, GLASS_CSS } from './glass/ui';
import FeedReadiness from './feed/ReadinessHeroCard';
import FeedSoreness from './feed/SorenessSilhouetteWidget';
import FeedPass from './feed/SafetyPassBadge';
import FeedPlan from './feed/AICoachPlanWidget';
import FeedPhone from './feed/FeedPhone';
import { FEED } from './feed/copy';
import LiquidGlassButton from '../components/ui/LiquidGlassButton';
import PaletteMesh from '../components/ui/AmbientMesh';
import WhoopReadiness from './whoop/ReadinessHeroCard';
import WhoopSoreness from './whoop/SorenessSilhouetteWidget';
import WhoopPass from './whoop/SafetyPassBadge';
import WhoopPlan from './whoop/AICoachPlanWidget';
import NikeReadiness from './nike/ReadinessHeroCard';
import NikeSoreness from './nike/SorenessSilhouetteWidget';
import NikePass from './nike/SafetyPassBadge';
import NikePlan from './nike/AICoachPlanWidget';
import AppleReadiness from './apple/ReadinessHeroCard';
import AppleSoreness from './apple/SorenessSilhouetteWidget';
import ApplePass from './apple/SafetyPassBadge';
import ApplePlan from './apple/AICoachPlanWidget';

type Tab = ThemeId | 'compare';

type Kit = {
  Readiness: typeof WhoopReadiness;
  Soreness: typeof WhoopSoreness;
  Pass: typeof WhoopPass;
  Plan: typeof WhoopPlan;
};

const KITS: Record<ThemeId, Kit> = {
  glass: { Readiness: GlassReadiness, Soreness: GlassSoreness, Pass: GlassPass, Plan: GlassPlan },
  feed: { Readiness: FeedReadiness, Soreness: FeedSoreness, Pass: FeedPass, Plan: FeedPlan },
  whoop: { Readiness: WhoopReadiness, Soreness: WhoopSoreness, Pass: WhoopPass, Plan: WhoopPlan },
  nike: { Readiness: NikeReadiness, Soreness: NikeSoreness, Pass: NikePass, Plan: NikePlan },
  apple: { Readiness: AppleReadiness, Soreness: AppleSoreness, Pass: ApplePass, Plan: ApplePlan },
};

/** Keyframes used by the Gen-Z direction; switched off for reduced motion. */
const STUDIO_CSS = `
@keyframes dx-flicker { 0%,100% { transform: scale(1) rotate(0deg); } 25% { transform: scale(1.04,0.97) rotate(-1.5deg); } 50% { transform: scale(0.97,1.05) rotate(1deg); } 75% { transform: scale(1.03,0.98) rotate(-0.5deg); } }
@keyframes dx-core { 0%,100% { opacity: 0.95; } 50% { opacity: 0.6; } }
@keyframes dx-pop-in { 0% { transform: scale(0.6) rotate(-8deg); opacity: 0; } 70% { transform: scale(1.08) rotate(2deg); opacity: 1; } 100% { transform: scale(1) rotate(0deg); } }
.dx-flame { transform-origin: 50% 90%; animation: dx-flicker 1.6s ease-in-out infinite; }
.dx-flame-core { animation: dx-core 1.1s ease-in-out infinite; }
.dx-pop { animation: dx-pop-in 520ms cubic-bezier(.2,.9,.3,1.3) both; }
.dx-scroll { scrollbar-width: thin; }
@media (prefers-reduced-motion: reduce) {
  .dx-flame, .dx-flame-core, .dx-pop { animation: none !important; }
}
`;

/** The amber "storm" light shows when the day is not green or an exam is near. */
const STORM = DEMO_READINESS.zone !== 'green' || DEMO_READINESS.penalties.some((p) => p.code === 'EXAM_SOON');

function dotColor(t: ThemeTokens): string {
  if (t.id === 'glass') return t.gradients.accent;
  return t.id === 'apple' ? t.colors.info : t.colors.accent;
}

function isTab(v: string): v is Tab {
  return v === 'compare' || (THEME_ORDER as readonly string[]).includes(v);
}

function ThemeHeader({ t, lang, compact }: { t: ThemeTokens; lang: AdpLang; compact?: boolean }): ReactElement {
  const s = DX[lang].studio;
  return (
    <header className={compact ? 'mb-4' : 'mb-6'} style={{ color: t.colors.text, fontFamily: t.font.display }}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: t.colors.textFaint }}>
        {s.inspired(t.reference)}
      </p>
      <h2
        className={compact ? 'mt-1 text-2xl' : 'mt-1 text-[32px] leading-[1.05]'}
        style={
          t.id === 'nike'
            ? { fontStyle: 'italic', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.03em' }
            : { fontWeight: t.id === 'whoop' ? 700 : 600, letterSpacing: '-0.025em' }
        }
      >
        {t.name}
      </h2>
      <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ color: t.colors.textMuted }}>
        {t.tagline[lang]}
      </p>
    </header>
  );
}

function Stack({
  id,
  lang,
  origin,
  soreness,
  setSoreness,
  plan,
  twoColumns,
}: {
  id: ThemeId;
  lang: AdpLang;
  origin: string;
  soreness: SorenessMap;
  setSoreness: (m: SorenessMap) => void;
  plan: PlanView;
  twoColumns: boolean;
}): ReactElement {
  const K = KITS[id];
  if (!twoColumns) {
    return (
      <div className="space-y-5">
        <K.Readiness lang={lang} data={DEMO_READINESS} />
        <K.Soreness lang={lang} value={soreness} onChange={setSoreness} />
        <K.Plan lang={lang} plan={plan} />
        <K.Pass lang={lang} origin={origin} />
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <div className="min-w-0 space-y-5">
        <K.Readiness lang={lang} data={DEMO_READINESS} />
        <K.Pass lang={lang} origin={origin} />
      </div>
      <div className="min-w-0 space-y-5">
        <K.Soreness lang={lang} value={soreness} onChange={setSoreness} />
        <K.Plan lang={lang} plan={plan} />
      </div>
    </div>
  );
}

export default function DesignStudio({
  lang,
  origin,
  langSwitch,
  backHref = '/demo',
  backLabel,
}: {
  lang: AdpLang;
  /** Site origin for the demo QR (window.location.origin on the client). */
  origin: string;
  /** Language buttons, rendered by the host page. */
  langSwitch?: ReactNode;
  backHref?: string;
  backLabel?: string;
}): ReactElement {
  const s = DX[lang].studio;
  const [tab, setTab] = useState<Tab>(DEFAULT_THEME);
  const [soreness, setSoreness] = useState<SorenessMap>(DEMO_SORENESS);
  const plan = useMemo(() => buildDemoPlan(lang, soreness), [lang, soreness]);

  // #nike, #apple, #compare in the URL open that tab directly (handy for
  // the pitch: one link per direction).
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.replace('#', '');
      if (isTab(h)) setTab(h);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  // Keep the active tab visible in the scrollable strip on phones.
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(`[data-dx-tab="${tab}"]`);
    const strip = el?.parentElement;
    if (el && strip && strip.scrollWidth > strip.clientWidth) {
      strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    }
  }, [tab]);

  const choose = (next: Tab) => {
    setTab(next);
    if (typeof window !== 'undefined') window.history.replaceState(null, '', `#${next}`);
  };

  const active = tab === 'compare' ? null : THEMES[tab];
  const tabs: { id: Tab; label: string }[] = [
    ...THEME_ORDER.map((id) => ({ id, label: THEMES[id].name })),
    { id: 'compare', label: s.compare },
  ];

  return (
    <div className="min-h-dvh" style={{ background: active ? active.gradients.page : '#0B0B10' }}>
      <style>{STUDIO_CSS + GLASS_CSS}</style>

      {/* Sticky switcher */}
      <div
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'rgba(12,12,18,0.82)',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'saturate(160%) blur(16px)',
          WebkitBackdropFilter: 'saturate(160%) blur(16px)',
        }}
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <a href={backHref} className="text-sm font-semibold text-white" aria-label={backLabel ?? 'CloudPulse'}>
            {s.title}
          </a>
          <nav className="dx-scroll order-last -mx-1 flex w-full gap-1 overflow-x-auto px-1 md:order-none md:w-auto md:min-w-0 md:flex-1" role="tablist" aria-label={s.title}>
            {tabs.map((x) => {
              const on = tab === x.id;
              const th = x.id === 'compare' ? null : THEMES[x.id];
              return (
                <LiquidGlassButton
                  key={x.id}
                  role="tab"
                  aria-selected={on}
                  data-dx-tab={x.id}
                  selected={on}
                  size="sm"
                  onClick={() => choose(x.id)}
                  className="shrink-0 whitespace-nowrap"
                >
                  {th ? (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor(th), boxShadow: '0 0 0 1px rgba(0,0,0,0.25)' }} />
                  ) : (
                    <span className="flex gap-0.5" aria-hidden>
                      {THEME_ORDER.map((id) => (
                        <span key={id} className="h-2.5 w-1 rounded-full" style={{ background: dotColor(THEMES[id]) }} />
                      ))}
                    </span>
                  )}
                  {x.label}
                </LiquidGlassButton>
              );
            })}
          </nav>
          {langSwitch && <div className="ml-auto md:ml-0">{langSwitch}</div>}
        </div>
      </div>

      {active ? (
        <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-8">
          {active.id === 'glass' && <AmbientMesh storm={STORM} fixed />}
          {active.id === 'feed' && <PaletteMesh palette="dune" storm={STORM} fixed />}
          <div className="relative" style={{ zIndex: 1 }}>
          <ThemeHeader t={active} lang={lang} />
          {active.id === 'feed' ? (
            <FeedShowcase lang={lang} origin={origin} soreness={soreness} setSoreness={setSoreness} plan={plan} />
          ) : (
            <Stack id={active.id} lang={lang} origin={origin} soreness={soreness} setSoreness={setSoreness} plan={plan} twoColumns />
          )}
          <Footnotes t={active} lang={lang} />
          </div>
        </main>
      ) : (
        <main className="pb-16">
          <div className="mx-auto max-w-6xl px-4 pt-6">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-white">{s.compare}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/60">{s.subtitle}</p>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/45">{s.linked}</p>
          </div>
          <div className="dx-scroll mt-5 overflow-x-auto" style={{ scrollSnapType: 'x mandatory' }}>
            <div className="mx-auto grid" style={{ gridTemplateColumns: `repeat(${THEME_ORDER.length}, minmax(340px, 1fr))`, minWidth: THEME_ORDER.length * 340, maxWidth: THEME_ORDER.length * 430 }}>
              {THEME_ORDER.map((id) => {
                const t = THEMES[id];
                return (
                  <section key={id} className="relative min-w-0 overflow-hidden px-4 pb-8 pt-6" style={{ background: t.gradients.page, scrollSnapAlign: 'start' }}>
                    {id === 'glass' && <AmbientMesh storm={STORM} />}
                    {id === 'feed' && <PaletteMesh palette="dune" storm={STORM} />}
                    <div className="relative" style={{ zIndex: 1 }}>
                      <ThemeHeader t={t} lang={lang} compact />
                      <Stack id={id} lang={lang} origin={origin} soreness={soreness} setSoreness={setSoreness} plan={plan} twoColumns={false} />
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-6xl px-4 text-xs text-white/40">{s.demoNote}</p>
        </main>
      )}
    </div>
  );
}

/** Night Feed: the phone with three tabs + how the feed picks its cards. */
function FeedShowcase({
  lang,
  origin,
  soreness,
  setSoreness,
  plan,
}: {
  lang: AdpLang;
  origin: string;
  soreness: SorenessMap;
  setSoreness: (m: SorenessMap) => void;
  plan: PlanView;
}): ReactElement {
  const f = FEED[lang];
  const t = THEMES.feed;
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[420px_1fr]">
      <FeedPhone lang={lang} origin={origin} data={DEMO_READINESS} soreness={soreness} setSoreness={setSoreness} plan={plan} />
      <aside className="space-y-3 lg:pt-12" style={{ color: t.colors.text, fontFamily: t.font.body }}>
        <h3 className="text-[20px] font-semibold tracking-[-0.01em]">{f.howTitle}</h3>
        {(['morning', 'day', 'evening'] as const).map((p) => (
          <div key={p} className="p-4" style={{ background: t.colors.surface, border: `1px solid ${t.colors.border}`, borderRadius: t.radius.inner }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: t.colors.textFaint }}>
              {f.daypart[p]}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed" style={{ color: t.colors.textMuted }}>
              {f.how[p]}
            </p>
          </div>
        ))}
        <p className="text-[13px] leading-relaxed" style={{ color: t.colors.textFaint }}>
          {f.howNote}
        </p>
      </aside>
    </div>
  );
}

function Footnotes({ t, lang }: { t: ThemeTokens; lang: AdpLang }): ReactElement {
  const s = DX[lang].studio;
  return (
    <div className="mt-8 space-y-1 text-xs leading-relaxed" style={{ color: t.colors.textFaint, fontFamily: t.font.body }}>
      <p>{s.linked}</p>
      <p>{s.demoNote}</p>
    </div>
  );
}

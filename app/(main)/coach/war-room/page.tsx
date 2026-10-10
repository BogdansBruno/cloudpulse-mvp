'use client';

// /coach/war-room — the coach's tablet view: the whole roster as a grid, filters by colour / pain / overload signal,
// and one tap that copies a short QUESTION for all yellow athletes. Nothing is sent by the app and no load is cut
// by a percentage: the coach decides (roadmap rule "AI reads, the human decides").

import Link from 'next/link';
import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ChatCircleText, Warning, CheckCircle, WarningOctagon, Question } from '@phosphor-icons/react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useWarRoom } from '@/lib/use-war-room';
import { STRAIN } from '@/lib/strain-copy';
import { countFilters, filterCards, WAR_FILTERS, yellowToAsk, type WarFilter, type WarStatus } from '@/lib/war-room';
import { impactLight } from '@/lib/haptics';

const COLOR: Record<WarStatus, string> = {
  pain: '#FF3D5A',
  red: '#FF3D5A',
  yellow: '#F5B83D',
  no_checkin: '#8A8F98',
  green: '#30D158',
};

const FALLBACK: Record<'ru' | 'lv' | 'en', (id: string) => string> = {
  ru: (id) => `Спортсмен ${id}`,
  lv: (id) => `Sportists ${id}`,
  en: (id) => `Athlete ${id}`,
};

export default function WarRoomPage(): ReactElement {
  const { lang } = useLanguage();
  const c = STRAIN[lang].war;
  const reduce = useReducedMotion();
  const fallback = useCallback((id: string) => FALLBACK[lang](id), [lang]);
  const state = useWarRoom(fallback);
  const [filter, setFilter] = useState<WarFilter>('all');
  const [copied, setCopied] = useState(false);

  const cards = state.kind === 'ok' ? state.cards : [];
  const counts = useMemo(() => countFilters(cards), [cards]);
  const shown = useMemo(() => filterCards(cards, filter), [cards, filter]);
  const yellow = useMemo(() => yellowToAsk(cards), [cards]);

  async function copyMessage() {
    impactLight();
    try {
      await navigator.clipboard.writeText(c.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      // clipboard blocked: the text is on screen under the button, the coach can copy it by hand
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-10 pt-4 md:px-8 md:pt-8">
      <Link href="/coach" className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-np-text-2">
        <ArrowLeft size={14} weight="bold" aria-hidden />
        {c.back}
      </Link>
      <header className="mt-1 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-np-text md:text-3xl">{c.title}</h1>
          <p className="mt-1 max-w-xl text-sm text-np-text-2">{c.subtitle}</p>
        </div>
        <span className="np-pill">{c.live}</span>
      </header>


      {/* filters */}
      <div role="tablist" aria-label={c.title} className="-mx-3 mt-4 flex gap-2 overflow-x-auto px-3 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {WAR_FILTERS.map((f) => {
          const on = f === filter;
          return (
            <button
              key={f}
              role="tab"
              aria-selected={on}
              onClick={() => {
                setFilter(f);
                impactLight();
              }}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-semibold ring-1 ring-inset transition-colors ${
                on ? 'bg-np-text text-np-bg ring-transparent' : 'bg-np-veil/5 text-np-text-2 ring-np-veil/10'
              }`}
            >
              {c.filters[f]}
              <span className={on ? 'opacity-70' : 'text-np-text-3'}>{counts[f]}</span>
            </button>
          );
        })}
      </div>

      {state.kind === 'loading' && (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-np-card bg-np-veil/5" />
          ))}
        </div>
      )}
      {state.kind === 'error' && <p className="np-card mt-4 p-4 text-sm text-np-text">{c.error}</p>}
      {state.kind === 'ok' && cards.length === 0 && <p className="np-card mt-4 p-4 text-sm text-np-text-2">{c.empty}</p>}
      {state.kind === 'ok' && cards.length > 0 && shown.length === 0 && (
        <p className="np-card mt-4 p-4 text-sm text-np-text-2">{c.emptyFilter}</p>
      )}

      {shown.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {shown.map((a) => {
            const color = COLOR[a.status];
            const Ic = a.status === 'pain' || a.status === 'red' ? WarningOctagon : a.status === 'green' ? CheckCircle : a.status === 'no_checkin' ? Question : Warning;
            return (
              <motion.li
                key={a.id}
                layout={!reduce}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="np-card relative flex min-h-32 flex-col p-3.5"
                style={{ boxShadow: `inset 3px 0 0 ${color}` }}
              >
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-np-text">{a.label}</p>
                  <Ic size={18} weight="fill" style={{ color }} aria-hidden />
                </div>
                <p className="mt-0.5 text-xs font-medium" style={{ color }}>
                  {c.status[a.status]}
                  {a.score !== null && a.status !== 'no_checkin' ? ` · ${Math.round(a.score)}` : ''}
                </p>
                {a.status === 'pain' && (
                  <p className="mt-1.5 text-xs text-np-text-2">
                    {a.painZone ? `${a.painZone}. ` : ''}
                    {c.painLine}
                  </p>
                )}
                {a.strain.level !== 'none' && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-np-text">{a.strain.level === 'high' ? c.strainHigh : c.strainWatch}</p>
                    <p className="mt-0.5 text-xs text-np-text-2">
                      {[...a.strain.factors.map((f) => c.factors[f]), ...(a.examIn !== null && !a.strain.factors.includes('exam') ? [c.exam(a.examIn)] : [])].join(' · ')}
                    </p>
                  </div>
                )}
                {a.strain.level === 'none' && a.examIn !== null && <p className="mt-2 text-xs text-np-text-2">{c.exam(a.examIn)}</p>}
              </motion.li>
            );
          })}
        </ul>
      )}

      {/* one tap: a question for all yellow athletes */}
      {state.kind === 'ok' && cards.length > 0 && (
        <section className="np-card mt-6 p-4" aria-labelledby="war-ask">
          <div className="flex items-center gap-2">
            <ChatCircleText size={18} weight="fill" className="text-np-text-2" aria-hidden />
            <h2 id="war-ask" className="text-sm font-semibold text-np-text">
              {c.askTitle}
            </h2>
          </div>
          {yellow.length === 0 ? (
            <p className="mt-2 text-[13px] text-np-text-2">{c.askNone}</p>
          ) : (
            <>
              <p className="mt-2 text-[13px] text-np-text-2">{c.askBody(yellow.length)}</p>
              <p className="mt-2 rounded-np-ctrl bg-np-veil/5 px-3 py-2 text-[13px] text-np-text">{c.message}</p>
              <button onClick={copyMessage} className="np-btn-primary mt-3 inline-flex min-h-12 items-center px-5 text-[14px] font-semibold">
                {c.askButton(yellow.length)}
              </button>
              {copied && (
                <p role="status" className="mt-2 text-xs text-np-text-2">
                  {c.copied}
                </p>
              )}
            </>
          )}
        </section>
      )}

      <p className="mt-4 text-xs leading-relaxed text-np-text-3">{c.rule}</p>
    </div>
  );
}

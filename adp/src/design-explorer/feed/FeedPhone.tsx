'use client';

// Night Feed — the whole direction in one phone: three tabs (Today / Body /
// Pass) and a Today feed that re-orders itself by the time of day. The
// cards read the same demo athlete and the same live plan as the studio.

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { COACH_LABELS, type AdpLang } from '../../components/labels';
import type { SorenessMap } from '../../components/sorenessMap';
import type { PlanView } from '../../services/planView';
import { DX } from '../copy';
import { acwrState, usualDailyLoad, type DemoReadiness } from '../demoData';
import AmbientMesh from '../../components/ui/AmbientMesh';
import LoadWeekChart from './LoadWeekChart';
import { THEMES } from '../themeStyles';
import AICoachPlanWidget from './AICoachPlanWidget';
import ReadinessHeroCard from './ReadinessHeroCard';
import SafetyPassBadge from './SafetyPassBadge';
import SorenessSilhouetteWidget from './SorenessSilhouetteWidget';
import { FEED, daypartOf, type Daypart } from './copy';
import { Caps, Chevron, FeedCard, METRIC, PillButton, RangeScale, StatusTag, readinessGradient } from './ui';

const t = THEMES.feed;
type TabId = 'today' | 'body' | 'pass';
const LOCALE = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' } as const;

function Icon({ id, on }: { id: TabId; on: boolean }): ReactElement {
  const s = on ? '#FFFFFF' : t.colors.textMuted;
  const common = { fill: 'none', stroke: s, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      {id === 'today' && (
        <>
          <circle cx="12" cy="12" r="4" {...common} />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" {...common} />
        </>
      )}
      {id === 'body' && (
        <>
          <circle cx="12" cy="4.5" r="2" {...common} />
          <path d="M6 9h12M12 9v5M12 14l-3 7M12 14l3 7" {...common} />
        </>
      )}
      {id === 'pass' && (
        <>
          <path d="M12 3 5 6v5.5c0 4.4 3 7.9 7 9.5 4-1.6 7-5.1 7-9.5V6l-7-3Z" {...common} />
          <path d="m9 12 2 2 4-4" {...common} />
        </>
      )}
    </svg>
  );
}

function SmallCard({
  caps,
  capsColor,
  title,
  children,
  glow,
  onOpen,
  tag,
}: {
  caps: string;
  capsColor?: string;
  title: string;
  children?: ReactNode;
  glow?: string;
  onOpen?: () => void;
  /** Oval status tag on the right of the header. */
  tag?: { text: string; color: string };
}): ReactElement {
  return (
    <FeedCard glow={glow} className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Caps color={capsColor}>{caps}</Caps>
          <h4 className="mt-1 text-[17px] font-semibold leading-snug tracking-[-0.01em]">{title}</h4>
        </div>
        {tag ? <StatusTag text={tag.text} color={tag.color} onClick={onOpen} /> : onOpen && (
          <button type="button" onClick={onOpen} aria-label={title} className="p-1">
            <Chevron />
          </button>
        )}
      </div>
      {children}
    </FeedCard>
  );
}

export default function FeedPhone({
  lang,
  origin,
  data,
  soreness,
  setSoreness,
  plan,
}: {
  lang: AdpLang;
  origin: string;
  data: DemoReadiness;
  soreness: SorenessMap;
  setSoreness: (m: SorenessMap) => void;
  plan: PlanView;
}): ReactElement {
  const f = FEED[lang];
  const c = DX[lang];
  const [tab, setTab] = useState<TabId>('today');
  const [part, setPart] = useState<Daypart>('morning');
  const [planOpen, setPlanOpen] = useState(false);
  const [marked, setMarked] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  // Start on the real time of day; the switch above the phone is for the demo.
  useEffect(() => {
    setPart(daypartOf(new Date().getHours()));
  }, []);

  const go = (next: TabId) => {
    setTab(next);
    scroller.current?.scrollTo({ top: 0 });
  };

  const rawDate = new Date().toLocaleDateString(LOCALE[lang], { weekday: 'long', day: 'numeric', month: 'long' });
  const date = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const acwr = acwrState(data.acwr);
  const exam = data.penalties.find((p) => p.code === 'EXAM_SOON');
  const planPreview = (
    <SmallCard caps={COACH_LABELS[lang].modes[plan.mode]} capsColor={readinessGradient(data.zone)[0]} title={f.plan.title} glow={METRIC.good[0]}>
      <p className="mt-1 text-[14px]" style={{ color: t.colors.textMuted }}>
        {f.plan.blocks(plan.blocks.length, plan.totalMinutes)}
      </p>
      {!planOpen && (
        <div className="mt-4 flex flex-wrap gap-2">
          <PillButton onClick={() => setPlanOpen(true)}>
            {f.actions.start}
          </PillButton>
          <PillButton onClick={() => setPlanOpen(true)}>{f.actions.details}</PillButton>
        </div>
      )}
    </SmallCard>
  );

  const sleepCard = (
    <SmallCard caps={f.mini.sleep} capsColor={METRIC.sleep[0]} title={f.sleep.title} glow={METRIC.sleep[0]} tag={data.sleep >= 5 ? { text: f.tags.inNorm, color: t.colors.good } : { text: f.tags.belowNorm, color: METRIC.sleep[0] }}>
      <div className="mt-4">
        <RangeScale label={c.readiness.sleep} valueText={c.readiness.scale7(data.sleep)} min={1} max={7} value={data.sleep} normFrom={5} normTo={7} color={METRIC.sleep[0]} hereLabel={f.scales.here} />
      </div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
        {f.sleep.body}
      </p>
    </SmallCard>
  );
  const loadCard = (
    <SmallCard caps={f.mini.load} capsColor={METRIC.load[0]} title={f.chart.title} glow={METRIC.load[0]} tag={{ text: c.readiness.acwrState[acwr], color: acwr === 'ok' ? t.colors.good : acwr === 'spike' ? t.colors.bad : t.colors.warn }}>
      <div className="mt-4">
        <LoadWeekChart lang={lang} loads={data.weekLoad} usual={usualDailyLoad(data)} />
      </div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
        {f.load.body(data.acwr.toFixed(2), c.readiness.acwrState[acwr])}
      </p>
    </SmallCard>
  );
  const examCard = exam && (
    <SmallCard caps={c.readiness.penalties.EXAM_SOON} capsColor={t.colors.warn} title={f.exam.title} glow={t.colors.warn} tag={{ text: f.tags.soon, color: t.colors.warn }}>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
        {f.exam.body}
      </p>
      <p className="mt-3 text-[13px] font-semibold" style={{ color: t.colors.bad, fontVariantNumeric: 'tabular-nums' }}>
        −{exam.points}
      </p>
    </SmallCard>
  );
  const passMini = (
    <SmallCard caps={c.pass.title} capsColor={t.colors.bad} title={f.passMini.title} glow={t.colors.bad} tag={{ text: f.tags.limited, color: t.colors.bad }} onOpen={() => go('pass')}>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
        {f.passMini.body}
      </p>
      <div className="mt-4">
        <PillButton variant="cta" onClick={() => go('pass')}>
          {f.actions.showPass}
        </PillButton>
      </div>
    </SmallCard>
  );
  const windDown = (
    <SmallCard caps={f.daypart.evening} capsColor={METRIC.sleep[0]} title={f.windDown.title} glow={METRIC.sleep[0]}>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: t.colors.textMuted }}>
        {marked ? f.actions.markedToday : f.windDown.body}
      </p>
      {!marked && (
        <div className="mt-4 flex flex-wrap gap-2">
          <PillButton onClick={() => setMarked(true)}>{f.actions.markedAll}</PillButton>
          <PillButton onClick={() => go('body')}>{f.actions.editMap}</PillButton>
        </div>
      )}
    </SmallCard>
  );
  const outOfNorm = [
    data.acwr < 0.8 || data.acwr > 1.3,
    data.hooper > data.hooperBaseline,
    data.sleep < 5,
    data.stress < 5,
    data.fatigue < 5,
    data.soreness < 5,
  ].filter(Boolean).length;
  const factors = (
    <SmallCard
      caps={f.mini.readiness}
      capsColor={readinessGradient(data.zone)[0]}
      title={f.scales.title}
      tag={outOfNorm === 0 ? { text: f.tags.inNorm, color: t.colors.good } : { text: f.tags.outOfNorm(outOfNorm, 6), color: t.colors.warn }}
    >
      <p className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: t.colors.textFaint }}>
        <span className="inline-block h-2 w-5 rounded-full" style={{ background: `${METRIC.load[0]}66` }} />
        {f.scales.legend}
      </p>
      <div className="mt-4 space-y-5">
        <RangeScale label={c.readiness.acwr} valueText={data.acwr.toFixed(2)} min={0} max={2} value={data.acwr} normFrom={0.8} normTo={1.3} color={METRIC.load[0]} hereLabel={f.scales.here} note={c.readiness.acwrState[acwr]} />
        <RangeScale label={c.readiness.hooper} valueText={`${data.hooper} / 28`} min={4} max={28} value={data.hooper} normFrom={4} normTo={data.hooperBaseline} color={METRIC.load[0]} note={f.scales.hooperNorm(data.hooperBaseline)} />
        <RangeScale label={c.readiness.sleep} valueText={c.readiness.scale7(data.sleep)} min={1} max={7} value={data.sleep} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
        <RangeScale label={c.readiness.stress} valueText={c.readiness.scale7(data.stress)} min={1} max={7} value={data.stress} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
        <RangeScale label={c.readiness.fatigue} valueText={c.readiness.scale7(data.fatigue)} min={1} max={7} value={data.fatigue} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
        <RangeScale label={c.readiness.soreness} valueText={c.readiness.scale7(data.soreness)} min={1} max={7} value={data.soreness} normFrom={5} normTo={7} color={METRIC.sleep[0]} />
      </div>
      <p className="mt-3 text-right text-[11px] uppercase tracking-widest" style={{ color: t.colors.textFaint }}>
        {f.scales.better}
      </p>
    </SmallCard>
  );
  const fullPlan = planOpen && <AICoachPlanWidget lang={lang} plan={plan} />;

  const feed: Record<Daypart, ReactNode[]> = {
    morning: [<ReadinessHeroCard key="h" lang={lang} data={data} greeting={f.greeting.morning} />, <div key="s">{sleepCard}</div>, <div key="l">{loadCard}</div>, <div key="p">{planPreview}</div>, <div key="pp">{fullPlan}</div>],
    day: [<ReadinessHeroCard key="h" lang={lang} data={data} greeting={f.greeting.day} />, <div key="e">{examCard}</div>, <div key="p">{planPreview}</div>, <div key="pp">{fullPlan}</div>, <div key="m">{passMini}</div>],
    evening: [<div key="w">{windDown}</div>, <SorenessSilhouetteWidget key="so" lang={lang} value={soreness} onChange={setSoreness} />, <div key="m">{passMini}</div>, <div key="p">{planPreview}</div>, <div key="pp">{fullPlan}</div>],
  };

  const title = tab === 'today' ? f.tabs.today : tab === 'body' ? f.tabs.body : f.tabs.pass;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-medium uppercase tracking-widest" style={{ color: t.colors.textFaint }}>
          {f.demoTime}
        </span>
        <div className="flex gap-1 rounded-full p-1" style={{ background: t.colors.surface, border: `1px solid ${t.colors.border}` }} role="radiogroup" aria-label={f.demoTime}>
          {(['morning', 'day', 'evening'] as const).map((p) => (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={part === p}
              onClick={() => {
                setPart(p);
                go('today');
              }}
              className="rounded-full px-3 py-1 text-[13px] font-semibold"
              style={{ background: part === p ? '#FFFFFF' : 'transparent', color: part === p ? '#0A0B0E' : t.colors.textMuted }}
            >
              {f.daypart[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Phone */}
      <div
        className="relative w-full max-w-[400px] overflow-hidden"
        style={{ height: 820, background: t.gradients.page, borderRadius: 48, isolation: 'isolate', border: `1px solid ${t.colors.border}`, boxShadow: '0 40px 80px -30px rgba(0,0,0,0.9), 0 0 0 8px #050608', fontFamily: t.font.body, color: t.colors.text }}
      >
        <AmbientMesh palette="dune" storm={data.zone !== 'green'} />
        <div ref={scroller} className="dx-scroll relative h-full overflow-y-auto px-4 pb-28 pt-6" style={{ scrollbarWidth: 'none', zIndex: 1 }}>
          <header className="mb-4 px-1">
            <p className="text-[13px]" style={{ color: t.colors.textFaint }}>
              {date}
            </p>
            <h2 className="text-[28px] font-semibold tracking-[-0.02em]">{title}</h2>
          </header>
          <div className="space-y-3">
            {tab === 'today' && feed[part]}
            {tab === 'body' && (
              <>
                <SorenessSilhouetteWidget lang={lang} value={soreness} onChange={setSoreness} />
                {factors}
              </>
            )}
            {tab === 'pass' && <SafetyPassBadge lang={lang} origin={origin} />}
          </div>
        </div>

        {/* Floating capsule tab bar: three tabs + the round "+" (log how you feel) inside, on the right */}
        <nav
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-6 rounded-full border border-white/[0.12] px-5 py-2.5 shadow-2xl"
          style={{
            background: 'rgba(21,22,32,0.85)',
            backdropFilter: 'blur(40px) saturate(150%)',
            WebkitBackdropFilter: 'blur(40px) saturate(150%)',
            boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12), 0 20px 40px -12px rgba(0,0,0,0.8)',
          }}
          aria-label={title}
        >
          {(['today', 'body', 'pass'] as const).map((id) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={on ? 'page' : undefined}
                className="flex flex-col items-center gap-0.5 text-[10px] font-semibold tracking-wide transition-colors"
                style={{ color: on ? '#FFFFFF' : t.colors.textFaint }}
              >
                <Icon id={id} on={on} />
                {id === 'today' ? f.tabs.today : id === 'body' ? f.tabs.body : f.tabs.pass}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => go('body')}
            aria-label={f.actions.quickAdd}
            title={f.actions.quickAdd}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white transition-transform duration-200 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}

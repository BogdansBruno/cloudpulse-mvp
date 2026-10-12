'use client';

// /chat — the athlete's AI coach, v3 "Night Performance".
// A readiness sidebar (desktop) + a full-height glass chat: pulsing AI orb with a live status,
// gradient-bordered coach bubbles with Markdown, quick prompt chips, a glass input bar with the
// ONE lime action (send). The logic (engine numbers, chat API, questions, plans, voice) is unchanged;
// every number on screen comes from the engine history, the chat never invents one.

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { supabase } from '@/lib/supabase';
import { parseScheduleFromAI, getTextBeforeSchedule, getTextAfterSchedule } from '@/lib/schedule-parser';
import { parseQuestionsFromAI, getTextBeforeQuestions } from '@/lib/questions-parser';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import { loadIndex, usualDailyLoad } from '@/lib/load-index';
import QuickReplyQuestions from '@/components/QuickReplyQuestions';
import WorkoutPlan from '@/components/WorkoutPlan';
import PlanCard from '@/components/np/PlanCard';
import ScoreDial from '@/components/np/ScoreDial';
import Md from '@/components/np/Md';
import { ZONE } from '@/components/np/ui';
import { NP } from '@/components/np/copy';
import { APP } from '@/components/np/appCopy';
import AiOrb from '@/components/np/AiOrb';
import { LotusDisc } from '@/components/np/Lotus';
import { Icon, type IconName } from '@/components/np/icons';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type CoachMode = 'recovery' | 'strength' | 'cardio';

// Minimal typing for the Web Speech API (Chrome/Edge/Safari expose it with a
// webkit prefix; Firefox does not, and then the mic button is hidden).
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): SpeechCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SPEECH_LANG = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-US' } as const;
const CHIP_ICONS: IconName[] = ['calendar', 'moon', 'food', 'trend'];
const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const;

// ACWR bands of the engine (0.8 / 1.3 / 1.5) as pill tones; the number itself is always shown.
function acwrPill(acwr: number): string {
  if (acwr < 0.8) return 'np-pill-strain';
  if (acwr <= 1.3) return 'np-pill-good';
  if (acwr <= 1.5) return 'np-pill-warn';
  return 'np-pill-danger';
}

export default function ChatPage() {
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const np = NP[lang];
  const app = APP[lang].chat;
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.chat.welcome }]);
  const [seeded, setSeeded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [history, setHistory] = useState<ReadinessHistoryPoint[] | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Re-seed the welcome message when the language changes, but only before
  // the user has actually started chatting — never rewrite real history.
  useEffect(() => {
    if (!seeded && messages.length === 1 && messages[0].role === 'assistant') {
      setMessages([{ role: 'assistant', content: t.chat.welcome }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // Follow the conversation, but leave the welcome screen at its top (title + chips).
  useEffect(() => {
    if (messages.length <= 1 && !loading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }, [messages, loading, reduce]);

  // Same readiness history the Progress page uses, computed by the
  // deterministic engine server-side. The chat never invents these numbers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const res = await fetch('/api/checkin?days=14', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('history');
        const data = await res.json();
        if (!cancelled) setHistory(data.history ?? []);
      } catch {
        if (!cancelled) setHistory([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setVoiceSupported(getSpeechCtor() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  // Grow the message box with its content (like every chat app), up to a cap,
  // then let it scroll. Runs on every change, including voice and "insert
  // metrics", which update the text without a keystroke.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    // empty box: one line (a long placeholder must not make it taller)
    if (input) el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  const today = history && history.length > 0 ? history[history.length - 1] : null;
  const hasScore = Boolean(today && today.hasCheckin);
  const todayIndex = today ? loadIndex(today.dailyLoad ?? null, usualDailyLoad(today.chronicLoad)) : null;

  // overrideText lets the question cards and prompt chips send a message the
  // same way a typed one would, without touching the input box.
  const handleSend = async (overrideText?: string) => {
    const messageText = (overrideText ?? input).trim();
    if (!messageText || loading) return;
    setSeeded(true);

    const userMessage = messageText;
    const historyForApi = messages; // conversation so far, before this turn
    if (!overrideText) setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: userMessage, history: historyForApi, lang, mode: mode ?? undefined }),
      });

      const data = await res.json().catch(() => ({}));
      const botReply = data.content || t.chat.genericError;
      setMessages((prev) => [...prev, { role: 'assistant', content: botReply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages((prev) => [...prev, { role: 'assistant', content: t.chat.connectionError }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = SPEECH_LANG[lang];
    rec.interimResults = true;
    rec.continuous = false;
    const base = input ? `${input.trimEnd()} ` : '';
    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      setInput(base + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const insertMetrics = () => {
    if (!today) return;
    const snippet = t.hub.metricsSnippet(
      today.hasCheckin ? today.score : null,
      today.acwr,
      today.hasCheckin ? today.sleepQuality : null
    );
    setInput((prev) => (prev ? `${prev.trimEnd()} ${snippet}` : snippet));
    inputRef.current?.focus();
  };

  const modes: { key: CoachMode; label: string }[] = [
    { key: 'recovery', label: t.hub.modeRecovery },
    { key: 'strength', label: t.hub.modeStrength },
    { key: 'cardio', label: t.hub.modeCardio },
  ];
  // Smart chips: the first ones follow today's real numbers (never invented), then the usual ones.
  const smart: string[] = [];
  if (hasScore && today) {
    smart.push(app.chipWhyScore(today.score));
    smart.push(app.chipPlanToday);
    if (today.acwr !== null && (today.acwr > 1.3 || today.acwr < 0.8)) smart.push(app.chipWhyAcwr(today.acwr.toFixed(2)));
  } else if (history !== null) {
    smart.push(app.chipCheckinFirst);
  }
  smart.push(app.chipYesterday);
  const chips = Array.from(new Set([...smart, ...t.chat.promptChips])).slice(0, 4);

  const showWelcome = !seeded && messages.length === 1;
  const orb: 'idle' | 'thinking' | 'listening' = loading ? 'thinking' : listening ? 'listening' : 'idle';
  const status = loading ? app.statusThinking : listening ? app.statusListening : today && hasScore ? app.statusSees(today.score, today.acwr !== null ? today.acwr.toFixed(2) : null) : app.statusIdle;

  const dial = (size: number) => (
    <ScoreDial
      score={hasScore && today ? today.score : null}
      zone={hasScore && today ? today.zone : null}
      size={size}
      label={hasScore && today ? `${np.readiness}: ${today.score} / 100, ${np.zone[today.zone]}` : np.noScore}
    />
  );

  return (
    <div className="mx-auto grid h-[calc(100dvh-env(safe-area-inset-top)-188px-env(safe-area-inset-bottom))] min-h-[420px] max-w-7xl gap-4 p-3 [html[data-kb]_&]:h-[calc(var(--vvh)-96px)] md:h-dvh md:p-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* readiness sidebar (desktop) */}
      <aside className="hidden min-h-0 space-y-3 overflow-y-auto lg:block" style={{ scrollbarWidth: 'none' }}>
        <section className="lt-card-readiness p-5" aria-labelledby="chat-today">
          <h2 id="chat-today" className="np-overline" style={{ fontFamily: 'inherit' }}>
            {app.sidebarTitle}
          </h2>
          <div className="mt-4 flex items-center gap-4">
            {dial(96)}
            <div className="min-w-0 space-y-2">
              {hasScore && today ? (
                <>
                  <p className={`np-pill ${ZONE[today.zone].pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ZONE[today.zone].dot}`} aria-hidden />
                    {np.zone[today.zone]}
                  </p>
                  {today.acwr !== null && (
                    <p>
                      <span className={`np-pill ${acwrPill(today.acwr)}`}>ACWR {today.acwr.toFixed(2)}</span>
                    </p>
                  )}
                  <p>
                    <span className={`np-pill ${today.trainingStreak > 6 ? 'np-pill-warn' : ''}`}>
                      {today.trainingStreak} {t.hub.streak.toLowerCase()}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-sm leading-snug text-np-text-2">{app.sidebarEmpty}</p>
              )}
            </div>
          </div>
          {todayIndex !== null && (
            <p className="mt-4 text-xs text-np-text-2">
              <span className="np-pill np-pill-strain mr-2">{np.load.title}</span>
              {todayIndex} / 100
            </p>
          )}
          {!hasScore && (
            <Link href="/checkin" className="np-btn-glass mt-4 flex h-11 w-full items-center justify-center rounded-full text-sm font-medium">
              {t.hub.doCheckin}
            </Link>
          )}
        </section>
        <PlanCard />
      </aside>

      {/* coach column */}
      <section className="np-card flex min-h-0 flex-col overflow-hidden" aria-label={t.chat.title}>
        <header className="flex shrink-0 items-center gap-3 border-b border-np-line px-4 py-3 md:px-5">
          <span className="relative inline-flex shrink-0">
            <LotusDisc size={36} />
            {orb !== 'idle' && (
              <span aria-hidden className={`absolute inset-0 animate-pulse rounded-full ring-2 ${orb === 'listening' ? 'ring-[#FF3D5A]/70' : 'ring-[#B8F23C]/70'}`} />
            )}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-np-text">{t.chat.title}</p>
            <p className="mt-0.5 truncate text-xs text-np-text-2" aria-live="polite">
              {status}
            </p>
          </div>
          <span className="np-pill np-pill-ai ml-auto hidden sm:inline-flex">
            <Icon name="sparkle" size={12} active />
            {app.online}
          </span>
        </header>

        {/* messages */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 [mask-image:linear-gradient(to_bottom,transparent,#000_16px,#000_calc(100%-16px),transparent)] md:px-6">
          <div className="mx-auto max-w-2xl space-y-5">
            {showWelcome && (
              <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={SPRING} className="pt-2 md:pt-8">
                <p className="np-overline">{t.chat.heroTag}</p>
                <h1 className="mt-3 text-2xl np-editorial font-semibold leading-tight text-np-text sm:text-3xl md:text-4xl">
                  {t.chat.subtitle}
                </h1>
                <div className="np-ai-bubble mt-5 max-w-[60ch] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-np-text-2">
                  <p className="whitespace-pre-wrap">{t.chat.welcome}</p>
                </div>
                {/* today + plan (phone and tablet, where the sidebar is hidden) — part of the welcome flow,
                    so it scrolls with it and can never sit on top of the heading */}
                <div className="mt-5 space-y-2 lg:hidden">
                  {hasScore && today && (
                    <div className="np-card flex flex-nowrap items-center gap-2 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&>*]:shrink-0 [&_.np-pill]:whitespace-nowrap">
                      {dial(40)}
                      <span className={`np-pill ${ZONE[today.zone].pill}`}>{np.zone[today.zone]}</span>
                      {today.acwr !== null && <span className={`np-pill ${acwrPill(today.acwr)}`}>ACWR {today.acwr.toFixed(2)}</span>}
                    </div>
                  )}
                  <PlanCard compact />
                </div>
                <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                  {chips.map((chip, i) => {
                    const ico = CHIP_ICONS[i] ?? 'sparkle';
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSend(chip)}
                        disabled={loading}
                        className="np-chip group flex items-start gap-3 rounded-np-card p-4 text-left disabled:opacity-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-np-veil/5 text-np-text-2 transition-colors group-hover:text-np-text">
                          <Icon name={ico} size={16} />
                        </span>
                        <span className="min-w-0 pt-1 text-sm leading-snug text-np-text">{chip}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {!showWelcome &&
              messages.map((msg, idx) => {
                const isAssistant = msg.role === 'assistant';
                const parsedQuestions = isAssistant ? parseQuestionsFromAI(msg.content) : { questions: [], hasQuestions: false };
                const schedule = isAssistant && !parsedQuestions.hasQuestions ? parseScheduleFromAI(msg.content) : null;
                const displayText = isAssistant
                  ? parsedQuestions.hasQuestions
                    ? getTextBeforeQuestions(msg.content)
                    : getTextBeforeSchedule(msg.content)
                  : msg.content;
                const afterText = schedule?.hasSchedule ? getTextAfterSchedule(msg.content) : '';
                // Only the latest assistant message renders live question
                // cards; older ones in history stay as plain text.
                const isLiveQuestions = parsedQuestions.hasQuestions && idx === messages.length - 1 && !loading;

                return (
                  <motion.div
                    key={idx}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={SPRING}
                    className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && <AiOrb state="idle" size={28} />}
                    <div
                      className={
                        isAssistant
                          ? 'np-ai-bubble min-w-0 max-w-[92%] rounded-2xl rounded-tl-md px-4 py-3'
                          : 'np-user-bubble max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-np-text'
                      }
                    >
                      {displayText &&
                        (isAssistant ? (
                          <Md text={displayText} copyLabel={app.codeCopy} />
                        ) : (
                          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{displayText}</div>
                        ))}
                      {isLiveQuestions && <QuickReplyQuestions questions={parsedQuestions.questions} lang={lang} onComplete={(summary) => handleSend(summary)} />}
                      {schedule?.hasSchedule && (
                        <WorkoutPlan events={schedule.events} lang={lang} title={t.hub.planTitle} minLabel={t.hub.min} exportLabel={t.chat.addToCalendar} />
                      )}
                      {afterText && (
                        <div className="mt-3">
                          <Md text={afterText} copyLabel={app.codeCopy} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

            <AnimatePresence>
              {loading && (
                <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-3">
                  <AiOrb state="thinking" size={28} />
                  <div className="np-ai-bubble flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3" role="status" aria-label={t.common.loading}>
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="np-typing-dot h-1.5 w-1.5 rounded-full bg-np-text" />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* command bar */}
        <div className="shrink-0 border-t border-np-line p-3 md:p-4">
          <div className="mx-auto max-w-2xl space-y-2.5">
            {!showWelcome && (
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none]" aria-label={t.chat.title}>
                {chips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleSend(chip)}
                    disabled={loading}
                    className="np-chip shrink-0 whitespace-nowrap px-3.5 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* composer: one dark rounded shell — the message on top, the actions in a bar below */}
            <div className="np-scope-dark rounded-[24px] border border-white/[0.08] bg-[#151922]/90 p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition-colors focus-within:border-white/[0.15]">
              <div className="relative">
                {!input && (
                  <span aria-hidden className="pointer-events-none absolute inset-x-1 top-[6px] truncate text-[15px] leading-[22px] text-[#71717A]">
                    {listening ? t.hub.listening : t.chat.placeholder}
                  </span>
                )}
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends, Shift+Enter adds a new line. Skip while an
                    // IME is composing so it doesn't send half a word.
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  aria-label={t.chat.placeholder}
                  disabled={loading}
                  className="block max-h-[160px] min-h-[34px] w-full resize-none overflow-y-auto bg-transparent px-1 py-[6px] text-[15px] leading-[22px] text-[#FFFFFF] focus:outline-none disabled:opacity-50"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={insertMetrics}
                  disabled={!today}
                  title={t.hub.attach}
                  aria-label={t.hub.attach}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#C3C5C7] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
                >
                  <Icon name="clip" size={18} />
                </button>

                    <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&>*]:shrink-0 [&>*]:whitespace-nowrap" role="radiogroup" aria-label={app.focusLabel}>
                      {modes.map((m) => {
                        const active = mode === m.key;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setMode(active ? null : m.key)}
                            className={`np-chip h-8 px-3 text-xs font-semibold ${active ? '!border-np-violet/50 !bg-np-violet/12 !text-np-violet' : 'text-np-text-2'}`}
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>

                <div className="flex shrink-0 items-center gap-1">
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={toggleVoice}
                      title={t.hub.voice}
                      aria-label={t.hub.voice}
                      aria-pressed={listening}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                        listening ? 'bg-[#F25CA8]/15 text-[#F25CA8]' : 'text-[#C3C5C7] hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon name="mic" size={18} active={listening} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim()}
                    aria-label={t.chat.send}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B8F23C] text-[#0B0D11] shadow-[0_0_16px_rgb(184_242_60/0.3)] transition-[background-color,scale,opacity] hover:bg-[#6BE3F5] active:scale-95 disabled:opacity-40"
                  >
                    <Icon name="send" size={18} stroke={1.75} />
                  </button>
                </div>
              </div>
            </div>
            <p className="truncate text-center text-[10px] text-np-text-3">{APP[lang].v3.disclaimerShort}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

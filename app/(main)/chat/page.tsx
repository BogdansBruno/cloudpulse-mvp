'use client';

// /chat — the athlete's home: readiness sidebar + the AI coach.
// ADP "Dark Editorial Biohacking" look: #0C0D12 with a soft sand glow,
// editorial glass panels, serif headline, capsule controls. The logic
// (engine numbers, chat API, questions, plans, voice) is unchanged.

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import {
  ArrowUp,
  Microphone,
  Paperclip,
  Lightning,
  CalendarBlank,
  Moon,
  ForkKnife,
  Barbell,
} from '@phosphor-icons/react';
import { supabase } from '@/lib/supabase';
import { parseScheduleFromAI, getTextBeforeSchedule, getTextAfterSchedule } from '@/lib/schedule-parser';
import { parseQuestionsFromAI, getTextBeforeQuestions } from '@/lib/questions-parser';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import type { ReadinessHistoryPoint } from '@/lib/types/readiness';
import QuickReplyQuestions from '@/components/QuickReplyQuestions';
import WorkoutPlan from '@/components/WorkoutPlan';
import { EditorialPerformancePanel, EditorialPerformanceStrip, ED, edLoadColor, edNoRestColor, edZone } from '@/components/EditorialPerformancePanel';
import HomeWorkoutCard from '@/components/HomeWorkoutCard';
import AmbientMesh, { MESH_BASE } from '@/adp/src/components/ui/AmbientMesh';
import { MICRO_LABEL, SERIF, SLATE_300, SLATE_400 } from '@/adp/src/components/ui/typography';

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
const CHIP_ICONS = [CalendarBlank, Moon, ForkKnife];
const SPRING = { type: 'spring', bounce: 0, duration: 0.4 } as const;

// Editorial glass panel (same values as LiquidGlassCard tone="editorial").
const PANEL = {
  background: 'rgba(22,23,33,0.75)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(40px) saturate(150%)',
  WebkitBackdropFilter: 'blur(40px) saturate(150%)',
  boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.18), 0 12px 32px -4px rgba(0,0,0,0.5)',
} as const;
const PILL = `inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 ${MICRO_LABEL}`;

export default function ChatPage() {
  const { t, lang } = useLanguage();
  const reduce = useReducedMotion();
  const [messages, setMessages] = useState<Message[]>([{ role: 'assistant', content: t.chat.welcome }]);
  const [seeded, setSeeded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<CoachMode | null>(null);
  const [history, setHistory] = useState<ReadinessHistoryPoint[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
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
      } finally {
        if (!cancelled) setHistoryLoading(false);
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
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const today = history && history.length > 0 ? history[history.length - 1] : null;

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

  const showWelcome = !seeded && messages.length === 1;
  // Amber light in the background when today is not a green day.
  const storm = Boolean(today && today.hasCheckin && today.zone !== 'green');

  return (
    <div
      className="relative h-[calc(100dvh-7rem)] overflow-hidden text-white sm:h-[calc(100dvh-4.25rem)] md:h-[calc(100dvh-4.5rem)]"
      style={{ background: MESH_BASE.dune }}
    >
      <AmbientMesh palette="dune" storm={storm} />

      <div className="relative mx-auto grid h-full max-w-7xl gap-4 px-3 pb-3 pt-3 md:px-6 lg:grid-cols-[340px_minmax(0,1fr)]" style={{ zIndex: 1 }}>
        {/* Readiness sidebar */}
        <aside className="hidden min-h-0 space-y-3 overflow-y-auto pb-2 lg:block" style={{ scrollbarWidth: 'none' }}>
          <EditorialPerformancePanel history={history} loading={historyLoading} />
          <HomeWorkoutCard />
        </aside>

        {/* Coach column */}
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px]" style={PANEL}>
          {/* Header: what the coach is grounded in right now */}
          <header className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] px-4 py-3 md:px-5">
            <div className="mr-auto flex items-center gap-3">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-[#CCFF00]"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2)' }}
              >
                <Lightning size={16} weight="fill" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-[-0.01em] text-white">{t.chat.title}</p>
                <p className={`mt-0.5 ${MICRO_LABEL}`} style={{ color: SLATE_400 }}>
                  {t.hub.coachSees}
                </p>
              </div>
            </div>
            {today && today.hasCheckin && (
              <span className={`hidden sm:inline-flex ${PILL}`} style={{ color: SLATE_300 }}>
                {t.hub.readiness}
                <span className="tabular-nums" style={{ color: edZone(today.zone).color }}>
                  {today.score}
                </span>
              </span>
            )}
            {today && today.acwr !== null && (
              <span className={`hidden sm:inline-flex ${PILL}`} style={{ color: SLATE_300 }}>
                ACWR
                <span className="tabular-nums" style={{ color: edLoadColor(today.acwr) }}>
                  {today.acwr.toFixed(2)}
                </span>
              </span>
            )}
            {today && (
              <span className={`hidden sm:inline-flex ${PILL}`} style={{ color: SLATE_300 }}>
                <Barbell size={12} weight="fill" style={{ color: edNoRestColor(today.trainingStreak) }} />
                <span className="tabular-nums" style={{ color: edNoRestColor(today.trainingStreak) }}>
                  {today.trainingStreak}
                </span>
                {t.hub.streak}
              </span>
            )}
          </header>

          <div className="space-y-2 px-3 pt-3 lg:hidden">
            <div className="sm:hidden">
              <EditorialPerformanceStrip history={history} />
            </div>
            <HomeWorkoutCard compact />
          </div>

          {/* Messages */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 md:px-6">
            <div className="mx-auto max-w-2xl space-y-5">
              {showWelcome && (
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING}
                  className="pt-4 md:pt-10"
                >
                  <p className={MICRO_LABEL} style={{ color: SLATE_400 }}>
                    {t.chat.title}
                  </p>
                  <h1
                    className="mt-3 text-[34px] leading-[1.12] md:text-[44px]"
                    style={{ fontFamily: SERIF, fontWeight: 400, letterSpacing: '-0.02em', color: '#FFFFFF' }}
                  >
                    {t.chat.subtitle}
                  </h1>
                  <p className="mt-4 max-w-[60ch] whitespace-pre-wrap text-sm leading-relaxed" style={{ color: SLATE_300 }}>
                    {t.chat.welcome}
                  </p>
                  <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
                    {t.chat.promptChips.map((chip, i) => {
                      const Icon = CHIP_ICONS[i] ?? Lightning;
                      return (
                        <motion.button
                          key={chip}
                          type="button"
                          onClick={() => handleSend(chip)}
                          disabled={loading}
                          whileTap={reduce ? undefined : { scale: 0.97 }}
                          className="group flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.05] p-4 text-left transition-colors hover:bg-white/[0.09] disabled:opacity-50"
                          style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12)' }}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-white/80 transition-colors group-hover:text-white">
                            <Icon size={16} />
                          </span>
                          <span className="pt-1 text-sm leading-snug text-white">{chip}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {!showWelcome &&
                messages.map((msg, idx) => {
                  const isAssistant = msg.role === 'assistant';
                  const parsedQuestions = isAssistant
                    ? parseQuestionsFromAI(msg.content)
                    : { questions: [], hasQuestions: false };
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
                      {isAssistant && (
                        <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-[#CCFF00]">
                          <Lightning size={13} weight="fill" />
                        </span>
                      )}
                      <div
                        className={
                          isAssistant
                            ? 'min-w-0 max-w-[92%] flex-1 text-white/90'
                            : 'max-w-[80%] rounded-3xl rounded-br-lg border border-white/15 bg-white/[0.12] px-4 py-2.5 text-white'
                        }
                        style={isAssistant ? undefined : { boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.16)' }}
                      >
                        {displayText && (
                          <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">{displayText}</div>
                        )}
                        {isLiveQuestions && (
                          <QuickReplyQuestions
                            questions={parsedQuestions.questions}
                            lang={lang}
                            onComplete={(summary) => handleSend(summary)}
                          />
                        )}
                        {schedule?.hasSchedule && (
                          <WorkoutPlan
                            events={schedule.events}
                            lang={lang}
                            title={t.hub.planTitle}
                            minLabel={t.hub.min}
                            exportLabel={t.chat.addToCalendar}
                          />
                        )}
                        {afterText && (
                          <div className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed" style={{ color: SLATE_300 }}>
                            {afterText}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

              <AnimatePresence>
                {loading && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-3"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-[#CCFF00]">
                      <Lightning size={13} weight="fill" />
                    </span>
                    <div className="flex items-center gap-1.5 pt-1" aria-label={t.common.loading}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"
                          style={{ animationDelay: `${i * 0.15}s`, boxShadow: '0 0 8px rgba(255,255,255,0.8)' }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Command bar */}
          <div className="border-t border-white/[0.08] p-3 md:p-4">
            <div className="mx-auto max-w-2xl">
              <LayoutGroup id="coach-mode">
                <div className="mb-2.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Coaching focus">
                  {modes.map((m) => {
                    const active = mode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setMode(active ? null : m.key)}
                        className={`relative inline-flex h-8 items-center rounded-full border px-4 text-xs font-medium transition-colors ${
                          active ? 'border-white/30 text-white' : 'border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/[0.12] hover:text-white'
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="mode-pill"
                            className="absolute inset-0 rounded-full bg-white/20"
                            style={{ boxShadow: `inset 0 1px 1px rgba(255,255,255,0.25), 0 0 14px -4px ${ED.teal}` }}
                            transition={reduce ? { duration: 0 } : { type: 'spring', bounce: 0, duration: 0.35 }}
                          />
                        )}
                        <span className="relative inline-flex items-center gap-1.5">
                          {active && <span className="h-1.5 w-1.5 rounded-full" style={{ background: ED.teal, boxShadow: `0 0 6px ${ED.teal}` }} />}
                          {m.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>

              <div
                className="flex items-end gap-1 rounded-[26px] border border-white/[0.12] bg-white/[0.06] p-1.5 transition-colors focus-within:border-white/25"
                style={{ boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.12)' }}
              >
                <button
                  type="button"
                  onClick={insertMetrics}
                  disabled={!today}
                  title={t.hub.attach}
                  aria-label={t.hub.attach}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white disabled:opacity-30"
                >
                  <Paperclip size={18} />
                </button>
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
                  placeholder={listening ? t.hub.listening : t.chat.placeholder}
                  disabled={loading}
                  className="max-h-[200px] min-w-0 flex-1 resize-none overflow-y-auto bg-transparent px-1 py-[9px] text-[15px] leading-[22px] text-white placeholder-slate-400 focus:outline-none disabled:opacity-50"
                />
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoice}
                    title={t.hub.voice}
                    aria-label={t.hub.voice}
                    aria-pressed={listening}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                      listening ? 'bg-[#FB7185]/15 text-[#FB7185]' : 'text-white/70 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <Microphone size={18} weight={listening ? 'fill' : 'regular'} />
                  </button>
                )}
                <motion.button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  aria-label={t.chat.send}
                  whileTap={reduce ? undefined : { scale: 0.9 }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0C0D12] transition-opacity disabled:opacity-30"
                  style={{ boxShadow: '0 6px 18px -6px rgba(255,255,255,0.6)' }}
                >
                  <ArrowUp size={18} weight="bold" />
                </motion.button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

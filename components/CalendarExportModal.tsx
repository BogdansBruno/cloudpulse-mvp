'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  ArrowSquareOut,
  BellRinging,
  CaretRight,
  CheckCircle,
  DownloadSimple,
  EnvelopeSimple,
  X,
} from '@phosphor-icons/react';
import {
  downloadICS,
  generateICS,
  googleCalendarUrl,
  outlookCalendarUrl,
  type WorkoutEvent,
} from '@/lib/ics-generator';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { GoogleMark, AppleMark } from '@/components/BrandIcons';

type Lang = 'ru' | 'lv' | 'en';
type Step = 'choose' | 'google' | 'outlook' | 'done';

const SPRING = { type: 'spring', bounce: 0, duration: 0.35 } as const;
const LOCALE: Record<Lang, string> = { ru: 'ru-RU', lv: 'lv-LV', en: 'en-GB' };

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/**
 * Export sheet for a workout plan. Apple/.ics exports every workout at
 * once with a 15-minute reminder built in; Google and Outlook only accept
 * one event per web link, so those show a per-day list plus the .ics
 * fallback for importing everything at once.
 */
export default function CalendarExportModal({
  open,
  onClose,
  events,
  lang,
}: {
  open: boolean;
  onClose: () => void;
  events: WorkoutEvent[];
  lang: Lang;
}) {
  const { t } = useLanguage();
  const x = t.exportCal;
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>('choose');
  const [mounted, setMounted] = useState(false);

  // Kept in a ref so a parent re-render (new inline onClose) doesn't re-run
  // the open effect and bounce the sheet back to the first step.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setStep('choose');
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function downloadAll() {
    downloadICS(generateICS(events, lang), `cloudpulse-plan-${new Date().toISOString().split('T')[0]}.ics`);
    setStep('done');
  }

  const options = [
    { key: 'google' as const, label: x.google, hint: x.googleHint, icon: <GoogleMark size={20} /> },
    { key: 'apple' as const, label: x.apple, hint: x.appleHint, icon: <AppleMark size={20} /> },
    { key: 'outlook' as const, label: x.outlook, hint: x.outlookHint, icon: <EnvelopeSimple size={20} weight="fill" /> },
  ];

  const linkFor = step === 'outlook' ? outlookCalendarUrl : googleCalendarUrl;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={x.title}
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.98 }}
            transition={SPRING}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/60 backdrop-blur-2xl"
          >
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
              <div className="flex items-center gap-2">
                {(step === 'google' || step === 'outlook') && (
                  <button
                    type="button"
                    onClick={() => setStep('choose')}
                    aria-label={x.back}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-50"
                  >
                    <ArrowLeft size={16} />
                  </button>
                )}
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.02em] text-zinc-50">{x.title}</h2>
                  <p className="text-sm text-zinc-500">
                    {step === 'google' ? x.google : step === 'outlook' ? x.outlook : x.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={x.close}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-50"
              >
                <X size={14} weight="bold" />
              </button>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduce ? { opacity: 0 } : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
                transition={SPRING}
                className="px-5 pb-5"
              >
                {step === 'choose' && (
                  <div className="space-y-2">
                    {options.map((o) => (
                      <motion.button
                        key={o.key}
                        type="button"
                        whileTap={reduce ? undefined : { scale: 0.98 }}
                        onClick={() => (o.key === 'apple' ? downloadAll() : setStep(o.key))}
                        className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3.5 text-left ring-1 ring-inset ring-white/[0.08] transition-colors hover:bg-white/[0.07] hover:ring-white/15"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-100">
                          {o.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-zinc-50">{o.label}</span>
                          <span className="block text-xs text-zinc-500">{o.hint}</span>
                        </span>
                        {o.key === 'apple' ? (
                          <DownloadSimple size={16} className="text-zinc-500" />
                        ) : (
                          <CaretRight size={14} className="text-zinc-500" />
                        )}
                      </motion.button>
                    ))}
                    <p className="flex items-start gap-2 pt-2 text-xs leading-relaxed text-zinc-500">
                      <BellRinging size={14} className="mt-px shrink-0" />
                      {x.reminderIcs}
                    </p>
                  </div>
                )}

                {(step === 'google' || step === 'outlook') && (
                  <div>
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">{x.pickDay}</p>
                    <ul className="max-h-[42vh] space-y-1.5 overflow-y-auto">
                      {events.map((ev, i) => {
                        const d = ev.date;
                        const when = `${d.toLocaleDateString(LOCALE[lang], { weekday: 'short', day: 'numeric', month: 'short' })} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                        return (
                          <li key={i}>
                            <a
                              href={linkFor(ev, lang)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3.5 py-3 ring-1 ring-inset ring-white/[0.07] transition-colors hover:bg-white/[0.07]"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm text-zinc-50">
                                  {ev.sessionTitle || ev.exercises?.[0] || ev.title}
                                </span>
                                <span className="block font-mono text-[11px] capitalize tabular-nums text-zinc-500">
                                  {when} · {ev.duration} {t.hub.min}
                                </span>
                              </span>
                              <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[#CCFF00]">
                                {x.open}
                                <ArrowSquareOut size={13} />
                              </span>
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-3 text-xs leading-relaxed text-zinc-500">{x.reminderWeb}</p>
                    <div className="mt-4 rounded-2xl bg-black/20 p-3.5 ring-1 ring-inset ring-white/[0.06]">
                      <p className="text-xs leading-relaxed text-zinc-400">{x.importTip}</p>
                      <button
                        type="button"
                        onClick={downloadAll}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.07] py-2.5 text-sm font-medium text-zinc-100 ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.11]"
                      >
                        <DownloadSimple size={15} />
                        {x.downloadAll}
                      </button>
                    </div>
                  </div>
                )}

                {step === 'done' && (
                  <div className="flex flex-col items-center py-4 text-center">
                    <motion.span
                      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
                      className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#CCFF00]/[0.12] text-[#CCFF00]"
                    >
                      <CheckCircle size={28} weight="fill" />
                    </motion.span>
                    <p className="max-w-xs text-sm leading-relaxed text-zinc-200">{x.downloaded}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-500">
                      <BellRinging size={13} />
                      {x.reminderIcs}
                    </p>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-5 w-full rounded-xl bg-[#CCFF00] py-2.5 text-sm font-semibold text-zinc-950"
                    >
                      {x.close}
                    </button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

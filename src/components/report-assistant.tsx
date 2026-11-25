"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  buildReportFields,
  emptyDraft,
  handleAnswer,
  initialReply,
  promptFor,
  type AssistantDraft,
  type AssistantStep,
} from '@/lib/report-assistant';

type Message = { id: number; role: 'assistant' | 'user'; text: string };

type SpeechResultLike = { 0: { transcript: string }; isFinal: boolean };
type SpeechEventLike = { resultIndex: number; results: ArrayLike<SpeechResultLike> };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const acceptedImages = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif';
const maxImageBytes = 15 * 1024 * 1024;

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const scope = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  const Ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function ReportAssistant() {
  const first = initialReply();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'assistant', text: first.message },
  ]);
  const [draft, setDraft] = useState<AssistantDraft>(first.draft);
  const [step, setStep] = useState<AssistantStep>(first.step);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const nextId = useRef(1);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const hasOpenedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const sendRef = useRef<(text: string) => void>(() => undefined);
  const startListeningRef = useRef<() => void>(() => undefined);
  const scheduleListenRef = useRef<() => void>(() => undefined);
  const speakRef = useRef<(text: string) => void>(() => undefined);
  const listenTimerRef = useRef<number | null>(null);

  const voiceModeRef = useRef(false);
  const soundOnRef = useRef(false);
  const listeningRef = useRef(false);
  const speakingRef = useRef(false);
  const stepRef = useRef<AssistantStep>(first.step);
  const speechIdRef = useRef(0);
  const lastSpokenIdRef = useRef(-1);

  const addMessage = useCallback((role: Message['role'], text: string) => {
    setMessages((current) => [...current, { id: nextId.current++, role, text }]);
  }, []);

  const cancelSpeech = useCallback(() => {
    speechIdRef.current += 1;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    speakingRef.current = false;
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (!soundOnRef.current || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (voiceModeRef.current) scheduleListenRef.current();
      return;
    }

    cancelSpeech();
    const speechId = ++speechIdRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.04;
    utterance.pitch = 1;

    utterance.onstart = () => {
      if (speechId === speechIdRef.current) setSpeaking(true);
    };
    utterance.onend = () => {
      if (speechId !== speechIdRef.current) return;
      speakingRef.current = false;
      setSpeaking(false);
      if (voiceModeRef.current && stepRef.current !== 'complete') scheduleListenRef.current();
    };
    utterance.onerror = () => {
      if (speechId !== speechIdRef.current) return;
      speakingRef.current = false;
      setSpeaking(false);
      if (voiceModeRef.current && stepRef.current !== 'complete') scheduleListenRef.current();
    };

    speakingRef.current = true;
    window.speechSynthesis.speak(utterance);
  }, [cancelSpeech]);

  const startListening = useCallback(() => {
    if (listeningRef.current || speakingRef.current) return;

    const recognition = getRecognition();
    if (!recognition) {
      addMessage('assistant', 'Voice input is not supported in this browser. Type your answer instead.');
      voiceModeRef.current = false;
      setVoiceMode(false);
      return;
    }

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result?.[0]?.transcript ?? '';
        if (result?.isFinal) finalText += transcript;
        else interimText += transcript;
      }

      setInput(interimText || finalText);
      if (finalText.trim()) sendRef.current(finalText.trim());
    };
    recognition.onerror = () => {
      listeningRef.current = false;
      setListening(false);
      if (voiceModeRef.current) {
        addMessage('assistant', 'I missed that. Take your time — I am listening again.');
      }
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
      if (voiceModeRef.current && !speakingRef.current && stepRef.current !== 'complete') {
        scheduleListenRef.current();
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      listeningRef.current = true;
      setListening(true);
    } catch {
      listeningRef.current = false;
      setListening(false);
      addMessage('assistant', 'The microphone could not be started. Type your answer instead.');
      voiceModeRef.current = false;
      setVoiceMode(false);
    }
  }, [addMessage]);

  const scheduleListen = useCallback(() => {
    if (!voiceModeRef.current || stepRef.current === 'complete') return;
    if (listeningRef.current || speakingRef.current) return;
    if (listenTimerRef.current !== null) window.clearTimeout(listenTimerRef.current);
    listenTimerRef.current = window.setTimeout(() => startListeningRef.current(), 350);
  }, []);

  const stopVoice = useCallback(() => {
    voiceModeRef.current = false;
    setVoiceMode(false);
    if (listenTimerRef.current !== null) {
      window.clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    listeningRef.current = false;
    setListening(false);
    cancelSpeech();
    setInput('');
  }, [cancelSpeech]);

  const createReport = useCallback(async (finalDraft: AssistantDraft, image?: File) => {
    setBusy(true);
    const form = new FormData();
    for (const [key, value] of Object.entries(buildReportFields(finalDraft))) {
      if (value) form.append(key, value);
    }
    if (image) form.append('images', image, image.name);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: form,
      });
      const data = (await response.json().catch(() => ({}))) as {
        report?: { id?: string; caseReference?: string };
        caseReference?: string;
        trackingToken?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? 'Submission failed');

      const kind = finalDraft.reportType === 'FOUND' ? 'found' : 'lost';
      const reference = data.caseReference ?? data.report?.caseReference
        ?? (data.report?.id ? data.report.id.slice(0, 8).toUpperCase() : 'pending');
      const trackingToken = data.trackingToken;
      const credentialText = trackingToken
        ? ` Save this one-time tracking token: ${trackingToken}.`
        : ' Your tracking credentials will be shown on the confirmation screen.';
      addMessage(
        'assistant',
        `Done — I filed your ${kind} report${image ? ' with the photo' : ''}. Case reference ${reference}.${credentialText} It is now pending review.`,
      );
      setDraft(finalDraft);
      setStep('complete');
    } catch (error) {
      addMessage(
        'assistant',
        `I could not file that report: ${error instanceof Error ? error.message : 'please try again'}. You can retry here or use the full report form.`,
      );
      setStep('photo');
      scheduleListen();
    } finally {
      setBusy(false);
    }
  }, [addMessage, scheduleListen]);

  const sendText = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    cancelSpeech();
    addMessage('user', text);
    setInput('');
    const reply = handleAnswer(step, text, draft);
    setDraft(reply.draft);
    setStep(reply.step);
    addMessage('assistant', reply.message);
    if (reply.shouldSubmit) void createReport(reply.draft);
    else if (voiceModeRef.current && !soundOnRef.current) scheduleListen();
  }, [addMessage, busy, cancelSpeech, createReport, draft, scheduleListen, step]);

  const reset = useCallback(() => {
    stopVoice();
    const fresh = initialReply();
    setMessages([{ id: nextId.current++, role: 'assistant', text: fresh.message }]);
    lastSpokenIdRef.current = -1;
    setDraft(fresh.draft);
    setStep(fresh.step);
    setInput('');
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }, [stopVoice]);

  const toggleVoice = useCallback(() => {
    if (voiceModeRef.current) {
      stopVoice();
      return;
    }

    if (!getRecognition()) {
      addMessage('assistant', 'Voice input is not supported in this browser. Type your answer instead.');
      return;
    }

    voiceModeRef.current = true;
    setVoiceMode(true);
    cancelSpeech();
    startListening();
  }, [addMessage, cancelSpeech, startListening, stopVoice]);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    if (!next) {
      cancelSpeech();
      scheduleListen();
    }
  }, [cancelSpeech, scheduleListen]);

  const handleFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!acceptedImages.split(',').includes(file.type) || file.size > maxImageBytes) {
      addMessage('assistant', 'Use a JPG, PNG, WebP, GIF, HEIC, or HEIF image under 15MB.');
      return;
    }

    cancelSpeech();
    addMessage('user', `Attached photo: ${file.name}`);
    const withImage: AssistantDraft = { ...draft, imageName: file.name };
    setDraft(withImage);
    addMessage('assistant', 'Thanks — I have the photo. Creating your report now…');
    void createReport(withImage, file);
  }, [addMessage, cancelSpeech, createReport, draft]);

  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : launcherRef.current;
      const frame = requestAnimationFrame(() => closeRef.current?.focus());
      return () => cancelAnimationFrame(frame);
    }

    if (!hasOpenedRef.current) return;
    const previous = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;
    if (previous?.isConnected) previous.focus();
    else launcherRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    sendRef.current = sendText;
    startListeningRef.current = startListening;
    scheduleListenRef.current = scheduleListen;
    speakRef.current = speak;
  }, [scheduleListen, sendText, speak, startListening]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  useEffect(() => {
    if (!open || !soundOn) return;
    const latest = messages[messages.length - 1];
    if (!latest || latest.role !== 'assistant' || latest.id <= lastSpokenIdRef.current) return;
    lastSpokenIdRef.current = latest.id;
    speakRef.current(latest.text);
  }, [messages, open, soundOn]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, open, busy, listening, speaking]);

  useEffect(() => () => {
    voiceModeRef.current = false;
    if (listenTimerRef.current !== null) window.clearTimeout(listenTimerRef.current);
    recognitionRef.current?.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const latestAssistantId = [...messages].reverse().find((message) => message.role === 'assistant')?.id;

  const quickReplies = step === 'type'
    ? ['I lost something', 'I found something']
    : step === 'photo' || step === 'identifier'
      ? ['skip']
      : [];

  return (
    <>
      <button
        aria-controls="report-assistant-dialog"
        aria-expanded={open}
        aria-label={open ? 'Close report assistant' : 'Open report assistant'}
        className="fixed bottom-5 left-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-on-primary shadow-2xl transition-transform hover:scale-105 active:scale-95 sm:left-6"
        onClick={() => setOpen((value) => !value)}
        ref={launcherRef}
        type="button"
      >
        <span className="material-symbols-outlined text-[24px]">{open ? 'close' : 'smart_toy'}</span>
      </button>

      {open && (
        <section
          aria-labelledby="report-assistant-title"
          aria-modal="true"
          className="fixed bottom-24 left-4 z-50 flex max-h-[min(560px,calc(100vh-7rem))] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-2xl sm:left-6"
          id="report-assistant-dialog"
          role="dialog"
        >
          <header className="flex items-center justify-between gap-space-sm border-b border-outline-variant bg-canvas px-space-md py-space-sm">
            <div className="min-w-0">
              <p className="font-title-md text-title-md text-primary" id="report-assistant-title">CampusFind assistant</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Speak naturally — I will answer and file the report
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                aria-label="Close report assistant"
                className="grid h-8 w-8 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"
                onClick={() => setOpen(false)}
                ref={closeRef}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
              <button
                aria-label={soundOn ? 'Mute assistant voice' : 'Unmute assistant voice'}
                className="grid h-8 w-8 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"
                onClick={toggleSound}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {soundOn ? 'volume_up' : 'volume_off'}
                </span>
              </button>
              <button
                aria-label="Restart conversation"
                className="grid h-8 w-8 place-items-center rounded-full text-on-surface-variant hover:bg-surface-container"
                onClick={reset}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
              </button>
            </div>
          </header>

          <div className="flex-1 space-y-space-sm overflow-y-auto px-space-md py-space-md" ref={scrollRef}>
            {messages.map((message) => (
              <div
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                key={message.id}
              >
                <p
                  aria-live={message.id === latestAssistantId ? 'polite' : undefined}
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-space-sm py-2 font-body-md text-body-md ${
                    message.role === 'user'
                      ? 'rounded-br-sm bg-secondary text-on-secondary'
                      : 'rounded-bl-sm bg-surface-container text-on-surface'
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
            {busy && (
              <p className="font-body-sm text-body-sm text-outline">Filing your report…</p>
            )}
          </div>

          {(voiceMode || speaking) && (
            <div className="flex items-center gap-space-xs px-space-md pb-space-xs font-label-sm text-label-sm text-on-surface-variant">
              <span className={`size-2 rounded-full animate-pulse ${speaking ? 'bg-secondary' : 'bg-error'}`} />
              {speaking ? 'Speaking…' : 'Voice mode on — I am listening'}
            </div>
          )}

          {quickReplies.length > 0 && !busy && (
            <div className="flex flex-wrap gap-space-xs px-space-md pb-space-xs">
              {quickReplies.map((quickReply) => (
                <button
                  className="rounded-full border border-outline-variant px-space-sm py-0.5 font-label-sm text-label-sm text-secondary hover:bg-secondary-fixed"
                  key={quickReply}
                  onClick={() => sendText(quickReply)}
                  type="button"
                >
                  {quickReply}
                </button>
              ))}
            </div>
          )}

          {step === 'photo' && !busy && (
            <div className="px-space-md pb-space-xs">
              <label className="flex cursor-pointer items-center justify-center gap-space-xs rounded-xl border border-dashed border-secondary bg-secondary-fixed px-space-sm py-2 font-label-md text-label-md text-on-secondary-fixed">
                <span className="material-symbols-outlined text-[18px]">attach_photo</span>
                Attach item photo
                <input
                  accept={acceptedImages}
                  aria-label="Attach item photo"
                  className="sr-only"
                  onChange={handleFile}
                  ref={fileRef}
                  type="file"
                />
              </label>
            </div>
          )}

          <form
            className="flex items-center gap-space-xs border-t border-outline-variant bg-surface px-space-sm py-space-sm"
            onSubmit={(event) => {
              event.preventDefault();
              sendText(input);
            }}
          >
            <button
              aria-label={voiceMode ? 'Stop hands-free voice' : 'Start hands-free voice'}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                voiceMode ? 'bg-error text-on-error' : 'bg-surface-container text-primary'
              }`}
              onClick={toggleVoice}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">
                {voiceMode ? 'stop_circle' : 'mic'}
              </span>
            </button>
            <input
              aria-label="Message the CampusFind assistant"
              className="min-w-0 flex-1 rounded-full bg-surface-container-lowest px-space-sm py-2 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none"
              disabled={busy}
              onChange={(event) => setInput(event.target.value)}
              placeholder={listening ? 'Listening…' : promptFor(step, draft)}
              value={input}
            />
            <button
              aria-label="Send message"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40"
              disabled={busy || !input.trim()}
              type="submit"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </section>
      )}
    </>
  );
}

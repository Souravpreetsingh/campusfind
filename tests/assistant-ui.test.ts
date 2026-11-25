import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const source = readFileSync(`${rootDir}src/components/report-assistant.tsx`, 'utf8');

describe('assistant realtime voice wiring', () => {
  it('transcribes speech live and sends final spoken answers', () => {
    expect(source).toContain('interimResults = true');
    expect(source).toContain('result?.isFinal');
    expect(source).toContain('sendRef.current(finalText.trim())');
  });

  it('speaks assistant replies aloud', () => {
    expect(source).toContain("'speechSynthesis' in window");
    expect(source).toContain('window.speechSynthesis.speak(utterance)');
    expect(source).toContain('speakRef.current(latest.text)');
  });

  it('reopens the microphone after each spoken reply and exposes voice controls', () => {
    expect(source).toContain('scheduleListenRef.current()');
    expect(source).toContain("aria-label={soundOn ? 'Mute assistant voice' : 'Unmute assistant voice'}");
    expect(source).toContain("aria-label={voiceMode ? 'Stop hands-free voice' : 'Start hands-free voice'}");
    expect(source).toContain("aria-label=\"Restart conversation\"");
  });

  it('still allows a real photo upload and typed reports', () => {
    expect(source).toContain("fetch('/api/reports'");
    expect(source).toContain("headers: { Accept: 'application/json' }");
    expect(source).toContain("form.append('images', image, image.name)");
    expect(source).toContain('onSubmit={(event) => {');
  });

  it('starts muted and behaves as a labelled modal dialog', () => {
    expect(source).toContain('useState(false)');
    expect(source).toContain('useRef(false)');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="report-assistant-title"');
    expect(source).toContain('id="report-assistant-dialog"');
    expect(source).toContain('aria-controls="report-assistant-dialog"');
    expect(source).toContain('ref={closeRef}');
    expect(source).toContain('closeRef.current?.focus()');
    expect(source).toContain('previouslyFocusedRef.current');
    expect(source).toContain("event.key === 'Escape'");
  });

  it('keeps the launcher left-aligned with a responsive offset', () => {
    expect(source).toContain('bottom-5 left-4');
    expect(source).toContain('sm:left-6');
    expect(source).toContain('aria-label={open ? \'Close report assistant\' : \'Open report assistant\'}');
  });

  it('announces only the newest assistant reply', () => {
    expect(source).toContain('latestAssistantId');
    expect(source).toContain("aria-live={message.id === latestAssistantId ? 'polite' : undefined}");
    expect(source).not.toContain('<div aria-live="polite"');
  });

  it('shows the case reference and one-time token from a successful submission', () => {
    expect(source).toContain('caseReference?: string');
    expect(source).toContain('trackingToken?: string');
    expect(source).toContain('data.caseReference');
    expect(source).toContain('data.trackingToken');
    expect(source).toContain('one-time tracking token');
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildReportFields,
  emptyDraft,
  handleAnswer,
  initialReply,
  type AssistantDraft,
} from '@/lib/report-assistant';

function completeDraft(reportType: 'LOST' | 'FOUND'): AssistantDraft {
  let current = initialReply();
  current = handleAnswer(
    current.step,
    reportType === 'LOST'
      ? 'I lost my black AirPods case in the library'
      : 'I found a silver laptop near the science atrium',
    current.draft,
  );
  current = handleAnswer(current.step, 'A red sticker on the lid', current.draft);
  current = handleAnswer(current.step, 'myNetId123 me@example.edu', current.draft);
  return current.draft;
}

describe('report assistant conversation', () => {
  it('extracts a lost report from a spoken sentence', () => {
    let reply = initialReply();
    reply = handleAnswer(reply.step, 'I lost my black AirPods case in the library', reply.draft);

    expect(reply.draft.reportType).toBe('LOST');
    expect(reply.draft.category).toBe('black AirPods case');
    expect(reply.draft.location).toBe('the library');
    expect(reply.step).toBe('identifier');
  });

  it('extracts a found report from a spoken sentence', () => {
    let reply = initialReply();
    reply = handleAnswer(reply.step, 'I found a silver laptop near the science atrium', reply.draft);

    expect(reply.draft.reportType).toBe('FOUND');
    expect(reply.draft.category).toBe('silver laptop');
    expect(reply.draft.location).toBe('the science atrium');
    expect(reply.step).toBe('identifier');
  });

  it('asks for a photo before submitting', () => {
    const draft = completeDraft('LOST');
    const reply = handleAnswer('identity', 'myNetId123 me@example.edu', {
      ...draft,
      reporterNetId: '',
      contactEmail: '',
    });

    expect(reply.step).toBe('photo');
    expect(reply.message).toContain('photo');
    expect(reply.shouldSubmit).toBe(false);
  });

  it('submits after the photo step is skipped', () => {
    const reply = handleAnswer('photo', 'skip', completeDraft('FOUND'));
    expect(reply.shouldSubmit).toBe(true);
  });

  it('builds API fields from the collected conversation', () => {
    const reply = handleAnswer('photo', 'skip', completeDraft('LOST'));
    const fields = buildReportFields(reply.draft);

    expect(fields).toMatchObject({
      reportType: 'LOST',
      category: 'black AirPods case',
      location: 'the library',
      reporterNetId: 'myNetId123',
      contactEmail: 'me@example.edu',
      distinguishingMark: 'A red sticker on the lid',
    });
    expect(fields.description.length).toBeGreaterThanOrEqual(10);
  });

  it('asks again when the report type is unclear', () => {
    const reply = handleAnswer('type', 'maybe something', emptyDraft());
    expect(reply.step).toBe('type');
    expect(reply.draft.reportType).toBeNull();
  });
});

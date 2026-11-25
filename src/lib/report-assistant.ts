/**
 * Deterministic conversation flow for the CampusFind report assistant.
 * The UI owns the messages; this module owns the draft and the prompts.
 */

export type ReportType = 'LOST' | 'FOUND';

export type AssistantStep =
  | 'type'
  | 'item'
  | 'location'
  | 'identifier'
  | 'identity'
  | 'photo'
  | 'complete';

export type AssistantDraft = {
  reportType: ReportType | null;
  category: string;
  description: string;
  location: string;
  distinguishingMark: string;
  reporterNetId: string;
  reporterName: string;
  contactEmail: string;
  imageName: string;
};

export type AssistantReply = {
  message: string;
  draft: AssistantDraft;
  step: AssistantStep;
  shouldSubmit: boolean;
};

export function emptyDraft(): AssistantDraft {
  return {
    reportType: null,
    category: '',
    description: '',
    location: '',
    distinguishingMark: '',
    reporterNetId: '',
    reporterName: '',
    contactEmail: '',
    imageName: '',
  };
}

export function promptFor(step: AssistantStep, draft: AssistantDraft): string {
  switch (step) {
    case 'type':
      return 'Hi! I can file this for you. Did you lose an item, or did you find one?';
    case 'item':
      return 'What is the item? Tell me the brand, color, and anything that makes it recognizable.';
    case 'location':
      return draft.reportType === 'FOUND'
        ? 'Where did you find it?'
        : 'Where did you last have it?';
    case 'identifier':
      return "Is there a serial, engraving, sticker, or scratch that would confirm ownership? Type 'skip' if not.";
    case 'identity':
      return 'What NetID should we use for verification? You can also include your name and email.';
    case 'photo':
      return "Please attach a clear photo of the item. Type 'skip' if you do not have one right now.";
    case 'complete':
      return 'Your report is filed. Type “restart” to create another one.';
  }
}

export function initialReply(): AssistantReply {
  return { message: promptFor('type', emptyDraft()), draft: emptyDraft(), step: 'type', shouldSubmit: false };
}

function isSkipped(text: string) {
  return /^(skip|no|none|n\/a|not now)$/i.test(text.trim());
}

function cleanItem(text: string) {
  return text
    .replace(/^(yes|well|okay|ok|so)[,\s]+/i, '')
    .replace(/^(it's|its|this is|that's|i (?:lost|found|have)|we (?:lost|found)|my|the|a|an)\s+/i, '')
    .trim();
}

function summarizeCategory(text: string) {
  const cleaned = cleanItem(text)
    .split(/[,.]/)[0]
    .split(/\s+with\s+/i)[0]
    .replace(/^(?:a|an|the|my)\s+/i, '')
    .trim();
  return (cleaned || 'Personal item').slice(0, 80);
}

function parseOpening(text: string): { reportType: ReportType; item: string; location: string } | null {
  const lost = /\b(lost|misplaced|missing|can'?t find|cannot find)\b/i.test(text);
  const found = /\b(found|picked up|discovered|turned in)\b/i.test(text);
  if (lost === found) return null;

  const remainder = text
    .replace(/\b(?:i|we)\s+(?:lost|misplaced|found|picked up|discovered|can'?t find|cannot find)\s+/i, '')
    .replace(/^(?:my|the|a|an)\s+/i, '')
    .trim();

  const place = remainder.match(/\b(?:in|at|near|inside|by)\s+(.+)$/i);
  let item = remainder;
  let location = '';

  if (place && place[1] && !/^it\b/i.test(place[1].trim())) {
    item = remainder.slice(0, place.index ?? remainder.length).trim();
    location = place[1].trim().slice(0, 200);
  }

  return {
    reportType: lost ? 'LOST' : 'FOUND',
    item: cleanItem(item),
    location,
  };
}

function parseIdentity(text: string) {
  const email = text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? '';
  const withoutEmail = email ? text.replace(email, ' ') : text;
  const tokens = withoutEmail.match(/[A-Za-z0-9._-]+/g) ?? [];
  const ignored = new Set([
    'i',
    'am',
    'a',
    'an',
    'the',
    'my',
    'netid',
    'net',
    'id',
    'is',
    'email',
    'and',
    'name',
    "i'm",
  ]);
  const netId = tokens.find((token) => !ignored.has(token.toLowerCase()) && token.length >= 2) ?? '';

  let reporterName = '';
  const nameMatch = text.match(/\b(?:name|i am|i'm)\s+([A-Za-z][A-Za-z .'-]{1,80})/i);
  if (nameMatch?.[1]) reporterName = nameMatch[1].split(/,|\s+(?:netid|email)\b/i)[0].trim();

  return {
    netId: netId.slice(0, 50),
    reporterName: reporterName.slice(0, 120),
    contactEmail: email.slice(0, 120),
  };
}

function reply(message: string, draft: AssistantDraft, step: AssistantStep, shouldSubmit = false): AssistantReply {
  return { message, draft, step, shouldSubmit };
}

export function handleAnswer(step: AssistantStep, text: string, current: AssistantDraft): AssistantReply {
  const answer = text.trim();

  if (/^(restart|start over|new report)$/i.test(answer)) return initialReply();
  if (step === 'complete') return reply(promptFor('complete', current), current, 'complete');

  const opening = step === 'type' ? parseOpening(answer) : null;
  if (step === 'type' && !opening) {
    return reply("Please tell me whether you lost the item or found it.", current, 'type');
  }

  const draft: AssistantDraft = opening
    ? {
        ...current,
        reportType: opening.reportType,
        category: summarizeCategory(opening.item),
        description: opening.item,
        location: opening.location,
      }
    : { ...current };

  if (step === 'type' || opening) {
    const label = draft.reportType === 'FOUND' ? 'a found item' : 'a lost item';
    if (draft.category && draft.location) {
      return reply(`Got it — ${label}: ${draft.category} at ${draft.location}. ${promptFor('identifier', draft)}`, draft, 'identifier');
    }
    if (draft.category) {
      return reply(`Got it — ${label}: ${draft.category}. ${promptFor('location', draft)}`, draft, 'location');
    }
    return reply(`Got it — ${label}. ${promptFor('item', draft)}`, draft, 'item');
  }

  switch (step) {
    case 'item': {
      if (answer.length < 4) return reply(promptFor('item', draft), draft, 'item');
      draft.category = summarizeCategory(answer);
      draft.description = answer.slice(0, 5000);
      return reply(`Thanks. ${promptFor('location', draft)}`, draft, 'location');
    }

    case 'location': {
      if (answer.length < 2) return reply(promptFor('location', draft), draft, 'location');
      draft.location = answer.slice(0, 200);
      return reply(promptFor('identifier', draft), draft, 'identifier');
    }

    case 'identifier': {
      draft.distinguishingMark = isSkipped(answer) ? '' : answer.slice(0, 500);
      return reply(promptFor('identity', draft), draft, 'identity');
    }

    case 'identity': {
      const identity = parseIdentity(answer);
      if (!identity.netId) return reply("I still need your NetID for verification. What is it?", draft, 'identity');
      draft.reporterNetId = identity.netId;
      draft.reporterName = identity.reporterName;
      draft.contactEmail = identity.contactEmail;
      return reply(promptFor('photo', draft), draft, 'photo');
    }

    case 'photo': {
      if (!isSkipped(answer)) return reply("Use the attach button below to choose an image, or type 'skip'.", draft, 'photo');
      return reply('No photo added. Creating your report now…', draft, 'photo', true);
    }

    default:
      return reply(promptFor('type', draft), draft, 'type');
  }
}

export function buildReportFields(draft: AssistantDraft): Record<string, string> {
  const description = draft.description.length >= 10
    ? draft.description
    : `${draft.description || draft.category} — reported through the CampusFind assistant`;

  return {
    reportType: draft.reportType ?? 'LOST',
    category: draft.category || 'Personal item',
    description: description.slice(0, 5000),
    location: draft.location || 'Campus location not specified',
    reporterNetId: draft.reporterNetId,
    reporterName: draft.reporterName,
    contactEmail: draft.contactEmail,
    distinguishingMark: draft.distinguishingMark,
  };
}

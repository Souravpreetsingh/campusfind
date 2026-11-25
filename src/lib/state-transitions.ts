/** Server-side state machines shared by the admin API routes. */

export const REPORT_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  PENDING: ['APPROVED', 'ARCHIVED'],
  APPROVED: ['CLAIMED', 'ARCHIVED'],
  CLAIMED: [],
  ARCHIVED: [],
};

export const CLAIM_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  SUBMITTED: ['UNDER_REVIEW', 'ADDITIONAL_INFO', 'REJECTED'],
  UNDER_REVIEW: ['ADDITIONAL_INFO', 'APPROVED', 'REJECTED', 'DISPUTED'],
  ADDITIONAL_INFO: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  DISPUTED: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
  APPROVED: [],
  REJECTED: [],
};

export const CUSTODY_STATE_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  WITH_FINDER: ['SUBMITTED'],
  SUBMITTED: ['STORED'],
  STORED: ['READY'],
  READY: ['RETURNED'],
  RETURNED: [],
};

export const MATCH_STATUS_TRANSITIONS: Readonly<Record<string, readonly string[]>> = {
  CANDIDATE: ['APPROVED', 'DISMISSED'],
  APPROVED: [],
  DISMISSED: [],
  CLAIMED: [],
};

export function canTransition(
  transitions: Readonly<Record<string, readonly string[]>>,
  from: string,
  to: string,
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

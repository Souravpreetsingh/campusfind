import { cookies } from 'next/headers';

const TRACKING_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export type TrackingCookieValue = {
  reference: string;
  token: string;
};

function cookieName(): string {
  return process.env.NODE_ENV === 'production' ? '__Host-cf_track' : 'cf_track';
}

function encode(value: TrackingCookieValue): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function decode(raw: string): TrackingCookieValue | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const value = parsed as Record<string, unknown>;
    if (typeof value.reference !== 'string' || typeof value.token !== 'string') return null;
    if (!value.reference || !value.token) return null;
    return { reference: value.reference, token: value.token };
  } catch {
    return null;
  }
}

/** Stores the one-time tracking credential for ten minutes. */
export async function setTrackingCookie(reference: string, token: string): Promise<void> {
  const store = await cookies();
  store.set(cookieName(), encode({ reference, token }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TRACKING_COOKIE_MAX_AGE_SECONDS,
  });
}

/** Reads the tracking credential in server components and route handlers. */
export async function getTrackingCookie(): Promise<TrackingCookieValue | null> {
  const store = await cookies();
  const raw = store.get(cookieName())?.value ?? store.get('cf_track')?.value;
  return raw ? decode(raw) : null;
}

/** Invalidates the one-time tracking credential after a successful lookup. */
export async function clearTrackingCookie(): Promise<void> {
  const store = await cookies();
  store.delete(cookieName());
  store.delete('cf_track');
}

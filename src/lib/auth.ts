import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';
import { db } from '@/lib/db';

export const SESSION_COOKIE = 'campusfind_session';
export const SESSION_COOKIE_PRODUCTION = '__Host-campusfind_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

const PLACEHOLDER_MARKERS = [
  'change-me',
  'changeme',
  'change this',
  'replace-with',
  'replace with',
  'placeholder',
  'example',
  'local-development',
  'development-secret',
];

export type SessionPayload = {
  sub: string;
  email: string;
  role: Role;
  jti: string;
};

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/** Never logs or returns the secret itself. */
export function hasValidSessionSecret(): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false;
  const normalized = secret.toLowerCase();
  return !PLACEHOLDER_MARKERS.some((marker) => normalized.includes(marker));
}

function secretKey(): Uint8Array {
  if (!hasValidSessionSecret()) {
    throw new Error('SESSION_SECRET must be a strong, non-placeholder value of at least 32 characters.');
  }
  return new TextEncoder().encode(process.env.SESSION_SECRET as string);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuer('campusfind')
    .setAudience('campusfind-web')
    .setJti(payload.jti)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey());
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  const production = process.env.NODE_ENV === 'production';
  store.set(production ? SESSION_COOKIE_PRODUCTION : SESSION_COOKIE, token, {
    httpOnly: true,
    secure: production,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_PRODUCTION);
  store.delete(SESSION_COOKIE);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_PRODUCTION)?.value ?? store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: 'campusfind',
      audience: 'campusfind-web',
    });
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.jti !== 'string'
    ) {
      return null;
    }

    const session = await db.adminSession.findUnique({ where: { id: payload.jti } });
    if (!session || session.userId !== payload.sub || session.expiresAt.getTime() <= Date.now()) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role as Role,
      jti: payload.jti,
    };
  } catch {
    return null;
  }
}

export async function deleteSessionByJti(jti: string): Promise<void> {
  await db.adminSession.deleteMany({ where: { id: jti } });
}

export async function getCurrentUser() {
  const session = await getSessionPayload();
  if (!session) return null;

  return db.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      collegeId: true,
      createdAt: true,
    },
  });
}

/** Role membership is exact: higher-ranked roles do not inherit access. */
export async function requireRole(allowed: Role[]) {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError('Authentication required.');
  if (!allowed.includes(user.role)) throw new AuthorizationError();

  return user;
}

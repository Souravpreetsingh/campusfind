import { randomBytes, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createSessionToken, SESSION_MAX_AGE_SECONDS, setSessionCookie } from '@/lib/auth';
import { handleApiError, jsonError } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { getClientIp } from '@/lib/client-ip';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// A real bcrypt hash keeps missing-user checks comparable to wrong-password checks.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, 'login', LOGIN_LIMIT, LOGIN_WINDOW_MS);

    const input = loginSchema.parse(await request.json());
    const user = await db.user.findUnique({ where: { email: input.email } });
    const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
      return jsonError('Invalid email or password.', 401);
    }

    const jti = randomUUID();
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null;
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

    await db.$transaction(async (tx) => {
      await tx.adminSession.create({
        data: {
          id: jti,
          userId: user.id,
          expiresAt,
          ipAddress: ipAddress === 'unknown' ? null : ipAddress,
          userAgent,
        },
      });

      const olderSessions = await tx.adminSession.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
        skip: 3,
      });
      if (olderSessions.length > 0) {
        await tx.adminSession.deleteMany({
          where: { id: { in: olderSessions.map((session) => session.id) } },
        });
      }

      await writeAuditLog(tx, {
        actorId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        metadata: { ipAddress, userAgent },
      });
    });

    const token = await createSessionToken({ sub: user.id, email: user.email, role: user.role, jti });
    await setSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

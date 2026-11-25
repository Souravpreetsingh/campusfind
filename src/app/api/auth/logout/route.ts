import { NextResponse } from 'next/server';
import { clearSessionCookie, getSessionPayload } from '@/lib/auth';
import { handleApiError } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const session = await getSessionPayload();
    if (session) {
      await db.$transaction(async (tx) => {
        await tx.adminSession.deleteMany({ where: { id: session.jti } });
        await writeAuditLog(tx, {
          actorId: session.sub,
          action: 'LOGOUT',
          entityType: 'User',
          entityId: session.sub,
        });
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

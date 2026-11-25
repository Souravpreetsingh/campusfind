import { NextResponse } from 'next/server';
import { MatchStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { ConflictError, handleApiError, NotFoundError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { canTransition, MATCH_STATUS_TRANSITIONS } from '@/lib/state-transitions';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  action: z.enum(['APPROVE', 'DISMISS']),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const reviewer = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);
    const id = z.string().uuid().parse((await params).id);
    const input = updateSchema.parse(await request.json());
    const nextStatus = input.action === 'APPROVE' ? MatchStatus.APPROVED : MatchStatus.DISMISSED;

    const current = await db.match.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!current) throw new NotFoundError('Match not found.');
    if (!canTransition(MATCH_STATUS_TRANSITIONS, current.status, nextStatus)) {
      throw new ConflictError('Match has already been decided.');
    }

    const updated = await db.$transaction(async (tx) => {
      const match = await tx.match.update({
        where: { id },
        data: { status: nextStatus },
      });

      await writeAuditLog(tx, {
        actorId: reviewer.id,
        action: `MATCH_${input.action}`,
        entityType: 'Match',
        entityId: id,
        previousState: { status: current.status },
        newState: { status: nextStatus },
      });

      return match;
    });

    return NextResponse.json({ match: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

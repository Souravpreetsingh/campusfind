import { NextResponse } from 'next/server';
import { ClaimStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { ConflictError, handleApiError, jsonError, NotFoundError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { canTransition, CLAIM_STATUS_TRANSITIONS } from '@/lib/state-transitions';

const updateSchema = z.object({
  status: z.nativeEnum(ClaimStatus),
  reason: z.string().trim().max(2000).optional(),
});

const TERMINAL_STATUSES = new Set<ClaimStatus>([ClaimStatus.APPROVED, ClaimStatus.REJECTED]);

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const reviewer = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);
    const id = z.string().uuid().parse((await params).id);
    const input = updateSchema.parse(await request.json());

    if (input.status === ClaimStatus.REJECTED && !input.reason?.trim()) {
      return jsonError('A reason is required when rejecting a claim.', 400);
    }

    const current = await db.claim.findUnique({
      where: { id },
      select: { id: true, status: true, reason: true },
    });
    if (!current) throw new NotFoundError('Claim not found.');
    if (!canTransition(CLAIM_STATUS_TRANSITIONS, current.status, input.status)) {
      throw new ConflictError('Invalid claim status transition.');
    }

    const terminal = TERMINAL_STATUSES.has(input.status);
    const now = new Date();
    const updated = await db.$transaction(async (tx) => {
      const claim = await tx.claim.update({
        where: { id },
        data: {
          status: input.status,
          reason: input.reason?.trim() || current.reason || null,
          resolvedById: terminal ? reviewer.id : null,
          resolvedAt: terminal ? now : null,
        },
      });

      await writeAuditLog(tx, {
        actorId: reviewer.id,
        action: `CLAIM_${input.status}`,
        entityType: 'Claim',
        entityId: id,
        metadata: { reason: input.reason?.trim() || null },
        previousState: { status: current.status, reason: current.reason },
        newState: { status: input.status, reason: claim.reason },
      });

      return claim;
    });

    return NextResponse.json({ claim: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

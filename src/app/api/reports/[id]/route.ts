import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { ConflictError, handleApiError, jsonError, NotFoundError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { canTransition, REPORT_STATUS_TRANSITIONS } from '@/lib/state-transitions';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  status: z.enum(['APPROVED', 'ARCHIVED', 'CLAIMED']),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const reviewer = await requireRole([Role.MODERATOR, Role.SUPER_ADMIN]);
    const id = z.string().uuid().parse((await params).id);
    const input = updateSchema.parse(await request.json());

    const current = await db.report.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!current) throw new NotFoundError('Report not found.');
    if (!canTransition(REPORT_STATUS_TRANSITIONS, current.status, input.status)) {
      throw new ConflictError('Invalid report status transition.');
    }

    const updated = await db.$transaction(async (tx) => {
      const report = await tx.report.update({
        where: { id },
        data: { status: input.status },
      });

      await writeAuditLog(tx, {
        actorId: reviewer.id,
        action: `REPORT_${input.status}`,
        entityType: 'Report',
        entityId: id,
        previousState: { status: current.status },
        newState: { status: input.status },
      });

      return report;
    });

    return NextResponse.json({ report: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

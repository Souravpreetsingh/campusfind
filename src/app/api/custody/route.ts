import { NextResponse } from 'next/server';
import { ClaimStatus, CustodyState, Prisma, ReportStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { ConflictError, handleApiError, NotFoundError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { canTransition, CUSTODY_STATE_TRANSITIONS } from '@/lib/state-transitions';

const custodySchema = z.object({
  reportId: z.string().uuid(),
  state: z.nativeEnum(CustodyState),
  location: z.string().trim().max(200).optional(),
});

export async function GET() {
  try {
    const user = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);
    const where: Prisma.CustodyRecordWhereInput = user.collegeId
      ? {
          OR: [
            { report: { collegeId: user.collegeId } },
            { report: { collegeId: null } },
          ],
        }
      : {};

    const records = await db.custodyRecord.findMany({
      where,
      include: { report: true, heldBy: { select: { id: true, email: true, name: true } } },
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ records });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);
    const input = custodySchema.parse(await request.json());

    const collegeFilter: Prisma.ReportWhereInput = user.collegeId
      ? { OR: [{ collegeId: user.collegeId }, { collegeId: null }] }
      : {};

    const record = await db.$transaction(async (tx) => {
      const report = await tx.report.findFirst({
        where: { id: input.reportId, ...collegeFilter },
        select: { id: true },
      });
      if (!report) throw new NotFoundError('Report not found.');

      const latest = await tx.custodyRecord.findFirst({
        where: { reportId: input.reportId },
        orderBy: { receivedAt: 'desc' },
        select: { state: true, location: true },
      });
      const from = latest?.state ?? CustodyState.WITH_FINDER;

      if (!canTransition(CUSTODY_STATE_TRANSITIONS, from, input.state)) {
        throw new ConflictError('Invalid custody state transition.');
      }

      if (input.state === CustodyState.RETURNED) {
        const approvedClaim = await tx.claim.findFirst({
          where: { reportId: input.reportId, status: ClaimStatus.APPROVED },
          select: { id: true },
        });
        if (!approvedClaim) {
          throw new ConflictError('An approved claim is required before returning an item.');
        }
        await tx.report.update({
          where: { id: input.reportId },
          data: { status: ReportStatus.CLAIMED },
        });
      }

      const created = await tx.custodyRecord.create({
        data: {
          reportId: input.reportId,
          state: input.state,
          location: input.location,
          heldById: user.id,
        },
      });

      await writeAuditLog(tx, {
        actorId: user.id,
        action: `CUSTODY_${input.state}`,
        entityType: 'Report',
        entityId: input.reportId,
        metadata: {
          location: input.location ?? null,
          custodyRecordId: created.id,
        },
        previousState: { state: from, location: latest?.location ?? null },
        newState: { state: input.state, location: input.location ?? null },
      });

      return created;
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { handleApiError, NotFoundError } from '@/lib/api';
import { AuthorizationError, requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const handoverSchema = z.object({
  formKind: z.enum(['inline', 'modal']).optional(),
  transferringOfficer: z.string().trim().min(2).max(120),
  receivingOfficer: z.string().trim().min(2).max(120),
  targetLocation: z.string().trim().max(200).optional(),
  assetTag: z.string().trim().max(200).optional(),
  sealBarcode: z.string().trim().max(120).optional(),
  reason: z.string().trim().min(5).max(2000),
  reportId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const isForm =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');

  try {
    assertSameOrigin(request);

    const raw = isForm
      ? Object.fromEntries(
          [...(await request.formData()).entries()].map(([key, value]) => [key, String(value)]),
        )
      : await request.json();

    const input = handoverSchema.parse(raw);
    const user = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);
    const entityId = `CUSTODY_TRANSFER-${randomUUID()}`;

    const previous = input.reportId
      ? await db.custodyRecord.findFirst({
          where: { reportId: input.reportId },
          orderBy: { receivedAt: 'desc' },
          select: { state: true, location: true },
        })
      : null;

    if (input.reportId) {
      const report = await db.report.findUnique({
        where: { id: input.reportId },
        select: { id: true },
      });
      if (!report) throw new NotFoundError('Report not found.');
    }

    const newState = {
      formKind: input.formKind ?? 'inline',
      transferringOfficer: input.transferringOfficer,
      receivingOfficer: input.receivingOfficer,
      targetLocation: input.targetLocation ?? null,
      assetTag: input.assetTag ?? null,
      sealBarcode: input.sealBarcode ?? null,
      reason: input.reason,
      reportId: input.reportId ?? null,
    };

    const auditLog = await db.$transaction(async (tx) => {
      return writeAuditLog(tx, {
        actorId: user.id,
        action: 'CUSTODY_HANDOVER_COMMITTED',
        entityType: 'CustodyTransfer',
        entityId,
        metadata: newState,
        previousState: previous
          ? { state: previous.state, location: previous.location }
          : undefined,
        newState,
      });
    });

    if (isForm) {
      return NextResponse.redirect(
        new URL('/vault-inventory-and-custody?handover=1', request.url),
        303,
      );
    }

    return NextResponse.json({ auditLog }, { status: 201 });
  } catch (error) {
    if (isForm && error instanceof AuthorizationError) {
      return NextResponse.redirect(
        new URL('/login?next=/vault-inventory-and-custody', request.url),
        303,
      );
    }
    return handleApiError(error);
  }
}

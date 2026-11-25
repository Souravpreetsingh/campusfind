import { NextResponse } from 'next/server';
import { ClaimStatus, Prisma, ReportStatus, Role } from '@prisma/client';
import { z } from 'zod';
import { handleApiError, firstValue } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const CLAIM_LIMIT = 5;
const CLAIM_WINDOW_MS = 60 * 60 * 1000;

const claimSchema = z.object({
  reportId: z.string().uuid(),
  claimantName: z.string().trim().min(2).max(120),
  claimantEmail: z.string().email().transform((value) => value.toLowerCase()),
  ownershipExplanation: z.string().trim().min(20).max(5000),
  verificationAnswers: z
    .record(z.string(), z.string().max(500))
    .refine((answers) => Object.keys(answers).length <= 20, {
      message: 'At most 20 verification answers are allowed.',
    })
    .refine((answers) => Object.keys(answers).every((key) => key.length <= 100), {
      message: 'Verification question identifiers are too long.',
    })
    .optional(),
});

export async function GET(request: Request) {
  try {
    const user = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);

    const statusParam = firstValue(new URL(request.url).searchParams.get('status') ?? undefined);
    const status = Object.values(ClaimStatus).includes(statusParam as ClaimStatus)
      ? (statusParam as ClaimStatus)
      : undefined;

    const where: Prisma.ClaimWhereInput = status ? { status } : {};
    if (user.collegeId) {
      where.OR = [
        { report: { collegeId: user.collegeId } },
        { report: { collegeId: null } },
      ];
    }

    const claims = await db.claim.findMany({
      where,
      include: { report: { include: { category: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ claims });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, 'claims', CLAIM_LIMIT, CLAIM_WINDOW_MS);

    const input = claimSchema.parse(await request.json());
    const report = await db.report.findUnique({
      where: { id: input.reportId },
      select: { id: true, status: true },
    });
    if (!report || report.status !== ReportStatus.APPROVED) {
      return NextResponse.json({ error: 'Report is not available for claims.' }, { status: 404 });
    }

    const claim = await db.$transaction(async (tx) => {
      const created = await tx.claim.create({
        data: {
          reportId: input.reportId,
          claimantName: input.claimantName,
          claimantEmail: input.claimantEmail,
          ownershipExplanation: input.ownershipExplanation,
          verificationAnswers: input.verificationAnswers as Prisma.InputJsonValue | undefined,
        },
      });

      await writeAuditLog(tx, {
        action: 'CLAIM_SUBMITTED',
        entityType: 'Claim',
        entityId: created.id,
        metadata: { reportId: input.reportId },
        newState: { status: created.status },
      });

      return created;
    });

    return NextResponse.json({ claim }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { handleApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);

    // Users tied to a college only see their own tenant and unassigned records.
    const reportScope = user.collegeId
      ? { OR: [{ collegeId: user.collegeId }, { collegeId: null }] }
      : {};
    const claimScope = user.collegeId
      ? {
          OR: [
            { report: { collegeId: user.collegeId } },
            { report: { collegeId: null } },
          ],
        }
      : {};
    const matchScope = user.collegeId
      ? {
          OR: [
            { lostReport: { collegeId: user.collegeId } },
            { lostReport: { collegeId: null } },
            { foundReport: { collegeId: user.collegeId } },
            { foundReport: { collegeId: null } },
          ],
        }
      : {};

    const [reports, pendingClaims, matches, colleges] = await Promise.all([
      db.report.count({ where: reportScope }),
      db.claim.count({ where: { status: 'SUBMITTED', ...claimScope } }),
      db.match.count({ where: matchScope }),
      db.college.count({ where: user.collegeId ? { id: user.collegeId } : undefined }),
    ]);

    return NextResponse.json({ reports, pendingClaims, matches, colleges });
  } catch (error) {
    return handleApiError(error);
  }
}

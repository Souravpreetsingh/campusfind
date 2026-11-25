import { NextResponse } from 'next/server';
import { MatchStatus, Prisma, ReportStatus, Role } from '@prisma/client';
import { handleApiError } from '@/lib/api';
import { requireRole } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { scoreMatch, type MatchableReport } from '@/lib/matching';

export const dynamic = 'force-dynamic';
const MATCH_THRESHOLD = 50;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireRole([Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN]);

    const collegeFilter: Prisma.ReportWhereInput = user.collegeId
      ? { OR: [{ collegeId: user.collegeId }, { collegeId: null }] }
      : {};

    const [lostReports, foundReports] = await Promise.all([
      db.report.findMany({
        where: { type: 'LOST', status: ReportStatus.APPROVED, ...collegeFilter },
        include: { category: true },
      }),
      db.report.findMany({
        where: { type: 'FOUND', status: ReportStatus.APPROVED, ...collegeFilter },
        include: { category: true },
      }),
    ]);

    const toMatchable = (report: (typeof lostReports)[number]): MatchableReport => ({
      id: report.id,
      categoryName: report.category.name,
      brand: report.brand,
      colour: report.colour,
      description: report.description,
      campusBuilding: report.campusBuilding,
      date: report.type === 'LOST' ? report.lostDate : report.foundDate,
    });

    const existingMatches = await db.match.findMany({
      select: { id: true, lostReportId: true, foundReportId: true, status: true },
    });
    const byPair = new Map(
      existingMatches.map((match) => [
        `${match.lostReportId}:${match.foundReportId}`,
        match,
      ]),
    );

    let created = 0;
    let updated = 0;
    let preserved = 0;

    await db.$transaction(async (tx) => {
      for (const lost of lostReports) {
        for (const found of foundReports) {
          const result = scoreMatch(toMatchable(lost), toMatchable(found));
          if (result.score < MATCH_THRESHOLD) continue;

          const key = `${lost.id}:${found.id}`;
          const current = byPair.get(key);

          if (!current) {
            const match = await tx.match.create({
              data: {
                lostReportId: lost.id,
                foundReportId: found.id,
                score: result.score,
                reasons: result.reasons,
                status: MatchStatus.CANDIDATE,
              },
            });
            byPair.set(key, {
              id: match.id,
              lostReportId: lost.id,
              foundReportId: found.id,
              status: MatchStatus.CANDIDATE,
            });
            created += 1;

            await writeAuditLog(tx, {
              actorId: user.id,
              action: 'MATCH_CREATED',
              entityType: 'Match',
              entityId: match.id,
              metadata: { lostReportId: lost.id, foundReportId: found.id, score: result.score },
              newState: { status: MatchStatus.CANDIDATE, score: result.score },
            });
          } else if (current.status === MatchStatus.CANDIDATE) {
            await tx.match.update({
              where: { id: current.id },
              data: { score: result.score, reasons: result.reasons },
            });
            updated += 1;
          } else {
            // APPROVED, DISMISSED and CLAIMED decisions are never overwritten.
            preserved += 1;
          }
        }
      }
    });

    return NextResponse.json({
      evaluated: lostReports.length * foundReports.length,
      created,
      updated,
      preserved,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

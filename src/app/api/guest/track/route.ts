import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { handleApiError, jsonError } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { toPublicReport } from '@/lib/public-report';
import { enforceRateLimit } from '@/lib/rate-limit';
import { clearTrackingCookie, getTrackingCookie } from '@/lib/tracking-cookie';

export const dynamic = 'force-dynamic';

const TRACK_LIMIT = 3;
const TRACK_WINDOW_MS = 15 * 60 * 1000;
const MAX_CREDENTIAL_ATTEMPTS = 5;
const DUMMY_SECRET_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);

const trackSchema = z.object({
  reference: z
    .string()
    .trim()
    .regex(/^CF-\d{4}-\d{4}(?:-[A-Z])?$/i, 'Enter a valid case reference.'),
  secretToken: z.string().trim().min(8).max(64),
});

function readFormOrJson(rawForm: FormData | undefined, jsonBody: unknown) {
  if (rawForm) {
    return Object.fromEntries(
      [...rawForm.entries()].map(([key, value]) => [key, String(value)]),
    );
  }
  return jsonBody;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    enforceRateLimit(request, 'guest-track', TRACK_LIMIT, TRACK_WINDOW_MS);

    const contentType = request.headers.get('content-type') ?? '';
    const isForm =
      contentType.includes('application/x-www-form-urlencoded') ||
      contentType.includes('multipart/form-data');
    const raw = isForm
      ? readFormOrJson(await request.formData(), undefined)
      : readFormOrJson(undefined, await request.json());

    let candidate: unknown = raw;
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const fields = candidate as Record<string, unknown>;
      if (!fields.reference || !fields.secretToken) {
        const cookie = await getTrackingCookie();
        if (cookie) {
          candidate = {
            ...fields,
            reference: fields.reference || cookie.reference,
            secretToken: fields.secretToken || cookie.token,
          };
        }
      }
    }

    let input;
    try {
      input = trackSchema.parse(candidate);
    } catch (error) {
      if (isForm) {
        return NextResponse.redirect(new URL('/secure-guest-tracking?error=invalid', request.url), 303);
      }
      return handleApiError(error);
    }

    const reference = input.reference.toUpperCase();
    const report = await db.report.findUnique({
      where: { caseReference: reference },
      include: { category: true, images: { orderBy: { uploadedAt: 'asc' } } },
    });
    const credential = report
      ? await db.trackCredential.findFirst({
          where: { reportId: report.id, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
          select: { id: true, secretHash: true, attempts: true, lastAttemptAt: true },
        })
      : null;

    const now = Date.now();
    const expiredAttemptWindow =
      !credential ||
      !credential.lastAttemptAt ||
      credential.lastAttemptAt.getTime() <= now - TRACK_WINDOW_MS;
    const attempts = expiredAttemptWindow ? 0 : (credential?.attempts ?? 0);
    const credentialLocked = attempts >= MAX_CREDENTIAL_ATTEMPTS;

    // Always run a bcrypt comparison, even when no valid credential exists.
    const matches = await bcrypt.compare(
      input.secretToken,
      credential && !credentialLocked ? credential.secretHash : DUMMY_SECRET_HASH,
    );

    if (!report || !credential || !matches || credentialLocked) {
      await db.$transaction(async (tx) => {
        if (credential) {
          await tx.trackCredential.update({
            where: { id: credential.id },
            data: { attempts: attempts + 1, lastAttemptAt: new Date(now) },
          });
        }
        await writeAuditLog(tx, {
          action: 'TRACK_FAILURE',
          entityType: 'Report',
          entityId: report?.id ?? reference,
          metadata: { caseReference: reference },
        });
      });

      if (isForm) {
        return NextResponse.redirect(new URL('/secure-guest-tracking?error=invalid', request.url), 303);
      }
      return jsonError('Invalid reference or tracking credential.', 401);
    }

    await db.$transaction(async (tx) => {
      await tx.trackCredential.update({
        where: { id: credential.id },
        data: { attempts: { increment: 1 }, lastAttemptAt: new Date() },
      });
      await writeAuditLog(tx, {
        action: 'TRACK_SUCCESS',
        entityType: 'Report',
        entityId: report.id,
        metadata: { caseReference: reference },
      });
    });

    await clearTrackingCookie();

    if (isForm) {
      return NextResponse.redirect(new URL('/secure-guest-tracking?tracked=1', request.url), 303);
    }

    return NextResponse.json({
      ok: true,
      reference,
      status: report.status,
      report: toPublicReport(report),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

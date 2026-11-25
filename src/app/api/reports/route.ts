import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma, ReportStatus, ReportType } from '@prisma/client';
import { z, ZodError } from 'zod';
import { firstValue, handleApiError, jsonError } from '@/lib/api';
import { writeAuditLog } from '@/lib/audit';
import { assertSameOrigin } from '@/lib/csrf';
import { db } from '@/lib/db';
import { toPublicReport } from '@/lib/public-report';
import { enforceRateLimit } from '@/lib/rate-limit';
import { isSafeReturnPath } from '@/lib/redirect';
import { matchesSearchFilters, parseSearchFilters, sortSearchReports } from '@/lib/search';
import { setTrackingCookie } from '@/lib/tracking-cookie';
import {
  getUploadDir,
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_IMAGES,
  prepareImage,
  UploadError,
} from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export const ALLOWED_CATEGORY_NAMES = [
  'Electronics',
  'Documents',
  'Stationery',
  'Accessories',
  'Sports Equipment',
  'Other',
] as const;

const CATEGORY_VALUES = [...ALLOWED_CATEGORY_NAMES] as [string, ...string[]];

// The assistant's free-form fallback is mapped to a seeded category; arbitrary
// client values are never created as categories.
const CATEGORY_ALIASES: Record<string, string> = {
  'Personal item': 'Other',
};

export const CASE_REFERENCE_PATTERN = /^CF-\d{4}-\d{4}(?:-[A-Z])?$/;

const REPORT_SUBMIT_LIMIT = 5;
const REPORT_SUBMIT_WINDOW_MS = 60 * 60 * 1000;
const TRACK_TOKEN_BYTES = 18;
const TRACK_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

const takeSchema = z.coerce.number().int().min(1).max(100).default(20);

const reportSchema = z.object({
  reportType: z.enum(['LOST', 'FOUND']),
  category: z.enum(CATEGORY_VALUES),
  description: z.string().trim().min(10).max(5000),
  location: z.string().trim().min(2).max(200),
  reporterNetId: z.string().trim().min(2).max(50),
  reporterName: z.string().trim().max(120).optional(),
  contactEmail: z.union([z.string().email(), z.literal('')]).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  model: z.string().trim().max(160).optional(),
  colour: z.string().trim().max(160).optional(),
  distinguishingMark: z.string().trim().max(500).optional(),
  hiddenMark: z.string().trim().max(500).optional(),
  custodyNotes: z.string().trim().max(1000).optional(),
  campusComplex: z.string().trim().max(120).optional(),
  campusFloor: z.string().trim().max(160).optional(),
  incidentDate: z.string().trim().max(40).optional(),
  incidentWindow: z.string().trim().max(120).optional(),
});

type ReportInput = z.infer<typeof reportSchema>;

type StoredImage = {
  rowId: string;
  thumbnailRowId: string;
  objectKey: string;
  thumbnailObjectKey: string;
  contentType: string;
  sizeBytes: number;
  thumbnailSizeBytes: number;
  paths: string[];
};

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), 303);
}

function parseIncidentDate(value: string | undefined) {
  if (!value) return undefined;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** Only public notes are persisted in the public description column. */
function buildPublicDescription(input: ReportInput): string {
  const lines = [input.description];
  if (input.distinguishingMark?.trim()) {
    lines.push(`Distinguishing marks: ${input.distinguishingMark.trim()}`);
  }
  return lines.join('\n');
}

async function storeImages(files: File[]): Promise<{ images: StoredImage[]; paths: string[] }> {
  if (files.length === 0) return { images: [], paths: [] };
  if (files.length > MAX_UPLOAD_IMAGES) {
    throw new UploadError(`At most ${MAX_UPLOAD_IMAGES} images may be submitted.`);
  }

  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const images: StoredImage[] = [];
  const writtenPaths: string[] = [];

  try {
    for (const file of files) {
      if (file.size === 0) throw new UploadError('Images must not be empty.');
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new UploadError('Each image must be 10 MB or smaller.');
      }

      const prepared = await prepareImage(Buffer.from(await file.arrayBuffer()), file.type);
      const uuid = randomUUID();
      const mainName = `${uuid}.${prepared.extension}`;
      const thumbnailName = `${uuid}-thumb.webp`;
      const mainPath = join(/* turbopackIgnore: true */ uploadDir, mainName);
      const thumbnailPath = join(/* turbopackIgnore: true */ uploadDir, thumbnailName);

      await writeFile(mainPath, prepared.main);
      writtenPaths.push(mainPath);
      await writeFile(thumbnailPath, prepared.thumbnail);
      writtenPaths.push(thumbnailPath);

      images.push({
        rowId: randomUUID(),
        thumbnailRowId: randomUUID(),
        objectKey: `/api/media/${mainName}`,
        thumbnailObjectKey: `/api/media/${thumbnailName}`,
        contentType: prepared.contentType,
        sizeBytes: prepared.sizeBytes,
        thumbnailSizeBytes: prepared.thumbnailSizeBytes,
        paths: [mainPath, thumbnailPath],
      });
    }

    return { images, paths: writtenPaths };
  } catch (error) {
    await Promise.all(writtenPaths.map((path) => unlink(path).catch(() => undefined)));
    throw error;
  }
}

function generateCaseReference(): string {
  const reference = `CF-${new Date().getUTCFullYear()}-${String(randomInt(0, 10000)).padStart(4, '0')}`;
  if (!CASE_REFERENCE_PATTERN.test(reference)) {
    throw new Error('Unable to generate a valid case reference.');
  }
  return reference;
}

async function createReportWithCredentials(input: ReportInput, categoryId: string, images: StoredImage[]) {
  const expiresAt = new Date(Date.now() + TRACK_EXPIRY_MS);
  const verificationDetails = [
    input.hiddenMark?.trim(),
    input.contactPhone?.trim() ? `Contact phone: ${input.contactPhone.trim()}` : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .join('\n');

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const caseReference = generateCaseReference();
    const trackingToken = randomBytes(TRACK_TOKEN_BYTES).toString('base64url');
    const secretHash = await bcrypt.hash(trackingToken, 12);

    try {
      const report = await db.$transaction(async (tx) => {
        const created = await tx.report.create({
          data: {
            caseReference,
            type: input.reportType === 'LOST' ? ReportType.LOST : ReportType.FOUND,
            status: ReportStatus.PENDING,
            categoryId,
            description: buildPublicDescription(input),
            verificationDetails: verificationDetails || undefined,
            incidentWindow: input.incidentWindow?.trim() || undefined,
            custodyNotes: input.custodyNotes?.trim() || undefined,
            model: input.model || undefined,
            colour: input.colour || undefined,
            campusBuilding: input.campusComplex || undefined,
            campusFloor: input.campusFloor || undefined,
            lostDate: input.reportType === 'LOST' ? parseIncidentDate(input.incidentDate) : undefined,
            foundDate: input.reportType === 'FOUND' ? parseIncidentDate(input.incidentDate) : undefined,
            campusLandmark: input.location,
            finderName: input.reporterName ?? (input.reportType === 'FOUND' ? input.reporterNetId : null),
            finderEmail: input.contactEmail || undefined,
            reporterNetId: input.reporterNetId,
            images: {
              create: images.flatMap((image) => [
                {
                  id: image.rowId,
                  objectKey: image.objectKey,
                  contentType: image.contentType,
                  sizeBytes: image.sizeBytes,
                },
                {
                  id: image.thumbnailRowId,
                  objectKey: image.thumbnailObjectKey,
                  contentType: 'image/thumbnail',
                  sizeBytes: image.thumbnailSizeBytes,
                },
              ]),
            },
          },
          include: { category: true, images: true },
        });

        await tx.trackCredential.create({
          data: { reportId: created.id, secretHash, expiresAt },
        });

        await writeAuditLog(tx, {
          action: 'REPORT_CREATED',
          entityType: 'Report',
          entityId: created.id,
          metadata: { caseReference, reportType: input.reportType },
        });

        return created;
      });

      return { report, trackingToken };
    } catch (error) {
      const isUniqueCollision =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (isUniqueCollision && attempt < 11) continue;
      throw error;
    }
  }

  throw new Error('Unable to allocate a case reference.');
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params: Record<string, string | string[] | undefined> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const values = url.searchParams.getAll(key);
      params[key] = values.length > 1 ? values : values[0];
    }

    const filters = parseSearchFilters(params);
    const category = firstValue(params.category);
    const take = takeSchema.parse(url.searchParams.get('take') ?? undefined);

    // Public callers can never opt into pending or archived reports.
    const reports = await db.report.findMany({
      where: {
        status: ReportStatus.APPROVED,
        type: filters.type === 'ALL' ? undefined : filters.type,
        category: category ? { name: { equals: category, mode: 'insensitive' } } : undefined,
      },
      include: { category: true, images: { orderBy: { uploadedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });

    const filtered = reports.filter((report) => matchesSearchFilters(report, filters));
    const total = filtered.length;
    const paged = sortSearchReports(filtered, filters).slice(0, take);

    return NextResponse.json({
      reports: paged.map((report) => toPublicReport(report)),
      total,
      filters,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';
  const isForm =
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data');
  const wantsJson =
    request.headers.get('accept')?.includes('application/json') === true ||
    request.headers.get('x-response-format') === 'json';
  const shouldRedirect = isForm && !wantsJson;

  let raw: Record<string, string> = {};
  let storedPaths: string[] = [];
  let committed = false;

  try {
    assertSameOrigin(request);
    enforceRateLimit(request, 'reports', REPORT_SUBMIT_LIMIT, REPORT_SUBMIT_WINDOW_MS);

    const images: File[] = [];
    if (isForm) {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') raw[key] = value;
        else if (key === 'images' || key === 'image') images.push(value);
      }
    } else {
      raw = await request.json();
    }

    if (typeof raw.category === 'string' && CATEGORY_ALIASES[raw.category]) {
      raw.category = CATEGORY_ALIASES[raw.category];
    }

    const input = reportSchema.parse(raw);
    const category = await db.category.findUnique({
      where: { name: input.category },
      select: { id: true },
    });
    if (!category) return jsonError('Unknown category.', 400);

    const stored = await storeImages(images);
    storedPaths = stored.paths;

    const { report, trackingToken } = await createReportWithCredentials(input, category.id, stored.images);
    committed = true;
    await setTrackingCookie(report.caseReference, trackingToken);

    if (shouldRedirect) {
      const fallback = input.reportType === 'LOST' ? '/mobile-lost-property' : '/report-found';
      const returnTo = isSafeReturnPath(raw.returnTo) ? (raw.returnTo as string) : fallback;
      return redirectTo(request, `${returnTo}?submitted=1`);
    }

    return NextResponse.json(
      {
        report: toPublicReport(report),
        caseReference: report.caseReference,
        trackingToken,
      },
      { status: 201 },
    );
  } catch (error) {
    if (!committed) {
      await Promise.all(storedPaths.map((path) => unlink(path).catch(() => undefined)));
    }

    const fallback = raw.reportType === 'LOST'
      ? '/mobile-lost-property'
      : raw.reportType === 'FOUND'
        ? '/report-found'
        : '/';

    if (error instanceof UploadError) {
      if (shouldRedirect) {
        const returnTo = isSafeReturnPath(raw.returnTo) ? (raw.returnTo as string) : fallback;
        return redirectTo(request, `${returnTo}?error=upload`);
      }
      return jsonError(error.message, 400);
    }

    if (error instanceof ZodError && shouldRedirect) {
      const returnTo = isSafeReturnPath(raw.returnTo) ? (raw.returnTo as string) : fallback;
      return redirectTo(request, `${returnTo}?error=required`);
    }

    return handleApiError(error);
  }
}

import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { hasValidSessionSecret } from '@/lib/auth';
import { db } from '@/lib/db';
import { jsonError } from '@/lib/api';
import { logError } from '@/lib/logger';
import { getUploadDir } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

async function checkDatabase(): Promise<boolean> {
  await db.$queryRaw(Prisma.sql`SELECT 1`);
  return true;
}

async function checkUploads(): Promise<boolean> {
  const dir = getUploadDir();
  await mkdir(dir, { recursive: true });
  const probe = join(dir, `.ready-${randomUUID()}`);
  await writeFile(probe, 'ok', 'utf8');
  await unlink(probe);
  return true;
}

export async function GET() {
  const checks = { database: false, uploads: false, secrets: hasValidSessionSecret() };

  if (!checks.secrets) {
    return jsonError('Service is not ready: invalid secret configuration.', 503, {
      details: { reason: 'secrets' },
    });
  }

  try {
    checks.database = await checkDatabase();
  } catch (error) {
    logError('ready.database_failed', error, { reason: 'database' });
    return jsonError('Service is not ready: database unavailable.', 503, {
      details: { reason: 'database' },
    });
  }

  try {
    checks.uploads = await checkUploads();
  } catch (error) {
    logError('ready.uploads_failed', error, { reason: 'uploads' });
    return jsonError('Service is not ready: upload directory unavailable.', 503, {
      details: { reason: 'uploads' },
    });
  }

  return NextResponse.json({ status: 'ready', checks });
}

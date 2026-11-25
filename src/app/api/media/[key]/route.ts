import { readFile } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { jsonError } from '@/lib/api';
import { contentTypeForKey, resolveUploadedFile } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const contentType = contentTypeForKey(key);
  const filePath = resolveUploadedFile(key);

  if (!contentType || !filePath) {
    return jsonError('Not found.', 404);
  }

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return jsonError('Not found.', 404);
  }
}

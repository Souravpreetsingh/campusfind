import { resolve, sep } from 'node:path';
import sharp, { type Metadata, type Sharp } from 'sharp';

export const MAX_UPLOAD_IMAGES = 5;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MIN_IMAGE_DIMENSION = 200;
export const MAX_IMAGE_DIMENSION = 4000;
export const THUMBNAIL_WIDTH = 300;

export const MEDIA_KEY_PATTERN =
  /^[0-9a-f-]{36}(?:-thumb)?\.(jpg|png|webp|gif|heic|heif)$/i;

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
};

const MIME_FORMATS: Record<string, string> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export class UploadError extends Error {
  constructor(message = 'The uploaded image could not be processed.') {
    super(message);
    this.name = 'UploadError';
  }
}

type ImageFormat = 'jpeg' | 'png' | 'webp' | 'gif' | 'heic' | 'heif';
type OutputFormat = 'jpeg' | 'png' | 'webp' | 'gif';

export type PreparedImage = {
  extension: 'jpg' | 'png' | 'webp' | 'gif';
  contentType: string;
  main: Buffer;
  thumbnail: Buffer;
  sizeBytes: number;
  thumbnailSizeBytes: number;
};

export function getUploadDir(): string {
  return resolve(/* turbopackIgnore: true */ process.env.UPLOAD_DIR || '.data/uploads');
}

export function contentTypeForKey(key: string): string | null {
  const match = MEDIA_KEY_PATTERN.exec(key);
  if (!match) return null;
  return CONTENT_TYPES[match[2].toLowerCase()] ?? null;
}

export function resolveUploadedFile(key: string): string | null {
  if (!MEDIA_KEY_PATTERN.test(key)) return null;
  const base = getUploadDir();
  const target = resolve(base, key);
  if (!target.startsWith(`${base}${sep}`)) return null;
  return target;
}

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.subarray(start, end).toString('latin1');
}

/** Verifies real file signatures rather than trusting browser MIME types. */
export function detectImageFormat(buffer: Buffer): ImageFormat {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'jpeg';
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    ascii(buffer, 1, 4) === 'PNG' &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (
    buffer.length >= 12 &&
    ascii(buffer, 0, 4) === 'RIFF' &&
    ascii(buffer, 8, 12) === 'WEBP'
  ) {
    return 'webp';
  }

  if (
    buffer.length >= 6 &&
    (ascii(buffer, 0, 6) === 'GIF87a' || ascii(buffer, 0, 6) === 'GIF89a')
  ) {
    return 'gif';
  }

  if (buffer.length >= 12 && ascii(buffer, 4, 8) === 'ftyp') {
    const brand = ascii(buffer, 8, 12).toLowerCase();
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'heic';
    if (['heif', 'heim', 'mif1', 'msf1'].includes(brand)) return 'heif';
  }

  throw new UploadError('Only JPG, PNG, WebP, GIF, HEIC, and HEIF images are supported.');
}

function outputSettings(format: ImageFormat): {
  format: OutputFormat;
  extension: PreparedImage['extension'];
  contentType: string;
} {
  if (format === 'heic' || format === 'heif') {
    // HEIF input is accepted, then re-encoded to a broadly readable JPEG.
    return { format: 'jpeg', extension: 'jpg', contentType: 'image/jpeg' };
  }
  if (format === 'jpeg') return { format: 'jpeg', extension: 'jpg', contentType: 'image/jpeg' };
  return {
    format,
    extension: format as PreparedImage['extension'],
    contentType: CONTENT_TYPES[format] ?? 'application/octet-stream',
  };
}

function encode(format: OutputFormat, pipeline: Sharp): Promise<Buffer> {
  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    case 'png':
      return pipeline.png({ compressionLevel: 9 }).toBuffer();
    case 'webp':
      return pipeline.webp({ quality: 85 }).toBuffer();
    case 'gif':
      return pipeline.gif().toBuffer();
  }
}

/** Verifies, strips metadata from, and re-encodes an uploaded image. */
export async function prepareImage(buffer: Buffer, declaredType?: string): Promise<PreparedImage> {
  const detected = detectImageFormat(buffer);
  const declared = declaredType?.toLowerCase().split(';')[0]?.trim();
  if (declared && MIME_FORMATS[declared] && MIME_FORMATS[declared] !== detected) {
    throw new UploadError('The uploaded image does not match its content type.');
  }

  const settings = outputSettings(detected);
  let metadata: Metadata;
  try {
    metadata = await sharp(buffer, { failOn: 'error' }).metadata();
  } catch {
    throw new UploadError();
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (
    width < MIN_IMAGE_DIMENSION ||
    height < MIN_IMAGE_DIMENSION ||
    width > MAX_IMAGE_DIMENSION ||
    height > MAX_IMAGE_DIMENSION
  ) {
    throw new UploadError('Images must be between 200x200 and 4000x4000 pixels.');
  }

  try {
    const main = await encode(settings.format, sharp(buffer, { failOn: 'error' }).rotate());
    const thumbnail = await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    return {
      extension: settings.extension,
      contentType: settings.contentType,
      main,
      thumbnail,
      sizeBytes: main.byteLength,
      thumbnailSizeBytes: thumbnail.byteLength,
    };
  } catch {
    throw new UploadError();
  }
}

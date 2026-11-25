export const CANONICAL_SLUGS = [
  'campus-lost-found',
  'advanced-search',
  'report-lost',
  'report-found',
  'mobile-lost-property',
  'submission-confirmation',
  'secure-guest-tracking',
  'intelligent-match',
  'overview-dashboard',
  'report-moderation',
  'claims-and-verification',
  'vault-inventory-and-custody',
  'intelligent-matching',
  'platform-overview',
  'college-registry-provisioning',
] as const;

const SAFE_PATHS = new Set<string>([
  '/',
  '/admin',
  '/login',
  ...CANONICAL_SLUGS.map((slug) => `/${slug}`),
]);

function configuredOrigins(): string[] {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    process.env.SITE_URL,
  ];

  const origins: string[] = [];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      origins.push(new URL(candidate).origin);
    } catch {
      // Ignore malformed configuration; it cannot make a path safe.
    }
  }
  return origins;
}

function pathnameIsAllowed(pathname: string): boolean {
  return SAFE_PATHS.has(pathname);
}

function hasForbiddenSeparators(value: string): boolean {
  let decoded = value;
  for (let i = 0; i < 4; i += 1) {
    if (decoded.includes('\\') || decoded.includes('//')) return true;
    if (/[\u0000-\u001f\u007f]/.test(decoded)) return true;

    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return true;
    }
    if (next === decoded) break;
    decoded = next;
  }
  return decoded.includes('\\') || decoded.includes('//');
}

/**
 * Allows only exact application paths (with optional query/hash) or absolute
 * URLs pointing at the configured same origin. Protocol-relative URLs,
 * backslashes, and encoded separators are always rejected.
 */
export function isSafeReturnPath(value: unknown): boolean {
  if (typeof value !== 'string' || !value || value.length > 2048) return false;
  if (hasForbiddenSeparators(value)) return false;

  const isAbsolute = /^[a-z][a-z0-9+.-]*:/i.test(value);
  let pathname: string;

  if (isAbsolute) {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    if (!configuredOrigins().includes(url.origin)) return false;
    pathname = url.pathname;
  } else {
    if (!value.startsWith('/')) return false;
    const localUrl = new URL(value, 'http://localhost');
    pathname = localUrl.pathname;
  }

  if (!pathnameIsAllowed(pathname)) return false;
  return !pathname.includes('//');
}

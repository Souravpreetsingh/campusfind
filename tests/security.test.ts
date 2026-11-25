import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertSameOrigin, CsrfError } from '@/lib/csrf';
import { enforceRateLimit, RateLimitError } from '@/lib/rate-limit';
import { toPublicReport } from '@/lib/public-report';
import {
  canTransition,
  CLAIM_STATUS_TRANSITIONS,
  CUSTODY_STATE_TRANSITIONS,
  MATCH_STATUS_TRANSITIONS,
  REPORT_STATUS_TRANSITIONS,
} from '@/lib/state-transitions';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('no default credentials', () => {
  it('requires seed credentials from the environment', () => {
    const seed = source('prisma/seed.mjs');
    expect(seed).toContain("requireSeedCredential('SEED_ADMIN_EMAIL')");
    expect(seed).toContain("requireSeedCredential('SEED_ADMIN_PASSWORD')");
    expect(seed).not.toContain("?? 'admin@");
    expect(seed).not.toContain("?? 'change");
    expect(seed).toContain("update: rotate");
  });

  it('rejects placeholder session secrets and uses a dummy hash for missing users', () => {
    const auth = source('src/lib/auth.ts');
    const login = source('src/app/api/auth/login/route.ts');

    expect(auth).toContain('hasValidSessionSecret');
    expect(auth).toContain('secret.length < 32');
    expect(auth).toContain("'change-me'");
    expect(auth).toContain("'replace-with'");
    expect(auth).toContain("'example'");

    expect(login).toContain('DUMMY_PASSWORD_HASH');
    expect(login).toContain('user?.passwordHash ?? DUMMY_PASSWORD_HASH');
    expect(login).toContain('randomUUID()');
  });

  it('checks secret configuration from the readiness endpoint', () => {
    expect(source('src/app/api/ready/route.ts')).toContain('hasValidSessionSecret()');
  });
});

describe('public report projection', () => {
  it('returns only allowlisted fields and excludes private data', () => {
    const input = {
      id: 'report-1',
      caseReference: 'CF-2026-0001',
      type: 'LOST',
      status: 'APPROVED',
      category: { id: 'category-1', name: 'Electronics' },
      brand: 'Sony',
      model: 'WH-1000XM5',
      colour: 'black',
      description: [
        'Black headphones',
        'Distinguishing marks: small scratch on the left cup',
        'Hidden verification details: secret marking',
        'Time window: 22:00-23:00',
        'Custody notes: Vault shelf 4',
      ].join('\n'),
      campusBuilding: 'Library',
      campusFloor: 'Level 3, shelf 12',
      campusLandmark: 'Entrance',
      finderName: 'Private Finder',
      finderEmail: 'finder@example.test',
      reporterNetId: 'student-123',
      verificationDetails: 'secret marking',
      incidentWindow: '22:00-23:00',
      custodyNotes: 'Vault shelf 4',
      uploadedById: 'user-1',
      createdAt: '2026-11-20T10:00:00.000Z',
      updatedAt: '2026-11-21T10:00:00.000Z',
      images: [
        {
          id: 'image-1',
          objectKey: '/api/media/image.jpg',
          contentType: 'image/jpeg',
          sizeBytes: 1234,
          uploadedById: 'user-1',
        },
      ],
    };

    const result = toPublicReport(input as unknown as Parameters<typeof toPublicReport>[0]);
    expect(Object.keys(result)).toEqual([
      'id',
      'caseReference',
      'type',
      'status',
      'category',
      'brand',
      'model',
      'colour',
      'description',
      'campusArea',
      'createdAt',
      'updatedAt',
      'images',
    ]);
    expect(Object.keys(result.campusArea)).toEqual(['building', 'landmark']);
    expect(result.description).toBe(
      'Black headphones\nDistinguishing marks: small scratch on the left cup',
    );
    expect(result.images[0]).toEqual({
      id: 'image-1',
      objectKey: '/api/media/image.jpg',
      contentType: 'image/jpeg',
    });

    const serialized = JSON.stringify(result);
    for (const forbidden of [
      'finderName',
      'finderEmail',
      'reporterNetId',
      'verificationDetails',
      'incidentWindow',
      'custodyNotes',
      'uploadedById',
      'campusFloor',
      'secret marking',
      'Vault shelf 4',
      '22:00-23:00',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('never upserts categories from public submissions', () => {
    expect(source('src/app/api/reports/route.ts')).not.toContain('db.category.upsert');
  });
});

describe('rate limiting', () => {
  it('exports the limiter and error with retry metadata', () => {
    const request = new Request('https://campusfind.test/api', {
      headers: { 'x-forwarded-for': '203.0.113.10' },
    });
    const bucket = `security-test-${randomUUID()}`;

    expect(enforceRateLimit(request, bucket, 2, 60_000)).toBe(1);
    expect(enforceRateLimit(request, bucket, 2, 60_000)).toBe(0);

    try {
      enforceRateLimit(request, bucket, 2, 60_000);
      throw new Error('Expected RateLimitError');
    } catch (error) {
      expect(error).toBeInstanceOf(RateLimitError);
      expect((error as RateLimitError).retryAfter).toBeGreaterThan(0);
      expect((error as RateLimitError).bucket).toBe(bucket);
    }
  });
});

describe('same-origin enforcement', () => {
  it('allows non-browser clients and same-origin browser requests', () => {
    expect(() => assertSameOrigin(new Request('https://campusfind.test/api', { method: 'POST' }))).not.toThrow();
    expect(() =>
      assertSameOrigin(
        new Request('https://campusfind.test/api', {
          method: 'POST',
          headers: { origin: 'https://campusfind.test', referer: 'https://campusfind.test/form' },
        }),
      ),
    ).not.toThrow();
  });

  it('rejects cross-site fetch, origin, and referer headers', () => {
    expect(() =>
      assertSameOrigin(
        new Request('https://campusfind.test/api', {
          method: 'POST',
          headers: { 'sec-fetch-site': 'cross-site' },
        }),
      ),
    ).toThrow(CsrfError);
    expect(() =>
      assertSameOrigin(
        new Request('https://campusfind.test/api', {
          method: 'POST',
          headers: { origin: 'https://evil.test' },
        }),
      ),
    ).toThrow(CsrfError);
    expect(() =>
      assertSameOrigin(
        new Request('https://campusfind.test/api', {
          method: 'POST',
          headers: { referer: 'https://evil.test/steal' },
        }),
      ),
    ).toThrow(CsrfError);
  });
});

describe('case reference format', () => {
  it('uses the canonical reference regex for submission and lookup', () => {
    const reports = source('src/app/api/reports/route.ts');
    const track = source('src/app/api/guest/track/route.ts');
    expect(reports).toContain('/^CF-\\d{4}-\\d{4}(?:-[A-Z])?$/');
    expect(track).toContain('/^CF-\\d{4}-\\d{4}(?:-[A-Z])?$/i');
    expect(source('prisma/migrations/20261126000000_security_hardening/migration.sql')).toContain(
      "'CF-' || TO_CHAR",
    );
  });
});

describe('state transition maps', () => {
  it('enforces report, claim, custody, and match transitions', () => {
    expect(canTransition(REPORT_STATUS_TRANSITIONS, 'PENDING', 'APPROVED')).toBe(true);
    expect(canTransition(REPORT_STATUS_TRANSITIONS, 'PENDING', 'CLAIMED')).toBe(false);
    expect(canTransition(REPORT_STATUS_TRANSITIONS, 'APPROVED', 'ARCHIVED')).toBe(true);

    expect(canTransition(CLAIM_STATUS_TRANSITIONS, 'SUBMITTED', 'UNDER_REVIEW')).toBe(true);
    expect(canTransition(CLAIM_STATUS_TRANSITIONS, 'APPROVED', 'DISPUTED')).toBe(false);
    expect(CLAIM_STATUS_TRANSITIONS.REJECTED).toEqual([]);

    expect(canTransition(CUSTODY_STATE_TRANSITIONS, 'WITH_FINDER', 'SUBMITTED')).toBe(true);
    expect(canTransition(CUSTODY_STATE_TRANSITIONS, 'WITH_FINDER', 'STORED')).toBe(false);
    expect(CUSTODY_STATE_TRANSITIONS.RETURNED).toEqual([]);

    expect(canTransition(MATCH_STATUS_TRANSITIONS, 'CANDIDATE', 'APPROVED')).toBe(true);
    expect(canTransition(MATCH_STATUS_TRANSITIONS, 'DISMISSED', 'APPROVED')).toBe(false);
  });
});

describe('admin session checks', () => {
  it('binds JWTs to persisted AdminSession rows and uses exact roles', () => {
    const auth = source('src/lib/auth.ts');

    expect(auth).toContain("setIssuer('campusfind')");
    expect(auth).toContain("setAudience('campusfind-web')");
    expect(auth).toContain('.setJti(payload.jti)');
    expect(auth).toContain("issuer: 'campusfind'");
    expect(auth).toContain("audience: 'campusfind-web'");
    expect(auth).toContain('db.adminSession.findUnique');
    expect(auth).toContain('session.expiresAt.getTime()');
    expect(auth).toContain('allowed.includes(user.role)');
    expect(auth).toContain('__Host-campusfind_session');
    expect(auth).toContain('store.get(SESSION_COOKIE_PRODUCTION)?.value ?? store.get(SESSION_COOKIE)?.value');
  });
});

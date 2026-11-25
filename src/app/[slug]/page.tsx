import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { ReportStatus, Role } from '@prisma/client';
import HeroWordmarkMount from '@/components/hero-wordmark';
import { pageCatalog, pageContent, pageTitles } from '@/content/pages';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logError } from '@/lib/logger';
import { matchesSearchFilters, parseSearchFilters, sortSearchReports } from '@/lib/search';
import { renderSearchPageContent } from '@/lib/search-page';
import { getTrackingCookie } from '@/lib/tracking-cookie';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const validSlugs = pageCatalog.map((item) => item.slug);

const adminSlugs = new Set([
  'overview-dashboard',
  'report-moderation',
  'claims-and-verification',
  'vault-inventory-and-custody',
  'intelligent-matching',
  'platform-overview',
  'college-registry-provisioning',
]);

const adminRoles: Role[] = [Role.MODERATOR, Role.COLLEGE_ADMIN, Role.SUPER_ADMIN];

export function generateStaticParams() {
  return validSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  return { title: pageTitles[slug] ?? 'Page not found' };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function banner(message: string, tone: 'success' | 'error', live = false) {
  const toneClass = tone === 'success' ? 'border-mint bg-mint/15' : 'border-error bg-error-container';
  const liveAttributes = live ? ' role="status" aria-live="polite"' : '';
  return `<div${liveAttributes} class="${toneClass} rounded-xl px-space-md py-space-sm font-body-md text-body-md text-on-surface">${message}</div>`;
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function renderSearchPage(
  html: string,
  query: Record<string, string | string[] | undefined>,
) {
  // Search results are request-specific; keep the Prisma query out of prerendering.
  await connection();

  const filters = parseSearchFilters(query);
  let reports;
  try {
    reports = await db.report.findMany({
      where: { status: { in: [ReportStatus.APPROVED, ReportStatus.CLAIMED] } },
      include: { category: true, images: { orderBy: { uploadedAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  } catch (error) {
    logError('search.database_failed', error);
    return banner(
      'Search is temporarily unavailable because the database could not be reached. Please try again later.',
      'error',
      true,
    ) + renderSearchPageContent(html, filters, []);
  }
  const matches = sortSearchReports(
    reports.filter((report) => matchesSearchFilters(report, filters)),
    filters,
  );

  return renderSearchPageContent(html, filters, matches);
}

export default async function DesignPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const html = pageContent[slug];

  if (!html) notFound();

  if (adminSlugs.has(slug)) {
    const user = await getCurrentUser();
    if (!user) redirect(`/login?next=/${slug}`);
    if (!adminRoles.includes(user.role)) redirect('/admin');
  }

  const banners: string[] = [];
  if (firstValue(query.submitted) === '1') {
    banners.push(banner('Report submitted successfully. It is now pending review.', 'success'));
  }
  if (firstValue(query.tracked) === '1') {
    banners.push(banner('Tracking credentials accepted. The case is under review.', 'success'));
  }
  if (firstValue(query.handover) === '1') {
    banners.push(banner('Custody handover committed to the audit ledger.', 'success'));
  }
  if (firstValue(query.error) === 'invalid') {
    banners.push(banner('Those tracking credentials could not be verified.', 'error'));
  }
  if (firstValue(query.error) === 'required') {
    banners.push(banner('Please complete every required field before submitting.', 'error'));
  }
  if (firstValue(query.error) === 'upload') {
    banners.push(banner('One or more images could not be uploaded. Use JPG, PNG, WebP, GIF, HEIC, or HEIF under 15MB.', 'error'));
  }

  if (slug === 'submission-confirmation') {
    const tracking = (await getTrackingCookie()) as
      | {
          reference?: string;
          caseReference?: string;
          secretToken?: string;
          trackingToken?: string;
          token?: string;
        }
      | null
      | undefined;
    const reference = tracking?.reference ?? tracking?.caseReference;
    const token = tracking?.secretToken ?? tracking?.trackingToken ?? tracking?.token;
    if (reference && token) {
      banners.push(banner(
        `Case reference: <strong>${escapeHtml(reference)}</strong>. ` +
          `One-time tracking token: <code>${escapeHtml(token)}</code>. ` +
          'Store these credentials securely; the token will not be shown again.',
        'success',
        true,
      ));
    }
  }

  const notice = banners.length > 0
    ? `<div class="px-space-lg pt-space-md"><div class="mx-auto flex max-w-[1520px] flex-col gap-space-sm">${banners.join('')}</div></div>`
    : '';

  const content = slug === 'advanced-search'
    ? await renderSearchPage(html, query)
    : html;

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: notice + content }} />
      {slug === 'campus-lost-found' ? <HeroWordmarkMount /> : null}
    </>
  );
}

/** Pure search helpers shared by the listings page, API, and tests. */

export type ReportTypeFilter = 'ALL' | 'LOST' | 'FOUND';
export type SearchSort = 'relevance' | 'newest' | 'oldest';

export type SearchFilters = {
  q: string;
  type: ReportTypeFilter;
  zone: string;
  sort: SearchSort;
};

export type SearchableReport = {
  id: string;
  type: string;
  status?: string | null;
  category?: { name: string } | null;
  brand?: string | null;
  model?: string | null;
  colour?: string | null;
  description: string;
  campusBuilding?: string | null;
  campusFloor?: string | null;
  campusLandmark?: string | null;
  createdAt?: Date | string | null;
};

export const zoneTerms: Record<string, string[]> = {
  all: [],
  quad: ['quad', 'quadrangle', 'walkway'],
  library: ['library', 'du bois'],
  science: ['science', 'atrium'],
  athletic: ['athletic', 'pavilion', 'gym'],
  union: ['union', 'dining', 'student center'],
  engineering: ['engineering', 'innovation lab', 'engineering lab'],
};

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export function parseSearchFilters(
  params: Record<string, string | string[] | undefined> = {},
): SearchFilters {
  const rawType = firstValue(params.type) || firstValue(params.status);
  const rawZone = firstValue(params.zone).trim().toLowerCase();
  const rawSort = firstValue(params.sort).toLowerCase();

  const type: ReportTypeFilter = /^lost$/i.test(rawType)
    ? 'LOST'
    : /^found$/i.test(rawType)
      ? 'FOUND'
      : 'ALL';

  const sort: SearchSort = rawSort.includes('oldest')
    ? 'oldest'
    : rawSort.includes('newest')
      ? 'newest'
      : 'relevance';

  return {
    q: firstValue(params.q).trim().slice(0, 200),
    type,
    zone: rawZone || 'all',
    sort,
  };
}

export function searchTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.replace(/^["“'']+|["”'']+$/g, ''))
    .filter(Boolean);
}

export function reportSearchText(report: SearchableReport): string {
  return [
    report.type,
    report.status ?? '',
    report.category?.name ?? '',
    report.brand ?? '',
    report.model ?? '',
    report.colour ?? '',
    report.description,
    report.campusBuilding ?? '',
    report.campusFloor ?? '',
    report.campusLandmark ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

export function matchesSearchFilters(report: SearchableReport, filters: SearchFilters): boolean {
  if (filters.type !== 'ALL' && report.type.toUpperCase() !== filters.type) return false;

  const text = reportSearchText(report);
  const termsForZone = zoneTerms[filters.zone] ?? [filters.zone];
  if (termsForZone.length > 0 && !termsForZone.some((term) => text.includes(term.toLowerCase()))) {
    return false;
  }

  return searchTerms(filters.q).every((term) => text.includes(term));
}

function reportTime(report: SearchableReport): number {
  if (!report.createdAt) return 0;
  if (report.createdAt instanceof Date) return report.createdAt.getTime();
  const parsed = new Date(report.createdAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function relevanceScore(report: SearchableReport, filters: SearchFilters): number {
  const text = reportSearchText(report);
  return searchTerms(filters.q).reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

export function sortSearchReports<T extends SearchableReport>(
  reports: T[],
  filters: SearchFilters,
): T[] {
  return [...reports].sort((left, right) => {
    if (filters.sort === 'newest') return reportTime(right) - reportTime(left);
    if (filters.sort === 'oldest') return reportTime(left) - reportTime(right);

    const scoreDifference = relevanceScore(right, filters) - relevanceScore(left, filters);
    return scoreDifference !== 0 ? scoreDifference : reportTime(right) - reportTime(left);
  });
}

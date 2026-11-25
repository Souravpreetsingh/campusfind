import { zoneTerms, type SearchFilters, type SearchableReport } from '@/lib/search';

type ResultReport = SearchableReport & {
  images?: Array<{ objectKey: string }> | null;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function joined(values: Array<string | null | undefined>): string {
  return values.filter((value) => typeof value === 'string' && value.trim().length > 0).join(' · ');
}

function loggedAt(value: SearchableReport['createdAt']): string {
  if (!value) return 'Recently logged';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently logged';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function resultCard(report: ResultReport): string {
  const id = escapeHtml(report.id.slice(0, 8).toUpperCase());
  const type = report.type.toUpperCase() === 'FOUND' ? 'FOUND' : 'LOST';
  const title = joined([report.brand, report.category?.name, report.model, report.colour]) || 'Campus item';
  const location = joined([report.campusBuilding, report.campusFloor, report.campusLandmark]) || 'Campus location on file';
  const description = report.description.split('\n')[0] || 'No public description is available yet.';
  const image = report.images?.find((item) => item.objectKey?.startsWith('/uploads/'));
  const visual = image
    ? `<img alt="Uploaded item photo" class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" src="${escapeHtml(image.objectKey)}"/>`
    : `<div class="w-full h-full grid place-items-center bg-surface-container text-outline"><span class="material-symbols-outlined text-[42px]">inventory_2</span></div>`;
  const badgeClass = type === 'FOUND'
    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
    : 'bg-amber-100 text-amber-900 border-amber-300';
  const action = type === 'FOUND'
    ? '<a href="/secure-guest-tracking"><span>Initiate Ownership Claim</span><span class="material-symbols-outlined text-sm">arrow_forward</span></a>'
    : '<a href="/intelligent-match"><span class="material-symbols-outlined text-sm">front_hand</span><span>I Found This Item</span></a>';

  return `
<article class="bg-surface-container-lowest border border-outline-variant/80 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between group">
<div>
<div class="relative aspect-4/3 w-full bg-surface-container overflow-hidden">
${visual}
<span class="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold border flex items-center gap-1 shadow-xs ${badgeClass}">
<span class="size-1.5 rounded-full bg-current"></span> ${type} · APPROVED
</span>
<span class="absolute top-3 right-3 px-2 py-0.5 rounded text-[11px] font-mono bg-black/75 text-white backdrop-blur-xs">#${id}</span>
</div>
<div class="p-4 space-y-2">
<div class="flex items-center justify-between text-xs text-outline">
<span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">location_on</span> ${escapeHtml(location)}</span>
<span>${escapeHtml(loggedAt(report.createdAt))}</span>
</div>
<h4 class="font-headline-sm text-base text-primary leading-snug group-hover:text-secondary transition-colors">${escapeHtml(title)}</h4>
<p class="text-xs text-graphite line-clamp-2">${escapeHtml(description)}</p>
</div>
</div>
<div class="p-4 pt-0">
${action.replace('<a ', '<a class="w-full py-2 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-graphite transition-colors flex items-center justify-center gap-1.5" ')}
</div>
</article>`;
}

export function renderSearchResults(reports: ResultReport[], filters: SearchFilters): string {
  if (reports.length === 0) {
    return `
<div class="col-span-full rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-space-lg text-center">
<span class="material-symbols-outlined text-[36px] text-outline">search_off</span>
<h4 class="font-headline-sm text-headline-sm text-primary mt-space-sm">No approved reports match this search</h4>
<p class="font-body-md text-body-md text-on-surface-variant mt-space-xs">
Try a broader keyword, clear the zone filter, or check back after moderators approve new reports.
</p>
<div class="mt-space-md flex flex-wrap justify-center gap-space-sm">
<a class="rounded-lg bg-primary px-space-md py-space-xs font-label-md text-label-md text-on-primary" href="/advanced-search">Clear search</a>
<a class="rounded-lg border border-outline-variant px-space-md py-space-xs font-label-md text-label-md text-primary" href="/report-lost">Report a lost item</a>
<a class="rounded-lg border border-outline-variant px-space-md py-space-xs font-label-md text-label-md text-primary" href="/report-found">Report a found item</a>
</div>
</div>`;
  }

  return `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">${reports.map(resultCard).join('\n')}</div>`;
}

function filterChip(label: string): string {
  return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-surface-container-high text-on-surface border border-outline-variant/60">${escapeHtml(label)}</span>`;
}

export function renderSearchSummary(reports: ResultReport[]): string {
  const count = reports.length;
  const noun = count === 1 ? 'approved report' : 'approved reports';
  return `<span class="text-sm font-semibold text-primary mr-2">Showing ${count} ${noun}</span>`;
}

export function renderSearchChips(filters: SearchFilters): string {
  const chips: string[] = [];

  if (filters.q) chips.push(filterChip(`“${filters.q}”`));
  if (filters.type !== 'ALL') chips.push(filterChip(filters.type === 'FOUND' ? 'Found items' : 'Lost items'));
  if (filters.zone !== 'all') {
    const zoneTerm = (zoneTerms[filters.zone] ?? [filters.zone])[0];
    chips.push(filterChip(zoneTerm.replace(/\b\w/g, (char) => char.toUpperCase())));
  }
  chips.push('<a href="/advanced-search" class="text-xs font-semibold text-secondary hover:underline ml-1">Clear all filters</a>');

  return `<div class="flex flex-wrap items-center gap-1.5">${chips.join('')}</div>`;
}

export function renderSearchPagination(reports: ResultReport[]): string {
  const count = reports.length;
  return `
<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-surface-container-high">
<div class="text-xs text-graphite">
          Showing all <span class="font-semibold text-primary">${count}</span> matching approved ${count === 1 ? 'report' : 'reports'}.
        </div>
<div class="flex items-center gap-2 text-xs text-graphite">
<a class="rounded-lg border border-outline-variant px-3 py-1.5 font-semibold text-primary hover:bg-surface-container" href="/report-lost">Report a lost item</a>
<a class="rounded-lg bg-primary px-3 py-1.5 font-semibold text-white hover:bg-graphite" href="/report-found">Report a found item</a>
</div>
</div>`;
}

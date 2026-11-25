import type { SearchFilters, SearchableReport } from '@/lib/search';
import {
  escapeHtml,
  renderSearchChips,
  renderSearchPagination,
  renderSearchResults,
  renderSearchSummary,
} from '@/lib/search-results';

type ResultReport = SearchableReport & {
  images?: Array<{ objectKey: string }> | null;
};

export const searchMarkers = {
  resultsStart: '<!-- CAMPUSFIND_SEARCH_RESULTS_START -->',
  resultsEnd: '<!-- CAMPUSFIND_SEARCH_RESULTS_END -->',
  countStart: '<!-- CAMPUSFIND_SEARCH_COUNT_START -->',
  countEnd: '<!-- CAMPUSFIND_SEARCH_COUNT_END -->',
  chipsStart: '<!-- CAMPUSFIND_SEARCH_CHIPS_START -->',
  chipsEnd: '<!-- CAMPUSFIND_SEARCH_CHIPS_END -->',
  paginationStart: '<!-- CAMPUSFIND_SEARCH_PAGINATION_START -->',
  paginationEnd: '<!-- CAMPUSFIND_SEARCH_PAGINATION_END -->',
} as const;

function replaceMarkedSection(html: string, start: string, end: string, replacement: string) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  if (from < 0 || to < 0) return html;
  return `${html.slice(0, from + start.length)}\n${replacement}\n${html.slice(to)}`;
}

/** Applies every request-specific search section to the canonical page HTML. */
export function renderSearchPageContent(
  html: string,
  filters: SearchFilters,
  reports: ResultReport[],
): string {
  let rendered = replaceMarkedSection(
    html,
    searchMarkers.resultsStart,
    searchMarkers.resultsEnd,
    renderSearchResults(reports, filters),
  );
  rendered = replaceMarkedSection(
    rendered,
    searchMarkers.countStart,
    searchMarkers.countEnd,
    renderSearchSummary(reports),
  );
  rendered = replaceMarkedSection(
    rendered,
    searchMarkers.chipsStart,
    searchMarkers.chipsEnd,
    renderSearchChips(filters),
  );
  rendered = replaceMarkedSection(
    rendered,
    searchMarkers.paginationStart,
    searchMarkers.paginationEnd,
    renderSearchPagination(reports),
  );
  rendered = rendered.replace(
    new RegExp(`<option value="${filters.sort}"(?![^>]*\\bselected\\b)`, 'i'),
    `<option value="${filters.sort}" selected`,
  );
  rendered = rendered.replace(
    /(<input\b[^>]*data-search-input[^>]*?)(\/?>)/i,
    `$1 value="${escapeHtml(filters.q)}"$2`,
  );

  return rendered;
}

import { describe, expect, it } from 'vitest';
import {
  matchesSearchFilters,
  parseSearchFilters,
  searchTerms,
  sortSearchReports,
  type SearchableReport,
} from '@/lib/search';
import { renderSearchPageContent, searchMarkers } from '@/lib/search-page';
import {
  renderSearchChips,
  renderSearchPagination,
  renderSearchResults,
} from '@/lib/search-results';
import { pageContent } from '@/content/pages';

const report = (overrides: Partial<SearchableReport> = {}): SearchableReport => ({
  id: 'report-1',
  type: 'FOUND',
  status: 'APPROVED',
  category: { name: 'Electronics' },
  model: 'WH-1000XM5',
  colour: 'Black',
  description: 'Sony headphones found near the Du Bois Library',
  campusBuilding: 'W.E.B. Du Bois Library',
  campusFloor: '4th floor',
  campusLandmark: 'Quiet stacks',
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

describe('public report search', () => {
  it('parses query parameters from the search bar', () => {
    expect(parseSearchFilters({ q: ' Sony headphones ', type: 'found', zone: 'library', sort: 'newest' })).toEqual({
      q: 'Sony headphones',
      type: 'FOUND',
      zone: 'library',
      sort: 'newest',
    });
  });

  it('accepts legacy status filters and ignores invalid values', () => {
    expect(parseSearchFilters({ status: 'all', type: 'unknown' }).type).toBe('ALL');
    expect(parseSearchFilters({ q: '' }).q).toBe('');
  });

  it('matches keywords across category, model, colour, and location', () => {
    const filters = parseSearchFilters({ q: 'Sony black library' });
    expect(searchTerms(filters.q)).toEqual(['sony', 'black', 'library']);
    expect(matchesSearchFilters(report(), filters)).toBe(true);
    expect(matchesSearchFilters(report({ description: 'Generic item found at the quad' }), filters)).toBe(false);
  });

  it('matches item brands even when the description does not repeat them', () => {
    const branded = report({
      brand: 'Hydro Flask',
      category: { name: 'Bottles' },
      model: '32oz',
      description: 'Insulated bottle found by the science atrium',
    });

    expect(matchesSearchFilters(branded, parseSearchFilters({ q: 'Hydro Flask' }))).toBe(true);
    expect(renderSearchResults([branded], parseSearchFilters({ q: 'Hydro Flask' }))).toContain('Hydro Flask');
  });

  it('applies lost/found and campus zone filters', () => {
    expect(matchesSearchFilters(report(), parseSearchFilters({ type: 'LOST' }))).toBe(false);
    expect(matchesSearchFilters(report(), parseSearchFilters({ type: 'FOUND' }))).toBe(true);
    expect(matchesSearchFilters(report(), parseSearchFilters({ zone: 'science' }))).toBe(false);
    expect(matchesSearchFilters(report(), parseSearchFilters({ zone: 'library' }))).toBe(true);
  });

  it('sorts by newest first and keeps relevance for an empty query', () => {
    const older = report({ id: 'older', createdAt: '2026-10-01T10:00:00.000Z' });
    const newer = report({ id: 'newer', createdAt: '2026-11-01T10:00:00.000Z' });

    expect(sortSearchReports([older, newer], parseSearchFilters({ sort: 'newest' })).map((item) => item.id)).toEqual([
      'newer',
      'older',
    ]);
    expect(sortSearchReports([older, newer], parseSearchFilters()).map((item) => item.id)).toEqual([
      'newer',
      'older',
    ]);
  });

  it('renders real result cards in the canonical card grid and escapes user text', () => {
    const html = renderSearchResults(
      [report({ description: '<script>alert(1)</script> Sony headphones' })],
      parseSearchFilters({ q: 'Sony' }),
    );

    expect(html).toContain('<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">');
    expect(html).toContain('Sony headphones');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('replaces every marked section in the canonical advanced-search page', () => {
    const filters = parseSearchFilters({ q: 'Sony', type: 'FOUND', zone: 'library', sort: 'newest' });
    const html = renderSearchPageContent(pageContent['advanced-search'], filters, []);

    expect(html).not.toContain('Showing approved campus items');
    expect(html).not.toContain('Card 1: AirPods Pro');
    expect(html).toContain('Showing 0 approved reports');
    expect(html).toContain('No approved reports match this search');
    expect(html).toContain('Found items');
    expect(html).toContain('Library');
    expect(html).toContain('Showing all <span class="font-semibold text-primary">0</span>');
    expect(html).toContain('value="newest" selected');
    expect(html).toContain('value="Sony"');
    for (const marker of Object.values(searchMarkers)) expect(html).toContain(marker);
  });

  it('renders a helpful empty state and active filter chips', () => {
    const filters = parseSearchFilters({ q: 'AirPods', type: 'LOST', zone: 'library' });
    const empty = renderSearchResults([], filters);

    expect(empty).toContain('No approved reports match this search');
    expect(empty).toContain('Clear search');
    expect(renderSearchChips(filters)).toContain('Lost items');
    expect(renderSearchChips(filters)).toContain('Library');
    expect(renderSearchPagination([])).toContain('Showing all');
  });
});

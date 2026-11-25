import { describe, expect, it } from 'vitest';
import { scoreMatch, type MatchableReport } from '@/lib/matching';

const base: MatchableReport = {
  id: 'report-1',
  categoryName: 'Electronics',
  brand: 'Sony',
  colour: 'black',
  description: 'Black Sony headphones with stickers',
  campusBuilding: 'Westfield Library',
  date: new Date('2026-11-20T10:00:00Z'),
};

describe('scoreMatch', () => {
  it('scores identical reports highly and explains why', () => {
    const result = scoreMatch(base, {
      ...base,
      id: 'report-2',
      date: new Date('2026-11-22T10:00:00Z'),
    });

    expect(result.score).toBe(100);
    expect(result.reasons).toContain('Same category: Electronics');
    expect(result.reasons).toContain('Brand match: Sony');
  });

  it('scores unrelated reports low', () => {
    const result = scoreMatch(base, {
      id: 'report-3',
      categoryName: 'Documents',
      brand: null,
      colour: null,
      description: 'Calculus textbook',
      campusBuilding: 'Science Quad',
      date: null,
    });

    expect(result.score).toBeLessThan(50);
    expect(result.reasons).toEqual([]);
  });
});

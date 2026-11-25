export type MatchableReport = {
  id: string;
  categoryName: string;
  brand: string | null;
  colour: string | null;
  description: string;
  campusBuilding: string | null;
  date: Date | null;
};

export type MatchResult = {
  score: number;
  reasons: string[];
};

const stopWords = new Set([
  'a', 'an', 'the', 'and', 'or', 'with', 'in', 'on', 'at', 'of', 'for', 'to', 'is', 'it',
]);

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function tokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !stopWords.has(token)),
  );
}

function daysApart(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

export function scoreMatch(lost: MatchableReport, found: MatchableReport): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (normalize(lost.categoryName) === normalize(found.categoryName)) {
    score += 40;
    reasons.push(`Same category: ${lost.categoryName}`);
  }

  if (normalize(lost.brand) && normalize(lost.brand) === normalize(found.brand)) {
    score += 15;
    reasons.push(`Brand match: ${lost.brand}`);
  }

  if (normalize(lost.colour) && normalize(lost.colour) === normalize(found.colour)) {
    score += 10;
    reasons.push(`Colour match: ${lost.colour}`);
  }

  if (normalize(lost.campusBuilding) && normalize(lost.campusBuilding) === normalize(found.campusBuilding)) {
    score += 10;
    reasons.push(`Same campus building: ${lost.campusBuilding}`);
  }

  const lostTokens = tokens(lost.description);
  const foundTokens = tokens(found.description);
  const shared = [...lostTokens].filter((token) => foundTokens.has(token));
  const union = new Set([...lostTokens, ...foundTokens]);
  const overlap = union.size === 0 ? 0 : shared.length / union.size;
  const descriptionScore = Math.round(overlap * 25);
  if (descriptionScore > 0) {
    score += descriptionScore;
    reasons.push(`Description overlap: ${shared.slice(0, 5).join(', ')}`);
  }

  const gap = daysApart(lost.date, found.date);
  if (gap !== null && gap <= 7) {
    score += 10;
    reasons.push(`Reported within ${Math.round(gap)} day(s)`);
  }

  return { score: Math.min(score, 100), reasons };
}

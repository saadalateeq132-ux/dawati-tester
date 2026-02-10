export interface ScoreResult {
  score: number;
}

/**
 * Calculates the overall score from a set of analysis results.
 * The score is the average of all results, rounded to one decimal place.
 * Returns 0 if there are no results.
 *
 * @param results Array of results containing scores
 * @returns Average score rounded to 1 decimal place
 */
export function calculateOverallScore(results: ScoreResult[]): number {
  if (results.length === 0) return 0;

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  return Math.round((totalScore / results.length) * 10) / 10;
}

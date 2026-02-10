import assert from 'node:assert';
import { calculateOverallScore, ScoreResult } from './scoring-utils';

function testCalculateOverallScore() {
  console.log('Running testCalculateOverallScore...');

  // Helper to create mock ScoreResult
  const mockResult = (score: number): ScoreResult => ({
    score
  });

  // Test Case 1: Empty results
  console.log('  - Test Case 1: Empty results');
  assert.strictEqual(calculateOverallScore([]), 0, 'Should return 0 for empty results');

  // Test Case 2: Single result
  console.log('  - Test Case 2: Single result');
  assert.strictEqual(calculateOverallScore([mockResult(8)]), 8, 'Should return the score of a single result');

  // Test Case 3: Multiple results (exact average)
  console.log('  - Test Case 3: Multiple results (exact average)');
  assert.strictEqual(calculateOverallScore([mockResult(8), mockResult(10)]), 9, 'Should return the average of multiple results');

  // Test Case 4: Multiple results (rounding down)
  // (8 + 7 + 7) / 3 = 22 / 3 = 7.3333... -> 7.3
  console.log('  - Test Case 4: Multiple results (rounding down)');
  assert.strictEqual(calculateOverallScore([mockResult(8), mockResult(7), mockResult(7)]), 7.3, 'Should round average to 1 decimal place (down)');

  // Test Case 5: Multiple results (rounding up)
  // (8 + 8 + 7) / 3 = 23 / 3 = 7.6666... -> 7.7
  console.log('  - Test Case 5: Multiple results (rounding up)');
  assert.strictEqual(calculateOverallScore([mockResult(8), mockResult(8), mockResult(7)]), 7.7, 'Should round average to 1 decimal place (up)');

  // Test Case 6: Multiple results (rounding .5)
  // (7 + 8) / 2 = 7.5
  console.log('  - Test Case 6: Multiple results (rounding .5)');
  assert.strictEqual(calculateOverallScore([mockResult(7), mockResult(8)]), 7.5, 'Should handle .5 average correctly');

  console.log('✅ testCalculateOverallScore passed!');
}

try {
  testCalculateOverallScore();
} catch (error) {
  console.error('❌ testCalculateOverallScore failed!');
  console.error(error);
  process.exit(1);
}

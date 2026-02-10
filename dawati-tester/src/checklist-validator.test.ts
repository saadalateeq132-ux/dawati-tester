import { describe, it, expect } from 'vitest';
import { ChecklistValidator, ChecklistItem } from './checklist-validator';

// Helper to create items quickly
const createItem = (
  id: string,
  priority: 'P0' | 'P1' | 'P2' | 'P3',
  status: ChecklistItem['status'],
  category = 'General'
): ChecklistItem => ({
  id,
  name: `Test Item ${id}`,
  category,
  priority,
  status,
  required: priority === 'P0'
});

describe('ChecklistValidator', () => {
  describe('Constructor Injection', () => {
    it('should accept checklist items via constructor', () => {
      const items = [createItem('T1', 'P1', 'PASS')];
      const validator = new ChecklistValidator(items);
      expect(validator.getAllItems()).toEqual(items);
    });
  });

  describe('calculateScore', () => {
    it('should return 0 for empty checklist', () => {
      const validator = new ChecklistValidator([]);
      const score = validator.calculateScore();
      expect(score.overallScore).toBe(0);
      expect(score.totalItems).toBe(0);
    });

    it('should ignore N/A items', () => {
      const items = [
        createItem('T1', 'P1', 'PASS'),
        createItem('T2', 'P1', 'N/A')
      ];
      const validator = new ChecklistValidator(items);
      const score = validator.calculateScore();

      // Only T1 counts
      expect(score.totalItems).toBe(1); // N/A filtered out of "items" used for calc?
      // Wait, let's check logic: "const items = this.checklist.filter(item => item.status !== 'N/A');"
      // So score.totalItems is indeed filtered count.
      expect(score.overallScore).toBe(100);
    });

    it('should calculate 100% score for all PASS', () => {
      const items = [
        createItem('T1', 'P0', 'PASS'),
        createItem('T2', 'P1', 'PASS')
      ];
      const validator = new ChecklistValidator(items);
      const score = validator.calculateScore();
      expect(score.overallScore).toBe(100);
    });

    it('should calculate 0% score for all FAIL/TODO', () => {
      const items = [
        createItem('T1', 'P0', 'FAIL'),
        createItem('T2', 'P1', 'TODO')
      ];
      const validator = new ChecklistValidator(items);
      const score = validator.calculateScore();
      expect(score.overallScore).toBe(0);
    });

    describe('Weighted Scoring', () => {
      // Weights: P0=10, P1=5, P2=3, P3=1

      it('should weight P0 higher than P1', () => {
        // Case A: P0 PASS, P1 FAIL
        // Max: 10 + 5 = 15. Actual: 10. Score: 67%
        const itemsA = [
          createItem('T1', 'P0', 'PASS'),
          createItem('T2', 'P1', 'FAIL')
        ];
        const scoreA = new ChecklistValidator(itemsA).calculateScore().overallScore;

        // Case B: P0 FAIL, P1 PASS
        // Max: 15. Actual: 5. Score: 33%
        const itemsB = [
          createItem('T1', 'P0', 'FAIL'),
          createItem('T2', 'P1', 'PASS')
        ];
        const scoreB = new ChecklistValidator(itemsB).calculateScore().overallScore;

        expect(scoreA).toBeGreaterThan(scoreB);
        expect(scoreA).toBe(67);
        expect(scoreB).toBe(33);
      });

      it('should handle P2 and P3 weights correcty', () => {
         // P2 (3) PASS, P3 (1) FAIL => 3/4 = 75%
         const items = [
            createItem('T1', 'P2', 'PASS'),
            createItem('T2', 'P3', 'FAIL')
         ];
         const validator = new ChecklistValidator(items);
         expect(validator.calculateScore().overallScore).toBe(75);
      });
    });

    describe('Partial Credit', () => {
      it('should give 50% credit for PARTIAL status', () => {
        // P1 item (Weight 5)
        // PARTIAL => 2.5 points
        // Score: 2.5 / 5 = 50%
        const items = [createItem('T1', 'P1', 'PARTIAL')];
        const validator = new ChecklistValidator(items);
        expect(validator.calculateScore().overallScore).toBe(50);
      });

      it('should combine PARTIAL with weights correctly', () => {
        // P0 (10) PARTIAL => 5 pts
        // P1 (5) PASS => 5 pts
        // Total Max: 15
        // Total Actual: 10
        // Score: 10/15 = 67%
        const items = [
          createItem('T1', 'P0', 'PARTIAL'),
          createItem('T2', 'P1', 'PASS')
        ];
        const validator = new ChecklistValidator(items);
        expect(validator.calculateScore().overallScore).toBe(67);
      });
    });

    describe('Required Score (P0)', () => {
      it('should calculate required score based on P0 items only', () => {
        const items = [
          createItem('T1', 'P0', 'PASS'),   // 10/10
          createItem('T2', 'P0', 'FAIL'),   // 0/10
          createItem('T3', 'P1', 'PASS')    // Ignored for required score
        ];
        const validator = new ChecklistValidator(items);
        const score = validator.calculateScore();

        // P0 total weight: 20
        // P0 actual: 10
        // Expected: 50%
        expect(score.requiredScore).toBe(50);
        expect(score.requiredItems).toBe(2);
      });
    });

    describe('Category Scoring', () => {
      it('should calculate scores per category correctly', () => {
        const items = [
          createItem('T1', 'P1', 'PASS', 'Auth'),     // 5/5
          createItem('T2', 'P1', 'FAIL', 'Auth'),     // 0/5
          createItem('T3', 'P0', 'PASS', 'Payment')   // 10/10
        ];
        const validator = new ChecklistValidator(items);
        const score = validator.calculateScore();

        const authScore = score.categories.get('Auth');
        const paymentScore = score.categories.get('Payment');

        // Auth: 5/10 = 50%
        expect(authScore?.score).toBe(50);
        expect(authScore?.total).toBe(2);

        // Payment: 10/10 = 100%
        expect(paymentScore?.score).toBe(100);
      });
    });

    describe('Mixed Complex Scenario', () => {
        it('should calculate complex mix correctly', () => {
            // P0 (10) PASS     => 10
            // P0 (10) PARTIAL  => 5
            // P1 (5)  PASS     => 5
            // P1 (5)  FAIL     => 0
            // P2 (3)  PARTIAL  => 1.5
            // P3 (1)  TODO     => 0
            // ---------------------
            // Max: 10+10+5+5+3+1 = 34
            // Actual: 10+5+5+0+1.5+0 = 21.5
            // Score: 21.5 / 34 = 0.6323... -> 63%

            const items = [
                createItem('1', 'P0', 'PASS'),
                createItem('2', 'P0', 'PARTIAL'),
                createItem('3', 'P1', 'PASS'),
                createItem('4', 'P1', 'FAIL'),
                createItem('5', 'P2', 'PARTIAL'),
                createItem('6', 'P3', 'TODO'),
            ];

            const validator = new ChecklistValidator(items);
            expect(validator.calculateScore().overallScore).toBe(63);
        });
    });
  });
});

/**
 * Checklist Validator for Dawati-Tester
 *
 * Validates that test runs cover all required features from MASTER-TEST-CHECKLIST.md
 * Generates a score (0-100%) based on coverage
 *
 * Integrated into main test runner to show 3 scores:
 * 1. RTL Score
 * 2. AI Score
 * 3. Checklist Score ← THIS
 */

import fs from 'fs';
import path from 'path';
import { logger } from './logger';

export interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'TODO' | 'MISSING' | 'N/A';
  required: boolean; // P0 = required, P1/P2/P3 = optional
}

export interface ChecklistScore {
  totalItems: number;
  requiredItems: number; // P0 only
  testedItems: number;
  passingItems: number;
  failingItems: number;
  missingItems: number;
  overallScore: number; // 0-100 (Weighted)
  requiredScore: number; // P0 coverage (Weighted)
  categories: Map<string, CategoryScore>;
}

export interface CategoryScore {
  name: string;
  total: number;
  tested: number;
  passing: number;
  score: number;
}

export class ChecklistValidator {
  private checklistPath: string;
  private checklist: ChecklistItem[] = [];

  // Priority Weights for scoring
  private static PRIORITY_WEIGHTS = {
    'P0': 10, // Critical
    'P1': 5,  // High
    'P2': 3,  // Medium
    'P3': 1   // Low
  };

  constructor(checklist?: ChecklistItem[]) {
    const candidatePaths = [
      path.join(__dirname, '../../.planning/MASTER-TEST-CHECKLIST.md'),
      path.join(__dirname, '../../../.planning/MASTER-TEST-CHECKLIST.md'),
    ];
    this.checklistPath = candidatePaths.find((candidate) => fs.existsSync(candidate)) || candidatePaths[0];
    if (checklist) {
      this.checklist = checklist;
    }
  }

  /**
   * Load and parse the master checklist
   */
  async loadChecklist(): Promise<void> {
    // If checklist was injected via constructor, don't overwrite it unless empty
    if (this.checklist.length > 0) return;

    logger.info('Loading master test checklist...');

    try {
      await fs.promises.access(this.checklistPath);
    } catch (error) {
      logger.error(`Checklist not found: ${this.checklistPath}`);
      throw new Error('MASTER-TEST-CHECKLIST.md not found');
    }

    const content = await fs.promises.readFile(this.checklistPath, 'utf-8');
    this.checklist = this.parseChecklist(content);

    logger.info(`Loaded ${this.checklist.length} checklist items`);
  }

  /**
   * Parse checklist markdown into structured data
   */
  private parseChecklist(content: string): ChecklistItem[] {
    const items: ChecklistItem[] = [];
    const lines = content.split('\n');

    let currentCategory = '';
    let currentPriority: 'P0' | 'P1' | 'P2' | 'P3' = 'P1';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect category headers (## 1️⃣ HOME PAGE)
      if (line.startsWith('## ') && !line.startsWith('### ')) {
        const emojiMatch = line.match(/##\s+\d️⃣\s+(.+?)\s*\(/);
        if (emojiMatch) {
          currentCategory = emojiMatch[1].trim();
        } else {
          // Handle other ## headers like "## 🔥 PRIORITY 0: ..."
          const otherMatch = line.match(/##\s+.+?\s+(.+)/);
          currentCategory = otherMatch ? otherMatch[1].trim() : '';
        }
        continue;
      }

      // Detect sub-category headers (### Authentication & Security)
      if (line.startsWith('### ') && !line.startsWith('####')) {
        const subMatch = line.match(/###\s+(.+)/);
        if (subMatch) {
          currentCategory = subMatch[1].trim();
        }
        continue;
      }

      // Detect priority sections
      if (line.includes('PRIORITY 0:') || line.includes('P0 Critical')) {
        currentPriority = 'P0';
        continue;
      } else if (line.includes('Priority 1:') || line.includes('P1 High')) {
        currentPriority = 'P1';
        continue;
      } else if (line.includes('Priority 2:') || line.includes('P2 Medium')) {
        currentPriority = 'P2';
        continue;
      } else if (line.includes('Priority 3:') || line.includes('P3 Low')) {
        currentPriority = 'P3';
        continue;
      }

      // Parse checkbox items (- [ ] or - [x])
      if (line.includes('- [') && line.includes(']')) {
        const checked = line.includes('[x]');

        // Extract ID and name from format: - [ ] 📝 TODO ACC-003: Password change
        // Handles both bold (**ACC-003**:) and plain (ACC-003:) formats
        const match = line.match(/(?:\*\*)?([A-Z]+-[A-Z0-9]+)(?:\*\*)?:\s*(.+?)(\||$)/);

        if (match) {
          const id = match[1];
          const name = match[2].trim();

          // Determine status from emoji
          let status: ChecklistItem['status'] = 'TODO';
          if (line.includes('✅ PASS')) status = 'PASS';
          else if (line.includes('❌ FAIL')) status = 'FAIL';
          else if (line.includes('⚠️ PARTIAL')) status = 'PARTIAL';
          else if (line.includes('📝 TODO')) status = 'TODO';
          else if (line.includes('🚫 MISSING')) status = 'MISSING';
          else if (line.includes('N/A')) status = 'N/A';

          items.push({
            id,
            name,
            category: currentCategory,
            priority: currentPriority,
            status,
            required: currentPriority === 'P0', // P0 = required for 100% score
          });
        }
      }

      // Parse table rows (| HOME-F01 | Feature | Test Case | ✅ PASS | P0 |)
      if (line.startsWith('|') && !line.includes('---') && !line.includes('ID |')) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);

        if (cols.length >= 4) {
          const id = cols[0];
          const name = cols[1];
          // Handle 5-column format (ID | Feature | Test Case | Status | Priority)
          // and 4-column format (ID | Feature | Status | Priority)
          const statusCol = cols.length >= 5 ? cols[3] : cols[2];
          const priorityCol = cols.length >= 5 ? cols[4] : cols[3];

          // Skip header rows
          if (id === 'ID' || id === 'Feature') continue;

          // Extract status
          let status: ChecklistItem['status'] = 'TODO';
          if (statusCol.includes('✅ PASS')) status = 'PASS';
          else if (statusCol.includes('❌ FAIL')) status = 'FAIL';
          else if (statusCol.includes('⚠️ PARTIAL')) status = 'PARTIAL';
          else if (statusCol.includes('📝 TODO')) status = 'TODO';
          else if (statusCol.includes('🚫 MISSING')) status = 'MISSING';
          else if (statusCol.includes('N/A')) status = 'N/A';

          // Extract priority
          let priority: ChecklistItem['priority'] = currentPriority;
          if (priorityCol.includes('P0')) priority = 'P0';
          else if (priorityCol.includes('P1')) priority = 'P1';
          else if (priorityCol.includes('P2')) priority = 'P2';
          else if (priorityCol.includes('P3')) priority = 'P3';

          items.push({
            id,
            name,
            category: currentCategory,
            priority,
            status,
            required: priority === 'P0',
          });
        }
      }
    }

    return items;
  }

  /**
   * Calculate checklist coverage score
   */
  calculateScore(): ChecklistScore {
    const items = this.checklist.filter(item => item.status !== 'N/A');
    const requiredItems = items.filter(item => item.required);

    const testedItems = items.filter(item =>
      ['PASS', 'FAIL', 'PARTIAL'].includes(item.status)
    ).length;

    const passingItems = items.filter(item => item.status === 'PASS').length;
    const failingItems = items.filter(item => item.status === 'FAIL').length;
    const missingItems = items.filter(item => item.status === 'TODO').length;

    // Helper to calculate weighted score
    const calculateWeightedScore = (itemList: ChecklistItem[]): number => {
      if (itemList.length === 0) return 0;

      let totalMaxScore = 0;
      let totalActualScore = 0;

      for (const item of itemList) {
        const weight = ChecklistValidator.PRIORITY_WEIGHTS[item.priority] || 1;
        totalMaxScore += weight;

        let multiplier = 0;
        if (item.status === 'PASS') multiplier = 1;
        else if (item.status === 'PARTIAL') multiplier = 0.5;

        totalActualScore += (weight * multiplier);
      }

      return totalMaxScore > 0
        ? Math.round((totalActualScore / totalMaxScore) * 100)
        : 0;
    };

    // Overall score (0-100)
    const overallScore = calculateWeightedScore(items);

    // Required score (P0 only - must be 100%)
    const requiredScore = calculateWeightedScore(requiredItems);

    // Category breakdown
    const categories = new Map<string, CategoryScore>();
    const categoryNames = [...new Set(items.map(item => item.category))];

    for (const catName of categoryNames) {
      const catItems = items.filter(item => item.category === catName);
      const catTested = catItems.filter(item =>
        ['PASS', 'FAIL', 'PARTIAL'].includes(item.status)
      ).length;
      const catPassing = catItems.filter(item => item.status === 'PASS').length;
      const catScore = calculateWeightedScore(catItems);

      categories.set(catName, {
        name: catName,
        total: catItems.length,
        tested: catTested,
        passing: catPassing,
        score: catScore,
      });
    }

    return {
      totalItems: items.length,
      requiredItems: requiredItems.length,
      testedItems,
      passingItems,
      failingItems,
      missingItems,
      overallScore,
      requiredScore,
      categories,
    };
  }

  /**
   * Get items that are blocking 100% score
   */
  getBlockingItems(): ChecklistItem[] {
    return this.checklist.filter(item =>
      item.required && // P0 only
      item.status !== 'PASS' &&
      item.status !== 'N/A'
    );
  }

  /**
   * Get category-level gaps
   */
  getCategoryGaps(): Map<string, ChecklistItem[]> {
    const gaps = new Map<string, ChecklistItem[]>();
    const categories = [...new Set(this.checklist.map(item => item.category))];

    for (const category of categories) {
      const categoryGaps = this.checklist.filter(item =>
        item.category === category &&
        item.status !== 'PASS' &&
        item.status !== 'N/A'
      );

      if (categoryGaps.length > 0) {
        gaps.set(category, categoryGaps);
      }
    }

    return gaps;
  }

  /**
   * Format score as human-readable report
   */
  formatReport(score: ChecklistScore): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('═'.repeat(60));
    lines.push('📋 CHECKLIST SCORE');
    lines.push('═'.repeat(60));
    lines.push('');

    // Overall score
    const scoreEmoji = score.overallScore >= 80 ? '✅' : score.overallScore >= 50 ? '⚠️' : '❌';
    lines.push(`${scoreEmoji} Overall Coverage: ${score.passingItems}/${score.totalItems} (${score.overallScore}%)`);

    // Required score (P0 - must be 100%)
    const requiredEmoji = score.requiredScore === 100 ? '✅' : '❌';
    lines.push(`${requiredEmoji} Required (P0):    ${score.requiredItems - this.getBlockingItems().length}/${score.requiredItems} (${score.requiredScore}%)`);

    if (score.requiredScore < 100) {
      lines.push(`   ⚠️  ${this.getBlockingItems().length} critical tests blocking 100%!`);
    }

    lines.push('');

    // Progress bar
    const barLength = 50;
    const filled = Math.round((score.overallScore / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    lines.push(`[${bar}] ${score.overallScore}%`);
    lines.push('');

    // Status breakdown
    lines.push(`✅ Passing:  ${score.passingItems}`);
    lines.push(`❌ Failing:  ${score.failingItems}`);
    lines.push(`📝 Missing:  ${score.missingItems}`);
    lines.push('');

    // Top 5 category gaps
    const categoryArray = Array.from(score.categories.values())
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    if (categoryArray.length > 0) {
      lines.push('📂 Lowest Coverage Categories:');
      for (const cat of categoryArray) {
        const emoji = cat.score >= 50 ? '⚠️' : '❌';
        lines.push(`   ${emoji} ${cat.name.padEnd(20)} ${cat.score}%`);
      }
      lines.push('');
    }

    // Blocking items (P0 failures)
    const blocking = this.getBlockingItems();
    if (blocking.length > 0) {
      lines.push(`🚨 ${blocking.length} Critical Tests Blocking 100%:`);
      const top5 = blocking.slice(0, 5);
      for (const item of top5) {
        const statusEmoji = item.status === 'FAIL' ? '❌' : '📝';
        lines.push(`   ${statusEmoji} ${item.id.padEnd(12)} ${item.category}`);
      }
      if (blocking.length > 5) {
        lines.push(`   ... and ${blocking.length - 5} more`);
      }
      lines.push('');
    }

    lines.push('─'.repeat(60));
    lines.push('💾 Update checklist: .planning/MASTER-TEST-CHECKLIST.md');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Validate that test run covered required features
   * Returns true if all P0 tests pass
   */
  validateTestRun(): boolean {
    const score = this.calculateScore();
    return score.requiredScore === 100;
  }

  /**
   * Get all checklist items
   */
  getAllItems(): ChecklistItem[] {
    return this.checklist;
  }
}

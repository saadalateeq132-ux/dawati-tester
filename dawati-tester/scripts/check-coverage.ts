/**
 * Test Coverage Checker for Dawati-Tester
 *
 * Reads MASTER-TEST-CHECKLIST.md and calculates:
 * - Feature coverage percentage
 * - Test case coverage percentage
 * - Priority breakdown (P0/P1/P2/P3)
 * - Category-level coverage
 * - Missing critical tests
 *
 * Usage:
 *   npm run coverage
 *   npm run coverage --verbose
 *   npm run coverage --category=account
 */

import fs from 'fs';
import path from 'path';

interface TestItem {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL' | 'TODO' | 'MISSING' | 'N/A';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  category: string;
}

interface CategoryStats {
  total: number;
  pass: number;
  fail: number;
  partial: number;
  todo: number;
  missing: number;
  coverage: number;
}

interface CoverageReport {
  features: {
    total: number;
    tested: number;
    passing: number;
    failing: number;
    coverage: number;
  };
  testCases: {
    total: number;
    implemented: number;
    passing: number;
    failing: number;
    coverage: number;
  };
  byPriority: {
    p0: CategoryStats;
    p1: CategoryStats;
    p2: CategoryStats;
    p3: CategoryStats;
  };
  byCategory: Map<string, CategoryStats>;
  criticalGaps: TestItem[];
}

class CoverageChecker {
  private checklistPath: string;
  private verbose: boolean;
  private filterCategory?: string;

  constructor() {
    this.checklistPath = path.join(__dirname, '../../.planning/MASTER-TEST-CHECKLIST.md');
    this.verbose = process.argv.includes('--verbose');

    const categoryArg = process.argv.find(arg => arg.startsWith('--category='));
    this.filterCategory = categoryArg?.split('=')[1];
  }

  async run(): Promise<void> {
    console.log('📊 Dawati Test Coverage Report\n');
    console.log('═'.repeat(60));
    console.log();

    if (!fs.existsSync(this.checklistPath)) {
      console.error('❌ ERROR: MASTER-TEST-CHECKLIST.md not found');
      console.error(`   Expected at: ${this.checklistPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(this.checklistPath, 'utf-8');
    const report = this.parseChecklist(content);

    this.printSummary(report);
    this.printPriorityBreakdown(report);
    this.printCategoryBreakdown(report);
    this.printCriticalGaps(report);
    this.printRecommendations(report);
  }

  private parseChecklist(content: string): CoverageReport {
    const lines = content.split('\n');
    const testItems: TestItem[] = [];

    let currentCategory = '';
    let currentPriority: 'P0' | 'P1' | 'P2' | 'P3' = 'P1';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect category headers
      if (line.startsWith('## ') && line.includes('️⃣')) {
        currentCategory = line.split('️⃣')[1]?.trim().split('(')[0]?.trim() || '';
      }

      // Detect priority sections
      if (line.includes('Priority 0:') || line.includes('P0 Critical')) {
        currentPriority = 'P0';
      } else if (line.includes('Priority 1:') || line.includes('P1 High')) {
        currentPriority = 'P1';
      } else if (line.includes('Priority 2:') || line.includes('P2 Medium')) {
        currentPriority = 'P2';
      } else if (line.includes('Priority 3:') || line.includes('P3 Low')) {
        currentPriority = 'P3';
      }

      // Parse test items from tables
      if (line.startsWith('| ') && !line.includes('---') && !line.includes('ID |')) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);

        if (cols.length >= 4) {
          const id = cols[0];
          const name = cols[1];
          const statusCol = cols[2];
          const priorityCol = cols[3];

          // Extract status emoji
          let status: TestItem['status'] = 'TODO';
          if (statusCol.includes('✅ PASS')) status = 'PASS';
          else if (statusCol.includes('❌ FAIL')) status = 'FAIL';
          else if (statusCol.includes('⚠️ PARTIAL')) status = 'PARTIAL';
          else if (statusCol.includes('📝 TODO')) status = 'TODO';
          else if (statusCol.includes('🚫 MISSING')) status = 'MISSING';
          else if (statusCol.includes('N/A')) status = 'N/A';

          // Extract priority
          let priority: TestItem['priority'] = currentPriority;
          if (priorityCol.includes('P0')) priority = 'P0';
          else if (priorityCol.includes('P1')) priority = 'P1';
          else if (priorityCol.includes('P2')) priority = 'P2';
          else if (priorityCol.includes('P3')) priority = 'P3';

          testItems.push({
            id,
            name,
            status,
            priority,
            category: currentCategory,
          });
        }
      }

      // Parse checkbox items
      if (line.includes('- [ ]') || line.includes('- [x]')) {
        const checked = line.includes('[x]');
        const match = line.match(/\*\*([A-Z]+-[A-Z0-9]+)\*\*:(.+)/);

        if (match) {
          const id = match[1];
          const name = match[2].split('|')[0]?.trim() || '';

          testItems.push({
            id,
            name,
            status: checked ? 'PASS' : 'TODO',
            priority: currentPriority,
            category: currentCategory,
          });
        }
      }
    }

    return this.calculateStats(testItems);
  }

  private calculateStats(items: TestItem[]): CoverageReport {
    const features = items.filter(i => i.id.includes('-F'));
    const testCases = items.filter(i => !i.id.includes('-F'));

    const calcCategory = (items: TestItem[]): CategoryStats => {
      const total = items.filter(i => i.status !== 'N/A').length;
      const pass = items.filter(i => i.status === 'PASS').length;
      const fail = items.filter(i => i.status === 'FAIL').length;
      const partial = items.filter(i => i.status === 'PARTIAL').length;
      const todo = items.filter(i => i.status === 'TODO').length;
      const missing = items.filter(i => i.status === 'MISSING').length;

      return {
        total,
        pass,
        fail,
        partial,
        todo,
        missing,
        coverage: total > 0 ? Math.round((pass / total) * 100) : 0,
      };
    };

    const byCategory = new Map<string, CategoryStats>();
    const categories = [...new Set(items.map(i => i.category))];

    for (const cat of categories) {
      const catItems = items.filter(i => i.category === cat);
      byCategory.set(cat, calcCategory(catItems));
    }

    const criticalGaps = items.filter(
      i => i.priority === 'P0' && (i.status === 'TODO' || i.status === 'FAIL')
    );

    return {
      features: {
        total: features.length,
        tested: features.filter(i => ['PASS', 'FAIL', 'PARTIAL'].includes(i.status)).length,
        passing: features.filter(i => i.status === 'PASS').length,
        failing: features.filter(i => i.status === 'FAIL').length,
        coverage: Math.round((features.filter(i => i.status === 'PASS').length / features.length) * 100),
      },
      testCases: {
        total: testCases.length,
        implemented: testCases.filter(i => ['PASS', 'FAIL', 'PARTIAL'].includes(i.status)).length,
        passing: testCases.filter(i => i.status === 'PASS').length,
        failing: testCases.filter(i => i.status === 'FAIL').length,
        coverage: Math.round((testCases.filter(i => i.status === 'PASS').length / testCases.length) * 100),
      },
      byPriority: {
        p0: calcCategory(items.filter(i => i.priority === 'P0')),
        p1: calcCategory(items.filter(i => i.priority === 'P1')),
        p2: calcCategory(items.filter(i => i.priority === 'P2')),
        p3: calcCategory(items.filter(i => i.priority === 'P3')),
      },
      byCategory,
      criticalGaps,
    };
  }

  private printSummary(report: CoverageReport): void {
    console.log('📈 OVERALL COVERAGE\n');

    console.log(`Features:   ${report.features.passing}/${report.features.total} passing (${report.features.coverage}%)`);
    console.log(`Test Cases: ${report.testCases.passing}/${report.testCases.total} passing (${report.testCases.coverage}%)`);
    console.log();

    const totalItems = report.features.total + report.testCases.total;
    const passingItems = report.features.passing + report.testCases.passing;
    const overallCoverage = Math.round((passingItems / totalItems) * 100);

    console.log(`Overall:    ${passingItems}/${totalItems} (${overallCoverage}%)`);
    console.log();

    // Visual progress bar
    const barLength = 50;
    const filled = Math.round((overallCoverage / 100) * barLength);
    const empty = barLength - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    console.log(`Progress:   [${bar}] ${overallCoverage}%`);
    console.log();
    console.log('─'.repeat(60));
    console.log();
  }

  private printPriorityBreakdown(report: CoverageReport): void {
    console.log('🎯 PRIORITY BREAKDOWN\n');

    const printPriority = (name: string, stats: CategoryStats, emoji: string) => {
      const status = stats.coverage >= 90 ? '✅' : stats.coverage >= 50 ? '⚠️' : '❌';
      console.log(`${emoji} ${name.padEnd(12)} ${status} ${stats.pass}/${stats.total} passing (${stats.coverage}%)`);

      if (this.verbose && stats.fail > 0) {
        console.log(`   └─ ${stats.fail} failing, ${stats.todo} todo, ${stats.partial} partial`);
      }
    };

    printPriority('P0 Critical', report.byPriority.p0, '🔥');
    printPriority('P1 High', report.byPriority.p1, '⚡');
    printPriority('P2 Medium', report.byPriority.p2, '📌');
    printPriority('P3 Low', report.byPriority.p3, '💡');

    console.log();
    console.log('─'.repeat(60));
    console.log();
  }

  private printCategoryBreakdown(report: CoverageReport): void {
    console.log('📂 CATEGORY BREAKDOWN\n');

    const categories = Array.from(report.byCategory.entries())
      .filter(([name]) => !this.filterCategory || name.toLowerCase().includes(this.filterCategory.toLowerCase()))
      .sort((a, b) => b[1].coverage - a[1].coverage);

    for (const [name, stats] of categories) {
      const status = stats.coverage >= 80 ? '✅' : stats.coverage >= 50 ? '⚠️' : stats.coverage >= 20 ? '❌' : '🚫';
      const namePadded = name.padEnd(25);
      const coverage = `${stats.pass}/${stats.total}`.padStart(8);
      const percentage = `${stats.coverage}%`.padStart(5);

      console.log(`${status} ${namePadded} ${coverage} ${percentage}`);

      if (this.verbose) {
        console.log(`   Pass: ${stats.pass}, Fail: ${stats.fail}, Partial: ${stats.partial}, Todo: ${stats.todo}`);
      }
    }

    console.log();
    console.log('─'.repeat(60));
    console.log();
  }

  private printCriticalGaps(report: CoverageReport): void {
    if (report.criticalGaps.length === 0) {
      console.log('✅ NO CRITICAL GAPS - All P0 tests passing!\n');
      return;
    }

    console.log(`🚨 CRITICAL GAPS (${report.criticalGaps.length} P0 tests not passing)\n`);

    const topGaps = report.criticalGaps.slice(0, 10);

    for (const gap of topGaps) {
      const statusEmoji = gap.status === 'FAIL' ? '❌' : '📝';
      console.log(`${statusEmoji} ${gap.id.padEnd(15)} ${gap.category}`);

      if (this.verbose) {
        console.log(`   ${gap.name}`);
      }
    }

    if (report.criticalGaps.length > 10) {
      console.log(`\n   ... and ${report.criticalGaps.length - 10} more`);
    }

    console.log();
    console.log('─'.repeat(60));
    console.log();
  }

  private printRecommendations(report: CoverageReport): void {
    console.log('💡 RECOMMENDATIONS\n');

    const recommendations: string[] = [];

    // Check P0 coverage
    if (report.byPriority.p0.coverage < 100) {
      const missing = report.byPriority.p0.total - report.byPriority.p0.pass;
      recommendations.push(`⚠️  BLOCKER: ${missing} P0 critical tests failing/missing`);
      recommendations.push(`   → Focus on P0 tests before production`);
    }

    // Check major gaps
    const gapCategories = Array.from(report.byCategory.entries())
      .filter(([_, stats]) => stats.coverage < 20 && stats.total > 10)
      .sort((a, b) => b[1].total - a[1].total);

    if (gapCategories.length > 0) {
      const [catName, catStats] = gapCategories[0];
      recommendations.push(`📉 Lowest coverage: ${catName} (${catStats.coverage}%)`);
      recommendations.push(`   → Implement ${catStats.todo} ${catName} tests`);
    }

    // Check overall progress
    const overallCoverage = Math.round(
      ((report.features.passing + report.testCases.passing) /
       (report.features.total + report.testCases.total)) * 100
    );

    if (overallCoverage < 50) {
      recommendations.push(`📊 Overall coverage is ${overallCoverage}% (target: 80%)`);
      recommendations.push(`   → Prioritize P0/P1 tests in next sprint`);
    } else if (overallCoverage >= 80) {
      recommendations.push(`🎉 Excellent coverage! (${overallCoverage}%)`);
      recommendations.push(`   → Focus on edge cases and P2/P3 tests`);
    }

    if (recommendations.length === 0) {
      console.log('✅ No major issues - keep up the good work!\n');
    } else {
      for (const rec of recommendations) {
        console.log(rec);
      }
      console.log();
    }

    console.log('═'.repeat(60));
    console.log();
    console.log('💾 To update coverage:');
    console.log('   1. Edit .planning/MASTER-TEST-CHECKLIST.md');
    console.log('   2. Change [ ] to [x] or update status emojis');
    console.log('   3. Run: npm run coverage');
    console.log();
  }
}

// Run the checker
const checker = new CoverageChecker();
checker.run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Master Test Runner
 *
 * Runs all test suites sequentially and reports results.
 * Usage: npx ts-node tests/run-all.ts
 *
 * Individual tests can be run separately:
 *   npx ts-node tests/auth-flow.test.ts        # Auth pages (3 phases)
 *   npx ts-node tests/component-deep.test.ts   # Component checks (7 phases)
 *   npx ts-node tests/multi-device.test.ts     # 5 screen sizes (10 phases)
 *   npx ts-node tests/customer-tabs.test.ts    # Customer tabs (8 phases)
 *   npx ts-node tests/vendor-dashboard.test.ts # Vendor tabs (7 phases)
 *   npx ts-node tests/marketplace-flow.test.ts # Marketplace flow (6 phases)
 *   npx ts-node tests/account-settings.test.ts # Account pages (9 phases)
 */

const suites = [
  { name: 'Auth Flow', file: 'auth-flow.test.ts' },
  { name: 'Component Deep Checks', file: 'component-deep.test.ts' },
  { name: 'Customer Tabs', file: 'customer-tabs.test.ts' },
  { name: 'Vendor Dashboard', file: 'vendor-dashboard.test.ts' },
  { name: 'Marketplace Flow', file: 'marketplace-flow.test.ts' },
  { name: 'Account Settings', file: 'account-settings.test.ts' },
  { name: 'Multi-Device', file: 'multi-device.test.ts' },
];

// Allow running specific suites via command line arg
const requestedSuites = process.argv.slice(2);

const results: Array<{ name: string; passed: boolean; duration: number }> = [];

console.log('\n=== Dawati AI Testing System - Full Suite ===\n');
console.log(`Total suites: ${requestedSuites.length > 0 ? requestedSuites.length : suites.length}`);
console.log('');

for (const suite of suites) {
  // Skip if specific suites requested and this isn't one
  if (requestedSuites.length > 0 && !requestedSuites.includes(suite.file.replace('.test.ts', ''))) {
    continue;
  }

  console.log(`\n>>> Running: ${suite.name} (${suite.file})`);
  const start = Date.now();

  try {
    execSync(`npx ts-node ${path.join(__dirname, suite.file)}`, {
      stdio: 'inherit',
      timeout: 600000, // 10 min per suite
    });
    results.push({ name: suite.name, passed: true, duration: Date.now() - start });
  } catch {
    results.push({ name: suite.name, passed: false, duration: Date.now() - start });
  }
}

// Summary
console.log('\n\n=== FULL SUITE SUMMARY ===\n');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;

for (const r of results) {
  const icon = r.passed ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${r.name} (${(r.duration / 1000).toFixed(1)}s)`);
}

console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length}`);
console.log(`Total Duration: ${(results.reduce((s, r) => s + r.duration, 0) / 1000).toFixed(1)}s`);

process.exit(failed > 0 ? 1 : 0);

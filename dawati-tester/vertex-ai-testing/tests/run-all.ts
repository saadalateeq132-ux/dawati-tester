import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Master Test Runner
 *
 * Runs all test suites sequentially and reports results.
 * Usage: npx ts-node tests/run-all.ts
 *
 * Run specific suites:
 *   npx ts-node tests/run-all.ts auth-flow customer-tabs
 *
 * Individual tests can be run separately:
 *   npx ts-node tests/auth-flow.test.ts            # Auth pages (3 phases)
 *   npx ts-node tests/component-deep.test.ts       # Component checks (7 phases)
 *   npx ts-node tests/multi-device.test.ts         # 5 screen sizes (10 phases)
 *   npx ts-node tests/customer-tabs.test.ts        # Customer tabs (8 phases)
 *   npx ts-node tests/vendor-dashboard.test.ts     # Vendor tabs (7 phases)
 *   npx ts-node tests/marketplace-flow.test.ts     # Marketplace flow (6 phases)
 *   npx ts-node tests/account-settings.test.ts     # Account pages (9 phases)
 *   npx ts-node tests/events-flow.test.ts          # Events flow (7 phases)
 *   npx ts-node tests/bookings-flow.test.ts        # Bookings flow (9 phases)
 *   npx ts-node tests/admin-dashboard.test.ts      # Admin dashboard (13 phases)
 *   npx ts-node tests/account-extended.test.ts     # Account extended (13 phases)
 *   npx ts-node tests/marketplace-booking.test.ts  # Marketplace booking deep (11 phases)
 *   npx ts-node tests/vendor-management.test.ts    # Vendor management (9 phases)
 *   npx ts-node tests/misc-pages.test.ts           # Misc pages (16 phases)
 *
 * Total: 14 test suites, 128 phases
 */

const suites = [
  // --- Core (run first) ---
  { name: 'Auth Flow', file: 'auth-flow.test.ts', phases: 3 },
  { name: 'Component Deep Checks', file: 'component-deep.test.ts', phases: 7 },

  // --- Customer facing ---
  { name: 'Customer Tabs', file: 'customer-tabs.test.ts', phases: 8 },
  { name: 'Account Settings', file: 'account-settings.test.ts', phases: 9 },
  { name: 'Account Extended', file: 'account-extended.test.ts', phases: 13 },

  // --- Marketplace ---
  { name: 'Marketplace Flow', file: 'marketplace-flow.test.ts', phases: 6 },
  { name: 'Marketplace Booking Deep', file: 'marketplace-booking.test.ts', phases: 11 },

  // --- Events & Bookings ---
  { name: 'Events Flow', file: 'events-flow.test.ts', phases: 7 },
  { name: 'Bookings Flow', file: 'bookings-flow.test.ts', phases: 9 },

  // --- Vendor ---
  { name: 'Vendor Dashboard', file: 'vendor-dashboard.test.ts', phases: 7 },
  { name: 'Vendor Management', file: 'vendor-management.test.ts', phases: 9 },

  // --- Admin ---
  { name: 'Admin Dashboard', file: 'admin-dashboard.test.ts', phases: 13 },

  // --- Other ---
  { name: 'Miscellaneous Pages', file: 'misc-pages.test.ts', phases: 16 },
  { name: 'Multi-Device', file: 'multi-device.test.ts', phases: 10 },
];

// Allow running specific suites via command line arg
const requestedSuites = process.argv.slice(2);

const results: Array<{ name: string; passed: boolean; duration: number; phases: number }> = [];

const activeSuites = requestedSuites.length > 0
  ? suites.filter(s => requestedSuites.includes(s.file.replace('.test.ts', '')))
  : suites;

const totalPhases = activeSuites.reduce((s, suite) => s + suite.phases, 0);

console.log('\n=== Dawati AI Testing System - Full Suite ===\n');
console.log(`Total suites: ${activeSuites.length}`);
console.log(`Total phases: ${totalPhases}`);
console.log('');

for (const suite of suites) {
  // Skip if specific suites requested and this isn't one
  if (requestedSuites.length > 0 && !requestedSuites.includes(suite.file.replace('.test.ts', ''))) {
    continue;
  }

  console.log(`\n>>> Running: ${suite.name} (${suite.file}) - ${suite.phases} phases`);
  const start = Date.now();

  try {
    execSync(`npx ts-node ${path.join(__dirname, suite.file)}`, {
      stdio: 'inherit',
      timeout: 600000, // 10 min per suite
    });
    results.push({ name: suite.name, passed: true, duration: Date.now() - start, phases: suite.phases });
  } catch {
    results.push({ name: suite.name, passed: false, duration: Date.now() - start, phases: suite.phases });
  }
}

// Summary
console.log('\n\n=== FULL SUITE SUMMARY ===\n');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const totalPhasesRun = results.reduce((s, r) => s + r.phases, 0);

for (const r of results) {
  const icon = r.passed ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${r.name} (${r.phases} phases, ${(r.duration / 1000).toFixed(1)}s)`);
}

console.log(`\nSuites: ${passed} passed, ${failed} failed out of ${results.length}`);
console.log(`Phases: ${totalPhasesRun} total`);
console.log(`Duration: ${(results.reduce((s, r) => s + r.duration, 0) / 1000).toFixed(1)}s`);

process.exit(failed > 0 ? 1 : 0);

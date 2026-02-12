#!/usr/bin/env node

import { runTests, RunnerOptions } from './runner';
import { createChildLogger } from './logger';

const log = createChildLogger('main');

function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {
    only: 'all',
    skipAI: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--only=')) {
      const value = arg.split('=')[1];
      if (['auth', 'navigation', 'scrolling', 'rtl', 'auth+navigation', 'all'].includes(value)) {
        options.only = value as RunnerOptions['only'];
      }
    }
    if (arg === '--skip-ai' || arg === '--no-ai') {
      options.skipAI = true;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
Dawati Autonomous Tester
========================

Usage:
  npm run test              Run all tests with AI analysis
  npm run test:auth         Run only authentication tests
  npm run test:nav          Run only navigation tests
  npm run test:scroll       Run only scroll tests
  npm run test:rtl          Run only RTL/i18n checks
  npm run report            Open the latest report

Options:
  --only=<type>    Run specific test type (auth|navigation|scrolling|rtl|auth+navigation|all)
  --skip-ai        Skip AI analysis (faster, no Gemini/Vertex API calls)
  --help, -h       Show this help message

Environment Variables:
  GEMINI_API_KEY   Gemini key (optional if using Vertex)
  DAWATI_URL       URL of your Dawati app (or set BASE_URL)
  HEADLESS         Run browser in headless mode (default: true)
  LOG_LEVEL        Logging level (default: info)

Examples:
  npm run test                     # Full test with AI
  npm run test -- --skip-ai        # Full test without AI
  npm run test -- --only=auth      # Only auth tests
`);
}

async function main(): Promise<void> {
  const options = parseArgs();

  log.info({ options }, 'Starting Dawati Autonomous Tester');

  try {
    await runTests(options);
    log.info('Test run completed successfully');
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Test run failed');
    console.error('\n❌ Error:', errorMessage);
    process.exit(1);
  }
}

main();

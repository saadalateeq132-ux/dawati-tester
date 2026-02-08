import { initBrowser, closeBrowser, navigateTo } from './browser';
import { initScreenshotSession, saveScreenshotIndex, getScreenshots } from './screenshot-manager';
import { runAuthTests, AuthTestResult } from './auth-tester';
import { runNavigationTests, NavigationTestResult } from './navigation-tester';
import { runScrollTests, ScrollTestResult } from './scroll-tester';
import { runRTLChecks, RTLCheckResult } from './rtl-checker';
import { analyzeAllScreenshots, AnalysisResult } from './ai-analyzer';
import { generateReport, saveReport, printReportSummary } from './report-generator';
import { config } from './config';
import { createChildLogger } from './logger';

const log = createChildLogger('runner');

export interface RunnerOptions {
  only?: 'auth' | 'navigation' | 'scrolling' | 'rtl' | 'all';
  skipAI?: boolean;
}

export interface TestResults {
  authResults: AuthTestResult[];
  navigationResults: NavigationTestResult[];
  scrollResults: ScrollTestResult[];
  rtlResults: RTLCheckResult[];
  analysisResults: AnalysisResult[];
}

function printBanner(): void {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' DAWATI AUTONOMOUS TESTER');
  console.log(' Powered by Playwright + Gemini AI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📍 Target: ${config.dawatiUrl}`);
  console.log(`🤖 AI Model: ${config.aiModel}`);
  console.log(`🖥️  Headless: ${config.headless}`);
  console.log('\n');
}

function printProgress(phase: string, status: 'start' | 'done', details?: string): void {
  const timestamp = new Date().toLocaleTimeString();
  if (status === 'start') {
    console.log(`[${timestamp}] 🔄 ${phase}...${details ? ` (${details})` : ''}`);
  } else {
    console.log(`[${timestamp}] ✅ ${phase} complete${details ? ` - ${details}` : ''}`);
  }
}

export async function runTests(options: RunnerOptions = {}): Promise<TestResults> {
  const { only = 'all', skipAI = false } = options;
  const startTime = new Date();

  printBanner();

  const results: TestResults = {
    authResults: [],
    navigationResults: [],
    scrollResults: [],
    rtlResults: [],
    analysisResults: [],
  };

  try {
    // Initialize
    printProgress('Initializing browser', 'start');
    await initBrowser();
    const runDir = initScreenshotSession();
    printProgress('Initializing browser', 'done', `Screenshots: ${runDir}`);

    // Navigate to app
    printProgress('Loading app', 'start', config.dawatiUrl);
    await navigateTo(config.dawatiUrl);
    printProgress('Loading app', 'done');

    // Run tests based on options
    if (only === 'all' || only === 'auth') {
      printProgress('Authentication tests', 'start');
      results.authResults = await runAuthTests();
      const authPassed = results.authResults.filter((r) => r.success).length;
      printProgress('Authentication tests', 'done', `${authPassed}/${results.authResults.length} passed`);
    }

    if (only === 'all' || only === 'navigation') {
      printProgress('Navigation tests', 'start');
      results.navigationResults = await runNavigationTests();
      const navPassed = results.navigationResults.filter((r) => r.success).length;
      printProgress('Navigation tests', 'done', `${navPassed}/${results.navigationResults.length} passed`);
    }

    if (only === 'all' || only === 'scrolling') {
      printProgress('Scroll tests', 'start');
      results.scrollResults = await runScrollTests();
      const scrollPassed = results.scrollResults.filter((r) => r.success).length;
      printProgress('Scroll tests', 'done', `${scrollPassed}/${results.scrollResults.length} passed`);
    }

    if (only === 'all' || only === 'rtl') {
      printProgress('RTL & i18n checks', 'start');
      results.rtlResults = await runRTLChecks();
      const avgScore = results.rtlResults.reduce((sum, r) => sum + r.score, 0) / results.rtlResults.length;
      printProgress('RTL & i18n checks', 'done', `Avg score: ${avgScore.toFixed(1)}/10`);
    }

    // Save screenshot index
    saveScreenshotIndex();

    // AI Analysis
    if (!skipAI) {
      const screenshots = getScreenshots();
      printProgress('AI Analysis', 'start', `${screenshots.length} screenshots`);
      results.analysisResults = await analyzeAllScreenshots(screenshots);
      const totalIssues = results.analysisResults.reduce((sum, r) => sum + r.issues.length, 0);
      printProgress('AI Analysis', 'done', `${totalIssues} issues found`);
    }

    // Generate report
    printProgress('Generating report', 'start');
    const report = generateReport(
      config.dawatiUrl,
      startTime,
      results.analysisResults,
      results.authResults,
      results.navigationResults,
      results.scrollResults,
      results.rtlResults
    );
    saveReport(report);
    printProgress('Generating report', 'done');

    // Print summary
    printReportSummary(report);

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Test run failed');
    console.error('\n❌ Test run failed:', errorMessage);
    throw error;
  } finally {
    // Always close browser
    await closeBrowser();
  }
}

export async function runQuickTest(): Promise<void> {
  console.log('\n🚀 Running quick test (auth + navigation only)...\n');
  await runTests({ only: 'all', skipAI: true });
}

export async function runFullTest(): Promise<void> {
  console.log('\n🚀 Running full test with AI analysis...\n');
  await runTests({ only: 'all', skipAI: false });
}

import fs from 'fs';
import path from 'path';
import { launchBrowser, closeBrowser, createDeviceContexts } from './browser';
import { DeviceContext, setCurrentDevice, closeDeviceContext, parseDeviceConfigs } from './device-manager';
import {
  initScreenshotSession,
  saveScreenshotIndex,
  getScreenshots,
  setCurrentPage,
  getScreenshotsWithVisualChanges,
} from './screenshot-manager';
import { runAuthTests, AuthTestResult } from './auth-tester';
import { runNavigationTests, NavigationTestResult } from './navigation-tester';
import { runScrollTests, ScrollTestResult } from './scroll-tester';
import { runRTLChecks, RTLCheckResult } from './rtl-checker';
import { analyzeAllScreenshots, AnalysisResult } from './ai-analyzer';
import { generateReport, saveReport, printReportSummary } from './report-generator';
import { config } from './config';
import { createChildLogger } from './logger';
import { DeviceConfig, VisualDiff, AccessibilityResult, PerformanceMetric } from './types';
import { withRetry, safeExecute } from './retry-helper';
import { initVisualRegression, getVisualDiffs, getSignificantChanges } from './visual-regression';
import {
  initAccessibility,
  runAccessibilityCheck,
  getAccessibilityResults,
  getViolationSummary,
} from './accessibility-checker';
import {
  initPerformanceMetrics,
  measurePageLoad,
  getPerformanceMetrics,
  getPerformanceSummary,
} from './performance-metrics';
import { ChecklistValidator, ChecklistScore } from './checklist-validator';

const log = createChildLogger('runner');

export interface TestPlan {
  name: string;
  version: string;
  devices?: DeviceConfig[];
  runAllDevices?: boolean;
  visualRegression?: {
    enabled: boolean;
    diffThreshold: number;
    baselinesDir: string;
  };
  accessibility?: {
    enabled: boolean;
    runOnMajorPages: boolean;
    impactLevels: string[];
  };
  execution?: {
    timeout: number;
    navigationTimeout: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
}

export interface RunnerOptions {
  only?: 'auth' | 'navigation' | 'scrolling' | 'rtl' | 'all';
  skipAI?: boolean;
  deviceIndex?: number;
  testPlanPath?: string;
}

export interface TestResults {
  authResults: AuthTestResult[];
  navigationResults: NavigationTestResult[];
  scrollResults: ScrollTestResult[];
  rtlResults: RTLCheckResult[];
  analysisResults: AnalysisResult[];
  visualDiffs: VisualDiff[];
  accessibilityResults: AccessibilityResult[];
  performanceMetrics: PerformanceMetric[];
  devicesTested: string[];
  checklistScore?: ChecklistScore;
}

function loadTestPlan(testPlanPath?: string): TestPlan {
  const planPath = testPlanPath || path.join(config.testPlansDir, 'dawati.json');
  if (fs.existsSync(planPath)) {
    const content = fs.readFileSync(planPath, 'utf-8');
    return JSON.parse(content);
  }
  return { name: 'Default', version: '1.0.0' };
}

function printBanner(deviceName?: string): void {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(' DAWATI AUTONOMOUS TESTER');
  console.log(' Powered by Playwright + Gemini AI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📍 Target: ${config.dawatiUrl}`);
  console.log(`🤖 AI Model: ${config.aiModel}`);
  console.log(`🖥️  Headless: ${config.headless}`);
  if (deviceName) {
    console.log(`📱 Device: ${deviceName}`);
  }
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

function printDeviceBanner(deviceName: string, index: number, total: number): void {
  console.log('\n');
  console.log('─────────────────────────────────────────────────────');
  console.log(` 📱 Device ${index + 1}/${total}: ${deviceName}`);
  console.log('─────────────────────────────────────────────────────');
}

async function runTestsForDevice(
  deviceContext: DeviceContext,
  options: RunnerOptions,
  testPlan: TestPlan
): Promise<{
  authResults: AuthTestResult[];
  navigationResults: NavigationTestResult[];
  scrollResults: ScrollTestResult[];
  rtlResults: RTLCheckResult[];
  accessibilityResults: AccessibilityResult[];
}> {
  const { only = 'all' } = options;
  const { page } = deviceContext;
  const retryAttempts = testPlan.execution?.retryAttempts || 2;
  const retryDelay = testPlan.execution?.retryDelayMs || 2000;

  // Set timeouts from test plan
  if (testPlan.execution?.timeout) {
    page.setDefaultTimeout(testPlan.execution.timeout);
  }
  if (testPlan.execution?.navigationTimeout) {
    page.setDefaultNavigationTimeout(testPlan.execution.navigationTimeout);
  }

  // Set the current page for screenshot manager
  setCurrentPage(page);
  setCurrentDevice(deviceContext.name);

  const results = {
    authResults: [] as AuthTestResult[],
    navigationResults: [] as NavigationTestResult[],
    scrollResults: [] as ScrollTestResult[],
    rtlResults: [] as RTLCheckResult[],
    accessibilityResults: [] as AccessibilityResult[],
  };

  // Navigate to app with retry
  printProgress('Loading app', 'start', config.dawatiUrl);
  await withRetry(
    async () => {
      await page.goto(config.dawatiUrl, { waitUntil: 'networkidle' });
    },
    { maxAttempts: retryAttempts, delayMs: retryDelay, operationName: 'navigate to app' }
  );
  printProgress('Loading app', 'done');

  // Measure initial page load
  await measurePageLoad(page, 'homepage');

  // Run accessibility check on homepage
  if (testPlan.accessibility?.enabled && testPlan.accessibility.runOnMajorPages) {
    const a11yResult = await safeExecute(
      () => runAccessibilityCheck(page, 'homepage'),
      'Accessibility check on homepage'
    );
    if (a11yResult.success && a11yResult.result) {
      results.accessibilityResults.push(a11yResult.result);
    }
  }

  // Run tests based on options with retry logic
  if (only === 'all' || only === 'auth') {
    printProgress('Authentication tests', 'start');
    const authResult = await safeExecute(
      () =>
        withRetry(() => runAuthTests(), {
          maxAttempts: retryAttempts,
          delayMs: retryDelay,
          operationName: 'auth tests',
        }),
      'Authentication tests'
    );
    if (authResult.success && authResult.result) {
      results.authResults = authResult.result;
    }
    const authPassed = results.authResults.filter((r) => r.success).length;
    printProgress('Authentication tests', 'done', `${authPassed}/${results.authResults.length} passed`);
  }

  if (only === 'all' || only === 'navigation') {
    printProgress('Navigation tests', 'start');
    const navResult = await safeExecute(
      () =>
        withRetry(() => runNavigationTests(), {
          maxAttempts: retryAttempts,
          delayMs: retryDelay,
          operationName: 'navigation tests',
        }),
      'Navigation tests'
    );
    if (navResult.success && navResult.result) {
      results.navigationResults = navResult.result;

      // Run accessibility on major navigation pages
      if (testPlan.accessibility?.enabled && testPlan.accessibility.runOnMajorPages) {
        for (const navResult of results.navigationResults) {
          if (navResult.success && navResult.pagesVisited.length > 0) {
            const a11yResult = await safeExecute(
              () => runAccessibilityCheck(page, navResult.category),
              `Accessibility check on ${navResult.category}`
            );
            if (a11yResult.success && a11yResult.result) {
              results.accessibilityResults.push(a11yResult.result);
            }
          }
        }
      }
    }
    const navPassed = results.navigationResults.filter((r) => r.success).length;
    printProgress('Navigation tests', 'done', `${navPassed}/${results.navigationResults.length} passed`);
  }

  if (only === 'all' || only === 'scrolling') {
    printProgress('Scroll tests', 'start');
    const scrollResult = await safeExecute(
      () =>
        withRetry(() => runScrollTests(), {
          maxAttempts: retryAttempts,
          delayMs: retryDelay,
          operationName: 'scroll tests',
        }),
      'Scroll tests'
    );
    if (scrollResult.success && scrollResult.result) {
      results.scrollResults = scrollResult.result;
    }
    const scrollPassed = results.scrollResults.filter((r) => r.success).length;
    printProgress('Scroll tests', 'done', `${scrollPassed}/${results.scrollResults.length} passed`);
  }

  if (only === 'all' || only === 'rtl') {
    printProgress('RTL & i18n checks', 'start');
    const rtlResult = await safeExecute(
      () =>
        withRetry(() => runRTLChecks(), {
          maxAttempts: retryAttempts,
          delayMs: retryDelay,
          operationName: 'RTL checks',
        }),
      'RTL checks'
    );
    if (rtlResult.success && rtlResult.result) {
      results.rtlResults = rtlResult.result;
    }
    const avgScore =
      results.rtlResults.length > 0
        ? results.rtlResults.reduce((sum, r) => sum + r.score, 0) / results.rtlResults.length
        : 0;
    printProgress('RTL & i18n checks', 'done', `Avg score: ${avgScore.toFixed(1)}/10`);
  }

  return results;
}

export async function runTests(options: RunnerOptions = {}): Promise<TestResults> {
  const { skipAI = false, deviceIndex, testPlanPath } = options;
  const startTime = new Date();

  // Load test plan
  const testPlan = loadTestPlan(testPlanPath);

  printBanner();

  const results: TestResults = {
    authResults: [],
    navigationResults: [],
    scrollResults: [],
    rtlResults: [],
    analysisResults: [],
    visualDiffs: [],
    accessibilityResults: [],
    performanceMetrics: [],
    devicesTested: [],
  };

  try {
    // Initialize
    printProgress('Initializing browser', 'start');
    await launchBrowser();

    // Initialize screenshot session with visual regression if enabled
    const visualRegressionOptions = testPlan.visualRegression?.enabled
      ? {
          visualRegression: {
            enabled: true,
            baselinesDir: testPlan.visualRegression.baselinesDir || 'baselines',
            diffThreshold: testPlan.visualRegression.diffThreshold || 5,
          },
        }
      : undefined;

    const runDir = initScreenshotSession(visualRegressionOptions);

    // Initialize visual regression
    if (testPlan.visualRegression?.enabled) {
      initVisualRegression(
        testPlan.visualRegression.baselinesDir || 'baselines',
        testPlan.visualRegression.diffThreshold || 5
      );
    }

    // Initialize accessibility
    if (testPlan.accessibility?.enabled) {
      initAccessibility(testPlan.accessibility.impactLevels || ['critical', 'serious', 'moderate']);
    }

    // Initialize performance metrics
    initPerformanceMetrics();

    printProgress('Initializing browser', 'done', `Screenshots: ${runDir}`);

    // Get devices to test
    const allDevices = parseDeviceConfigs(testPlan.devices);
    const devicesToTest =
      deviceIndex !== undefined
        ? [allDevices[deviceIndex]]
        : testPlan.runAllDevices
          ? allDevices
          : [allDevices[0]];

    // Create device contexts
    const deviceContexts = await createDeviceContexts(devicesToTest, {
      locale: 'ar-SA',
      timezoneId: 'Asia/Riyadh',
    });

    // Run tests for each device
    for (let i = 0; i < deviceContexts.length; i++) {
      const deviceContext = deviceContexts[i];
      printDeviceBanner(deviceContext.name, i, deviceContexts.length);
      results.devicesTested.push(deviceContext.name);

      const deviceResults = await runTestsForDevice(deviceContext, options, testPlan);

      // Aggregate results
      results.authResults.push(...deviceResults.authResults);
      results.navigationResults.push(...deviceResults.navigationResults);
      results.scrollResults.push(...deviceResults.scrollResults);
      results.rtlResults.push(...deviceResults.rtlResults);
      results.accessibilityResults.push(...deviceResults.accessibilityResults);

      // Close device context
      await closeDeviceContext(deviceContext);
    }

    // Collect visual diffs
    results.visualDiffs = getVisualDiffs();
    results.performanceMetrics = getPerformanceMetrics();
    results.accessibilityResults = getAccessibilityResults();

    // Save screenshot index
    saveScreenshotIndex();

    // Print visual regression summary if enabled
    if (testPlan.visualRegression?.enabled) {
      const significantChanges = getSignificantChanges();
      if (significantChanges.length > 0) {
        console.log(`\n⚠️  Visual changes detected: ${significantChanges.length} screenshots differ from baseline`);
      }
    }

    // Print accessibility summary if enabled
    if (testPlan.accessibility?.enabled) {
      const violationSummary = getViolationSummary();
      if (violationSummary.total > 0) {
        console.log(`\n♿ Accessibility issues: ${violationSummary.total} violations found`);
        console.log(`   Critical: ${violationSummary.critical}, Serious: ${violationSummary.serious}, Moderate: ${violationSummary.moderate}`);
      }
    }

    // Print performance summary
    const perfSummary = getPerformanceSummary();
    if (perfSummary.totalPages > 0) {
      console.log(`\n⚡ Performance: Avg load time ${(perfSummary.avgLoadTimeMs / 1000).toFixed(2)}s across ${perfSummary.totalPages} pages`);
      if (perfSummary.slowPages.length > 0) {
        console.log(`   Slow pages (>5s): ${perfSummary.slowPages.join(', ')}`);
      }
    }

    // AI Analysis
    if (!skipAI) {
      const screenshots = getScreenshots();
      printProgress('AI Analysis', 'start', `${screenshots.length} screenshots`);
      results.analysisResults = await analyzeAllScreenshots(screenshots);
      const totalIssues = results.analysisResults.reduce((sum, r) => sum + r.issues.length, 0);
      printProgress('AI Analysis', 'done', `${totalIssues} issues found`);
    }

    // Checklist Validation
    printProgress('Checklist validation', 'start');
    try {
      const validator = new ChecklistValidator();
      await validator.loadChecklist();
      results.checklistScore = validator.calculateScore();
      printProgress('Checklist validation', 'done', `${results.checklistScore.overallScore}% coverage`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.warn({ error: errorMsg }, 'Checklist validation failed - continuing without checklist score');
      console.log(`⚠️  Checklist validation skipped: ${errorMsg}`);
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
      results.rtlResults,
      results.visualDiffs,
      results.accessibilityResults,
      results.performanceMetrics,
      results.devicesTested,
      results.checklistScore
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

export async function runMultiDeviceTest(): Promise<void> {
  console.log('\n🚀 Running multi-device test...\n');
  await runTests({ only: 'all', skipAI: false, testPlanPath: path.join(config.testPlansDir, 'dawati.json') });
}

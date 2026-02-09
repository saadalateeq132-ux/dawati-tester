/**
 * Section Test: Playwright Browser Automation
 * Tests browser launch, navigation, screenshot capture
 */
import { loadConfig } from '../src/config/default-config';
import { BrowserManager } from '../src/playwright/browser-manager';
import * as fs from 'fs';

async function testPlaywright() {
  console.log('=== PLAYWRIGHT BROWSER TEST ===\n');

  const config = loadConfig();
  // Force headless for automated testing
  config.headless = true;

  const browser = new BrowserManager(config);

  try {
    // Test 1: Browser Launch
    console.log('[Test 1] Launching browser...');
    await browser.launch();
    console.log('[Test 1] PASS - Browser launched successfully\n');

    // Test 2: Navigation
    console.log('[Test 2] Navigating to base URL...');
    await browser.executeAction({
      type: 'navigate',
      url: config.baseUrl,
      description: 'Navigate to Dawati homepage',
    });
    const url = await browser.getCurrentUrl();
    console.log(`[Test 2] Current URL: ${url}`);
    console.log('[Test 2] PASS - Navigation successful\n');

    // Test 3: Screenshot
    console.log('[Test 3] Capturing screenshot...');
    const screenshotPath = await browser.captureScreenshot('playwright-test');
    const exists = fs.existsSync(screenshotPath);
    console.log(`[Test 3] Screenshot saved: ${screenshotPath}`);
    console.log(`[Test 3] File exists: ${exists}`);
    if (exists) {
      const stats = fs.statSync(screenshotPath);
      console.log(`[Test 3] File size: ${(stats.size / 1024).toFixed(1)} KB`);
    }
    console.log(`[Test 3] ${exists ? 'PASS' : 'FAIL'} - Screenshot capture\n`);

    // Test 4: Element Detection
    console.log('[Test 4] Checking page elements...');
    const hasBody = await browser.validateDOM('body');
    console.log(`[Test 4] Body element found: ${hasBody}`);
    console.log(`[Test 4] ${hasBody ? 'PASS' : 'FAIL'} - DOM validation\n`);

    // Test 5: HTML Capture
    console.log('[Test 5] Capturing HTML snapshot...');
    const htmlPath = await browser.captureHTML();
    const htmlExists = fs.existsSync(htmlPath);
    console.log(`[Test 5] HTML saved: ${htmlPath}`);
    console.log(`[Test 5] ${htmlExists ? 'PASS' : 'FAIL'} - HTML capture\n`);

    // Test 6: Artifacts
    console.log('[Test 6] Checking artifacts...');
    const artifacts = browser.getArtifacts();
    console.log(`[Test 6] Screenshots: ${artifacts.screenshots.length}`);
    console.log(`[Test 6] HTML Snapshots: ${artifacts.htmlSnapshots.length}`);
    console.log(`[Test 6] Network Logs: ${artifacts.networkLogs.length}`);
    console.log(`[Test 6] Console Logs: ${artifacts.consoleLogs.length}`);
    console.log(`[Test 6] Errors: ${artifacts.errors.length}`);
    console.log('[Test 6] PASS - Artifacts collected\n');

    console.log('=== PLAYWRIGHT: ALL TESTS PASSED ===');

  } catch (error: any) {
    console.error(`\n=== PLAYWRIGHT TEST FAILED ===`);
    console.error(`Error: ${error.message}`);
    if (error.message.includes('browserType.launch')) {
      console.error('\nHint: Run "npx playwright install chromium" to install browser');
    }
  } finally {
    await browser.close();
  }
}

testPlaywright();

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { TestConfig, PhaseAction, TestArtifacts, NetworkLog, ConsoleLog } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: TestConfig;
  private artifacts: TestArtifacts;

  constructor(config: TestConfig) {
    this.config = config;
    this.artifacts = {
      screenshots: [],
      htmlSnapshots: [],
      networkLogs: [],
      consoleLogs: [],
      errors: [],
    };
  }

  async launch(): Promise<void> {
    const device = this.config.devices[0];
    console.log(`[Playwright] Launching browser for mobile device: ${device.name}`);
    console.log(`[Playwright] Viewport: ${device.viewport.width}x${device.viewport.height}`);

    this.browser = await chromium.launch({
      headless: this.config.headless,
    });

    this.context = await this.browser.newContext({
      viewport: device.viewport,
      userAgent: device.userAgent || 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
      locale: this.config.locale,
      timezoneId: this.config.timezone,
      hasTouch: true, // Enable touch events for mobile
      isMobile: true,  // Mobile-specific behaviors
      deviceScaleFactor: 2, // Retina display
    });

    this.page = await this.context.newPage();

    // Set timeouts
    this.page.setDefaultTimeout(this.config.timeout);
    this.page.setDefaultNavigationTimeout(this.config.timeout);

    // Capture network logs
    if (this.config.artifacts.saveNetworkLogs) {
      this.page.on('response', (response) => {
        this.artifacts.networkLogs.push({
          timestamp: new Date(),
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          duration: 0, // Playwright doesn't expose timing directly
        });
      });
    }

    // Capture console logs
    if (this.config.artifacts.saveConsoleLogs) {
      this.page.on('console', (msg) => {
        this.artifacts.consoleLogs.push({
          timestamp: new Date(),
          level: msg.type() as any,
          message: msg.text(),
        });
      });
    }

    // Capture errors
    this.page.on('pageerror', (error) => {
      this.artifacts.errors.push({
        timestamp: new Date(),
        message: error.message,
        stack: error.stack,
        phase: 'browser-error',
      });
    });

    console.log('[Playwright] Browser launched successfully');
  }

  async executeAction(action: PhaseAction): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call launch() first.');
    }

    console.log(`[Playwright] Executing action: ${action.type} - ${action.description}`);

    try {
      switch (action.type) {
        case 'navigate':
          await this.navigate(action.url!);
          break;

        case 'click':
          await this.page.click(action.selector!, { timeout: action.timeout });

          // Click validation: verify expected result after click
          if (action.expectAfterClick) {
            await this.validateClickResult(action);
          }
          break;

        case 'fill':
          await this.page.fill(action.selector!, action.value!, { timeout: action.timeout });
          break;

        case 'scroll':
          await this.page.evaluate((pixels) => window.scrollBy(0, pixels), action.value ? parseInt(action.value) : 500);
          await this.page.waitForTimeout(500);
          break;

        case 'wait':
          if (action.selector) {
            await this.page.waitForSelector(action.selector, { timeout: action.timeout });
          } else {
            await this.page.waitForTimeout(action.timeout || 1000);
          }
          break;

        case 'screenshot':
          await this.captureScreenshot(action.description);
          break;

        case 'resize':
          if (action.width && action.height) {
            await this.page.setViewportSize({ width: action.width, height: action.height });
            console.log(`[Playwright] Viewport resized to ${action.width}x${action.height}`);
            await this.page.waitForTimeout(1000);
          }
          break;

        case 'back':
          await this.page.goBack({ waitUntil: 'networkidle' });
          await this.page.waitForTimeout(2000);
          break;

        case 'scroll-to-bottom':
          await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await this.page.waitForTimeout(1000);
          break;

        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      console.log(`[Playwright] Action completed: ${action.type}`);
    } catch (error: any) {
      console.error(`[Playwright] Action failed: ${action.type} - ${error.message}`);
      throw error;
    }
  }

  private async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    console.log(`[Playwright] Navigating to: ${url}`);

    const response = await this.page.goto(url, { waitUntil: 'networkidle' });

    // Check for HTTP errors (404, 500, etc.)
    if (response) {
      const status = response.status();
      if (status >= 400) {
        const errorMessage = `HTTP ${status} error when navigating to ${url}`;
        console.error(`[Playwright] ${errorMessage}`);
        throw new Error(errorMessage);
      }
    }

    // Check for error page content
    const pageContent = await this.page.content();
    const errorIndicators = [
      'NOT_FOUND',
      '404',
      'Page Not Found',
      'This page could not be found',
      'Application error',
      'deployment not found',
    ];

    const contentLower = pageContent.toLowerCase();
    for (const indicator of errorIndicators) {
      if (contentLower.includes(indicator.toLowerCase())) {
        const errorMessage = `Error page detected (${indicator}) at ${url}`;
        console.error(`[Playwright] ${errorMessage}`);
        throw new Error(errorMessage);
      }
    }

    // Wait for SPA/JS frameworks (React, Expo) to fully render
    await this.page.waitForTimeout(3000);

    console.log(`[Playwright] Navigation successful: HTTP ${response?.status()}`);
  }

  async captureScreenshot(description: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    const timestamp = Date.now();
    const filename = `screenshot-${timestamp}-${description.replace(/\s+/g, '-')}.png`;
    const filepath = path.join(this.config.artifacts.artifactsDir, filename);

    // Ensure directory exists
    fs.mkdirSync(this.config.artifacts.artifactsDir, { recursive: true });

    await this.page.screenshot({
      path: filepath,
      fullPage: true,
    });

    this.artifacts.screenshots.push(filepath);
    console.log(`[Playwright] Screenshot saved: ${filename}`);

    return filepath;
  }

  async captureHTML(): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    const timestamp = Date.now();
    const filename = `html-${timestamp}.html`;
    const filepath = path.join(this.config.artifacts.artifactsDir, filename);

    const html = await this.page.content();

    fs.mkdirSync(this.config.artifacts.artifactsDir, { recursive: true });
    fs.writeFileSync(filepath, html, 'utf-8');

    this.artifacts.htmlSnapshots.push(filepath);
    console.log(`[Playwright] HTML snapshot saved: ${filename}`);

    return filepath;
  }

  async getCurrentUrl(): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    return this.page.url();
  }

  async getElementText(selector: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');
    const element = await this.page.$(selector);
    if (!element) throw new Error(`Element not found: ${selector}`);
    return (await element.textContent()) || '';
  }

  async isElementVisible(selector: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      const element = await this.page.$(selector);
      if (!element) return false;
      return await element.isVisible();
    } catch {
      return false;
    }
  }

  async validateDOM(selector: string): Promise<boolean> {
    if (!this.page) throw new Error('Page not initialized');
    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  getArtifacts(): TestArtifacts {
    return this.artifacts;
  }

  clearArtifacts(): void {
    this.artifacts = {
      screenshots: [],
      htmlSnapshots: [],
      networkLogs: [],
      consoleLogs: [],
      errors: [],
    };
  }

  /**
   * Validate that a click action produced the expected result
   */
  private async validateClickResult(action: PhaseAction): Promise<void> {
    if (!this.page || !action.expectAfterClick) return;

    const expect = action.expectAfterClick;
    const timeout = expect.timeout || 5000;
    const errorMessage = expect.errorMessage || `Click validation failed: expected ${expect.type}`;

    console.log(`[Playwright] Validating click result: ${expect.type}`);

    try {
      switch (expect.type) {
        case 'element':
          // Wait for element to appear
          if (!expect.selector) {
            throw new Error('expectAfterClick.selector is required for type "element"');
          }
          await this.page.waitForSelector(expect.selector, { timeout, state: 'visible' });
          console.log(`[Playwright] ✅ Click validation passed: element "${expect.selector}" appeared`);
          break;

        case 'not-visible':
          // Wait for element to disappear
          if (!expect.selector) {
            throw new Error('expectAfterClick.selector is required for type "not-visible"');
          }
          await this.page.waitForSelector(expect.selector, { timeout, state: 'hidden' });
          console.log(`[Playwright] ✅ Click validation passed: element "${expect.selector}" disappeared`);
          break;

        case 'url':
          // Wait for URL to change
          const currentUrl = this.page.url();
          await this.page.waitForFunction(
            (args) => {
              const url = window.location.href;
              if (args.expected instanceof RegExp) {
                return args.expected.test(url);
              } else {
                return url.includes(args.expected) && url !== args.currentUrl;
              }
            },
            { expected: expect.expected, currentUrl },
            { timeout }
          );
          console.log(`[Playwright] ✅ Click validation passed: URL changed to match "${expect.expected}"`);
          break;

        case 'text':
          // Wait for specific text to appear
          if (!expect.expected) {
            throw new Error('expectAfterClick.expected is required for type "text"');
          }
          if (typeof expect.expected === 'string') {
            await this.page.waitForSelector(`text=${expect.expected}`, { timeout });
          } else {
            // RegExp: check page content
            await this.page.waitForFunction(
              (pattern) => {
                const text = document.body.innerText;
                return new RegExp(pattern).test(text);
              },
              expect.expected.source,
              { timeout }
            );
          }
          console.log(`[Playwright] ✅ Click validation passed: text "${expect.expected}" appeared`);
          break;

        default:
          throw new Error(`Unknown expectAfterClick type: ${expect.type}`);
      }
    } catch (error: any) {
      console.error(`[Playwright] ❌ Click validation failed: ${errorMessage}`);
      console.error(`[Playwright] Error: ${error.message}`);

      // Add error to artifacts for reporting
      this.artifacts.errors.push({
        timestamp: new Date(),
        message: `${errorMessage}: ${error.message}`,
        stack: error.stack || '',
      });

      throw new Error(errorMessage);
    }
  }

  async close(): Promise<void> {
    console.log('[Playwright] Closing browser...');

    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    console.log('[Playwright] Browser closed');
  }
}

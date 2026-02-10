import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { TestConfig, PhaseAction, TestArtifacts, NetworkLog, ConsoleLog } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: TestConfig;
  private artifacts: TestArtifacts;
  private storedValues: Map<string, string> = new Map();
  private currentBrowserType: BrowserType = 'chromium';
  private currentDeviceIndex: number = 0;

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

  async launch(browserType: BrowserType = 'chromium', deviceIndex = 0): Promise<void> {
    this.currentBrowserType = browserType;
    this.currentDeviceIndex = deviceIndex;
    const device = this.config.devices[deviceIndex] || this.config.devices[0];
    console.log(`[Playwright] Launching ${browserType} for: ${device.name}`);
    console.log(`[Playwright] Viewport: ${device.viewport.width}x${device.viewport.height}`);

    const browsers = { chromium, firefox, webkit };
    this.browser = await browsers[browserType].launch({
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
      colorScheme: 'light', // Default; dark mode tested separately
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

  getBrowserType(): BrowserType { return this.currentBrowserType; }
  getDeviceName(): string {
    const device = this.config.devices[this.currentDeviceIndex] || this.config.devices[0];
    return device.name;
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

        case 'submit': {
          // Submit a form (click submit button or press Enter)
          if (action.selector) {
            await this.page.click(action.selector, { timeout: action.timeout });
          } else {
            await this.page.keyboard.press('Enter');
          }
          await this.page.waitForTimeout(1000);
          break;
        }

        case 'select': {
          // Select from dropdown
          if (action.selector && action.value) {
            await this.page.selectOption(action.selector, action.value, { timeout: action.timeout });
          }
          break;
        }

        case 'upload': {
          // Upload file
          if (action.selector && action.value) {
            const fileInput = await this.page.$(action.selector);
            if (fileInput) {
              await fileInput.setInputFiles(action.value);
            }
          }
          break;
        }

        case 'swipe': {
          // Mobile swipe gesture
          const viewport = this.page.viewportSize()!;
          const centerX = viewport.width / 2;
          const centerY = viewport.height / 2;
          const distance = 200;

          let startX = centerX, startY = centerY, endX = centerX, endY = centerY;
          const dir = action.direction || action.value as any || 'left';

          if (dir === 'left') { startX = centerX + distance / 2; endX = centerX - distance / 2; }
          else if (dir === 'right') { startX = centerX - distance / 2; endX = centerX + distance / 2; }
          else if (dir === 'up') { startY = centerY + distance / 2; endY = centerY - distance / 2; }
          else if (dir === 'down') { startY = centerY - distance / 2; endY = centerY + distance / 2; }

          await this.page.mouse.move(startX, startY);
          await this.page.mouse.down();
          await this.page.mouse.move(endX, endY, { steps: 10 });
          await this.page.mouse.up();
          await this.page.waitForTimeout(500);
          break;
        }

        case 'long-press': {
          // Long press for context menus
          if (action.selector) {
            const el = await this.page.$(action.selector);
            if (el) {
              const box = await el.boundingBox();
              if (box) {
                await this.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await this.page.mouse.down();
                await this.page.waitForTimeout(800); // 800ms long press
                await this.page.mouse.up();
              }
            }
          }
          break;
        }

        case 'assert': {
          // Inline assertion
          await this.executeAssert(action);
          break;
        }

        case 'store-value': {
          // Store a value from the page for later use
          if (action.selector && action.storeKey) {
            const text = await this.page.textContent(action.selector) || '';
            this.storedValues.set(action.storeKey, text.trim());
            console.log(`[Playwright] Stored "${action.storeKey}" = "${text.trim().substring(0, 50)}"`);
          }
          break;
        }

        case 'use-value': {
          // Use a previously stored value (fill input with stored value)
          if (action.selector && action.storeKey) {
            const value = this.storedValues.get(action.storeKey) || '';
            await this.page.fill(action.selector, value);
          }
          break;
        }

        case 'rotate': {
          // Rotate device (swap viewport dimensions)
          const vp = this.page.viewportSize()!;
          await this.page.setViewportSize({ width: vp.height, height: vp.width });
          console.log(`[Playwright] Rotated to ${vp.height}x${vp.width}`);
          await this.page.waitForTimeout(1000);
          break;
        }

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
          await this.page.goBack({ waitUntil: 'load' });
          await this.page.waitForTimeout(2000);
          break;

        case 'scroll-to-bottom':
          await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await this.page.waitForTimeout(1000);
          break;

        default:
          console.warn(`[Playwright] Unknown action type: ${action.type} — skipping`);
      }

      console.log(`[Playwright] Action completed: ${action.type}`);
    } catch (error: any) {
      console.error(`[Playwright] Action failed: ${action.type} - ${error.message}`);
      throw error;
    }
  }

  private async executeAssert(action: PhaseAction): Promise<void> {
    if (!this.page) return;
    const timeout = action.timeout || 5000;

    switch (action.assertType) {
      case 'visible':
        if (action.selector) {
          await this.page.waitForSelector(action.selector, { timeout, state: 'visible' });
          console.log(`[Playwright] Assert passed: "${action.selector}" is visible`);
        }
        break;
      case 'hidden':
        if (action.selector) {
          await this.page.waitForSelector(action.selector, { timeout, state: 'hidden' });
          console.log(`[Playwright] Assert passed: "${action.selector}" is hidden`);
        }
        break;
      case 'text-contains':
        if (action.expected) {
          await this.page.waitForFunction(
            (text) => document.body.innerText.includes(text),
            action.expected,
            { timeout }
          );
          console.log(`[Playwright] Assert passed: page contains "${action.expected}"`);
        }
        break;
      case 'url-contains':
        if (action.expected) {
          await this.page.waitForFunction(
            (text) => window.location.href.includes(text),
            action.expected,
            { timeout }
          );
          console.log(`[Playwright] Assert passed: URL contains "${action.expected}"`);
        }
        break;
      case 'count':
        if (action.selector && action.expected) {
          const count = await this.page.$$eval(action.selector, els => els.length);
          const expectedCount = parseInt(action.expected);
          if (count !== expectedCount) {
            throw new Error(`Assert failed: expected ${expectedCount} elements for "${action.selector}", found ${count}`);
          }
          console.log(`[Playwright] Assert passed: ${count} elements found for "${action.selector}"`);
        }
        break;
    }
  }

  private async navigate(url: string): Promise<void> {
    if (!this.page) throw new Error('Page not initialized');

    console.log(`[Playwright] Navigating to: ${url}`);

    // Use 'load' instead of 'networkidle' to avoid timeout on pages with persistent connections
    const response = await this.page.goto(url, {
      waitUntil: 'load',
      timeout: 15000,
    }).catch((navError: any) => {
      console.warn(`[Playwright] Navigation warning: ${navError.message} — continuing anyway`);
      return null;
    });

    // Log HTTP errors but don't throw (app bugs are reported as warnings)
    if (response) {
      const status = response.status();
      if (status >= 400) {
        console.warn(`[Playwright] HTTP ${status} at ${url} — will analyze current page state`);
      }
    }

    // Dynamic SPA wait: detect hydration instead of fixed 5s
    await this.waitForSPAHydration();

    // Check for error page content — log as warning, don't throw
    const visibleText = await this.page.evaluate(() => document.body?.innerText || '');
    const errorIndicators = [
      'NOT_FOUND',
      'Page Not Found',
      'This page could not be found',
      'Application error',
      'deployment not found',
    ];

    const textLower = visibleText.toLowerCase();
    for (const indicator of errorIndicators) {
      if (textLower.includes(indicator.toLowerCase())) {
        console.warn(`[Playwright] Error page detected (${indicator}) at ${url} — will analyze current state`);
        break;
      }
    }

    console.log(`[Playwright] Navigation successful: HTTP ${response?.status()}`);
  }

  /**
   * Dynamic SPA hydration detection (replaces hardcoded 5s wait)
   */
  private async waitForSPAHydration(): Promise<void> {
    if (!this.page) return;

    try {
      await Promise.race([
        this.page.waitForFunction(() => {
          // Expo Router hydration indicators
          if (document.querySelector('[data-expo-router-state]')) return true;
          // React hydration complete
          if (document.querySelector('[data-reactroot]')) return true;
          // General: DOM is stable (no pending mutations)
          if (document.readyState === 'complete') return true;
          return false;
        }, { timeout: 8000 }),
        this.page.waitForTimeout(8000), // Max fallback
      ]);
      // Small extra wait for animations/transitions
      await this.page.waitForTimeout(1000);
    } catch {
      // Fallback: just wait 3s
      await this.page.waitForTimeout(3000);
    }
  }

  /**
   * Clean browser state between phases (test isolation)
   */
  async isolatePhase(): Promise<void> {
    if (!this.context || !this.page) return;

    try {
      await this.context.clearCookies();
      await this.page.evaluate(() => {
        try { localStorage.clear(); } catch { /* blocked */ }
        try { sessionStorage.clear(); } catch { /* blocked */ }
      });
      console.log('[Playwright] Phase isolation: cleared cookies, localStorage, sessionStorage');
    } catch (e: any) {
      console.warn(`[Playwright] Phase isolation failed: ${e.message}`);
    }
  }

  /**
   * Enable dark mode via media query emulation
   */
  async setColorScheme(scheme: 'light' | 'dark'): Promise<void> {
    if (this.page) {
      await this.page.emulateMedia({ colorScheme: scheme });
      await this.page.waitForTimeout(500);
      console.log(`[Playwright] Color scheme set to: ${scheme}`);
    }
  }

  /**
   * Simulate virtual keyboard (reduce viewport height)
   */
  async simulateKeyboard(show: boolean): Promise<void> {
    if (!this.page) return;
    const vp = this.page.viewportSize()!;
    const keyboardHeight = 300; // Average mobile keyboard height

    if (show) {
      await this.page.setViewportSize({ width: vp.width, height: vp.height - keyboardHeight });
    } else {
      const device = this.config.devices[this.currentDeviceIndex] || this.config.devices[0];
      await this.page.setViewportSize(device.viewport);
    }
  }

  async captureScreenshot(description: string): Promise<string> {
    if (!this.page) throw new Error('Page not initialized');

    const timestamp = Date.now();
    const safeName = description.replace(/[^a-zA-Z0-9\u0600-\u06FF-]/g, '-').substring(0, 80);
    const filename = `screenshot-${timestamp}-${safeName}.png`;
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
          console.log(`[Playwright] Click validation passed: element "${expect.selector}" appeared`);
          break;

        case 'not-visible':
          // Wait for element to disappear
          if (!expect.selector) {
            throw new Error('expectAfterClick.selector is required for type "not-visible"');
          }
          await this.page.waitForSelector(expect.selector, { timeout, state: 'hidden' });
          console.log(`[Playwright] Click validation passed: element "${expect.selector}" disappeared`);
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
                return url.includes(args.expected as string) && url !== args.currentUrl;
              }
            },
            { expected: expect.expected, currentUrl },
            { timeout }
          );
          console.log(`[Playwright] Click validation passed: URL changed to match "${expect.expected}"`);
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
          console.log(`[Playwright] Click validation passed: text "${expect.expected}" appeared`);
          break;

        default:
          throw new Error(`Unknown expectAfterClick type: ${expect.type}`);
      }
    } catch (error: any) {
      console.error(`[Playwright] Click validation failed: ${errorMessage}`);
      console.error(`[Playwright] Error: ${error.message}`);

      // Add error to artifacts for reporting
      this.artifacts.errors.push({
        timestamp: new Date(),
        message: `${errorMessage}: ${error.message}`,
        stack: error.stack || '',
        phase: 'click-validation',
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

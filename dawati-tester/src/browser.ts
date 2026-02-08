import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from './config';
import { createChildLogger } from './logger';
import { DeviceConfig } from './types';
import { createDeviceContext, DeviceContext } from './device-manager';

const log = createChildLogger('browser');

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;
let deviceContexts: DeviceContext[] = [];

export async function initBrowser(): Promise<Page> {
  log.info('Launching browser...');

  browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
  });

  context = await browser.newContext({
    viewport: {
      width: config.viewportWidth,
      height: config.viewportHeight,
    },
    locale: 'ar-SA',
    timezoneId: 'Asia/Riyadh',
  });

  page = await context.newPage();

  // Set default timeout
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);

  log.info('Browser launched successfully');
  return page;
}

export async function launchBrowser(): Promise<Browser> {
  if (browser) {
    return browser;
  }

  log.info('Launching browser...');

  browser = await chromium.launch({
    headless: config.headless,
    slowMo: config.slowMo,
  });

  log.info('Browser launched successfully');
  return browser;
}

export function getBrowser(): Browser | null {
  return browser;
}

export async function createDeviceContexts(
  devices: DeviceConfig[],
  options: { locale?: string; timezoneId?: string } = {}
): Promise<DeviceContext[]> {
  const browserInstance = await launchBrowser();
  deviceContexts = [];

  for (const deviceConfig of devices) {
    const deviceContext = await createDeviceContext(browserInstance, deviceConfig, options);
    deviceContexts.push(deviceContext);
  }

  log.info({ deviceCount: deviceContexts.length }, 'Device contexts created');
  return deviceContexts;
}

export function getDeviceContexts(): DeviceContext[] {
  return deviceContexts;
}

export async function closeAllDeviceContexts(): Promise<void> {
  for (const deviceContext of deviceContexts) {
    try {
      await deviceContext.page.close();
      await deviceContext.context.close();
    } catch (error) {
      log.warn({ device: deviceContext.name, error }, 'Error closing device context');
    }
  }
  deviceContexts = [];
  log.info('All device contexts closed');
}

export async function getPage(): Promise<Page> {
  if (!page) {
    return initBrowser();
  }
  return page;
}

export async function closeBrowser(): Promise<void> {
  log.info('Closing browser...');

  // Close device contexts first
  await closeAllDeviceContexts();

  if (page) {
    await page.close();
    page = null;
  }

  if (context) {
    await context.close();
    context = null;
  }

  if (browser) {
    await browser.close();
    browser = null;
  }

  log.info('Browser closed');
}

export async function navigateTo(url: string): Promise<void> {
  const currentPage = await getPage();
  log.info({ url }, 'Navigating to URL');
  await currentPage.goto(url, { waitUntil: 'networkidle' });
}

export async function waitForSelector(selector: string, timeout = 10000): Promise<void> {
  const currentPage = await getPage();
  await currentPage.waitForSelector(selector, { timeout });
}

export async function click(selector: string): Promise<void> {
  const currentPage = await getPage();
  log.debug({ selector }, 'Clicking element');
  await currentPage.click(selector);
}

export async function fill(selector: string, value: string): Promise<void> {
  const currentPage = await getPage();
  log.debug({ selector }, 'Filling input');
  await currentPage.fill(selector, value);
}

export async function scrollDown(pixels: number = 500): Promise<void> {
  const currentPage = await getPage();
  await currentPage.evaluate((px) => window.scrollBy(0, px), pixels);
  await currentPage.waitForTimeout(500); // Wait for scroll animation
}

export async function scrollToBottom(): Promise<void> {
  const currentPage = await getPage();
  await currentPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await currentPage.waitForTimeout(500);
}

export async function scrollToTop(): Promise<void> {
  const currentPage = await getPage();
  await currentPage.evaluate(() => window.scrollTo(0, 0));
  await currentPage.waitForTimeout(500);
}

export async function getScrollPosition(): Promise<number> {
  const currentPage = await getPage();
  return currentPage.evaluate(() => window.scrollY);
}

export async function getCurrentUrl(): Promise<string> {
  const currentPage = await getPage();
  return currentPage.url();
}

export async function goBack(): Promise<void> {
  const currentPage = await getPage();
  await currentPage.goBack({ waitUntil: 'networkidle' });
}

export async function waitForNavigation(): Promise<void> {
  const currentPage = await getPage();
  await currentPage.waitForLoadState('networkidle');
}

export async function getPageContent(): Promise<string> {
  const currentPage = await getPage();
  return currentPage.content();
}

export async function getAllLinks(): Promise<string[]> {
  const currentPage = await getPage();
  return currentPage.evaluate(() => {
    const links = document.querySelectorAll('a[href]');
    return Array.from(links).map((a) => (a as HTMLAnchorElement).href);
  });
}

export async function getAllButtons(): Promise<string[]> {
  const currentPage = await getPage();
  return currentPage.evaluate(() => {
    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]');
    return Array.from(buttons).map((b) => b.textContent?.trim() || '');
  });
}

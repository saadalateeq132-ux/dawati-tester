import fs from 'fs';
import path from 'path';
import { Page } from 'playwright';
import { format } from 'date-fns';
import { config } from './config';
import { createChildLogger } from './logger';
import { getCurrentDevice, sanitizeDeviceName } from './device-manager';
import { compareWithBaseline, initVisualRegression } from './visual-regression';
import { VisualDiff } from './types';

const log = createChildLogger('screenshots');

export interface Screenshot {
  filename: string;
  filepath: string;
  timestamp: Date;
  description: string;
  action: string;
  url: string;
  device: string;
  visualDiff?: VisualDiff;
}

let screenshotCounter = 0;
let currentRunDir: string = '';
let screenshots: Screenshot[] = [];
let currentPage: Page | null = null;
let visualRegressionEnabled = false;

export function initScreenshotSession(options?: {
  visualRegression?: { enabled: boolean; baselinesDir: string; diffThreshold: number };
}): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  currentRunDir = path.join(config.testResultsDir, timestamp);

  // Create directories
  fs.mkdirSync(path.join(currentRunDir, 'screenshots'), { recursive: true });

  // Create/update latest symlink
  const latestLink = path.join(config.testResultsDir, 'latest');
  if (fs.existsSync(latestLink)) {
    fs.rmSync(latestLink, { recursive: true });
  }

  try {
    fs.symlinkSync(currentRunDir, latestLink, 'junction');
  } catch {
    fs.writeFileSync(latestLink + '.txt', currentRunDir);
  }

  // Initialize visual regression if enabled
  if (options?.visualRegression?.enabled) {
    visualRegressionEnabled = true;
    initVisualRegression(
      options.visualRegression.baselinesDir,
      options.visualRegression.diffThreshold
    );
  }

  screenshotCounter = 0;
  screenshots = [];

  log.info({ dir: currentRunDir }, 'Screenshot session initialized');
  return currentRunDir;
}

export function setCurrentPage(page: Page): void {
  currentPage = page;
}

export function getCurrentPage(): Page | null {
  return currentPage;
}

export async function takeScreenshot(
  action: string,
  description: string,
  page?: Page
): Promise<Screenshot> {
  const targetPage = page || currentPage;
  if (!targetPage) {
    throw new Error('No page available for screenshot');
  }

  screenshotCounter++;
  const device = getCurrentDevice();
  const sanitizedDevice = sanitizeDeviceName(device);

  const paddedCounter = String(screenshotCounter).padStart(3, '0');
  const sanitizedAction = action.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `${paddedCounter}_${sanitizedAction}_${sanitizedDevice}.png`;
  const filepath = path.join(currentRunDir, 'screenshots', filename);

  await targetPage.screenshot({
    path: filepath,
    fullPage: config.fullPageScreenshots,
  });

  const screenshot: Screenshot = {
    filename,
    filepath,
    timestamp: new Date(),
    description,
    action,
    url: targetPage.url(),
    device,
  };

  // Visual regression comparison
  if (visualRegressionEnabled) {
    try {
      screenshot.visualDiff = await compareWithBaseline(filepath, currentRunDir);
    } catch (error) {
      log.warn({ filename, error }, 'Visual regression comparison failed');
    }
  }

  screenshots.push(screenshot);
  log.info({ filename, action, device }, 'Screenshot captured');

  return screenshot;
}

export async function takeFullPageScreenshot(
  action: string,
  description: string,
  page?: Page
): Promise<Screenshot> {
  const targetPage = page || currentPage;
  if (!targetPage) {
    throw new Error('No page available for screenshot');
  }

  screenshotCounter++;
  const device = getCurrentDevice();
  const sanitizedDevice = sanitizeDeviceName(device);

  const paddedCounter = String(screenshotCounter).padStart(3, '0');
  const sanitizedAction = action.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `${paddedCounter}_${sanitizedAction}_full_${sanitizedDevice}.png`;
  const filepath = path.join(currentRunDir, 'screenshots', filename);

  await targetPage.screenshot({
    path: filepath,
    fullPage: true,
  });

  const screenshot: Screenshot = {
    filename,
    filepath,
    timestamp: new Date(),
    description,
    action,
    url: targetPage.url(),
    device,
  };

  // Visual regression comparison
  if (visualRegressionEnabled) {
    try {
      screenshot.visualDiff = await compareWithBaseline(filepath, currentRunDir);
    } catch (error) {
      log.warn({ filename, error }, 'Visual regression comparison failed');
    }
  }

  screenshots.push(screenshot);
  log.info({ filename, action, device }, 'Full page screenshot captured');

  return screenshot;
}

export function getScreenshots(): Screenshot[] {
  return screenshots;
}

export function getCurrentRunDir(): string {
  return currentRunDir;
}

export function getScreenshotCount(): number {
  return screenshotCounter;
}

export function getScreenshotsWithVisualChanges(): Screenshot[] {
  return screenshots.filter((s) => s.visualDiff?.hasSignificantChange);
}

export async function captureScrollSequence(
  baseName: string,
  scrollIncrement: number = 500,
  page?: Page
): Promise<Screenshot[]> {
  const targetPage = page || currentPage;
  if (!targetPage) {
    throw new Error('No page available for screenshot');
  }

  const capturedScreenshots: Screenshot[] = [];

  await targetPage.evaluate(() => window.scrollTo(0, 0));
  await targetPage.waitForTimeout(500);

  let position = 0;
  let scrollIndex = 0;

  while (true) {
    scrollIndex++;
    const screenshot = await takeScreenshot(
      `${baseName}_scroll_${scrollIndex}`,
      `Scroll position ${position}px`,
      targetPage
    );
    capturedScreenshots.push(screenshot);

    await targetPage.evaluate((px) => window.scrollBy(0, px), scrollIncrement);
    await targetPage.waitForTimeout(500);

    const newPosition = await targetPage.evaluate(() => window.scrollY);
    const pageHeight = await targetPage.evaluate(() => document.body.scrollHeight);

    if (newPosition === position || newPosition + config.viewportHeight >= pageHeight) {
      break;
    }

    position = newPosition;

    if (scrollIndex > 20) {
      log.warn('Scroll limit reached (20 screenshots)');
      break;
    }
  }

  return capturedScreenshots;
}

export function saveScreenshotIndex(): void {
  const indexPath = path.join(currentRunDir, 'screenshots', 'index.json');
  fs.writeFileSync(indexPath, JSON.stringify(screenshots, null, 2));
  log.info({ count: screenshots.length }, 'Screenshot index saved');
}

export function resetScreenshotCounter(): void {
  screenshotCounter = 0;
}

export function clearScreenshots(): void {
  screenshots = [];
  screenshotCounter = 0;
}

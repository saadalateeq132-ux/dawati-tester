import fs from 'fs';
import path from 'path';
import { format } from 'date-fns';
import { getPage } from './browser';
import { config } from './config';
import { createChildLogger } from './logger';

const log = createChildLogger('screenshots');

export interface Screenshot {
  filename: string;
  filepath: string;
  timestamp: Date;
  description: string;
  action: string;
  url: string;
}

let screenshotCounter = 0;
let currentRunDir: string = '';
let screenshots: Screenshot[] = [];

export function initScreenshotSession(): string {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  currentRunDir = path.join(config.testResultsDir, timestamp);

  // Create directories
  fs.mkdirSync(path.join(currentRunDir, 'screenshots'), { recursive: true });

  // Create/update latest symlink
  const latestLink = path.join(config.testResultsDir, 'latest');
  if (fs.existsSync(latestLink)) {
    fs.rmSync(latestLink, { recursive: true });
  }

  // On Windows, copy instead of symlink
  try {
    fs.symlinkSync(currentRunDir, latestLink, 'junction');
  } catch {
    // Fallback: just store the path
    fs.writeFileSync(latestLink + '.txt', currentRunDir);
  }

  screenshotCounter = 0;
  screenshots = [];

  log.info({ dir: currentRunDir }, 'Screenshot session initialized');
  return currentRunDir;
}

export async function takeScreenshot(
  action: string,
  description: string
): Promise<Screenshot> {
  const page = await getPage();
  screenshotCounter++;

  const paddedCounter = String(screenshotCounter).padStart(3, '0');
  const sanitizedAction = action.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `${paddedCounter}_${sanitizedAction}.png`;
  const filepath = path.join(currentRunDir, 'screenshots', filename);

  await page.screenshot({
    path: filepath,
    fullPage: config.fullPageScreenshots,
  });

  const screenshot: Screenshot = {
    filename,
    filepath,
    timestamp: new Date(),
    description,
    action,
    url: page.url(),
  };

  screenshots.push(screenshot);
  log.info({ filename, action }, 'Screenshot captured');

  return screenshot;
}

export async function takeFullPageScreenshot(
  action: string,
  description: string
): Promise<Screenshot> {
  const page = await getPage();
  screenshotCounter++;

  const paddedCounter = String(screenshotCounter).padStart(3, '0');
  const sanitizedAction = action.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const filename = `${paddedCounter}_${sanitizedAction}_full.png`;
  const filepath = path.join(currentRunDir, 'screenshots', filename);

  await page.screenshot({
    path: filepath,
    fullPage: true,
  });

  const screenshot: Screenshot = {
    filename,
    filepath,
    timestamp: new Date(),
    description,
    action,
    url: page.url(),
  };

  screenshots.push(screenshot);
  log.info({ filename, action }, 'Full page screenshot captured');

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

export async function captureScrollSequence(
  baseName: string,
  scrollIncrement: number = 500
): Promise<Screenshot[]> {
  const page = await getPage();
  const capturedScreenshots: Screenshot[] = [];

  // Scroll to top first
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);

  let position = 0;
  let lastHeight = 0;
  let scrollIndex = 0;

  while (true) {
    scrollIndex++;
    const screenshot = await takeScreenshot(
      `${baseName}_scroll_${scrollIndex}`,
      `Scroll position ${position}px`
    );
    capturedScreenshots.push(screenshot);

    // Scroll down
    await page.evaluate((px) => window.scrollBy(0, px), scrollIncrement);
    await page.waitForTimeout(500);

    const newPosition = await page.evaluate(() => window.scrollY);
    const pageHeight = await page.evaluate(() => document.body.scrollHeight);

    if (newPosition === position || newPosition + config.viewportHeight >= pageHeight) {
      // Reached bottom or can't scroll anymore
      break;
    }

    position = newPosition;
    lastHeight = pageHeight;

    // Safety limit
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

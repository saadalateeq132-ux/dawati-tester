import fs from 'fs';
import path from 'path';
import { Worker } from 'worker_threads';
import { VisualDiff } from './types';
import { createChildLogger } from './logger';

const log = createChildLogger('visual-regression');

let baselinesDir: string = 'baselines';
let diffThreshold: number = 5;
let visualDiffs: VisualDiff[] = [];

export function initVisualRegression(baselines: string, threshold: number): void {
  baselinesDir = path.resolve(process.cwd(), baselines);
  diffThreshold = threshold;
  visualDiffs = [];

  // Ensure baselines directory exists
  if (!fs.existsSync(baselinesDir)) {
    fs.mkdirSync(baselinesDir, { recursive: true });
    log.info({ dir: baselinesDir }, 'Created baselines directory');
  }
}

export function getBaselinePath(screenshotFilename: string): string {
  return path.join(baselinesDir, screenshotFilename);
}

export function compareWithBaseline(
  screenshotPath: string,
  outputDir: string
): Promise<VisualDiff> {
  return new Promise((resolve, reject) => {
    const filename = path.basename(screenshotPath);
    const baselinePath = getBaselinePath(filename);

    const workerFilename = 'visual-regression-worker.js';
    let workerPath = path.resolve(__dirname, workerFilename);

    // Fallback for when running from src (e.g., tests)
    if (!fs.existsSync(workerPath) && __dirname.endsWith('src')) {
      workerPath = path.resolve(__dirname, '../dist', workerFilename);
    }

    if (!fs.existsSync(workerPath)) {
      throw new Error(`Worker file not found at ${workerPath}. Please run 'npm run build' to generate it.`);
    }

    const worker = new Worker(workerPath);

    worker.on('message', (diff: VisualDiff) => {
      visualDiffs.push(diff);
      resolve(diff);
      worker.terminate();
    });

    worker.on('error', (err) => {
      log.error({ filename, error: err }, 'Worker error');
      const errorDiff: VisualDiff = {
        filename,
        baselineExists: true, // Optimistic assumption or irrelevant
        diffPercentage: -1,
        hasSignificantChange: false
      };
      visualDiffs.push(errorDiff);
      resolve(errorDiff);
      worker.terminate();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        log.error({ filename, code }, 'Worker exited with non-zero code');
        // Resolve with error state if not already resolved
        const errorDiff: VisualDiff = {
          filename,
          baselineExists: true,
          diffPercentage: -1,
          hasSignificantChange: false
        };
        visualDiffs.push(errorDiff);
        resolve(errorDiff);
      }
    });

    worker.postMessage({
      baselinePath,
      screenshotPath,
      outputDir,
      threshold: diffThreshold
    });
  });
}

export function saveAsBaseline(screenshotPath: string): void {
  const filename = path.basename(screenshotPath);
  const baselinePath = getBaselinePath(filename);

  fs.copyFileSync(screenshotPath, baselinePath);
  log.info({ filename }, 'Saved as baseline');
}

export function saveAllAsBaselines(screenshotPaths: string[]): void {
  for (const screenshotPath of screenshotPaths) {
    saveAsBaseline(screenshotPath);
  }
  log.info({ count: screenshotPaths.length }, 'Saved all screenshots as baselines');
}

export function getVisualDiffs(): VisualDiff[] {
  return visualDiffs;
}

export function getSignificantChanges(): VisualDiff[] {
  return visualDiffs.filter((d) => d.hasSignificantChange);
}

export function clearVisualDiffs(): void {
  visualDiffs = [];
}

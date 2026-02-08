import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
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

export async function compareWithBaseline(
  screenshotPath: string,
  outputDir: string
): Promise<VisualDiff> {
  const filename = path.basename(screenshotPath);
  const baselinePath = getBaselinePath(filename);

  const diff: VisualDiff = {
    filename,
    baselineExists: false,
    diffPercentage: 0,
    hasSignificantChange: false,
  };

  // Check if baseline exists
  if (!fs.existsSync(baselinePath)) {
    log.debug({ filename }, 'No baseline found for comparison');
    diff.baselineExists = false;
    visualDiffs.push(diff);
    return diff;
  }

  diff.baselineExists = true;

  try {
    // Read images
    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(screenshotPath));

    // Check dimensions match
    if (img1.width !== img2.width || img1.height !== img2.height) {
      log.warn(
        { filename, baseline: `${img1.width}x${img1.height}`, current: `${img2.width}x${img2.height}` },
        'Image dimensions differ'
      );
      diff.diffPercentage = 100;
      diff.hasSignificantChange = true;
      visualDiffs.push(diff);
      return diff;
    }

    // Create diff image
    const { width, height } = img1;
    const diffImage = new PNG({ width, height });

    const numDiffPixels = pixelmatch(
      img1.data,
      img2.data,
      diffImage.data,
      width,
      height,
      { threshold: 0.1 }
    );

    const totalPixels = width * height;
    diff.diffPercentage = (numDiffPixels / totalPixels) * 100;
    diff.hasSignificantChange = diff.diffPercentage > diffThreshold;

    // Save diff image if there are changes
    if (diff.hasSignificantChange) {
      const diffFilename = `diff_${filename}`;
      const diffPath = path.join(outputDir, 'diffs', diffFilename);

      // Ensure diffs directory exists
      const diffsDir = path.dirname(diffPath);
      if (!fs.existsSync(diffsDir)) {
        fs.mkdirSync(diffsDir, { recursive: true });
      }

      fs.writeFileSync(diffPath, PNG.sync.write(diffImage));
      diff.diffImagePath = diffPath;

      log.warn(
        { filename, diffPercentage: diff.diffPercentage.toFixed(2) },
        'Significant visual change detected'
      );
    } else {
      log.debug(
        { filename, diffPercentage: diff.diffPercentage.toFixed(2) },
        'Visual comparison passed'
      );
    }
  } catch (error) {
    log.error({ filename, error }, 'Error comparing images');
    diff.diffPercentage = -1; // Indicate error
  }

  visualDiffs.push(diff);
  return diff;
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

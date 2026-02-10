import { parentPort } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { VisualDiff } from './types';
import { createChildLogger } from './logger';

const log = createChildLogger('visual-regression-worker');

if (!parentPort) {
  throw new Error('Worker thread not initialized properly');
}

parentPort.on('message', (data: { baselinePath: string, screenshotPath: string, outputDir: string, threshold: number }) => {
  const { baselinePath, screenshotPath, outputDir, threshold } = data;
  const filename = path.basename(screenshotPath);

  const diff: VisualDiff = {
    filename,
    baselineExists: false,
    diffPercentage: 0,
    hasSignificantChange: false,
  };

  try {
    if (!fs.existsSync(baselinePath)) {
      log.debug({ filename }, 'No baseline found for comparison');
      diff.baselineExists = false;
      parentPort?.postMessage(diff);
      return;
    }

    diff.baselineExists = true;

    const img1 = PNG.sync.read(fs.readFileSync(baselinePath));
    const img2 = PNG.sync.read(fs.readFileSync(screenshotPath));

    if (img1.width !== img2.width || img1.height !== img2.height) {
      log.warn(
        { filename, baseline: `${img1.width}x${img1.height}`, current: `${img2.width}x${img2.height}` },
        'Image dimensions differ'
      );
      diff.diffPercentage = 100;
      diff.hasSignificantChange = true;
      parentPort?.postMessage(diff);
      return;
    }

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
    diff.hasSignificantChange = diff.diffPercentage > threshold;

    if (diff.hasSignificantChange) {
      const diffFilename = `diff_${filename}`;
      const diffPath = path.join(outputDir, 'diffs', diffFilename);
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

    parentPort?.postMessage(diff);

  } catch (error) {
    log.error({ filename, error }, 'Error comparing images');
    diff.diffPercentage = -1;
    parentPort?.postMessage(diff);
  }
});

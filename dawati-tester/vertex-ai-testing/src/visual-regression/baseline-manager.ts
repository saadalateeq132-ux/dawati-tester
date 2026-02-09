import * as fs from 'fs';
import * as path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { VisualRegressionResult, TestConfig } from '../types';

export class BaselineManager {
  private config: TestConfig;
  private baselinesDir: string;

  constructor(config: TestConfig) {
    this.config = config;
    this.baselinesDir = config.visualRegression.baselinesDir;

    // Ensure baselines directory exists
    fs.mkdirSync(this.baselinesDir, { recursive: true });
  }

  /**
   * Compare screenshot against baseline
   */
  async compareWithBaseline(
    screenshotPath: string,
    baselineName: string
  ): Promise<VisualRegressionResult> {
    console.log(`[Visual Regression] Comparing: ${baselineName}`);

    const baselinePath = path.join(this.baselinesDir, `${baselineName}.png`);

    // If baseline doesn't exist, create it
    if (!fs.existsSync(baselinePath)) {
      if (this.config.visualRegression.updateBaselines) {
        console.log(`[Visual Regression] Creating new baseline: ${baselineName}`);
        fs.copyFileSync(screenshotPath, baselinePath);

        return {
          passed: true,
          diffPercentage: 0,
          diffPixels: 0,
          totalPixels: 0,
          baselinePath,
          currentPath: screenshotPath,
        };
      } else {
        console.warn(`[Visual Regression] Baseline not found: ${baselineName}`);
        return {
          passed: false,
          diffPercentage: 100,
          diffPixels: 0,
          totalPixels: 0,
          baselinePath,
          currentPath: screenshotPath,
        };
      }
    }

    // Load images
    const baselineImage = PNG.sync.read(fs.readFileSync(baselinePath));
    const currentImage = PNG.sync.read(fs.readFileSync(screenshotPath));

    // Ensure same dimensions
    if (
      baselineImage.width !== currentImage.width ||
      baselineImage.height !== currentImage.height
    ) {
      console.error(
        `[Visual Regression] Image dimensions mismatch: baseline ${baselineImage.width}x${baselineImage.height} vs current ${currentImage.width}x${currentImage.height}`
      );

      return {
        passed: false,
        diffPercentage: 100,
        diffPixels: 0,
        totalPixels: baselineImage.width * baselineImage.height,
        baselinePath,
        currentPath: screenshotPath,
      };
    }

    // Create diff image
    const { width, height } = baselineImage;
    const diff = new PNG({ width, height });

    // Compare images
    const diffPixels = pixelmatch(
      baselineImage.data,
      currentImage.data,
      diff.data,
      width,
      height,
      {
        threshold: 0.1, // Sensitivity to color changes
        includeAA: false, // Ignore anti-aliasing
      }
    );

    const totalPixels = width * height;
    const diffPercentage = (diffPixels / totalPixels) * 100;

    // Save diff image if significant difference
    let diffImagePath: string | undefined;
    if (diffPercentage > this.config.visualRegression.threshold * 100) {
      diffImagePath = path.join(
        this.config.artifacts.artifactsDir,
        `diff-${baselineName}-${Date.now()}.png`
      );
      fs.writeFileSync(diffImagePath, PNG.sync.write(diff));
      console.log(`[Visual Regression] Diff image saved: ${diffImagePath}`);
    }

    // Update baseline if enabled
    if (
      this.config.visualRegression.updateBaselines &&
      diffPercentage > this.config.visualRegression.threshold * 100
    ) {
      console.log(`[Visual Regression] Updating baseline: ${baselineName}`);
      fs.copyFileSync(screenshotPath, baselinePath);
    }

    const passed = diffPercentage <= this.config.visualRegression.threshold * 100;

    console.log(
      `[Visual Regression] Result: ${passed ? 'PASS' : 'FAIL'} (${diffPercentage.toFixed(2)}% diff, threshold: ${this.config.visualRegression.threshold * 100}%)`
    );

    return {
      passed,
      diffPercentage,
      diffPixels,
      totalPixels,
      diffImagePath,
      baselinePath,
      currentPath: screenshotPath,
    };
  }

  /**
   * Get baseline path for a given name
   */
  getBaselinePath(name: string): string {
    return path.join(this.baselinesDir, `${name}.png`);
  }

  /**
   * Check if baseline exists
   */
  baselineExists(name: string): boolean {
    return fs.existsSync(this.getBaselinePath(name));
  }

  /**
   * Delete baseline
   */
  deleteBaseline(name: string): void {
    const baselinePath = this.getBaselinePath(name);
    if (fs.existsSync(baselinePath)) {
      fs.unlinkSync(baselinePath);
      console.log(`[Visual Regression] Deleted baseline: ${name}`);
    }
  }

  /**
   * List all baselines
   */
  listBaselines(): string[] {
    if (!fs.existsSync(this.baselinesDir)) {
      return [];
    }

    return fs
      .readdirSync(this.baselinesDir)
      .filter((file) => file.endsWith('.png'))
      .map((file) => file.replace('.png', ''));
  }

  /**
   * Create baseline from screenshot
   */
  createBaseline(screenshotPath: string, name: string): void {
    const baselinePath = this.getBaselinePath(name);
    fs.copyFileSync(screenshotPath, baselinePath);
    console.log(`[Visual Regression] Created baseline: ${name}`);
  }
}

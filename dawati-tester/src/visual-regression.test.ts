import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { initVisualRegression, compareWithBaseline } from './visual-regression';

// Mock logger
vi.mock('./logger', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

const TEST_BASELINES_DIR = path.join(__dirname, '__test_baselines__');
const TEST_OUTPUT_DIR = path.join(__dirname, '__test_output__');

function createTestImage(width: number, height: number, color: [number, number, number]): Buffer {
  const png = new PNG({ width, height });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = color[0];
      png.data[idx + 1] = color[1];
      png.data[idx + 2] = color[2];
      png.data[idx + 3] = 255; // Alpha
    }
  }
  return PNG.sync.write(png);
}

describe('Visual Regression', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_BASELINES_DIR)) fs.rmSync(TEST_BASELINES_DIR, { recursive: true, force: true });
    if (fs.existsSync(TEST_OUTPUT_DIR)) fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });

    fs.mkdirSync(TEST_BASELINES_DIR, { recursive: true });
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });

    initVisualRegression(TEST_BASELINES_DIR, 5); // 5% threshold
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(TEST_BASELINES_DIR)) fs.rmSync(TEST_BASELINES_DIR, { recursive: true, force: true });
    if (fs.existsSync(TEST_OUTPUT_DIR)) fs.rmSync(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  it('should report baseline missing if file does not exist', async () => {
    const screenshotPath = path.join(TEST_OUTPUT_DIR, 'missing.png');
    // Just create a dummy file so calling it "screenshotPath" makes sense,
    // even though compareWithBaseline primarily checks for baseline existence first.
    // However, the function signature takes screenshotPath.
    // Wait, compareWithBaseline(screenshotPath) -> infers baseline filename from screenshotPath basename.
    // It does not necessarily need the screenshot file to exist if baseline check fails early?
    // Let's check code:
    // const filename = path.basename(screenshotPath);
    // const baselinePath = getBaselinePath(filename);
    // if (!fs.existsSync(baselinePath)) ...
    // So yes, screenshot file doesn't need to exist for this specific test case, but good practice.
    fs.writeFileSync(screenshotPath, createTestImage(10, 10, [255, 0, 0]));

    const result = await compareWithBaseline(screenshotPath, TEST_OUTPUT_DIR);
    expect(result.baselineExists).toBe(false);
  });

  it('should report 0% diff for identical images', async () => {
    const filename = 'identical.png';
    const baselinePath = path.join(TEST_BASELINES_DIR, filename);
    const screenshotPath = path.join(TEST_OUTPUT_DIR, filename);

    const img = createTestImage(10, 10, [255, 0, 0]);
    fs.writeFileSync(baselinePath, img);
    fs.writeFileSync(screenshotPath, img);

    const result = await compareWithBaseline(screenshotPath, TEST_OUTPUT_DIR);
    expect(result.baselineExists).toBe(true);
    expect(result.diffPercentage).toBe(0);
    expect(result.hasSignificantChange).toBe(false);
  });

  it('should report diff for different images', async () => {
    const filename = 'different.png';
    const baselinePath = path.join(TEST_BASELINES_DIR, filename);
    const screenshotPath = path.join(TEST_OUTPUT_DIR, filename);

    // Red baseline
    fs.writeFileSync(baselinePath, createTestImage(10, 10, [255, 0, 0]));
    // Blue screenshot
    fs.writeFileSync(screenshotPath, createTestImage(10, 10, [0, 0, 255]));

    const result = await compareWithBaseline(screenshotPath, TEST_OUTPUT_DIR);
    expect(result.baselineExists).toBe(true);
    // 100% diff because all pixels are different (and diffImage generated)
    expect(result.diffPercentage).toBeGreaterThan(0);
    expect(result.hasSignificantChange).toBe(true);
  });

  it('should handle dimension mismatch', async () => {
    const filename = 'dimensions.png';
    const baselinePath = path.join(TEST_BASELINES_DIR, filename);
    const screenshotPath = path.join(TEST_OUTPUT_DIR, filename);

    fs.writeFileSync(baselinePath, createTestImage(10, 10, [255, 0, 0]));
    fs.writeFileSync(screenshotPath, createTestImage(20, 20, [255, 0, 0]));

    const result = await compareWithBaseline(screenshotPath, TEST_OUTPUT_DIR);
    expect(result.baselineExists).toBe(true);
    expect(result.diffPercentage).toBe(100);
    expect(result.hasSignificantChange).toBe(true);
  });
});

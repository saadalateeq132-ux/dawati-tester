import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import { performance } from 'perf_hooks';
import { initVisualRegression, compareWithBaseline } from './visual-regression';

// Setup directories
const BENCHMARK_DIR = path.resolve(process.cwd(), 'benchmark_data');
const BASELINES_DIR = path.join(BENCHMARK_DIR, 'baselines');
const OUTPUT_DIR = path.join(BENCHMARK_DIR, 'output');

// Cleanup function
function cleanup() {
  if (fs.existsSync(BENCHMARK_DIR)) {
    fs.rmSync(BENCHMARK_DIR, { recursive: true, force: true });
  }
}

// Generate random PNG
function generateRandomPNG(width: number, height: number, filepath: string) {
  const png = new PNG({ width, height });
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const idx = (png.width * y + x) << 2;
      png.data[idx] = Math.floor(Math.random() * 256);
      png.data[idx + 1] = Math.floor(Math.random() * 256);
      png.data[idx + 2] = Math.floor(Math.random() * 256);
      png.data[idx + 3] = 255;
    }
  }
  fs.writeFileSync(filepath, PNG.sync.write(png));
}

async function runBenchmark() {
  cleanup();
  fs.mkdirSync(BASELINES_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  initVisualRegression(BASELINES_DIR, 5);

  const filename = 'benchmark_image.png';
  const baselinePath = path.join(BASELINES_DIR, filename);
  const screenshotPath = path.join(OUTPUT_DIR, filename);

  // Generate 1024x1024 image
  console.log('Generating synthetic images (1024x1024)...');
  generateRandomPNG(1024, 1024, baselinePath);
  fs.copyFileSync(baselinePath, screenshotPath);

  const iterations = 5;
  console.log(`Running benchmark with ${iterations} iterations...`);

  let maxLag = 0;
  let totalLag = 0;
  let lastMonitorTime = performance.now();

  const monitorInterval = setInterval(() => {
    const now = performance.now();
    const expectedTime = lastMonitorTime + 10;
    const lag = now - expectedTime;

    if (lag > 0) {
      if (lag > maxLag) maxLag = lag;
      totalLag += lag;
    }
    lastMonitorTime = now;
  }, 10);

  let totalOpTime = 0;

  for (let i = 0; i < iterations; i++) {
    const opStart = performance.now();
    await compareWithBaseline(screenshotPath, OUTPUT_DIR);
    const opEnd = performance.now();
    totalOpTime += (opEnd - opStart);

    // Yield to event loop to allow interval to fire and measure lag
    await new Promise(resolve => setTimeout(resolve, 20));
  }

  clearInterval(monitorInterval);

  console.log(`Average Processing Time: ${(totalOpTime / iterations).toFixed(2)} ms`);
  console.log(`Max Event Loop Lag: ${maxLag.toFixed(2)} ms`);
  console.log(`Total Event Loop Lag: ${totalLag.toFixed(2)} ms`);

  cleanup();
}

runBenchmark().catch(console.error);

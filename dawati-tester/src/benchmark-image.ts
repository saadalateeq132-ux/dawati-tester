import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// --- Baseline (Current Implementation) ---
function imageToBase64Sync(filepath: string): string {
  const imageBuffer = fs.readFileSync(filepath);
  return imageBuffer.toString('base64');
}

// --- Optimization (Proposed Implementation) ---
async function imageToBase64Async(filepath: string): Promise<string> {
  const imageBuffer = await fs.promises.readFile(filepath);
  return imageBuffer.toString('base64');
}

// --- Setup ---
let testFile = 'test-results/2026-02-09_00-48-14/screenshots/001_phone_auth_01_home_Desktop_1280x720.png';
const iterations = 1000;
let createdDummy = false;

async function setupTestFile() {
  if (fs.existsSync(testFile)) {
    return testFile;
  }

  // Create a dummy file if original doesn't exist
  console.log('Original test file not found. Creating dummy file...');
  testFile = path.resolve('benchmark-test-image.png');
  const buffer = Buffer.alloc(1024 * 1024); // 1MB
  fs.writeFileSync(testFile, buffer);
  createdDummy = true;
  return testFile;
}

async function runBenchmark() {
  await setupTestFile();
  console.log(`Running benchmark on: ${testFile}`);
  console.log(`Iterations: ${iterations}`);

  if (!fs.existsSync(testFile)) {
    console.error(`Test file not found: ${path.resolve(testFile)}`);
    process.exit(1);
  }

  // --- Measure Sync ---
  console.log('\n--- Synchronous (fs.readFileSync) ---');
  const startSync = performance.now();
  let maxLagSync = 0;
  let totalLagSync = 0;
  let ticksSync = 0;

  let lastMonitorTimeSync = performance.now();

  const monitorIntervalSync = setInterval(() => {
      ticksSync++;
      const now = performance.now();
      const expectedTime = lastMonitorTimeSync + 10;
      const lag = now - expectedTime;

      if (lag > 0) {
          if (lag > maxLagSync) maxLagSync = lag;
          totalLagSync += lag;
      }
      lastMonitorTimeSync = now;
  }, 10);

  for (let i = 0; i < iterations; i++) {
    imageToBase64Sync(testFile);
  }

  clearInterval(monitorIntervalSync);
  const endSync = performance.now();
  const durationSync = endSync - startSync;

  console.log(`Total Time: ${durationSync.toFixed(2)} ms`);
  console.log(`Average Time per Op: ${(durationSync / iterations).toFixed(2)} ms`);
  console.log(`Max Event Loop Lag: ${maxLagSync.toFixed(2)} ms`);
  console.log(`Total Event Loop Lag: ${totalLagSync.toFixed(2)} ms`);
  console.log(`Interval Ticks: ${ticksSync}`);


  // --- Measure Async ---
  console.log('\n--- Asynchronous (fs.promises.readFile) ---');

  if (global.gc) {
      try { global.gc(); } catch (e) {}
  }

  const startAsync = performance.now();
  let maxLagAsync = 0;
  let totalLagAsync = 0;
  let ticksAsync = 0;
  let lastMonitorTimeAsync = performance.now();

  const monitorIntervalAsync = setInterval(() => {
      ticksAsync++;
      const now = performance.now();
      const expectedTime = lastMonitorTimeAsync + 10;
      const lag = now - expectedTime;

      if (lag > 0) {
          if (lag > maxLagAsync) maxLagAsync = lag;
          totalLagAsync += lag;
      }
      lastMonitorTimeAsync = now;
  }, 10);

  for (let i = 0; i < iterations; i++) {
    await imageToBase64Async(testFile);
  }

  clearInterval(monitorIntervalAsync);
  const endAsync = performance.now();
  const durationAsync = endAsync - startAsync;

  console.log(`Total Time: ${durationAsync.toFixed(2)} ms`);
  console.log(`Average Time per Op: ${(durationAsync / iterations).toFixed(2)} ms`);
  console.log(`Max Event Loop Lag: ${maxLagAsync.toFixed(2)} ms`);
  console.log(`Total Event Loop Lag: ${totalLagAsync.toFixed(2)} ms`);
  console.log(`Interval Ticks: ${ticksAsync}`);

  // Cleanup
  if (createdDummy && fs.existsSync(testFile)) {
      console.log('\nCleaning up dummy file...');
      fs.unlinkSync(testFile);
  }
}

runBenchmark().catch(console.error);

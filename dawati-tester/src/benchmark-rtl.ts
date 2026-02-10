import { chromium } from 'playwright';

async function runBenchmark() {
  console.log('Starting RTL Checker Benchmark...');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Create a heavy DOM structure
  console.log('Generating heavy DOM...');
  await page.evaluate(() => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    // Create 1000 containers
    for (let i = 0; i < 1000; i++) {
      const container = document.createElement('div');
      container.className = 'container-' + i;
      container.style.textAlign = i % 2 === 0 ? 'left' : 'right'; // Mix alignment

      // Add some nested structure
      const wrapper = document.createElement('div');
      wrapper.className = 'wrapper';
      container.appendChild(wrapper);

      // Add 5 text elements
      for (let j = 0; j < 5; j++) {
        const span = document.createElement('span');
        span.textContent = `Item ${i}-${j} with some text content`;
        if (j % 2 === 0) span.style.textAlign = 'left'; // Explicit left alignment
        wrapper.appendChild(span);
      }

      root.appendChild(container);
    }

    // Add some empty nodes
    for (let k = 0; k < 500; k++) {
      const empty = document.createElement('div');
      empty.className = 'spacer';
      root.appendChild(empty);
    }
  });

  console.log('DOM created. Starting measurements...');

  // --- Baseline Measurement ---
  const startOriginal = performance.now();

  // Original logic: querySelectorAll('*')
  const originalResult = await page.evaluate(() => {
    const elements: string[] = [];
    const all = document.querySelectorAll('*');
    all.forEach((el) => {
      const style = window.getComputedStyle(el);
      if (style.textAlign === 'left' && el.textContent?.trim()) {
        elements.push(el.tagName + ': ' + (el.textContent?.slice(0, 30) || ''));
      }
    });
    return elements.slice(0, 10);
  });

  const endOriginal = performance.now();
  console.log(`Original Logic Time: ${(endOriginal - startOriginal).toFixed(2)}ms`);
  console.log(`Found ${originalResult.length} items (Original)`);

  // --- Optimized Measurement ---
  const startOptimized = performance.now();

  // Optimized logic: TreeWalker for text nodes
  const optimizedResult = await page.evaluate(() => {
    const elements: string[] = [];
    const checked = new Set<Element>();

    // Use TreeWalker to find text nodes efficiently
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;

      // Skip if we already checked this element
      if (checked.has(parent)) continue;
      checked.add(parent);

      // Skip non-visual elements
      const tagName = parent.tagName;
      if (tagName === 'SCRIPT' || tagName === 'STYLE' || tagName === 'NOSCRIPT') continue;

      // Only check if it actually has visible text content (already confirmed by walker)
      // but ensure it's not just whitespace
      if (!node.nodeValue?.trim()) continue;

      const style = window.getComputedStyle(parent);
      if (style.textAlign === 'left') {
        elements.push(tagName + ': ' + (parent.textContent?.slice(0, 30) || ''));
      }
    }
    return elements.slice(0, 10);
  });

  const endOptimized = performance.now();
  console.log(`Optimized Logic Time: ${(endOptimized - startOptimized).toFixed(2)}ms`);
  console.log(`Found ${optimizedResult.length} items (Optimized)`);

  console.log(`Speedup: ${(endOriginal - startOriginal) / (endOptimized - startOptimized)}x`);

  await browser.close();
}

runBenchmark().catch(console.error);

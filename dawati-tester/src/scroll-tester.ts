import { getPage, scrollDown, scrollToTop, scrollToBottom, getScrollPosition } from './browser';
import { takeScreenshot, captureScrollSequence } from './screenshot-manager';
import { config } from './config';
import { createChildLogger } from './logger';

const log = createChildLogger('scroll-tester');

export interface ScrollTestResult {
  testName: string;
  success: boolean;
  screenshotsCount: number;
  scrollPositions: number[];
  infiniteScrollTriggered: boolean;
  errors: string[];
}

export async function testVerticalScroll(): Promise<ScrollTestResult> {
  log.info('Testing vertical scrolling');
  const result: ScrollTestResult = {
    testName: 'Vertical Scroll',
    success: true,
    screenshotsCount: 0,
    scrollPositions: [],
    infiniteScrollTriggered: false,
    errors: [],
  };

  try {
    const page = await getPage();

    // Start at top
    await scrollToTop();
    const initialPosition = await getScrollPosition();
    result.scrollPositions.push(initialPosition);

    await takeScreenshot('scroll_vertical_start', 'Start position (top)');
    result.screenshotsCount++;

    // Scroll down incrementally
    const scrollIncrement = 500;
    let scrollCount = 0;
    const maxScrolls = 10;

    while (scrollCount < maxScrolls) {
      await scrollDown(scrollIncrement);
      const newPosition = await getScrollPosition();

      if (newPosition === result.scrollPositions[result.scrollPositions.length - 1]) {
        // Can't scroll anymore
        log.info('Reached bottom of page');
        break;
      }

      result.scrollPositions.push(newPosition);
      scrollCount++;

      await takeScreenshot(`scroll_vertical_${scrollCount}`, `Scroll position ${newPosition}px`);
      result.screenshotsCount++;

      // Check for infinite scroll / load more
      const loadingIndicators = await page.$$('[data-testid="loading"], .loading, .spinner');
      if (loadingIndicators.length > 0) {
        log.info('Loading indicator detected - infinite scroll may be active');
        result.infiniteScrollTriggered = true;
        await page.waitForTimeout(2000); // Wait for content to load
      }
    }

    // Scroll back to top
    await scrollToTop();
    await takeScreenshot('scroll_vertical_back_to_top', 'Back at top');
    result.screenshotsCount++;

    result.success = result.scrollPositions.length > 1;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Vertical scroll test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function testHorizontalScroll(): Promise<ScrollTestResult> {
  log.info('Testing horizontal scrolling (carousels/tabs)');
  const result: ScrollTestResult = {
    testName: 'Horizontal Scroll',
    success: true,
    screenshotsCount: 0,
    scrollPositions: [],
    infiniteScrollTriggered: false,
    errors: [],
  };

  try {
    const page = await getPage();

    // Find horizontal scroll containers
    const carouselSelectors = [
      '[data-testid="carousel"]',
      '.carousel',
      '.swiper',
      '[class*="scroll-x"]',
      '[class*="horizontal"]',
      '[style*="overflow-x"]',
    ];

    let carouselFound = false;

    for (const selector of carouselSelectors) {
      try {
        const carousels = await page.$$(selector);
        if (carousels.length > 0) {
          carouselFound = true;
          log.info({ selector, count: carousels.length }, 'Found horizontal scroll containers');

          // Take initial screenshot
          await takeScreenshot('scroll_horizontal_initial', 'Horizontal scroll - initial');
          result.screenshotsCount++;

          // Try to scroll the first carousel
          const carousel = carousels[0];
          const box = await carousel.boundingBox();

          if (box) {
            // Swipe left (scroll right)
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
            await page.mouse.down();
            await page.mouse.move(box.x + 100, box.y + box.height / 2, { steps: 10 });
            await page.mouse.up();

            await page.waitForTimeout(500);
            await takeScreenshot('scroll_horizontal_swiped', 'After horizontal swipe');
            result.screenshotsCount++;
          }
          break;
        }
      } catch {
        continue;
      }
    }

    // Also test tab containers
    const tabContainerSelectors = [
      '[role="tablist"]',
      '.tabs',
      '[data-testid="tabs"]',
    ];

    for (const selector of tabContainerSelectors) {
      try {
        const tabContainer = await page.$(selector);
        if (tabContainer) {
          log.info({ selector }, 'Found tab container');

          // Click through tabs
          const tabs = await tabContainer.$$('[role="tab"], button, a');
          for (let i = 0; i < Math.min(tabs.length, 4); i++) {
            await tabs[i].click();
            await page.waitForTimeout(500);
            await takeScreenshot(`scroll_tab_${i + 1}`, `Tab ${i + 1} selected`);
            result.screenshotsCount++;
          }
          break;
        }
      } catch {
        continue;
      }
    }

    if (!carouselFound) {
      log.info('No horizontal scroll containers found');
      result.errors.push('No horizontal scroll containers found');
    }

    result.success = result.screenshotsCount > 0;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Horizontal scroll test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function testInfiniteScroll(): Promise<ScrollTestResult> {
  log.info('Testing infinite scroll / load more');
  const result: ScrollTestResult = {
    testName: 'Infinite Scroll',
    success: true,
    screenshotsCount: 0,
    scrollPositions: [],
    infiniteScrollTriggered: false,
    errors: [],
  };

  try {
    const page = await getPage();

    // Go to a page that likely has infinite scroll (marketplace, vendor list)
    await scrollToTop();

    // Count initial items
    const itemSelectors = [
      '[data-testid="vendor-card"]',
      '[data-testid="item-card"]',
      '.card',
      'article',
    ];

    let initialItemCount = 0;
    let itemSelector = '';

    for (const selector of itemSelectors) {
      const items = await page.$$(selector);
      if (items.length > 0) {
        initialItemCount = items.length;
        itemSelector = selector;
        log.info({ selector, count: initialItemCount }, 'Found items');
        break;
      }
    }

    await takeScreenshot('scroll_infinite_start', `Initial items: ${initialItemCount}`);
    result.screenshotsCount++;

    // Scroll to bottom multiple times
    for (let i = 0; i < 5; i++) {
      await scrollToBottom();
      await page.waitForTimeout(2000); // Wait for potential content load

      // Check for load more button
      const loadMoreSelectors = [
        'text=Load More',
        'text=تحميل المزيد',
        'text=Show More',
        'text=المزيد',
        '[data-testid="load-more"]',
      ];

      for (const selector of loadMoreSelectors) {
        try {
          await page.click(selector, { timeout: 1000 });
          log.info('Clicked load more button');
          await page.waitForTimeout(2000);
          break;
        } catch {
          continue;
        }
      }

      // Count items again
      if (itemSelector) {
        const currentItems = await page.$$(itemSelector);
        if (currentItems.length > initialItemCount) {
          result.infiniteScrollTriggered = true;
          log.info({ before: initialItemCount, after: currentItems.length }, 'More items loaded');
          await takeScreenshot(`scroll_infinite_loaded_${i}`, `Items loaded: ${currentItems.length}`);
          result.screenshotsCount++;
          initialItemCount = currentItems.length;
        }
      }

      const position = await getScrollPosition();
      result.scrollPositions.push(position);
    }

    result.success = true;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Infinite scroll test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function testScrollPerformance(): Promise<ScrollTestResult> {
  log.info('Testing scroll performance (smoothness)');
  const result: ScrollTestResult = {
    testName: 'Scroll Performance',
    success: true,
    screenshotsCount: 0,
    scrollPositions: [],
    infiniteScrollTriggered: false,
    errors: [],
  };

  try {
    const page = await getPage();
    await scrollToTop();

    // Measure scroll performance
    const scrollTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const startTime = Date.now();
      await scrollDown(500);
      const endTime = Date.now();
      scrollTimes.push(endTime - startTime);
      result.scrollPositions.push(await getScrollPosition());
    }

    const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
    log.info({ avgScrollTime, scrollTimes }, 'Scroll performance measured');

    // If scroll is very slow, might indicate jank
    if (avgScrollTime > 500) {
      result.errors.push(`Slow scroll detected: avg ${avgScrollTime}ms per 500px`);
    }

    await takeScreenshot('scroll_performance_test', `Avg scroll time: ${avgScrollTime}ms`);
    result.screenshotsCount++;

    result.success = avgScrollTime < 1000; // Less than 1 second per scroll
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Scroll performance test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function runScrollTests(): Promise<ScrollTestResult[]> {
  log.info('Running all scroll tests');
  const results: ScrollTestResult[] = [];

  results.push(await testVerticalScroll());
  results.push(await testHorizontalScroll());
  results.push(await testInfiniteScroll());
  results.push(await testScrollPerformance());

  const passed = results.filter((r) => r.success).length;
  log.info({ passed, total: results.length }, 'Scroll tests complete');

  return results;
}

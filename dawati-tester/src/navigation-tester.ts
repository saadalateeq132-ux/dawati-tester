import { getPage, navigateTo, getCurrentUrl, goBack, waitForNavigation } from './browser';
import { takeScreenshot } from './screenshot-manager';
import { config } from './config';
import { createChildLogger } from './logger';

const log = createChildLogger('navigation-tester');

export interface NavigationTestResult {
  category: string;
  tested: boolean;
  success: boolean;
  screenshotsCount: number;
  pagesVisited: string[];
  errors: string[];
}

// Dawati marketplace categories
const MARKETPLACE_CATEGORIES = [
  { name: 'Photography', arabic: 'التصوير', selector: 'text=Photography' },
  { name: 'Videography', arabic: 'الفيديو', selector: 'text=Videography' },
  { name: 'Catering', arabic: 'الضيافة', selector: 'text=Catering' },
  { name: 'Venues', arabic: 'القاعات', selector: 'text=Venues' },
  { name: 'Florists', arabic: 'الورود', selector: 'text=Florists' },
  { name: 'Cakes', arabic: 'الكيك', selector: 'text=Cakes' },
  { name: 'Entertainment', arabic: 'الترفيه', selector: 'text=Entertainment' },
  { name: 'Decoration', arabic: 'الديكور', selector: 'text=Decoration' },
  { name: 'Invitations', arabic: 'الدعوات', selector: 'text=Invitations' },
  { name: 'Music', arabic: 'الموسيقى', selector: 'text=Music' },
  { name: 'Makeup', arabic: 'المكياج', selector: 'text=Makeup' },
  { name: 'Dresses', arabic: 'الفساتين', selector: 'text=Dresses' },
  { name: 'Jewelry', arabic: 'المجوهرات', selector: 'text=Jewelry' },
  { name: 'Transportation', arabic: 'النقل', selector: 'text=Transportation' },
  { name: 'Planning', arabic: 'التخطيط', selector: 'text=Planning' },
];

const HOMEPAGE_TABS = [
  { name: 'Birthdays', arabic: 'أعياد الميلاد' },
  { name: 'Weddings', arabic: 'حفلات الزفاف' },
  { name: 'Corporate', arabic: 'فعاليات الشركات' },
  { name: 'Gatherings', arabic: 'التجمعات' },
];

export async function testHomepageTabs(): Promise<NavigationTestResult> {
  log.info('Testing homepage tabs');
  const result: NavigationTestResult = {
    category: 'Homepage Tabs',
    tested: true,
    success: true,
    screenshotsCount: 0,
    pagesVisited: [],
    errors: [],
  };

  try {
    await navigateTo(config.dawatiUrl);
    const page = await getPage();

    await takeScreenshot('nav_homepage_initial', 'Homepage initial state');
    result.screenshotsCount++;

    for (const tab of HOMEPAGE_TABS) {
      try {
        // Try clicking by name (English or Arabic)
        const selectors = [
          `text=${tab.name}`,
          `text=${tab.arabic}`,
          `[data-testid="${tab.name.toLowerCase()}"]`,
          `button:has-text("${tab.name}")`,
          `div:has-text("${tab.name}"):not(:has(div))`,
        ];

        let clicked = false;
        for (const selector of selectors) {
          try {
            await page.click(selector, { timeout: 2000 });
            clicked = true;
            log.info({ tab: tab.name }, 'Tab clicked');
            break;
          } catch {
            continue;
          }
        }

        if (clicked) {
          await page.waitForTimeout(1000);
          await takeScreenshot(`nav_tab_${tab.name.toLowerCase()}`, `${tab.name} tab content`);
          result.screenshotsCount++;
          result.pagesVisited.push(`Tab: ${tab.name}`);
        } else {
          log.warn({ tab: tab.name }, 'Tab not found');
          result.errors.push(`Tab not found: ${tab.name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.errors.push(`Error testing tab ${tab.name}: ${errorMessage}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Homepage tabs test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function testMarketplaceCategories(): Promise<NavigationTestResult> {
  log.info('Testing marketplace categories');
  const result: NavigationTestResult = {
    category: 'Marketplace Categories',
    tested: true,
    success: true,
    screenshotsCount: 0,
    pagesVisited: [],
    errors: [],
  };

  try {
    const page = await getPage();

    // Navigate to marketplace
    const marketplaceSelectors = [
      'text=Marketplace',
      'text=السوق',
      'text=Browse',
      'text=تصفح',
      '[data-testid="marketplace"]',
      'a[href*="marketplace"]',
    ];

    let marketplaceFound = false;
    for (const selector of marketplaceSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        marketplaceFound = true;
        break;
      } catch {
        continue;
      }
    }

    if (!marketplaceFound) {
      // Try navigating directly
      await navigateTo(`${config.dawatiUrl}/marketplace`);
    }

    await page.waitForTimeout(1000);
    await takeScreenshot('nav_marketplace_main', 'Marketplace main page');
    result.screenshotsCount++;

    // Test each category
    for (const category of MARKETPLACE_CATEGORIES) {
      try {
        const selectors = [
          category.selector,
          `text=${category.arabic}`,
          `[data-testid="${category.name.toLowerCase()}"]`,
          `a:has-text("${category.name}")`,
        ];

        let clicked = false;
        for (const selector of selectors) {
          try {
            await page.click(selector, { timeout: 2000 });
            clicked = true;
            break;
          } catch {
            continue;
          }
        }

        if (clicked) {
          await page.waitForTimeout(1000);
          await takeScreenshot(
            `nav_category_${category.name.toLowerCase()}`,
            `${category.name} category page`
          );
          result.screenshotsCount++;
          result.pagesVisited.push(`Category: ${category.name}`);

          // Go back to marketplace
          await goBack();
          await page.waitForTimeout(500);
        } else {
          log.debug({ category: category.name }, 'Category not found, may not exist in current version');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log.debug({ category: category.name, error: errorMessage }, 'Error testing category');
      }
    }

    result.success = result.pagesVisited.length > 0;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Marketplace categories test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function testVendorProfiles(): Promise<NavigationTestResult> {
  log.info('Testing vendor profile navigation');
  const result: NavigationTestResult = {
    category: 'Vendor Profiles',
    tested: true,
    success: true,
    screenshotsCount: 0,
    pagesVisited: [],
    errors: [],
  };

  try {
    const page = await getPage();

    // Find and click a vendor card
    const vendorCardSelectors = [
      '[data-testid="vendor-card"]',
      '.vendor-card',
      'a[href*="vendor"]',
      'div[class*="vendor"]',
    ];

    let vendorClicked = false;
    for (const selector of vendorCardSelectors) {
      try {
        const cards = await page.$$(selector);
        if (cards.length > 0) {
          await cards[0].click();
          vendorClicked = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (vendorClicked) {
      await page.waitForTimeout(1000);
      await takeScreenshot('nav_vendor_profile', 'Vendor profile page');
      result.screenshotsCount++;
      result.pagesVisited.push('Vendor Profile');

      // Test back navigation
      await goBack();
      await page.waitForTimeout(500);
      await takeScreenshot('nav_after_back', 'After back navigation');
      result.screenshotsCount++;
    } else {
      result.errors.push('No vendor cards found to test');
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Vendor profile test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function testBottomNavigation(): Promise<NavigationTestResult> {
  log.info('Testing bottom navigation bar');
  const result: NavigationTestResult = {
    category: 'Bottom Navigation',
    tested: true,
    success: true,
    screenshotsCount: 0,
    pagesVisited: [],
    errors: [],
  };

  try {
    const page = await getPage();
    await navigateTo(config.dawatiUrl);

    // Common bottom nav items
    const bottomNavItems = [
      { name: 'Home', selectors: ['text=Home', 'text=الرئيسية', '[data-testid="nav-home"]'] },
      { name: 'Explore', selectors: ['text=Explore', 'text=اكتشف', '[data-testid="nav-explore"]'] },
      { name: 'Events', selectors: ['text=Events', 'text=الفعاليات', '[data-testid="nav-events"]'] },
      { name: 'Profile', selectors: ['text=Profile', 'text=حسابي', '[data-testid="nav-profile"]'] },
    ];

    for (const item of bottomNavItems) {
      for (const selector of item.selectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          await page.waitForTimeout(1000);
          await takeScreenshot(`nav_bottom_${item.name.toLowerCase()}`, `Bottom nav: ${item.name}`);
          result.screenshotsCount++;
          result.pagesVisited.push(`Bottom Nav: ${item.name}`);
          break;
        } catch {
          continue;
        }
      }
    }

    result.success = result.pagesVisited.length > 0;
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Bottom navigation test failed');
    result.success = false;
    result.errors.push(errorMessage);
    return result;
  }
}

export async function runNavigationTests(): Promise<NavigationTestResult[]> {
  log.info('Running all navigation tests');
  const results: NavigationTestResult[] = [];

  // Test homepage tabs
  results.push(await testHomepageTabs());

  // Test marketplace categories
  results.push(await testMarketplaceCategories());

  // Test vendor profiles
  results.push(await testVendorProfiles());

  // Test bottom navigation
  results.push(await testBottomNavigation());

  const passed = results.filter((r) => r.success).length;
  log.info({ passed, total: results.length }, 'Navigation tests complete');

  return results;
}

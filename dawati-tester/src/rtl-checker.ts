import { getPage } from './browser';
import { takeScreenshot } from './screenshot-manager';
import { createChildLogger } from './logger';

const log = createChildLogger('rtl-checker');

export interface RTLCheckResult {
  category: string;
  issues: RTLIssue[];
  hardcodedStrings: string[];
  score: number; // 1-10
}

export interface RTLIssue {
  type: 'direction' | 'alignment' | 'hardcoded' | 'number' | 'date';
  severity: 'high' | 'medium' | 'low';
  description: string;
  element?: string;
  suggestion: string;
}

// Common English strings that should be translated
const HARDCODED_ENGLISH_PATTERNS = [
  'Submit',
  'Cancel',
  'Save',
  'Delete',
  'Edit',
  'Add',
  'Remove',
  'Search',
  'Filter',
  'Sort',
  'View',
  'Back',
  'Next',
  'Previous',
  'Loading',
  'Error',
  'Success',
  'Welcome',
  'Hello',
  'Sign In',
  'Sign Up',
  'Log In',
  'Log Out',
  'Profile',
  'Settings',
  'Home',
  'Continue',
  'OK',
  'Yes',
  'No',
];

export async function checkRTLDirection(): Promise<RTLCheckResult> {
  log.info('Checking RTL text direction');
  const result: RTLCheckResult = {
    category: 'Text Direction',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check HTML dir attribute
    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    const bodyDir = await page.evaluate(() => document.body.dir);

    if (htmlDir !== 'rtl' && bodyDir !== 'rtl') {
      result.issues.push({
        type: 'direction',
        severity: 'high',
        description: 'Document is not set to RTL direction',
        element: 'html/body',
        suggestion: 'Add dir="rtl" to <html> or <body> element',
      });
      result.score -= 3;
    }

    // Check for elements with explicit LTR direction
    const ltrElements = await page.evaluate(() => {
      const elements: string[] = [];
      document.querySelectorAll('[dir="ltr"], [style*="direction: ltr"]').forEach((el) => {
        elements.push(el.tagName + (el.className ? '.' + el.className : ''));
      });
      return elements;
    });

    if (ltrElements.length > 0) {
      result.issues.push({
        type: 'direction',
        severity: 'medium',
        description: `Found ${ltrElements.length} elements with explicit LTR direction`,
        element: ltrElements.slice(0, 5).join(', '),
        suggestion: 'Review if these elements should be LTR or remove explicit direction',
      });
      result.score -= 1;
    }

    await takeScreenshot('rtl_direction_check', 'RTL direction check');

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'RTL direction check failed');
    result.issues.push({
      type: 'direction',
      severity: 'high',
      description: `Check failed: ${errorMessage}`,
      suggestion: 'Fix the error and re-run',
    });
    result.score = 0;
    return result;
  }
}

export async function checkTextAlignment(): Promise<RTLCheckResult> {
  log.info('Checking text alignment for RTL');
  const result: RTLCheckResult = {
    category: 'Text Alignment',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check for left-aligned text that should be right-aligned in RTL
    const leftAlignedElements = await page.evaluate(() => {
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

    if (leftAlignedElements.length > 0) {
      result.issues.push({
        type: 'alignment',
        severity: 'medium',
        description: `Found ${leftAlignedElements.length}+ elements with left text alignment`,
        element: leftAlignedElements[0],
        suggestion: 'Use text-align: start or text-align: right for RTL',
      });
      result.score -= 2;
    }

    // Check for margin/padding using left/right instead of start/end
    const fixedPositioningElements = await page.evaluate(() => {
      const issues: string[] = [];
      const all = document.querySelectorAll('*');
      all.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (
          (style.marginLeft !== '0px' && style.marginLeft !== 'auto') ||
          (style.paddingLeft !== '0px')
        ) {
          // This might be intentional, but could cause RTL issues
          if (el.classList.length > 0) {
            issues.push(el.className);
          }
        }
      });
      return [...new Set(issues)].slice(0, 5);
    });

    if (fixedPositioningElements.length > 5) {
      result.issues.push({
        type: 'alignment',
        severity: 'low',
        description: 'Many elements use left/right positioning instead of start/end',
        suggestion: 'Consider using margin-inline-start/end and padding-inline-start/end',
      });
      result.score -= 1;
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Text alignment check failed');
    result.score = 5;
    return result;
  }
}

export async function checkHardcodedStrings(): Promise<RTLCheckResult> {
  log.info('Checking for hardcoded English strings');
  const result: RTLCheckResult = {
    category: 'Hardcoded Strings',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Get all visible text on the page
    const pageText = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );
      const texts: string[] = [];
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          texts.push(text);
        }
      }
      return texts;
    });

    // Check for hardcoded English patterns
    for (const pattern of HARDCODED_ENGLISH_PATTERNS) {
      const found = pageText.filter(
        (text) => text.toLowerCase() === pattern.toLowerCase()
      );
      if (found.length > 0) {
        result.hardcodedStrings.push(pattern);
      }
    }

    if (result.hardcodedStrings.length > 0) {
      result.issues.push({
        type: 'hardcoded',
        severity: 'high',
        description: `Found ${result.hardcodedStrings.length} hardcoded English strings`,
        element: result.hardcodedStrings.slice(0, 5).join(', '),
        suggestion: 'Replace with Arabic translations using i18n system',
      });
      result.score -= Math.min(result.hardcodedStrings.length, 5);
    }

    // Check for English-only content (Latin characters in unexpected places)
    const englishOnlyElements = await page.evaluate(() => {
      const elements: string[] = [];
      const buttons = document.querySelectorAll('button, a, label');
      buttons.forEach((el) => {
        const text = el.textContent?.trim();
        if (text && /^[A-Za-z\s]+$/.test(text) && text.length > 2) {
          elements.push(text);
        }
      });
      return elements.slice(0, 10);
    });

    if (englishOnlyElements.length > 0) {
      result.issues.push({
        type: 'hardcoded',
        severity: 'medium',
        description: `Found ${englishOnlyElements.length} buttons/links with English-only text`,
        element: englishOnlyElements.slice(0, 3).join(', '),
        suggestion: 'Ensure all UI text is translated to Arabic',
      });
      result.score -= 2;
    }

    await takeScreenshot('rtl_hardcoded_check', 'Hardcoded strings check');

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Hardcoded strings check failed');
    result.score = 5;
    return result;
  }
}

export async function checkNumbersAndDates(): Promise<RTLCheckResult> {
  log.info('Checking number and date formatting');
  const result: RTLCheckResult = {
    category: 'Numbers & Dates',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check for Western numerals vs Arabic numerals
    const hasWesternNumerals = await page.evaluate(() => {
      const text = document.body.innerText;
      return /[0-9]+/.test(text);
    });

    const hasArabicNumerals = await page.evaluate(() => {
      const text = document.body.innerText;
      return /[٠-٩]+/.test(text);
    });

    // Note: Both are acceptable, but consistency matters
    if (hasWesternNumerals && hasArabicNumerals) {
      result.issues.push({
        type: 'number',
        severity: 'low',
        description: 'Mixed Western and Arabic numerals detected',
        suggestion: 'Consider using consistent numeral style throughout',
      });
      result.score -= 1;
    }

    // Check for date format issues (MM/DD/YYYY vs DD/MM/YYYY)
    const datePatterns = await page.evaluate(() => {
      const text = document.body.innerText;
      const usDatePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/g;
      const matches = text.match(usDatePattern) || [];
      return matches.slice(0, 5);
    });

    if (datePatterns.length > 0) {
      result.issues.push({
        type: 'date',
        severity: 'low',
        description: 'Date patterns found - verify format is appropriate for Saudi Arabia',
        element: datePatterns.join(', '),
        suggestion: 'Use DD/MM/YYYY or localized Arabic date format',
      });
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Numbers and dates check failed');
    result.score = 5;
    return result;
  }
}

export async function checkIconAlignment(): Promise<RTLCheckResult> {
  log.info('Checking icon alignment for RTL');
  const result: RTLCheckResult = {
    category: 'Icon Alignment',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check for icons that might need flipping in RTL
    const directionalIcons = await page.evaluate(() => {
      const icons: string[] = [];
      const svgs = document.querySelectorAll('svg, [class*="icon"], [class*="Icon"]');
      svgs.forEach((icon) => {
        const classes = icon.className?.toString() || '';
        if (
          classes.includes('arrow') ||
          classes.includes('chevron') ||
          classes.includes('back') ||
          classes.includes('forward') ||
          classes.includes('next') ||
          classes.includes('prev')
        ) {
          icons.push(classes.slice(0, 50));
        }
      });
      return icons.slice(0, 10);
    });

    if (directionalIcons.length > 0) {
      result.issues.push({
        type: 'alignment',
        severity: 'medium',
        description: `Found ${directionalIcons.length} directional icons that may need RTL handling`,
        element: directionalIcons.slice(0, 3).join(', '),
        suggestion: 'Ensure directional icons are flipped in RTL mode using transform: scaleX(-1)',
      });
      result.score -= 1;
    }

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Icon alignment check failed');
    result.score = 5;
    return result;
  }
}

export async function runRTLChecks(): Promise<RTLCheckResult[]> {
  log.info('Running all RTL checks');
  const results: RTLCheckResult[] = [];

  results.push(await checkRTLDirection());
  results.push(await checkTextAlignment());
  results.push(await checkHardcodedStrings());
  results.push(await checkNumbersAndDates());
  results.push(await checkIconAlignment());

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  log.info({ avgScore, checks: results.length }, 'RTL checks complete');

  return results;
}

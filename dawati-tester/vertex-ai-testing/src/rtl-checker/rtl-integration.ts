import { Page } from 'playwright';
import { ComprehensiveRTLResult, RTLCheckResult } from '../types';
import { ColorChecker, DesignSystemColors } from '../design-system/color-checker';

/**
 * Integration with existing RTL checker from dawati-tester/src/rtl-checker.ts
 * This wraps the existing comprehensive RTL checks
 */
export class RTLIntegration {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Run all 9 comprehensive RTL checks from existing implementation
   */
  async runComprehensiveChecks(): Promise<ComprehensiveRTLResult> {
    console.log('[RTL Checker] Running comprehensive RTL checks...');

    const checks: RTLCheckResult[] = [];

    // 1. RTL Direction Check
    checks.push(await this.checkRTLDirection());

    // 2. Text Alignment Check
    checks.push(await this.checkTextAlignment());

    // 3. Margin/Padding Check
    checks.push(await this.checkMarginPadding());

    // 4. Hardcoded Strings Check (English + Arabic)
    checks.push(await this.checkHardcodedStrings());

    // 5. Currency Formatting Check (SAR)
    checks.push(await this.checkCurrencyFormatting());

    // 6. BiDi Text Handling Check
    checks.push(await this.checkBiDiTextHandling());

    // 7. Hijri Calendar Check
    checks.push(await this.checkHijriCalendar());

    // 8. Layout Expansion Check (30% rule)
    checks.push(await this.checkLayoutExpansion());

    // 9. Icon Alignment Check
    checks.push(await this.checkIconAlignment());

    // 10. Mobile Tap Target Size Check (NEW for mobile apps)
    checks.push(await this.checkTapTargetSizes());

    // 11. Design System Color Consistency Check (NEW - catch color inconsistencies)
    checks.push(await this.checkColorConsistency());

    // 12. Element Overlap Detection (from RTL-CHECKLIST.md)
    checks.push(await this.checkElementOverlap());

    // 13. Back Button / Navigation Position (RTL: back button on RIGHT)
    checks.push(await this.checkNavigationPosition());

    // 14. Tab Bar Check (alignment, active state, RTL order)
    checks.push(await this.checkTabBar());

    // 15. Flexbox Direction Check (row auto-flips in RTL)
    checks.push(await this.checkFlexboxDirection());

    // 16. Form Input Direction (phone/numbers stay LTR, text RTL)
    checks.push(await this.checkFormInputDirection());

    // 17. Arabic Typography / lineHeight Check (prevents Arabic text clipping)
    checks.push(await this.checkArabicTypography());

    // 18. Animation Direction Check (translateX must account for RTL)
    checks.push(await this.checkAnimationDirection());

    // 19. Number Formatting Check (Western 1234 vs Arabic-Eastern ١٢٣٤)
    checks.push(await this.checkNumberFormatting());

    // 20. Accessibility Integration Check (lang="ar", ARIA, contrast)
    checks.push(await this.checkAccessibilityIntegration());

    // 21. Dynamic Content & Script Check (unlocalized JS-generated text)
    checks.push(await this.checkDynamicContent());

    // 22. Scroll Direction Check (horizontal carousels start from right in RTL)
    checks.push(await this.checkScrollDirection());

    // 23. Text Truncation Direction (ellipsis on LEFT side in RTL)
    checks.push(await this.checkTruncationDirection());

    // 24. List/Table RTL Order (rightmost = first column)
    checks.push(await this.checkListTableOrder());

    // 25. i18n Completeness (raw i18n keys not resolved to Arabic)
    checks.push(await this.checkI18nCompleteness());

    // 26. Safe Area / Notch Handling (content not behind notch/Dynamic Island)
    checks.push(await this.checkSafeAreaHandling());

    // Calculate overall score
    const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
    const overallScore = totalScore / checks.length;

    // Collect critical issues
    const criticalIssues: string[] = [];
    checks.forEach((check) => {
      if (check.score <= 5) {
        criticalIssues.push(`${check.checkName}: ${check.issues.join(', ')}`);
      }
    });

    const summary = this.generateSummary(overallScore, checks);

    console.log(`[RTL Checker] Overall RTL Score: ${overallScore.toFixed(1)}/10`);
    console.log(`[RTL Checker] Critical Issues: ${criticalIssues.length}`);

    return {
      overallScore,
      checks,
      criticalIssues,
      summary,
    };
  }

  private async checkRTLDirection(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const htmlDir = await this.page.evaluate(() => document.documentElement.getAttribute('dir'));
      const bodyDir = await this.page.evaluate(() => document.body.getAttribute('dir'));

      if (htmlDir !== 'rtl') {
        issues.push('HTML element missing dir="rtl"');
        suggestions.push('Add dir="rtl" to <html> tag');
      }

      if (bodyDir !== 'rtl') {
        issues.push('Body element missing dir="rtl"');
        suggestions.push('Add dir="rtl" to <body> tag');
      }

      const score = issues.length === 0 ? 10 : issues.length === 1 ? 7 : 4;

      return {
        checkName: 'RTL Direction',
        passed: issues.length === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('RTL Direction', error);
    }
  }

  private async checkTextAlignment(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const leftAlignedCount = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let count = 0;
        elements.forEach((el) => {
          const style = window.getComputedStyle(el);
          if (style.textAlign === 'left') {
            count++;
          }
        });
        return count;
      });

      if (leftAlignedCount > 0) {
        issues.push(`${leftAlignedCount} elements using text-align: left`);
        suggestions.push('Use text-align: start instead of left');
      }

      const score = leftAlignedCount === 0 ? 10 : leftAlignedCount < 5 ? 7 : 4;

      return {
        checkName: 'Text Alignment',
        passed: leftAlignedCount === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Text Alignment', error);
    }
  }

  private async checkMarginPadding(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // NOTE: React Native Web compiles marginStart/End to marginLeft/Right
      // in computed styles. Checking computed CSS will ALWAYS show left/right
      // even when the source code correctly uses Start/End.
      // Instead, check for inline styles that explicitly use left/right
      // (which indicates the developer hardcoded direction, not the framework).
      const leftRightUsage = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        let inlineIssues = 0;

        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          const inlineStyle = htmlEl.getAttribute('style') || '';

          // Only flag inline styles that explicitly use left/right
          // (not computed styles which React Native Web auto-generates)
          if (/margin-left|margin-right|padding-left|padding-right/i.test(inlineStyle)) {
            inlineIssues++;
          }
        });

        return inlineIssues;
      });

      if (leftRightUsage > 0) {
        issues.push(`${leftRightUsage} elements with hardcoded margin/padding-left/right in inline styles`);
        suggestions.push('Use marginStart/End and paddingStart/End instead of Left/Right');
      }

      // Score based on inline style violations only (not computed)
      const score = leftRightUsage === 0 ? 10 : leftRightUsage <= 5 ? 8 : leftRightUsage <= 15 ? 6 : 4;

      return {
        checkName: 'Margin/Padding Direction',
        passed: leftRightUsage === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Margin/Padding Direction', error);
    }
  }

  private async checkHardcodedStrings(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const pageText = await this.page.evaluate(() => document.body.innerText);

      // Common English strings that should be translated
      const englishPatterns = [
        'Submit', 'Cancel', 'Save', 'Delete', 'Edit', 'Add', 'Search', 'Loading',
        'Error', 'Success', 'Login', 'Logout', 'Sign In', 'Sign Up', 'Password',
        'Email', 'Phone', 'Name', 'Address', 'City', 'Continue', 'Back', 'Next',
      ];

      // Currency text patterns (should use SVG icon instead of text)
      // Note: Common Arabic UI words (حفظ, حذف, تعديل, etc.) are NOT flagged here
      // because they are expected translations in an Arabic-first app.
      // Only currency text is flagged since it should use the SAR SVG icon.
      // Note: Short patterns like 'رس' and 'سر' removed — they match inside
      // common Arabic words (رسالة, إرسال, سرعة, أسرة, etc.)
      const arabicPatterns = [
        'ريال', 'ر.س', 'س.ر', // Currency text (should use SVG icon)
      ];

      // Currency patterns (English variants)
      const currencyPatterns = [
        'SAR', 'sar', 'Sar', 'S.A.R', // All case variations
      ];

      const allPatterns = [...englishPatterns, ...arabicPatterns, ...currencyPatterns];

      for (const pattern of allPatterns) {
        if (pageText.includes(pattern)) {
          // Check if it's a currency pattern
          const isCurrency = currencyPatterns.includes(pattern) ||
                           ['ريال', 'ر.س', 'س.ر'].includes(pattern);

          if (isCurrency) {
            issues.push(`Hardcoded currency text: "${pattern}" (should use SVG icon)`);
          } else {
            issues.push(`Hardcoded string found: "${pattern}"`);
          }
        }
      }

      // Separate English vs currency issues for targeted suggestions
      const hasEnglish = issues.some(i => i.startsWith('Hardcoded string found:'));
      const hasCurrency = issues.some(i => i.startsWith('Hardcoded currency text:'));

      if (hasEnglish) {
        suggestions.push('Replace English strings with i18n keys: t("key") — Arabic app should not show English text');
      }
      if (hasCurrency) {
        suggestions.push('Replace currency text (SAR/ريال/ر.س/etc.) with SVG icon from assets');
      }

      const score = issues.length === 0 ? 10 : issues.length <= 3 ? 7 : issues.length <= 10 ? 5 : 2;

      return {
        checkName: 'Hardcoded Strings',
        passed: issues.length === 0,
        score,
        issues: issues.slice(0, 10), // Limit to first 10
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Hardcoded Strings', error);
    }
  }

  private async checkCurrencyFormatting(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const pageText = await this.page.evaluate(() => document.body.innerText);

      // Check for hardcoded currency text (should use SVG icon instead)
      // Note: Short patterns like سر/رس removed — they match inside common
      // Arabic words (رسالة, إرسال, سرعة, أسرة, مدرسة, etc.)
      const hardcodedCurrencyPatterns = [
        /SAR/gi,           // SAR, sar, Sar
        /ر\.س/g,           // ر.س (Arabic with dot)
        /س\.ر/g,           // س.ر (reversed)
        /ريال/g,           // ريال (full Arabic word)
        /\$/g,             // Dollar sign (shouldn't be used at all)
      ];

      const hardcodedMatches: string[] = [];
      for (const pattern of hardcodedCurrencyPatterns) {
        const matches = pageText.match(pattern);
        if (matches) {
          hardcodedMatches.push(...matches);
        }
      }

      if (hardcodedMatches.length > 0) {
        // Remove duplicates
        const uniqueMatches = [...new Set(hardcodedMatches)];
        issues.push(`Hardcoded currency text found: ${uniqueMatches.join(', ')}`);
        suggestions.push(
          'Replace hardcoded currency text (SAR/ريال/ر.س/س.ر) with SVG icon from assets'
        );
      }

      // Also check for currency symbol before number (WRONG placement)
      const wrongPlacementPatterns = [
        /(?:SAR|ر\.س|س\.ر|ريال)\s*\d+/gi,
      ];

      for (const pattern of wrongPlacementPatterns) {
        const matches = pageText.match(pattern);
        if (matches) {
          issues.push(`Currency before number: ${matches.join(', ')} (should be after number)`);
          suggestions.push('Place currency symbol AFTER the number: "100 [SVG]" not "[SVG] 100"');
        }
      }

      const score = issues.length === 0 ? 10 : issues.length <= 2 ? 6 : 3;

      return {
        checkName: 'Currency Formatting',
        passed: issues.length === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Currency Formatting', error);
    }
  }

  private async checkBiDiTextHandling(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const pageText = await this.page.evaluate(() => document.body.innerText);

      // Check for phone numbers, emails, URLs in Arabic text without isolation
      const bidiPatterns = [
        { pattern: /[\u0600-\u06FF]+.*?\+966\d{9}/, type: 'Phone number in Arabic' },
        { pattern: /[\u0600-\u06FF]+.*?[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, type: 'Email in Arabic' },
        { pattern: /[\u0600-\u06FF]+.*?https?:\/\//, type: 'URL in Arabic' },
      ];

      for (const { pattern, type } of bidiPatterns) {
        const matches = pageText.match(pattern);
        if (matches) {
          issues.push(`${type} without BiDi isolation`);
        }
      }

      if (issues.length > 0) {
        suggestions.push('Wrap LTR content (phone/email/URL) in <span dir="ltr"> or use <bdi> tags');
      }

      const score = issues.length === 0 ? 10 : issues.length <= 2 ? 7 : 4;

      return {
        checkName: 'BiDi Text Handling',
        passed: issues.length === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('BiDi Text Handling', error);
    }
  }

  private async checkHijriCalendar(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const pageText = await this.page.evaluate(() => document.body.innerText);

      // Check for Hijri month names
      const hijriMonths = [
        'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأول', 'جمادى الثاني',
        'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
      ];

      const hasHijri = hijriMonths.some((month) => pageText.includes(month));

      // Check if this page actually displays any dates (Gregorian or otherwise)
      // Common date indicators: day numbers, month names, date patterns
      const hasAnyDates = await this.page.evaluate(() => {
        const text = document.body.innerText;
        // Look for date patterns: digits/digits/digits, month names, calendar widgets
        const datePatterns = [
          /\d{1,2}\/\d{1,2}\/\d{2,4}/,          // dd/mm/yyyy
          /\d{1,2}-\d{1,2}-\d{2,4}/,             // dd-mm-yyyy
          /\d{4}\/\d{1,2}\/\d{1,2}/,             // yyyy/mm/dd
          /january|february|march|april|may|june|july|august|september|october|november|december/i,
          /يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر/, // Arabic Gregorian months
        ];
        // Also check for calendar-related elements
        const hasCalendarWidget = document.querySelectorAll('[class*="calendar"], [class*="date-picker"], [role="grid"]').length > 0;
        return datePatterns.some(p => p.test(text)) || hasCalendarWidget;
      });

      if (hasHijri) {
        // Great - Hijri is present
        return {
          checkName: 'Hijri Calendar',
          passed: true,
          score: 10,
          issues: [],
          suggestions: [],
        };
      } else if (hasAnyDates) {
        // Page shows dates but no Hijri - this is a real issue
        issues.push('Page displays dates but no Hijri calendar format found');
        suggestions.push('Display both Hijri and Gregorian calendars for Saudi Arabia');
        return {
          checkName: 'Hijri Calendar',
          passed: false,
          score: 5,
          issues,
          suggestions,
        };
      } else {
        // Page doesn't display any dates - not applicable, give full score
        return {
          checkName: 'Hijri Calendar',
          passed: true,
          score: 10,
          issues: [],
          suggestions: ['Consider adding Hijri dates where date display is relevant'],
        };
      }
    } catch (error) {
      return this.createErrorResult('Hijri Calendar', error);
    }
  }

  private async checkLayoutExpansion(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const overflowElements = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('button, [role="button"], input, label');
        let count = 0;

        elements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const scrollWidth = (el as HTMLElement).scrollWidth;
          const clientWidth = (el as HTMLElement).clientWidth;

          // Check if content is wider than container (overflow)
          if (scrollWidth > clientWidth + 2) {
            count++;
          }
        });

        return count;
      });

      if (overflowElements > 0) {
        issues.push(`${overflowElements} elements with text overflow`);
        suggestions.push('Allow 30% extra space for Arabic text. Use flexible layouts (flex, grid)');
      }

      const score = overflowElements === 0 ? 10 : overflowElements <= 3 ? 7 : 4;

      return {
        checkName: 'Layout Expansion',
        passed: overflowElements === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Layout Expansion', error);
    }
  }

  private async checkIconAlignment(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check for directional icons that should be flipped in RTL
      const iconCheck = await this.page.evaluate(() => {
        const allSvgs = document.querySelectorAll('svg');
        let directionalIcons = 0;
        let flippedIcons = 0;

        allSvgs.forEach((svg) => {
          // Check if SVG or parent has directional class names
          const parentClasses = (svg.parentElement?.className || '').toString().toLowerCase();
          const svgClasses = (svg.className?.baseVal || '').toLowerCase();
          const allClasses = parentClasses + ' ' + svgClasses;

          const isDirectional = /arrow|chevron|back|forward|next|prev|caret/i.test(allClasses);

          if (isDirectional) {
            directionalIcons++;
            // Check if it has RTL flip transform
            const style = window.getComputedStyle(svg);
            const parentStyle = svg.parentElement ? window.getComputedStyle(svg.parentElement) : null;
            const hasFlip = style.transform.includes('matrix(-1') ||
                           style.transform.includes('scaleX(-1') ||
                           (parentStyle && parentStyle.transform.includes('matrix(-1'));
            if (hasFlip) flippedIcons++;
          }
        });

        return { total: allSvgs.length, directional: directionalIcons, flipped: flippedIcons };
      });

      // If no directional icons found, everything is fine
      if (iconCheck.directional === 0) {
        return {
          checkName: 'Icon Alignment',
          passed: true,
          score: 10,
          issues: [],
          suggestions: [],
        };
      }

      // Check ratio of flipped directional icons
      const unflipped = iconCheck.directional - iconCheck.flipped;
      if (unflipped > 0) {
        issues.push(`${unflipped} directional icon(s) may not be flipped for RTL`);
        suggestions.push('Ensure directional icons (arrows, chevrons) flip in RTL mode using transform: scaleX(-1)');
      }

      // Score: 10 if all flipped, 8 if some, 6 if none
      const score = unflipped === 0 ? 10 : unflipped <= 2 ? 8 : 6;

      return {
        checkName: 'Icon Alignment',
        passed: unflipped === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Icon Alignment', error);
    }
  }

  private async checkTapTargetSizes(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check tap target sizes for mobile (Apple HIG: 44x44pt min, Android: 48x48dp min)
      const targetSizeIssues = await this.page.evaluate(() => {
        const tappableElements = document.querySelectorAll(
          'button, a, input, [role="button"], [onclick], [role="tab"], [role="menuitem"]'
        );

        const tooSmall: string[] = [];
        const tooBig: string[] = [];
        const good: number = 0;

        tappableElements.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          const width = rect.width;
          const height = rect.height;

          // Get element identifier
          const id = (el as HTMLElement).id || `element-${index}`;
          const text = el.textContent?.trim().substring(0, 20) || id;

          // Too small (< 44px minimum for comfortable tapping)
          if (width < 44 || height < 44) {
            tooSmall.push(`"${text}" (${Math.round(width)}x${Math.round(height)}px)`);
          }

          // Too big (> 300px width for mobile - likely not a button/tap target)
          if (width > 300 && el.tagName.toLowerCase() === 'button') {
            tooBig.push(`"${text}" (${Math.round(width)}px wide)`);
          }
        });

        return { tooSmall, tooBig, total: tappableElements.length };
      });

      if (targetSizeIssues.tooSmall.length > 0) {
        issues.push(
          `${targetSizeIssues.tooSmall.length} tap targets TOO SMALL (< 44x44px): ${targetSizeIssues.tooSmall.slice(0, 5).join(', ')}${targetSizeIssues.tooSmall.length > 5 ? '...' : ''}`
        );
        suggestions.push(
          'Minimum tap target size: 44x44px (iOS) or 48x48dp (Android). Add padding to small buttons/links.'
        );
      }

      if (targetSizeIssues.tooBig.length > 0) {
        issues.push(
          `${targetSizeIssues.tooBig.length} buttons TOO WIDE (> 300px): ${targetSizeIssues.tooBig.slice(0, 3).join(', ')}`
        );
        suggestions.push(
          'Mobile buttons should be narrower. Use max-width or appropriate sizing for mobile screens.'
        );
      }

      // Scoring
      const totalIssues = targetSizeIssues.tooSmall.length + targetSizeIssues.tooBig.length;
      let score = 10;
      if (totalIssues > 0 && totalIssues <= 3) score = 7;
      else if (totalIssues > 3 && totalIssues <= 7) score = 5;
      else if (totalIssues > 7) score = 3;

      return {
        checkName: 'Mobile Tap Target Sizes',
        passed: totalIssues === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Mobile Tap Target Sizes', error);
    }
  }

  private async checkColorConsistency(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      // Define Dawati design system colors (from constants/theme.ts)
      // IMPORTANT: Must include ALL colors from theme.ts to avoid false positives
      const designSystemColors: DesignSystemColors = {
        // Primary
        primary: '#673AB7',
        primaryLight: '#9575CD',
        primaryDark: '#512DA8',

        // Background
        background: '#FFFDF9',
        surface: '#FFFFFF',

        // Text
        textPrimary: '#1F2937',
        textSecondary: '#6B7280',
        textTertiary: '#9CA3AF',

        // Buttons
        buttonPrimary: '#673AB7',
        buttonSecondary: '#F5F5F5',
        buttonDanger: '#E8A8A8',

        // Status
        success: '#A8D4B8',
        error: '#E8A8A8',
        warning: '#F4D4A8',
        info: '#A8C8E8',

        // Borders
        border: '#E5E7EB',
        divider: '#F3F4F6',
      };

      // Extended palette: all additional colors from theme.ts that are legitimate
      const extendedColors = [
        // Secondary watercolors
        '#F4C2B8', '#FFEEE8', '#E89B8A',  // Peach
        '#A8C5D4', '#D8E8F0', '#7A9FB0',  // Blue
        '#E8D49A', '#F8ECCE', '#C8B478',  // Gold
        // Royal theme
        '#D4AF37', '#F4CF57', '#3E2723', '#2D2422',
        // Eventelegance
        '#C5A059', '#EAD8B1', '#3E3424', '#5C4D35', '#FAF7F0', '#E6DCC3',
        '#44403c', '#78716c', '#a8a29e',  // Stone
        // Neutrals & backgrounds
        '#F5F5F5', '#F5F7F9', '#FFFFFF', '#FFFDF9',
        // Status variants
        '#D4EAD8', '#78B48A',  // Success
        '#F8E0E0', '#D87878',  // Error
        '#FBF0E0', '#E8B878',  // Warning
        '#D8E8F4', '#78A8D4',  // Info
        // Gray scale
        '#F7F7F7', '#E5E5E5', '#D4D4D4', '#A3A3A3', '#737373', '#525252', '#374151', '#1F2937',
        // Slate scale
        '#fafaf9', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a', '#111827',
        // Vendor purples
        '#6d38b7', '#8B5CF6', '#7C3AED', '#6D28D9', '#F3E8FF', '#F5F3FF', '#E9D5FF',
        // Social/brand
        '#25D366', '#E4405F', '#FF6B9D', '#4ECDC4',
        // Card/bank
        '#FFD700', '#DAA520', '#FF6B35', '#1a1a1a', '#4b5563',
        // Decorative
        '#E879F9', '#FCD34D', '#DDD6FE',
        // Category backgrounds & icons
        '#f3e8ff', '#9333ea', '#fce7f3', '#db2777', '#ffedd5', '#ea580c', '#dbeafe', '#2563eb', '#ffe4e6', '#e11d48', '#e0e7ff', '#4f46e5',
        // Tamara
        '#00A69C',
        // Dark theme
        '#1A1A2E', '#252542', '#B8B8C8',
        // WhatsApp
        '#DCF8C6', '#E5DDD5', '#0B141A', '#075E54', '#667781', '#303030', '#53BDEB', '#F0F0F0', '#8696A0',
        // Marketplace
        '#FFF9F5', '#FFFCFA', '#C9A227', '#A88B1F', '#2D1B0E', '#5D4E37', '#8B7355',
        // Shadows
        '#C4A2C7', '#9B7B9E',
        // Warning
        '#FEF3C7', '#92400E',
        // Tier badges
        '#F59E0B', '#FBBF24', '#F97316', '#CBD5E1',
        // Surface
        '#f8fafc',
        // Disabled
        '#E5E7EB',
        // Card background
        '#FFFFFF',
        // React Native Web framework grays (tab bar, backgrounds)
        '#F2F2F2', '#E8E8E8', '#D9D9D9', '#CCCCCC', '#BFBFBF',
        // Switch/toggle component colors
        '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
        // Additional RNW computed grays
        '#F0F0F0', '#EBEBEB', '#E0E0E0', '#F6F6F6', '#FAFAFA',
        // Common opacity variants (solid equivalents)
        '#FDF2F2', '#F9E8E8', '#FCE4EC', '#FFF3E0', '#E8F5E9',
      ];

      const colorChecker = new ColorChecker(this.page, designSystemColors, extendedColors);
      const result = await colorChecker.checkColorConsistency();

      // Summarize violations
      if (result.violatingElements.length > 0) {
        const byType: Record<string, number> = {};
        result.violatingElements.forEach((v) => {
          byType[v.property] = (byType[v.property] || 0) + 1;
        });

        Object.entries(byType).forEach(([property, count]) => {
          issues.push(`${count} elements with hardcoded ${property}`);
        });

        // Show first few examples
        result.violatingElements.slice(0, 3).forEach((v) => {
          issues.push(`  - ${v.selector}: ${v.property}=${v.actualColor}`);
        });

        if (result.violatingElements.length > 3) {
          issues.push(`  ... and ${result.violatingElements.length - 3} more`);
        }
      }

      suggestions.push(...result.suggestions);

      return {
        checkName: 'Design System Color Consistency',
        passed: result.passed,
        score: result.score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Design System Color Consistency', error);
    }
  }

  /**
   * Check 12: Element Overlap Detection
   * Finds elements that overlap each other (text on text, buttons on buttons)
   */
  private async checkElementOverlap(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const overlaps = await this.page.evaluate(() => {
        // Check interactive/visible elements for overlaps
        const selectors = 'button, a, [role="button"], h1, h2, h3, h4, p, span, img, input, [role="tab"]';
        const elements = Array.from(document.querySelectorAll(selectors));
        const found: string[] = [];

        // Only check visible elements with non-zero size
        const visible = elements.filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight;
        });

        // Compare pairs (limit to first 100 elements for perf)
        const toCheck = visible.slice(0, 100);
        for (let i = 0; i < toCheck.length; i++) {
          for (let j = i + 1; j < toCheck.length; j++) {
            const a = toCheck[i].getBoundingClientRect();
            const b = toCheck[j].getBoundingClientRect();

            // Skip if one is inside the other (parent-child)
            if (toCheck[i].contains(toCheck[j]) || toCheck[j].contains(toCheck[i])) continue;

            // Check overlap (with 4px tolerance)
            const overlapX = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
            const overlapY = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
            const overlapArea = overlapX * overlapY;

            // Only flag significant overlaps (> 100px² area)
            if (overlapArea > 100) {
              const aText = (toCheck[i].textContent || '').trim().substring(0, 15);
              const bText = (toCheck[j].textContent || '').trim().substring(0, 15);
              const aTag = toCheck[i].tagName.toLowerCase();
              const bTag = toCheck[j].tagName.toLowerCase();
              found.push(`${aTag}"${aText}" overlaps ${bTag}"${bText}" (${Math.round(overlapArea)}px²)`);
            }
          }
          if (found.length >= 5) break; // Limit output
        }
        return found;
      });

      if (overlaps.length > 0) {
        issues.push(`${overlaps.length} overlapping element pairs detected`);
        overlaps.forEach(o => issues.push(`  - ${o}`));
        suggestions.push('Fix element positioning to prevent overlaps. Check z-index, margins, and absolute positioning.');
      }

      const score = overlaps.length === 0 ? 10 : overlaps.length <= 2 ? 7 : overlaps.length <= 5 ? 5 : 3;

      return {
        checkName: 'Element Overlap Detection',
        passed: overlaps.length === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Element Overlap Detection', error);
    }
  }

  /**
   * Check 13: Back Button / Navigation Position
   * In RTL, back button should be on the RIGHT side of the header
   */
  private async checkNavigationPosition(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const navCheck = await this.page.evaluate(() => {
        const viewportWidth = window.innerWidth;
        const midpoint = viewportWidth / 2;

        // Find back buttons by common patterns
        const backSelectors = [
          '[aria-label*="back" i]',
          '[aria-label*="رجوع"]',
          '[aria-label*="عودة"]',
          'button svg[class*="arrow-left"], button svg[class*="arrow-back"]',
          'a[href*="back"]',
        ];

        let backButtons: Element[] = [];
        for (const sel of backSelectors) {
          try {
            backButtons.push(...Array.from(document.querySelectorAll(sel)));
          } catch { /* invalid selector */ }
        }

        // Also check first button in header-like areas (top 80px of page)
        const topButtons = Array.from(document.querySelectorAll('button, a[role="button"]')).filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.top < 80 && rect.height > 20 && rect.height < 60 && rect.width < 60;
        });

        // Check if these are on the RIGHT side (RTL) or LEFT side
        const isRTL = document.documentElement.getAttribute('dir') === 'rtl' ||
                      document.body.getAttribute('dir') === 'rtl' ||
                      getComputedStyle(document.body).direction === 'rtl';

        const results = {
          isRTL,
          backButtonsFound: backButtons.length,
          topButtonsFound: topButtons.length,
          wrongSide: 0,
          details: [] as string[],
        };

        const allNavButtons = [...backButtons, ...topButtons];
        const seen = new Set<Element>();

        for (const btn of allNavButtons) {
          if (seen.has(btn)) continue;
          seen.add(btn);
          const rect = btn.getBoundingClientRect();
          const text = (btn.textContent || '').trim().substring(0, 15);

          if (isRTL && rect.left < midpoint * 0.4) {
            // In RTL, back button on far LEFT is wrong (should be RIGHT)
            results.wrongSide++;
            results.details.push(`Back/nav button "${text}" on LEFT (x=${Math.round(rect.left)}), should be RIGHT in RTL`);
          } else if (!isRTL && rect.right > midpoint * 1.6) {
            // In LTR, back button on far RIGHT is wrong (should be LEFT)
            results.wrongSide++;
            results.details.push(`Back/nav button "${text}" on RIGHT (x=${Math.round(rect.right)}), should be LEFT in LTR`);
          }
        }

        return results;
      });

      if (navCheck.wrongSide > 0) {
        issues.push(`${navCheck.wrongSide} navigation button(s) on wrong side for ${navCheck.isRTL ? 'RTL' : 'LTR'}`);
        navCheck.details.forEach(d => issues.push(`  - ${d}`));
        suggestions.push('In RTL mode, back/navigation buttons should be on the RIGHT side of the header');
      }

      // If no nav buttons found at all, give neutral score
      if (navCheck.backButtonsFound === 0 && navCheck.topButtonsFound === 0) {
        return {
          checkName: 'Navigation Position (RTL)',
          passed: true,
          score: 10,
          issues: [],
          suggestions: [],
        };
      }

      const score = navCheck.wrongSide === 0 ? 10 : navCheck.wrongSide <= 1 ? 7 : 4;

      return {
        checkName: 'Navigation Position (RTL)',
        passed: navCheck.wrongSide === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Navigation Position (RTL)', error);
    }
  }

  /**
   * Check 14: Tab Bar Check
   * Verifies tab bar exists, is aligned, has active state, and respects RTL order
   */
  private async checkTabBar(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const tabCheck = await this.page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Find tab bars by common patterns
        const tabBars = document.querySelectorAll(
          '[role="tablist"], nav[class*="tab" i], [class*="tab-bar" i], [class*="tabbar" i], [class*="bottom-nav" i]'
        );

        // Also check for fixed/sticky elements at the bottom of the page
        const bottomElements = Array.from(document.querySelectorAll('nav, div, footer')).filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return (
            rect.bottom >= viewportHeight - 10 &&
            rect.height > 40 && rect.height < 120 &&
            rect.width > viewportWidth * 0.8 &&
            (style.position === 'fixed' || style.position === 'sticky' || rect.top > viewportHeight - 120)
          );
        });

        const tabs = tabBars.length > 0 ? tabBars : bottomElements;

        if (tabs.length === 0) {
          return { found: false, issues: [], tabCount: 0, hasActive: false };
        }

        const tabBar = tabs[0];
        const tabItems = tabBar.querySelectorAll('[role="tab"], a, button');
        const result = {
          found: true,
          tabCount: tabItems.length,
          hasActive: false,
          isBottomAligned: false,
          fullWidth: false,
          issues: [] as string[],
        };

        // Check if tab bar is at the bottom
        const barRect = tabBar.getBoundingClientRect();
        result.isBottomAligned = barRect.bottom >= viewportHeight - 20;
        result.fullWidth = barRect.width >= viewportWidth * 0.9;

        if (!result.isBottomAligned) {
          result.issues.push(`Tab bar not at bottom (bottom: ${Math.round(barRect.bottom)}, viewport: ${viewportHeight})`);
        }
        if (!result.fullWidth) {
          result.issues.push(`Tab bar not full width (${Math.round(barRect.width)}px vs ${viewportWidth}px viewport)`);
        }

        // Check for active tab
        tabItems.forEach(tab => {
          const ariaSelected = tab.getAttribute('aria-selected');
          const classes = (tab.className || '').toString().toLowerCase();
          if (ariaSelected === 'true' || classes.includes('active') || classes.includes('selected')) {
            result.hasActive = true;
          }
        });

        if (!result.hasActive && tabItems.length > 0) {
          result.issues.push('No active/selected tab found (missing aria-selected="true" or active class)');
        }

        // Check tab spacing is even
        if (tabItems.length >= 2) {
          const rects = Array.from(tabItems).map(t => t.getBoundingClientRect());
          const gaps: number[] = [];
          for (let i = 1; i < rects.length; i++) {
            gaps.push(Math.abs(rects[i].left - rects[i - 1].right));
          }
          const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
          const unevenGaps = gaps.filter(g => Math.abs(g - avgGap) > 15).length;
          if (unevenGaps > 0) {
            result.issues.push(`Tab spacing uneven: ${unevenGaps} tabs have irregular gaps`);
          }
        }

        return result;
      });

      if (!tabCheck.found) {
        // No tab bar on this page — not an issue, give full score
        return {
          checkName: 'Tab Bar',
          passed: true,
          score: 10,
          issues: [],
          suggestions: [],
        };
      }

      issues.push(...tabCheck.issues);
      if (tabCheck.issues.length > 0) {
        suggestions.push('Ensure tab bar is fixed at bottom, full width, with a visually active tab indicator');
      }

      const score = tabCheck.issues.length === 0 ? 10 : tabCheck.issues.length <= 1 ? 8 : tabCheck.issues.length <= 2 ? 6 : 4;

      return {
        checkName: 'Tab Bar',
        passed: tabCheck.issues.length === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Tab Bar', error);
    }
  }

  /**
   * Check 15: Flexbox Direction
   * Verifies that row layouts auto-flip in RTL (no hardcoded row-reverse in RTL mode)
   */
  private async checkFlexboxDirection(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const flexCheck = await this.page.evaluate(() => {
        const isRTL = document.documentElement.getAttribute('dir') === 'rtl' ||
                      document.body.getAttribute('dir') === 'rtl' ||
                      getComputedStyle(document.body).direction === 'rtl';

        const elements = document.querySelectorAll('*');
        let wrongDirection = 0;
        let totalRows = 0;

        elements.forEach(el => {
          const style = window.getComputedStyle(el);
          const display = style.display;

          // Only check flex containers
          if (!display.includes('flex')) return;
          const direction = style.flexDirection;

          if (direction === 'row' || direction === 'row-reverse') {
            totalRows++;

            // In RTL with React Native Web, 'row' should auto-flip
            // Check inline style for hardcoded 'row-reverse' which might break auto-flip
            const inlineStyle = (el as HTMLElement).getAttribute('style') || '';
            if (isRTL && /flex-direction:\s*row-reverse/i.test(inlineStyle)) {
              // Hardcoded row-reverse in inline style + RTL = double flip (back to LTR)
              wrongDirection++;
            }
          }
        });

        return { isRTL, totalRows, wrongDirection };
      });

      if (flexCheck.wrongDirection > 0) {
        issues.push(`${flexCheck.wrongDirection} elements with hardcoded flex-direction: row-reverse in inline style (may cause double-flip in RTL)`);
        suggestions.push('Use flexDirection: "row" which auto-flips in RTL. Only use "row-reverse" when you need opposite direction.');
      }

      const score = flexCheck.wrongDirection === 0 ? 10 : flexCheck.wrongDirection <= 3 ? 7 : 4;

      return {
        checkName: 'Flexbox Direction (RTL)',
        passed: flexCheck.wrongDirection === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Flexbox Direction (RTL)', error);
    }
  }

  /**
   * Check 16: Form Input Direction
   * Phone numbers and numeric inputs should stay LTR even in RTL mode
   * Text inputs should follow RTL direction
   */
  private async checkFormInputDirection(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const formCheck = await this.page.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea, [contenteditable]');
        const results = {
          totalInputs: inputs.length,
          phoneWrongDir: 0,
          numberWrongDir: 0,
          textWrongDir: 0,
          details: [] as string[],
        };

        const isRTL = document.documentElement.getAttribute('dir') === 'rtl' ||
                      document.body.getAttribute('dir') === 'rtl' ||
                      getComputedStyle(document.body).direction === 'rtl';

        if (!isRTL) return results; // Only relevant in RTL mode

        inputs.forEach(el => {
          const input = el as HTMLInputElement;
          const type = (input.type || 'text').toLowerCase();
          const style = window.getComputedStyle(input);
          const dir = style.direction;
          const textAlign = style.textAlign;
          const placeholder = input.placeholder || '';
          const name = (input.name || input.id || placeholder).substring(0, 20);

          // Phone inputs should stay LTR
          if (type === 'tel' || /phone|mobile|هاتف|جوال/i.test(placeholder + name)) {
            if (dir !== 'ltr' && textAlign !== 'left') {
              results.phoneWrongDir++;
              results.details.push(`Phone input "${name}" is RTL (should be LTR)`);
            }
          }

          // Number/PIN/OTP inputs should stay LTR
          if (type === 'number' || /otp|pin|code|رمز/i.test(placeholder + name)) {
            if (dir !== 'ltr' && textAlign !== 'left') {
              results.numberWrongDir++;
              results.details.push(`Number/OTP input "${name}" is RTL (should be LTR)`);
            }
          }
        });

        return results;
      });

      if (formCheck.totalInputs === 0) {
        return {
          checkName: 'Form Input Direction',
          passed: true,
          score: 10,
          issues: [],
          suggestions: [],
        };
      }

      if (formCheck.phoneWrongDir > 0) {
        issues.push(`${formCheck.phoneWrongDir} phone input(s) not set to LTR direction`);
        suggestions.push('Phone inputs must use textAlign: "left" and writingDirection: "ltr" even in Arabic mode');
      }
      if (formCheck.numberWrongDir > 0) {
        issues.push(`${formCheck.numberWrongDir} number/OTP input(s) not set to LTR direction`);
        suggestions.push('Number/OTP/PIN inputs must stay LTR for correct digit entry');
      }
      formCheck.details.forEach(d => issues.push(`  - ${d}`));

      const totalWrong = formCheck.phoneWrongDir + formCheck.numberWrongDir;
      const score = totalWrong === 0 ? 10 : totalWrong <= 1 ? 8 : totalWrong <= 3 ? 6 : 4;

      return {
        checkName: 'Form Input Direction',
        passed: totalWrong === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Form Input Direction', error);
    }
  }

  /**
   * Check 17: Arabic Typography / lineHeight
   * Arabic text (especially Tajawal font) gets clipped at the top without proper lineHeight.
   * Only flags elements where lineHeight is ACTUALLY too tight (less than fontSize).
   * Browser default lineHeight "normal" = ~1.2x fontSize which is acceptable.
   * From RTL-CHECKLIST.md Section 4: "Arabic text WILL get clipped without proper lineHeight!"
   */
  private async checkArabicTypography(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const typoCheck = await this.page.evaluate(() => {
        const textElements = document.querySelectorAll(
          'h1, h2, h3, h4, h5, h6, p, span, label, div, a, button, [role="heading"]'
        );
        let clippedText = 0;
        let totalLargeText = 0;
        const details: string[] = [];

        textElements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          const lineHeight = style.lineHeight;
          const text = (el.textContent || '').trim().substring(0, 20);

          // Skip empty, tiny elements, or elements with no direct text
          if (!text || fontSize < 18) return;
          // Skip elements that just contain child text (not direct)
          if (el.children.length > 0 && !(el as HTMLElement).childNodes[0]?.nodeValue?.trim()) return;

          totalLargeText++;

          // "normal" lineHeight = ~1.2x fontSize in browsers — this is fine for Arabic
          // Only flag elements where lineHeight is explicitly set TOO TIGHT
          if (lineHeight !== 'normal') {
            const lhValue = parseFloat(lineHeight);
            // lineHeight less than fontSize = text WILL clip
            if (lhValue > 0 && lhValue < fontSize) {
              clippedText++;
              if (details.length < 5) {
                details.push(
                  `${el.tagName.toLowerCase()}"${text}" fontSize=${fontSize}px lineHeight=${lhValue}px (text will clip!)`
                );
              }
            }
          }

          // Also check if text is visually clipped (scrollHeight > clientHeight)
          const htmlEl = el as HTMLElement;
          if (htmlEl.scrollHeight > htmlEl.clientHeight + 2 && htmlEl.clientHeight > 0) {
            clippedText++;
            if (details.length < 5) {
              details.push(
                `${el.tagName.toLowerCase()}"${text}" text overflows container (scrollH=${htmlEl.scrollHeight} > clientH=${htmlEl.clientHeight})`
              );
            }
          }
        });

        return { totalLargeText, clippedText, details };
      });

      if (typoCheck.totalLargeText === 0) {
        return {
          checkName: 'Arabic Typography (lineHeight)',
          passed: true,
          score: 10,
          issues: [],
          suggestions: [],
        };
      }

      if (typoCheck.clippedText > 0) {
        issues.push(
          `${typoCheck.clippedText} large text element(s) with clipping issues`
        );
        typoCheck.details.forEach((d) => issues.push(`  - ${d}`));
        suggestions.push(
          'Ensure lineHeight >= fontSize for Arabic text. Use Typography.lineHeights from theme.'
        );
      }

      const score = typoCheck.clippedText === 0 ? 10 : typoCheck.clippedText <= 2 ? 8 : typoCheck.clippedText <= 5 ? 6 : 4;

      return {
        checkName: 'Arabic Typography (lineHeight)',
        passed: typoCheck.clippedText === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Arabic Typography (lineHeight)', error);
    }
  }

  /**
   * Check 18: Animation Direction
   * translateX animations must account for RTL direction.
   * In RTL mode, translateX values should be negated.
   * From RTL-CHECKLIST.md Section 11: "translateX: isRTL ? -100 : 100"
   */
  private async checkAnimationDirection(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const animCheck = await this.page.evaluate(() => {
        const isRTL =
          document.documentElement.getAttribute('dir') === 'rtl' ||
          document.body.getAttribute('dir') === 'rtl' ||
          getComputedStyle(document.body).direction === 'rtl';

        if (!isRTL) return { isRTL, totalAnimated: 0, wrongDirection: 0, details: [] as string[] };

        const allElements = document.querySelectorAll('*');
        let totalAnimated = 0;
        let wrongDirection = 0;
        const details: string[] = [];

        allElements.forEach((el) => {
          const style = window.getComputedStyle(el);
          const transform = style.transform;
          const transition = style.transition;
          const animation = style.animationName;

          // Check for translateX in inline styles (hardcoded positive values in RTL)
          const inlineStyle = (el as HTMLElement).getAttribute('style') || '';

          // Look for translateX with positive values in inline styles while in RTL
          // Positive translateX in RTL moves element LEFT (wrong direction for slide-in from left)
          const translateMatch = inlineStyle.match(/translateX\(\s*(\d+)/);
          if (translateMatch) {
            totalAnimated++;
            const value = parseInt(translateMatch[1]);
            if (value > 0) {
              wrongDirection++;
              const text = (el.textContent || '').trim().substring(0, 15);
              if (details.length < 5) {
                details.push(
                  `Element "${text}" has translateX(${value}) in RTL mode (may need negation)`
                );
              }
            }
          }

          // Check for CSS animations that use translateX (via animation-name)
          if (animation && animation !== 'none') {
            totalAnimated++;
            // Can't inspect keyframes from JS, but flag that animations exist
          }

          // Check for transition on transform property
          if (transition && transition.includes('transform') && transform && transform !== 'none') {
            // Element has animated transform — check if it's moving in wrong direction
            const matrix = transform.match(/matrix\(([^)]+)\)/);
            if (matrix) {
              const values = matrix[1].split(',').map((v) => parseFloat(v.trim()));
              const translateXValue = values[4]; // translateX is 5th value in matrix
              if (translateXValue !== undefined && Math.abs(translateXValue) > 50) {
                totalAnimated++;
                // In RTL, large positive translateX might indicate wrong animation direction
                // This is heuristic — positive translateX in RTL often means animation didn't flip
              }
            }
          }
        });

        return { isRTL, totalAnimated, wrongDirection, details };
      });

      if (!animCheck.isRTL || animCheck.totalAnimated === 0) {
        return {
          checkName: 'Animation Direction (RTL)',
          passed: true,
          score: 10,
          issues: [],
          suggestions: [],
        };
      }

      if (animCheck.wrongDirection > 0) {
        issues.push(
          `${animCheck.wrongDirection} element(s) with potentially wrong translateX direction in RTL mode`
        );
        animCheck.details.forEach((d) => issues.push(`  - ${d}`));
        suggestions.push(
          'In RTL mode, negate translateX values: translateX: isRTL ? -100 : 100'
        );
        suggestions.push(
          'Slide animations should flip direction in RTL. Check carousel/swiper components too.'
        );
      }

      const score =
        animCheck.wrongDirection === 0
          ? 10
          : animCheck.wrongDirection <= 2
            ? 8
            : animCheck.wrongDirection <= 5
              ? 6
              : 4;

      return {
        checkName: 'Animation Direction (RTL)',
        passed: animCheck.wrongDirection === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Animation Direction (RTL)', error);
    }
  }

  /**
   * Check 19: Number Formatting
   * Flag Arabic-Eastern numerals (١٢٣٤) in UI contexts where Western (1234) is preferred.
   */
  private async checkNumberFormatting(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const numberCheck = await this.page.evaluate(() => {
        const text = document.body.innerText;
        // Arabic-Eastern numeral range: ٠١٢٣٤٥٦٧٨٩
        const arabicEasternPattern = /[٠-٩]{2,}/g;
        const matches = text.match(arabicEasternPattern) || [];
        return {
          arabicEasternCount: matches.length,
          samples: matches.slice(0, 5),
        };
      });

      if (numberCheck.arabicEasternCount > 0) {
        issues.push(
          `${numberCheck.arabicEasternCount} instance(s) of Arabic-Eastern numerals (${numberCheck.samples.join(', ')})`
        );
        suggestions.push(
          'Use Western numerals (0-9) in UI for consistency. Arabic-Eastern (٠-٩) may confuse users in Saudi market.'
        );
      }

      const score = numberCheck.arabicEasternCount === 0 ? 10
        : numberCheck.arabicEasternCount <= 3 ? 8 : numberCheck.arabicEasternCount <= 8 ? 6 : 4;

      return {
        checkName: 'Number Formatting',
        passed: numberCheck.arabicEasternCount === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Number Formatting', error);
    }
  }

  /**
   * Check 20: Accessibility Integration
   * Validates lang="ar", ARIA attributes for RTL, contrast in RTL mode.
   */
  private async checkAccessibilityIntegration(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const a11yCheck = await this.page.evaluate(() => {
        const results = {
          missingLangAr: false,
          missingAriaLabels: 0,
          lowContrastCount: 0,
          missingAltText: 0,
        };

        // Check lang="ar" on <html>
        const lang = document.documentElement.getAttribute('lang');
        if (!lang || !lang.startsWith('ar')) {
          results.missingLangAr = true;
        }

        // Check interactive elements for aria-labels
        const interactive = document.querySelectorAll('button, a, input, select, [role="button"], [role="tab"]');
        interactive.forEach(el => {
          const hasLabel = el.getAttribute('aria-label') ||
                          el.getAttribute('aria-labelledby') ||
                          el.getAttribute('title') ||
                          (el.textContent || '').trim().length > 0;
          if (!hasLabel) {
            results.missingAriaLabels++;
          }
        });

        // Check images for alt text
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (!img.getAttribute('alt') && !img.getAttribute('aria-label') && !img.getAttribute('role')) {
            results.missingAltText++;
          }
        });

        // Basic contrast check: look for light text on light background
        const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, label, a');
        const checked = Math.min(textElements.length, 50);
        for (let i = 0; i < checked; i++) {
          const el = textElements[i] as HTMLElement;
          const style = window.getComputedStyle(el);
          const color = style.color;
          const bgColor = style.backgroundColor;

          // Parse rgb values
          const parseRgb = (c: string): number[] | null => {
            const m = c.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
            return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : null;
          };

          const fg = parseRgb(color);
          const bg = parseRgb(bgColor);

          if (fg && bg) {
            // Simple luminance check (not full WCAG but catches obvious issues)
            const fgLum = (fg[0] * 0.299 + fg[1] * 0.587 + fg[2] * 0.114);
            const bgLum = (bg[0] * 0.299 + bg[1] * 0.587 + bg[2] * 0.114);
            const contrast = Math.abs(fgLum - bgLum);

            if (contrast < 40 && fgLum > 100 && bgLum > 100) {
              results.lowContrastCount++;
            }
          }
        }

        return results;
      });

      if (a11yCheck.missingLangAr) {
        issues.push('HTML element missing lang="ar" attribute');
        suggestions.push('Add lang="ar" to <html> tag for screen readers');
      }

      if (a11yCheck.missingAriaLabels > 0) {
        issues.push(`${a11yCheck.missingAriaLabels} interactive element(s) without accessible labels`);
        suggestions.push('Add aria-label or aria-labelledby to all interactive elements');
      }

      if (a11yCheck.missingAltText > 0) {
        issues.push(`${a11yCheck.missingAltText} image(s) missing alt text`);
        suggestions.push('Add descriptive alt text in Arabic for all images');
      }

      if (a11yCheck.lowContrastCount > 0) {
        issues.push(`${a11yCheck.lowContrastCount} element(s) with potentially low contrast`);
        suggestions.push('Ensure minimum 4.5:1 contrast ratio for text (WCAG AA)');
      }

      const totalIssues = (a11yCheck.missingLangAr ? 1 : 0) + a11yCheck.missingAriaLabels + a11yCheck.missingAltText + a11yCheck.lowContrastCount;
      const score = totalIssues === 0 ? 10 : totalIssues <= 3 ? 8 : totalIssues <= 8 ? 6 : 4;

      return {
        checkName: 'Accessibility Integration',
        passed: totalIssues === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Accessibility Integration', error);
    }
  }

  /**
   * Check 21: Dynamic Content & Scripts
   * Detects JavaScript-generated text that isn't localized and form injection risks.
   */
  private async checkDynamicContent(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const dynamicCheck = await this.page.evaluate(() => {
        const results = {
          unlocalizedAlerts: 0,
          scriptInjectionRisks: 0,
          unlocalizedPlaceholders: 0,
        };

        // Check for English placeholder text in inputs (should be Arabic)
        const inputs = document.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          const placeholder = (input as HTMLInputElement).placeholder || '';
          // If placeholder is purely English (no Arabic chars), flag it
          if (placeholder.length > 3 && /^[a-zA-Z0-9\s@._,!?-]+$/.test(placeholder)) {
            results.unlocalizedPlaceholders++;
          }
        });

        // Check for form inputs without proper sanitization attributes
        const textInputs = document.querySelectorAll('input[type="text"], textarea');
        textInputs.forEach(input => {
          const el = input as HTMLInputElement;
          // Check if input could accept script content (no pattern/maxlength)
          if (!el.pattern && !el.maxLength && el.type === 'text') {
            // Only flag if the field name suggests it accepts free text
            const name = (el.name || el.placeholder || '').toLowerCase();
            if (/name|title|description|comment|message|note|details/i.test(name)) {
              results.scriptInjectionRisks++;
            }
          }
        });

        return results;
      });

      if (dynamicCheck.unlocalizedPlaceholders > 0) {
        issues.push(`${dynamicCheck.unlocalizedPlaceholders} input placeholder(s) in English (should be Arabic)`);
        suggestions.push('Localize all placeholder text to Arabic using i18n');
      }

      if (dynamicCheck.scriptInjectionRisks > 0) {
        issues.push(`${dynamicCheck.scriptInjectionRisks} text input(s) without pattern/maxLength (script injection risk)`);
        suggestions.push('Add pattern validation and maxLength to free-text inputs');
      }

      const totalIssues = dynamicCheck.unlocalizedPlaceholders + dynamicCheck.scriptInjectionRisks;
      const score = totalIssues === 0 ? 10 : totalIssues <= 3 ? 8 : totalIssues <= 6 ? 6 : 4;

      return {
        checkName: 'Dynamic Content & Scripts',
        passed: totalIssues === 0,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Dynamic Content & Scripts', error);
    }
  }

  /**
   * Check 22: Scroll Direction
   * Horizontal scroll containers (carousels, sliders) should start scrolled to the right in RTL.
   */
  private async checkScrollDirection(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const scrollCheck = await this.page.evaluate(() => {
        let wrongDirection = 0;
        const scrollContainers = document.querySelectorAll('[style*="overflow"], [class*="carousel"], [class*="slider"], [class*="scroll"]');

        scrollContainers.forEach(el => {
          const htmlEl = el as HTMLElement;
          const style = window.getComputedStyle(htmlEl);
          const isHorizontalScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';

          if (isHorizontalScroll && htmlEl.scrollWidth > htmlEl.clientWidth) {
            // In RTL, scrollLeft should be at the rightmost position (negative or max)
            if (htmlEl.scrollLeft === 0) {
              wrongDirection++;
            }
          }
        });

        return { wrongDirection, total: scrollContainers.length };
      });

      if (scrollCheck.wrongDirection > 0) {
        issues.push(`${scrollCheck.wrongDirection} horizontal scroll container(s) start at left (should start at right in RTL)`);
        suggestions.push('Set initial scroll position to rightmost for RTL layouts');
      }

      const score = scrollCheck.wrongDirection === 0 ? 10 : scrollCheck.wrongDirection <= 2 ? 7 : 4;

      return { checkName: 'Scroll Direction (RTL)', passed: scrollCheck.wrongDirection === 0, score, issues, suggestions };
    } catch (error) {
      return this.createErrorResult('Scroll Direction (RTL)', error);
    }
  }

  /**
   * Check 23: Text Truncation Direction
   * In RTL, text-overflow: ellipsis should show "..." on the LEFT side.
   */
  private async checkTruncationDirection(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const truncCheck = await this.page.evaluate(() => {
        let truncatedElements = 0;
        let wrongDirection = 0;

        const els = document.querySelectorAll('*');
        els.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.textOverflow === 'ellipsis' && style.overflow === 'hidden') {
            truncatedElements++;
            // In RTL, the text-align should be 'right' or 'start' for proper truncation
            const dir = style.direction;
            const textAlign = style.textAlign;
            if (dir === 'rtl' && textAlign === 'left') {
              wrongDirection++;
            }
          }
        });

        return { truncatedElements, wrongDirection };
      });

      if (truncCheck.wrongDirection > 0) {
        issues.push(`${truncCheck.wrongDirection} truncated element(s) with wrong text-align in RTL`);
        suggestions.push('Use text-align: start (not left) for truncated text in RTL');
      }

      const score = truncCheck.wrongDirection === 0 ? 10 : truncCheck.wrongDirection <= 2 ? 7 : 5;

      return { checkName: 'Truncation Direction', passed: truncCheck.wrongDirection === 0, score, issues, suggestions };
    } catch (error) {
      return this.createErrorResult('Truncation Direction', error);
    }
  }

  /**
   * Check 24: List/Table RTL Order
   * In RTL, table columns should be reversed (rightmost = first data column).
   */
  private async checkListTableOrder(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const tableCheck = await this.page.evaluate(() => {
        let wrongOrder = 0;
        const tables = document.querySelectorAll('table');

        tables.forEach(table => {
          const style = window.getComputedStyle(table);
          // Tables in RTL should have direction: rtl
          if (style.direction !== 'rtl') {
            wrongOrder++;
          }
        });

        // Check ordered lists alignment
        const lists = document.querySelectorAll('ol, ul');
        let wrongListAlign = 0;
        lists.forEach(list => {
          const style = window.getComputedStyle(list);
          // List markers should be on the right in RTL
          if (style.direction === 'ltr') {
            wrongListAlign++;
          }
        });

        return { wrongOrder, wrongListAlign, tables: tables.length, lists: lists.length };
      });

      if (tableCheck.wrongOrder > 0) {
        issues.push(`${tableCheck.wrongOrder} table(s) without RTL direction`);
        suggestions.push('Add direction: rtl to table elements');
      }

      if (tableCheck.wrongListAlign > 0) {
        issues.push(`${tableCheck.wrongListAlign} list(s) with LTR direction`);
        suggestions.push('Ensure lists inherit RTL direction');
      }

      const totalIssues = tableCheck.wrongOrder + tableCheck.wrongListAlign;
      const score = totalIssues === 0 ? 10 : totalIssues <= 2 ? 7 : 5;

      return { checkName: 'List/Table RTL Order', passed: totalIssues === 0, score, issues, suggestions };
    } catch (error) {
      return this.createErrorResult('List/Table RTL Order', error);
    }
  }

  /**
   * Check 25: i18n Completeness
   * Detect raw i18n keys that failed to resolve to Arabic translations.
   */
  private async checkI18nCompleteness(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const i18nCheck = await this.page.evaluate(() => {
        const text = document.body?.innerText || '';
        const rawKeys: string[] = [];

        // Pattern for raw i18n keys: snake_case or dot.notation
        const patterns = [
          /\b[a-z]{2,}_[a-z_]{2,}\b/g,     // snake_case: vendor_signin_title
          /\b[a-z]{2,}\.[a-z]{2,}\.[a-z]+\b/g, // dot.notation: auth.login.title
        ];

        for (const pattern of patterns) {
          const matches = text.match(pattern) || [];
          for (const m of matches) {
            // Filter out common false positives
            if (m.includes('http') || m.includes('www') || m.includes('com') ||
                m.includes('font_') || m.includes('text_') || m.includes('data_')) continue;
            // Must be at least 5 chars to be a meaningful key
            if (m.length >= 5 && !rawKeys.includes(m)) {
              rawKeys.push(m);
            }
          }
        }

        return { rawKeys: rawKeys.slice(0, 20), count: rawKeys.length };
      });

      if (i18nCheck.count > 0) {
        issues.push(`${i18nCheck.count} possible raw i18n key(s) displayed: ${i18nCheck.rawKeys.slice(0, 5).join(', ')}`);
        suggestions.push('Verify all i18n keys resolve to Arabic translations');
      }

      const score = i18nCheck.count === 0 ? 10 : i18nCheck.count <= 2 ? 8 : i18nCheck.count <= 5 ? 6 : 4;

      return { checkName: 'i18n Completeness', passed: i18nCheck.count === 0, score, issues, suggestions };
    } catch (error) {
      return this.createErrorResult('i18n Completeness', error);
    }
  }

  /**
   * Check 26: Safe Area / Notch Handling
   * Content should not be hidden behind iPhone notch, Dynamic Island, or Android status bar.
   */
  private async checkSafeAreaHandling(): Promise<RTLCheckResult> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    try {
      const safeAreaCheck = await this.page.evaluate(() => {
        let usesSafeArea = false;
        let contentInDangerZone = false;

        // Check if any element uses safe area insets
        const allElements = document.querySelectorAll('*');
        for (const el of Array.from(allElements)) {
          const style = window.getComputedStyle(el);
          const paddingTop = parseFloat(style.paddingTop);
          // Check for safe area handling (≥44px padding at top suggests notch awareness)
          if (paddingTop >= 44 && el === document.body?.firstElementChild) {
            usesSafeArea = true;
            break;
          }
        }

        // Check if any interactive element is in the top 44px (notch zone)
        const interactive = document.querySelectorAll('a, button, input, [role="button"]');
        interactive.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.top < 44 && rect.top >= 0 && rect.width > 0 && rect.height > 0) {
            contentInDangerZone = true;
          }
        });

        return { usesSafeArea, contentInDangerZone };
      });

      if (safeAreaCheck.contentInDangerZone && !safeAreaCheck.usesSafeArea) {
        issues.push('Interactive content found in notch/status bar zone (top 44px) without safe area handling');
        suggestions.push('Use env(safe-area-inset-top) or SafeAreaView to avoid content behind notch');
      }

      const score = issues.length === 0 ? 10 : 6;

      return { checkName: 'Safe Area / Notch Handling', passed: issues.length === 0, score, issues, suggestions };
    } catch (error) {
      return this.createErrorResult('Safe Area / Notch Handling', error);
    }
  }

  private createErrorResult(checkName: string, error: any): RTLCheckResult {
    return {
      checkName,
      passed: false,
      score: 0,
      issues: [`Check failed: ${error.message}`],
      suggestions: ['Fix the underlying error and re-run check'],
    };
  }

  private generateSummary(overallScore: number, checks: RTLCheckResult[]): string {
    const failedChecks = checks.filter((c) => !c.passed);

    if (overallScore >= 9.0) {
      return 'Excellent RTL support - no major issues detected';
    } else if (overallScore >= 7.0) {
      return `Good RTL support - ${failedChecks.length} minor issues to address`;
    } else if (overallScore >= 5.0) {
      return `RTL support needs improvement - ${failedChecks.length} issues found`;
    } else {
      return `Poor RTL support - ${failedChecks.length} critical issues must be fixed`;
    }
  }
}

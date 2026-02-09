import { Page } from 'playwright';
import { ComprehensiveRTLResult, RTLCheckResult } from '../types';

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
      const leftRightUsage = await this.page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const problems: string[] = [];

        elements.forEach((el) => {
          const style = window.getComputedStyle(el);

          // Check for marginLeft/Right instead of Start/End
          if (style.marginLeft !== '0px' && style.marginLeft !== 'auto') {
            problems.push('marginLeft');
          }
          if (style.marginRight !== '0px' && style.marginRight !== 'auto') {
            problems.push('marginRight');
          }

          // Check for paddingLeft/Right
          if (style.paddingLeft !== '0px') {
            problems.push('paddingLeft');
          }
          if (style.paddingRight !== '0px') {
            problems.push('paddingRight');
          }
        });

        return problems.length;
      });

      if (leftRightUsage > 10) {
        issues.push(`${leftRightUsage} elements using Left/Right instead of Start/End`);
        suggestions.push('Use marginStart/End and paddingStart/End');
      }

      const score = leftRightUsage <= 10 ? 10 : leftRightUsage <= 30 ? 7 : 4;

      return {
        checkName: 'Margin/Padding Direction',
        passed: leftRightUsage <= 10,
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

      // Common Arabic strings that should use i18n keys
      const arabicPatterns = [
        'إرسال', 'إلغاء', 'حفظ', 'حذف', 'تعديل', 'إضافة', 'بحث', 'تحميل',
        'خطأ', 'نجح', 'تسجيل الدخول', 'تسجيل', 'خروج', 'كلمة المرور',
        'ريال', 'ر.س', 'س.ر', 'سر', 'رس', // Currency text (should use SVG icon)
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
                           ['ريال', 'ر.س', 'س.ر', 'سر', 'رس'].includes(pattern);

          if (isCurrency) {
            issues.push(`Hardcoded currency text: "${pattern}" (should use SVG icon)`);
          } else {
            issues.push(`Hardcoded string found: "${pattern}"`);
          }
        }
      }

      if (issues.length > 0) {
        suggestions.push('Replace all hardcoded strings with i18n keys: t("key")');
        suggestions.push('Replace currency text (SAR/ريال/ر.س/etc.) with SVG icon: /Users/saadalateeq/Desktop/untitled folder 4/SVG/Saudi_Riyal_Symbol-2.svg');
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
      const hardcodedCurrencyPatterns = [
        /SAR/gi,           // SAR, sar, Sar
        /ر\.س/g,           // ر.س (Arabic with dot)
        /س\.ر/g,           // س.ر (reversed)
        /ريال/g,           // ريال (full Arabic word)
        /سر/g,             // سر (without dots)
        /رس/g,             // رس (reversed without dots)
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
          'Replace hardcoded currency text (SAR/ريال/ر.س/س.ر/سر) with SVG icon: /Users/saadalateeq/Desktop/untitled folder 4/SVG/Saudi_Riyal_Symbol-2.svg'
        );
      }

      // Also check for currency symbol before number (WRONG placement)
      const wrongPlacementPatterns = [
        /(?:SAR|ر\.س|س\.ر|ريال|سر|رس)\s*\d+/gi,
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

      if (!hasHijri) {
        issues.push('No Hijri calendar dates found');
        suggestions.push('Display both Hijri and Gregorian calendars for Saudi Arabia');
      }

      const score = hasHijri ? 10 : 5;

      return {
        checkName: 'Hijri Calendar',
        passed: hasHijri,
        score,
        issues,
        suggestions,
      };
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
      // This is a basic check - full icon flipping would require more detailed analysis
      const iconElements = await this.page.evaluate(() => {
        const icons = document.querySelectorAll('[class*="icon"], [class*="arrow"], [class*="chevron"], svg');
        return icons.length;
      });

      // Assume icons are handled correctly if they exist
      const score = iconElements > 0 ? 8 : 10;

      if (iconElements > 0) {
        suggestions.push('Ensure directional icons (arrows, chevrons) flip in RTL mode');
      }

      return {
        checkName: 'Icon Alignment',
        passed: true,
        score,
        issues,
        suggestions,
      };
    } catch (error) {
      return this.createErrorResult('Icon Alignment', error);
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

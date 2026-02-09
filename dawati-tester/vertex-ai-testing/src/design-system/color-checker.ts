import { Page } from 'playwright';

/**
 * Design System Color Checker
 *
 * Validates that components use colors from the design system theme,
 * catching hardcoded colors and color inconsistencies.
 */

export interface DesignSystemColors {
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Background colors
  background: string;
  surface: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Button colors
  buttonPrimary: string;
  buttonSecondary: string;
  buttonDanger: string;

  // Status colors
  success: string;
  error: string;
  warning: string;
  info: string;

  // Borders
  border: string;
  divider: string;
}

export interface ColorCheckResult {
  passed: boolean;
  score: number; // 0-10
  issues: string[];
  suggestions: string[];
  violatingElements: Array<{
    selector: string;
    property: string;
    actualColor: string;
    expectedColor?: string;
    reason: string;
  }>;
}

export class ColorChecker {
  private page: Page;
  private designSystemColors: DesignSystemColors;

  constructor(page: Page, designSystemColors: DesignSystemColors) {
    this.page = page;
    this.designSystemColors = designSystemColors;
  }

  /**
   * Check all elements for color consistency
   */
  async checkColorConsistency(): Promise<ColorCheckResult> {
    console.log(`[Color Checker] Validating design system colors...`);

    const issues: string[] = [];
    const suggestions: string[] = [];
    const violatingElements: Array<{
      selector: string;
      property: string;
      actualColor: string;
      expectedColor?: string;
      reason: string;
    }> = [];

    try {
      // Check 1: Hardcoded hex colors (not from design system)
      const hardcodedColors = await this.findHardcodedColors();
      if (hardcodedColors.length > 0) {
        issues.push(`Found ${hardcodedColors.length} elements with hardcoded colors`);
        violatingElements.push(...hardcodedColors);
        suggestions.push('Replace hardcoded hex colors with theme tokens from constants/theme.ts');
      }

      // Check 2: Button color consistency
      const buttonIssues = await this.checkButtonColors();
      if (buttonIssues.length > 0) {
        issues.push(`Found ${buttonIssues.length} buttons with inconsistent colors`);
        violatingElements.push(...buttonIssues);
        suggestions.push('All buttons should use primary/secondary/danger theme colors');
      }

      // Check 3: Text color consistency
      const textIssues = await this.checkTextColors();
      if (textIssues.length > 0) {
        issues.push(`Found ${textIssues.length} text elements with non-standard colors`);
        violatingElements.push(...textIssues);
        suggestions.push('Use textPrimary/textSecondary/textTertiary for all text');
      }

      // Check 4: Background color consistency
      const bgIssues = await this.checkBackgroundColors();
      if (bgIssues.length > 0) {
        issues.push(`Found ${bgIssues.length} elements with non-standard backgrounds`);
        violatingElements.push(...bgIssues);
        suggestions.push('Use background/surface theme tokens for backgrounds');
      }

      // Calculate score
      const totalIssues = violatingElements.length;
      let score = 10;
      if (totalIssues > 0 && totalIssues <= 3) score = 8;
      else if (totalIssues > 3 && totalIssues <= 7) score = 6;
      else if (totalIssues > 7 && totalIssues <= 15) score = 4;
      else if (totalIssues > 15) score = 2;

      console.log(`[Color Checker] Color consistency score: ${score}/10 (${totalIssues} issues)`);

      return {
        passed: totalIssues === 0,
        score,
        issues,
        suggestions,
        violatingElements,
      };
    } catch (error: any) {
      console.error(`[Color Checker] Failed: ${error.message}`);
      return {
        passed: false,
        score: 0,
        issues: [`Color check failed: ${error.message}`],
        suggestions: ['Fix underlying error and re-run check'],
        violatingElements: [],
      };
    }
  }

  /**
   * Find elements with hardcoded hex colors (not from design system)
   */
  private async findHardcodedColors(): Promise<Array<{
    selector: string;
    property: string;
    actualColor: string;
    expectedColor?: string;
    reason: string;
  }>> {
    return await this.page.evaluate((allowedColors) => {
      const violations: Array<{
        selector: string;
        property: string;
        actualColor: string;
        expectedColor?: string;
        reason: string;
      }> = [];

      // Convert allowed colors to RGB for comparison
      const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgb(${r}, ${g}, ${b})`;
      };

      const allowedRgbColors = Object.values(allowedColors).map((hex) => hexToRgb(hex));

      // Check all visible elements
      const elements = document.querySelectorAll('*');
      elements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return; // Skip invisible

        const computed = window.getComputedStyle(el);
        const bgColor = computed.backgroundColor;
        const textColor = computed.color;

        // Get element identifier
        const id = (el as HTMLElement).id || el.className || `element-${index}`;
        const selector = el.tagName.toLowerCase() + (id ? `#${id}` : '');

        // Check background color
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && !allowedRgbColors.includes(bgColor)) {
          // Skip very common colors (pure white, pure black, transparent)
          if (!['rgb(255, 255, 255)', 'rgb(0, 0, 0)', 'transparent'].includes(bgColor)) {
            violations.push({
              selector,
              property: 'backgroundColor',
              actualColor: bgColor,
              reason: 'Hardcoded background color not in design system',
            });
          }
        }

        // Check text color
        if (textColor && !allowedRgbColors.includes(textColor)) {
          // Skip pure black (default) unless it's explicitly set
          if (textColor !== 'rgb(0, 0, 0)') {
            violations.push({
              selector,
              property: 'color',
              actualColor: textColor,
              reason: 'Hardcoded text color not in design system',
            });
          }
        }
      });

      // Limit to first 20 violations (avoid overwhelming output)
      return violations.slice(0, 20);
    }, this.designSystemColors);
  }

  /**
   * Check button color consistency
   */
  private async checkButtonColors(): Promise<Array<{
    selector: string;
    property: string;
    actualColor: string;
    expectedColor?: string;
    reason: string;
  }>> {
    return await this.page.evaluate((expectedColors) => {
      const violations: Array<{
        selector: string;
        property: string;
        actualColor: string;
        expectedColor?: string;
        reason: string;
      }> = [];

      const buttons = document.querySelectorAll('button, [role="button"]');
      buttons.forEach((btn, index) => {
        const computed = window.getComputedStyle(btn);
        const bgColor = computed.backgroundColor;
        const id = (btn as HTMLElement).id || btn.className || `button-${index}`;
        const selector = `button#${id}`;

        // Check if button uses expected colors
        const expectedBgColors = [
          expectedColors.buttonPrimary,
          expectedColors.buttonSecondary,
          expectedColors.buttonDanger,
          'rgb(255, 255, 255)', // White (allowed for ghost buttons)
          'rgba(0, 0, 0, 0)',    // Transparent (allowed for text buttons)
        ];

        if (!expectedBgColors.includes(bgColor)) {
          violations.push({
            selector,
            property: 'backgroundColor',
            actualColor: bgColor,
            expectedColor: expectedColors.buttonPrimary,
            reason: 'Button color does not match primary/secondary/danger theme',
          });
        }
      });

      return violations.slice(0, 10);
    }, {
      buttonPrimary: this.designSystemColors.primary,
      buttonSecondary: this.designSystemColors.surface,
      buttonDanger: this.designSystemColors.error,
    });
  }

  /**
   * Check text color consistency
   */
  private async checkTextColors(): Promise<Array<{
    selector: string;
    property: string;
    actualColor: string;
    expectedColor?: string;
    reason: string;
  }>> {
    return await this.page.evaluate((expectedColors) => {
      const violations: Array<{
        selector: string;
        property: string;
        actualColor: string;
        expectedColor?: string;
        reason: string;
      }> = [];

      const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgb(${r}, ${g}, ${b})`;
      };

      const expectedTextColors = [
        hexToRgb(expectedColors.textPrimary),
        hexToRgb(expectedColors.textSecondary),
        hexToRgb(expectedColors.textTertiary),
        'rgb(255, 255, 255)', // White (allowed on dark backgrounds)
        'rgb(0, 0, 0)',       // Black (default)
      ];

      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, label');
      textElements.forEach((el, index) => {
        const computed = window.getComputedStyle(el);
        const textColor = computed.color;
        const id = (el as HTMLElement).id || el.className || `text-${index}`;
        const selector = `${el.tagName.toLowerCase()}#${id}`;

        if (!expectedTextColors.includes(textColor)) {
          violations.push({
            selector,
            property: 'color',
            actualColor: textColor,
            expectedColor: expectedColors.textPrimary,
            reason: 'Text color does not match textPrimary/textSecondary/textTertiary',
          });
        }
      });

      return violations.slice(0, 10);
    }, this.designSystemColors);
  }

  /**
   * Check background color consistency
   */
  private async checkBackgroundColors(): Promise<Array<{
    selector: string;
    property: string;
    actualColor: string;
    expectedColor?: string;
    reason: string;
  }>> {
    return await this.page.evaluate((expectedColors) => {
      const violations: Array<{
        selector: string;
        property: string;
        actualColor: string;
        expectedColor?: string;
        reason: string;
      }> = [];

      const hexToRgb = (hex: string): string => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgb(${r}, ${g}, ${b})`;
      };

      const expectedBgColors = [
        hexToRgb(expectedColors.background),
        hexToRgb(expectedColors.surface),
        'rgb(255, 255, 255)',  // White (allowed)
        'rgba(0, 0, 0, 0)',     // Transparent (allowed)
      ];

      // Check main containers
      const containers = document.querySelectorAll('main, section, div[class*="container"], div[class*="card"]');
      containers.forEach((el, index) => {
        const computed = window.getComputedStyle(el);
        const bgColor = computed.backgroundColor;
        const id = (el as HTMLElement).id || el.className || `container-${index}`;
        const selector = `${el.tagName.toLowerCase()}#${id}`;

        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && !expectedBgColors.includes(bgColor)) {
          violations.push({
            selector,
            property: 'backgroundColor',
            actualColor: bgColor,
            expectedColor: expectedColors.background,
            reason: 'Background color does not match background/surface theme tokens',
          });
        }
      });

      return violations.slice(0, 10);
    }, this.designSystemColors);
  }
}

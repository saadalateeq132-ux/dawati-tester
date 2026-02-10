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
  private extendedColors: string[];

  constructor(page: Page, designSystemColors: DesignSystemColors, extendedColors: string[] = []) {
    this.page = page;
    this.designSystemColors = designSystemColors;
    this.extendedColors = extendedColors;
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

      // Calculate score — graduated scale that reflects real-world apps
      // Most apps have some color variations; only severely broken pages deserve < 5
      const totalIssues = violatingElements.length;
      let score = 10;
      if (totalIssues > 0 && totalIssues <= 3) score = 9;
      else if (totalIssues > 3 && totalIssues <= 8) score = 8;
      else if (totalIssues > 8 && totalIssues <= 15) score = 7;
      else if (totalIssues > 15 && totalIssues <= 25) score = 6;
      else if (totalIssues > 25 && totalIssues <= 40) score = 5;
      else if (totalIssues > 40) score = 4;

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
    return await this.page.evaluate(({ allowedColors, extendedHexColors }) => {
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

      const allowedRgbColors = [
        ...Object.values(allowedColors).map((hex) => hexToRgb(hex as string)),
        ...extendedHexColors.map((hex: string) => hexToRgb(hex)),
      ];

      // Parse rgb string to [r,g,b] array
      const parseRgb = (color: string): number[] | null => {
        const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!m) return null;
        return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      };

      // Check if color is close to any allowed color (tolerance ±12)
      const isNearMatch = (color: string): boolean => {
        const parsed = parseRgb(color);
        if (!parsed) return false;
        return allowedRgbColors.some(allowed => {
          const ap = parseRgb(allowed);
          if (!ap) return false;
          return Math.abs(parsed[0] - ap[0]) <= 12 &&
                 Math.abs(parsed[1] - ap[1]) <= 12 &&
                 Math.abs(parsed[2] - ap[2]) <= 12;
        });
      };

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
        if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
          // Skip rgba with alpha (framework-generated overlays)
          if (bgColor.startsWith('rgba(') && !bgColor.endsWith(', 1)')) return;
          // Skip common safe colors (including browser default link blue)
          if (['rgb(255, 255, 255)', 'rgb(0, 0, 0)', 'transparent', 'rgb(0, 0, 238)'].includes(bgColor)) return;
          // Check exact match OR near match
          if (!allowedRgbColors.includes(bgColor) && !isNearMatch(bgColor)) {
            violations.push({
              selector,
              property: 'backgroundColor',
              actualColor: bgColor,
              reason: 'Hardcoded background color not in design system',
            });
          }
        }

        // Check text color
        if (textColor) {
          // Skip rgba with alpha
          if (textColor.startsWith('rgba(') && !textColor.endsWith(', 1)')) return;
          // Skip pure black (default) and browser default link blue
          if (textColor === 'rgb(0, 0, 0)' || textColor === 'rgb(0, 0, 238)') return;
          // Check exact match OR near match
          if (!allowedRgbColors.includes(textColor) && !isNearMatch(textColor)) {
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
    }, { allowedColors: this.designSystemColors, extendedHexColors: this.extendedColors });
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
    return await this.page.evaluate(({ expectedColors, extendedHexColors }) => {
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

      const parseRgb = (color: string): number[] | null => {
        const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!m) return null;
        return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      };

      const expectedBgColors = [
        expectedColors.buttonPrimary,
        expectedColors.buttonSecondary,
        expectedColors.buttonDanger,
        'rgb(255, 255, 255)',
        'rgba(0, 0, 0, 0)',
        ...extendedHexColors.map((hex: string) => hexToRgb(hex)),
      ];

      const isNearBtn = (color: string): boolean => {
        const p = parseRgb(color);
        if (!p) return false;
        return expectedBgColors.some(a => { const ap = parseRgb(a); return ap && Math.abs(p[0]-ap[0])<=12 && Math.abs(p[1]-ap[1])<=12 && Math.abs(p[2]-ap[2])<=12; });
      };

      const buttons = document.querySelectorAll('button, [role="button"]');
      buttons.forEach((btn, index) => {
        const computed = window.getComputedStyle(btn);
        const bgColor = computed.backgroundColor;
        if (bgColor.startsWith('rgba(') && !bgColor.endsWith(', 1)')) return;
        const id = (btn as HTMLElement).id || btn.className || `button-${index}`;
        const selector = `button#${id}`;

        if (!expectedBgColors.includes(bgColor) && !isNearBtn(bgColor)) {
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
      expectedColors: {
        buttonPrimary: this.designSystemColors.primary,
        buttonSecondary: this.designSystemColors.surface,
        buttonDanger: this.designSystemColors.error,
      },
      extendedHexColors: this.extendedColors,
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
    return await this.page.evaluate(({ expectedColors, extendedHexColors }) => {
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

      const parseRgb = (color: string): number[] | null => {
        const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!m) return null;
        return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      };

      const expectedTextColors = [
        hexToRgb(expectedColors.textPrimary),
        hexToRgb(expectedColors.textSecondary),
        hexToRgb(expectedColors.textTertiary),
        'rgb(255, 255, 255)',
        'rgb(0, 0, 0)',
        ...extendedHexColors.map((hex: string) => hexToRgb(hex)),
      ];

      const isNearTxt = (color: string): boolean => {
        const p = parseRgb(color);
        if (!p) return false;
        return expectedTextColors.some(a => { const ap = parseRgb(a); return ap && Math.abs(p[0]-ap[0])<=12 && Math.abs(p[1]-ap[1])<=12 && Math.abs(p[2]-ap[2])<=12; });
      };

      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, label');
      textElements.forEach((el, index) => {
        const computed = window.getComputedStyle(el);
        const textColor = computed.color;
        // Skip rgba with alpha
        if (textColor.startsWith('rgba(') && !textColor.endsWith(', 1)')) return;
        // Skip pure black (default) and browser default link blue (RNW renders as <a>)
        if (textColor === 'rgb(0, 0, 0)' || textColor === 'rgb(0, 0, 238)') return;
        const id = (el as HTMLElement).id || el.className || `text-${index}`;
        const selector = `${el.tagName.toLowerCase()}#${id}`;

        if (!expectedTextColors.includes(textColor) && !isNearTxt(textColor)) {
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
    }, { expectedColors: this.designSystemColors, extendedHexColors: this.extendedColors });
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
    return await this.page.evaluate(({ expectedColors, extendedHexColors }) => {
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

      const parseRgb = (color: string): number[] | null => {
        const m = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!m) return null;
        return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
      };

      const expectedBgColors = [
        hexToRgb(expectedColors.background),
        hexToRgb(expectedColors.surface),
        'rgb(255, 255, 255)',
        'rgba(0, 0, 0, 0)',
        ...extendedHexColors.map((hex: string) => hexToRgb(hex)),
      ];

      const isNearBg = (color: string): boolean => {
        const p = parseRgb(color);
        if (!p) return false;
        return expectedBgColors.some(a => { const ap = parseRgb(a); return ap && Math.abs(p[0]-ap[0])<=12 && Math.abs(p[1]-ap[1])<=12 && Math.abs(p[2]-ap[2])<=12; });
      };

      // Check main containers
      const containers = document.querySelectorAll('main, section, div[class*="container"], div[class*="card"]');
      containers.forEach((el, index) => {
        const computed = window.getComputedStyle(el);
        const bgColor = computed.backgroundColor;
        // Skip rgba with alpha
        if (bgColor.startsWith('rgba(') && !bgColor.endsWith(', 1)')) return;
        if (!bgColor || bgColor === 'rgba(0, 0, 0, 0)') return;
        const id = (el as HTMLElement).id || el.className || `container-${index}`;
        const selector = `${el.tagName.toLowerCase()}#${id}`;

        if (!expectedBgColors.includes(bgColor) && !isNearBg(bgColor)) {
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
    }, { expectedColors: this.designSystemColors, extendedHexColors: this.extendedColors });
  }
}

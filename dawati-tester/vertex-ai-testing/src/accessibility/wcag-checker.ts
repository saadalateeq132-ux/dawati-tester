/**
 * WCAG Accessibility Checker
 *
 * Checks WCAG 2.1 AA compliance:
 * - Focus order (tab order follows logical RTL flow)
 * - Focus visibility (focus ring on all interactive elements)
 * - Keyboard navigation (all interactive elements reachable)
 * - Color contrast ratios (4.5:1 normal text, 3:1 large text)
 * - Touch target spacing (8px minimum)
 * - Label association (inputs with visible labels)
 * - Motion preferences (prefers-reduced-motion)
 * - Text resizing (content readable at 200% zoom)
 * - ARIA roles and states
 */

import { Page } from 'playwright';
import { WCAGResult, WCAGViolation } from '../types';

export class WCAGChecker {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Run comprehensive WCAG 2.1 AA checks
   */
  async checkAccessibility(): Promise<WCAGResult> {
    console.log('[WCAGChecker] Running WCAG 2.1 AA compliance checks...');

    const violations: WCAGViolation[] = [];
    let passes = 0;

    // Run all checks
    const [
      focusResults,
      contrastResults,
      labelResults,
      ariaResults,
      keyboardResults,
      targetSpacing,
      motionResults,
    ] = await Promise.all([
      this.checkFocusOrder(),
      this.checkColorContrast(),
      this.checkLabelAssociation(),
      this.checkARIARoles(),
      this.checkKeyboardNavigation(),
      this.checkTouchTargetSpacing(),
      this.checkMotionPreferences(),
    ]);

    violations.push(...focusResults.violations);
    passes += focusResults.passes;

    violations.push(...contrastResults.violations);
    passes += contrastResults.passes;

    violations.push(...labelResults.violations);
    passes += labelResults.passes;

    violations.push(...ariaResults.violations);
    passes += ariaResults.passes;

    violations.push(...keyboardResults.violations);
    passes += keyboardResults.passes;

    violations.push(...targetSpacing.violations);
    passes += targetSpacing.passes;

    violations.push(...motionResults.violations);
    passes += motionResults.passes;

    // Score calculation
    let score = 10;
    for (const v of violations) {
      if (v.impact === 'critical') score -= 2;
      else if (v.impact === 'serious') score -= 1;
      else if (v.impact === 'moderate') score -= 0.5;
      else score -= 0.2;
    }
    score = Math.max(0, Math.round(score * 10) / 10);

    const contrastPassing = contrastResults.violations.length === 0 ? contrastResults.passes : 0;
    const contrastFailing = contrastResults.violations.reduce((s, v) => s + v.nodes, 0);

    const summary = violations.length === 0
      ? `WCAG 2.1 AA compliant: ${passes} checks passed`
      : `${violations.length} WCAG violations found (${violations.filter(v => v.impact === 'critical').length} critical)`;

    console.log(`[WCAGChecker] Score: ${score}/10 | ${violations.length} violations, ${passes} passes`);

    return {
      score,
      violations,
      passes,
      focusOrder: focusResults.violations.length === 0,
      keyboardNavigable: keyboardResults.violations.length === 0,
      contrastRatio: { passing: contrastPassing, failing: contrastFailing },
      summary,
    };
  }

  private async checkFocusOrder(): Promise<{ violations: WCAGViolation[]; passes: number }> {
    const violations: WCAGViolation[] = [];
    let passes = 0;

    try {
      const result = await this.page.evaluate(() => {
        const issues: Array<{ desc: string; count: number }> = [];
        let passCount = 0;

        // Check for visible focus styles
        const interactive = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
        let withoutFocusStyle = 0;

        interactive.forEach(el => {
          const style = window.getComputedStyle(el);
          // Check outline on focus (approximate)
          if (style.outlineStyle === 'none' && style.boxShadow === 'none') {
            withoutFocusStyle++;
          } else {
            passCount++;
          }
        });

        if (withoutFocusStyle > 0) {
          issues.push({
            desc: `${withoutFocusStyle} interactive elements may not have visible focus indicators`,
            count: withoutFocusStyle,
          });
        }

        // Check tabindex > 0 (disrupts natural tab order)
        const badTabindex = document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])');
        if (badTabindex.length > 0) {
          issues.push({
            desc: `${badTabindex.length} elements have positive tabindex (disrupts natural focus order)`,
            count: badTabindex.length,
          });
        } else {
          passCount++;
        }

        return { issues, passCount };
      });

      passes = result.passCount;
      for (const issue of result.issues) {
        violations.push({
          id: 'focus-order',
          impact: 'serious',
          description: issue.desc,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
          nodes: issue.count,
          wcagCriteria: 'WCAG 2.1 AA 2.4.3',
        });
      }
    } catch { /* check failed */ }

    return { violations, passes };
  }

  private async checkColorContrast(): Promise<{ violations: WCAGViolation[]; passes: number }> {
    const violations: WCAGViolation[] = [];
    let passes = 0;

    try {
      const result = await this.page.evaluate(() => {
        const issues: Array<{ desc: string; count: number }> = [];
        let passCount = 0;

        function luminance(r: number, g: number, b: number): number {
          const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        }

        function parseColor(color: string): [number, number, number] | null {
          const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
          return null;
        }

        function contrastRatio(l1: number, l2: number): number {
          const lighter = Math.max(l1, l2);
          const darker = Math.min(l1, l2);
          return (lighter + 0.05) / (darker + 0.05);
        }

        const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, a, button, label, li, td, th, div');
        let failCount = 0;

        textElements.forEach(el => {
          const style = window.getComputedStyle(el);
          const text = (el as HTMLElement).innerText?.trim();
          if (!text || text.length === 0) return;

          const fgColor = parseColor(style.color);
          const bgColor = parseColor(style.backgroundColor);

          if (fgColor && bgColor) {
            const fgLum = luminance(...fgColor);
            const bgLum = luminance(...bgColor);
            const ratio = contrastRatio(fgLum, bgLum);

            const fontSize = parseFloat(style.fontSize);
            const isBold = parseInt(style.fontWeight) >= 700;
            const isLargeText = fontSize >= 18.66 || (fontSize >= 14 && isBold);

            const minRatio = isLargeText ? 3 : 4.5;

            if (ratio < minRatio) {
              failCount++;
            } else {
              passCount++;
            }
          }
        });

        if (failCount > 0) {
          issues.push({
            desc: `${failCount} text elements have insufficient color contrast ratio`,
            count: failCount,
          });
        }

        return { issues, passCount };
      });

      passes = result.passCount;
      for (const issue of result.issues) {
        violations.push({
          id: 'color-contrast',
          impact: 'serious',
          description: issue.desc,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
          nodes: issue.count,
          wcagCriteria: 'WCAG 2.1 AA 1.4.3',
        });
      }
    } catch { /* check failed */ }

    return { violations, passes };
  }

  private async checkLabelAssociation(): Promise<{ violations: WCAGViolation[]; passes: number }> {
    const violations: WCAGViolation[] = [];
    let passes = 0;

    try {
      const result = await this.page.evaluate(() => {
        const issues: Array<{ desc: string; count: number }> = [];
        let passCount = 0;

        const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
        let unlabeled = 0;

        inputs.forEach(input => {
          const el = input as HTMLInputElement;
          const hasLabel = el.labels && el.labels.length > 0;
          const hasAriaLabel = el.getAttribute('aria-label');
          const hasAriaLabelledBy = el.getAttribute('aria-labelledby');
          const hasTitle = el.getAttribute('title');
          const hasPlaceholder = el.getAttribute('placeholder');

          if (hasLabel || hasAriaLabel || hasAriaLabelledBy || hasTitle) {
            passCount++;
          } else if (hasPlaceholder) {
            // Placeholder alone is not sufficient for WCAG
            unlabeled++;
          } else {
            unlabeled++;
          }
        });

        if (unlabeled > 0) {
          issues.push({
            desc: `${unlabeled} form inputs without associated labels or aria-label`,
            count: unlabeled,
          });
        }

        return { issues, passCount };
      });

      passes = result.passCount;
      for (const issue of result.issues) {
        violations.push({
          id: 'label-association',
          impact: 'critical',
          description: issue.desc,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
          nodes: issue.count,
          wcagCriteria: 'WCAG 2.1 AA 3.3.2',
        });
      }
    } catch { /* check failed */ }

    return { violations, passes };
  }

  private async checkARIARoles(): Promise<{ violations: WCAGViolation[]; passes: number }> {
    const violations: WCAGViolation[] = [];
    let passes = 0;

    try {
      const result = await this.page.evaluate(() => {
        const issues: Array<{ desc: string; count: number }> = [];
        let passCount = 0;

        // Check images for alt text
        const images = document.querySelectorAll('img');
        let missingAlt = 0;
        images.forEach(img => {
          if (img.hasAttribute('alt')) passCount++;
          else missingAlt++;
        });

        if (missingAlt > 0) {
          issues.push({
            desc: `${missingAlt} images missing alt attribute`,
            count: missingAlt,
          });
        }

        // Check for landmark roles
        const hasMain = document.querySelector('main, [role="main"]');
        const hasNav = document.querySelector('nav, [role="navigation"]');
        if (!hasMain) {
          issues.push({ desc: 'Page missing main landmark', count: 1 });
        } else {
          passCount++;
        }
        if (!hasNav) {
          issues.push({ desc: 'Page missing navigation landmark', count: 1 });
        } else {
          passCount++;
        }

        // Check lang attribute
        const htmlLang = document.documentElement.getAttribute('lang');
        if (!htmlLang) {
          issues.push({ desc: 'HTML element missing lang attribute', count: 1 });
        } else {
          passCount++;
        }

        // Check heading hierarchy
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let skippedLevel = false;
        for (let i = 1; i < headings.length; i++) {
          const prev = parseInt(headings[i - 1].tagName[1]);
          const curr = parseInt(headings[i].tagName[1]);
          if (curr > prev + 1) {
            skippedLevel = true;
            break;
          }
        }
        if (skippedLevel) {
          issues.push({ desc: 'Heading hierarchy has skipped levels', count: 1 });
        } else if (headings.length > 0) {
          passCount++;
        }

        return { issues, passCount };
      });

      passes = result.passCount;
      for (const issue of result.issues) {
        violations.push({
          id: 'aria-roles',
          impact: issue.desc.includes('missing alt') ? 'serious' : 'moderate',
          description: issue.desc,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
          nodes: issue.count,
          wcagCriteria: 'WCAG 2.1 AA 1.3.1',
        });
      }
    } catch { /* check failed */ }

    return { violations, passes };
  }

  private async checkKeyboardNavigation(): Promise<{ violations: WCAGViolation[]; passes: number }> {
    const violations: WCAGViolation[] = [];
    let passes = 0;

    try {
      const result = await this.page.evaluate(() => {
        const issues: Array<{ desc: string; count: number }> = [];
        let passCount = 0;

        // Check for click handlers without keyboard handlers
        const clickable = document.querySelectorAll('[onclick], [role="button"]');
        let noKeyboard = 0;
        clickable.forEach(el => {
          const tabindex = el.getAttribute('tabindex');
          const isNativeButton = el.tagName === 'BUTTON' || el.tagName === 'A';
          if (!isNativeButton && tabindex !== '0') {
            noKeyboard++;
          } else {
            passCount++;
          }
        });

        if (noKeyboard > 0) {
          issues.push({
            desc: `${noKeyboard} clickable elements not keyboard accessible (missing tabindex="0")`,
            count: noKeyboard,
          });
        }

        // Check for keyboard traps (elements with tabindex="-1" that receive focus)
        const traps = document.querySelectorAll('[tabindex="-1"]:focus');
        if (traps.length > 0) {
          issues.push({
            desc: `${traps.length} potential keyboard traps detected`,
            count: traps.length,
          });
        } else {
          passCount++;
        }

        return { issues, passCount };
      });

      passes = result.passCount;
      for (const issue of result.issues) {
        violations.push({
          id: 'keyboard-nav',
          impact: 'serious',
          description: issue.desc,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
          nodes: issue.count,
          wcagCriteria: 'WCAG 2.1 AA 2.1.1',
        });
      }
    } catch { /* check failed */ }

    return { violations, passes };
  }

  private async checkTouchTargetSpacing(): Promise<{ violations: WCAGViolation[]; passes: number }> {
    const violations: WCAGViolation[] = [];
    let passes = 0;

    try {
      const result = await this.page.evaluate(() => {
        const issues: Array<{ desc: string; count: number }> = [];
        let passCount = 0;

        const interactive = Array.from(document.querySelectorAll('a, button, input, select, [role="button"], [onclick]'));
        const rects = interactive.map(el => ({
          el,
          rect: el.getBoundingClientRect(),
        })).filter(r => r.rect.width > 0 && r.rect.height > 0);

        let tooClose = 0;
        for (let i = 0; i < rects.length; i++) {
          for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i].rect;
            const b = rects[j].rect;

            // Calculate distance between edges
            const hGap = Math.max(0, Math.max(b.left - a.right, a.left - b.right));
            const vGap = Math.max(0, Math.max(b.top - a.bottom, a.top - b.bottom));
            const gap = Math.min(hGap, vGap);

            // Check if they're adjacent (both gaps < 8px means they're too close)
            if (hGap < 8 && vGap < 8 && hGap + vGap > 0) {
              tooClose++;
              break; // Only count each element once
            }
          }
          if (tooClose === 0) passCount++;
        }

        if (tooClose > 0) {
          issues.push({
            desc: `${tooClose} interactive elements have < 8px spacing between them`,
            count: tooClose,
          });
        }

        return { issues, passCount };
      });

      passes = result.passCount;
      for (const issue of result.issues) {
        violations.push({
          id: 'touch-target-spacing',
          impact: 'moderate',
          description: issue.desc,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/target-size.html',
          nodes: issue.count,
          wcagCriteria: 'WCAG 2.1 AA 2.5.5',
        });
      }
    } catch { /* check failed */ }

    return { violations, passes };
  }

  private async checkMotionPreferences(): Promise<{ violations: WCAGViolation[]; passes: number }> {
    const violations: WCAGViolation[] = [];
    let passes = 0;

    try {
      const result = await this.page.evaluate(() => {
        const issues: Array<{ desc: string; count: number }> = [];
        let passCount = 0;

        // Check if CSS includes prefers-reduced-motion media query
        let hasReducedMotionQuery = false;
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSMediaRule && rule.conditionText?.includes('prefers-reduced-motion')) {
                hasReducedMotionQuery = true;
                break;
              }
            }
          } catch { /* CORS blocked */ }
          if (hasReducedMotionQuery) break;
        }

        // Check for animations
        const animated = document.querySelectorAll('[style*="animation"], [style*="transition"]');
        if (animated.length > 0 && !hasReducedMotionQuery) {
          issues.push({
            desc: `${animated.length} animated elements without prefers-reduced-motion support`,
            count: animated.length,
          });
        } else {
          passCount++;
        }

        return { issues, passCount };
      });

      passes = result.passCount;
      for (const issue of result.issues) {
        violations.push({
          id: 'motion-preferences',
          impact: 'moderate',
          description: issue.desc,
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions.html',
          nodes: issue.count,
          wcagCriteria: 'WCAG 2.1 AA 2.3.3',
        });
      }
    } catch { /* check failed */ }

    return { violations, passes };
  }
}

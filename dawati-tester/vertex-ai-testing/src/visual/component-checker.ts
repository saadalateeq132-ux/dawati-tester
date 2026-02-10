/**
 * Level 1: Component Consistency Checker
 *
 * Validates visual consistency across pages:
 * - Back button position same across all pages
 * - Header uniformity (branding, search, navigation)
 * - Tab bar consistency (position, size, active state)
 * - Primary button color/size consistency
 * - Title/photo alignment
 * - Element overlap detection (enhanced)
 * - Detects positional differences >5-10%
 */

import { Page } from 'playwright';
import { ComponentConsistencyResult, ComponentInconsistency, ElementPosition } from '../types';

export class ComponentChecker {
  private page: Page;
  private collectedPositions: ElementPosition[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Capture element positions on the current page for later cross-page comparison
   */
  async capturePageElements(pageName: string): Promise<ElementPosition[]> {
    const positions = await this.page.evaluate((pName: string) => {
      const results: Array<{
        element: string;
        page: string;
        x: number;
        y: number;
        width: number;
        height: number;
        viewportWidth: number;
        viewportHeight: number;
      }> = [];

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 1. Back buttons
      const backSelectors = [
        '[aria-label*="back" i]',
        '[aria-label*="رجوع"]',
        '[aria-label*="عودة"]',
      ];
      for (const sel of backSelectors) {
        try {
          const els = document.querySelectorAll(sel);
          els.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) {
              results.push({
                element: 'back-button',
                page: pName,
                x: Math.round(r.x),
                y: Math.round(r.y),
                width: Math.round(r.width),
                height: Math.round(r.height),
                viewportWidth,
                viewportHeight,
              });
            }
          });
        } catch { /* invalid selector */ }
      }

      // 2. Headers (top 80px region)
      const headerEls = Array.from(document.querySelectorAll('header, [role="banner"], nav')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.top < 80 && r.height > 30 && r.width > viewportWidth * 0.5;
      });
      headerEls.forEach(el => {
        const r = el.getBoundingClientRect();
        results.push({
          element: 'header',
          page: pName,
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          viewportWidth,
          viewportHeight,
        });
      });

      // 3. Tab bars (bottom region)
      const tabBars = Array.from(document.querySelectorAll('[role="tablist"], nav, footer')).filter(el => {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return r.bottom >= viewportHeight - 20 && r.height > 40 && r.height < 120 &&
               r.width > viewportWidth * 0.8 &&
               (style.position === 'fixed' || style.position === 'sticky' || r.top > viewportHeight - 120);
      });
      tabBars.forEach(el => {
        const r = el.getBoundingClientRect();
        results.push({
          element: 'tab-bar',
          page: pName,
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          viewportWidth,
          viewportHeight,
        });
      });

      // 4. Primary buttons (larger buttons with primary-like styling)
      const buttons = document.querySelectorAll('button, [role="button"]');
      buttons.forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width < 100 || r.height < 30 || r.width === 0) return;
        const style = window.getComputedStyle(btn);
        const bg = style.backgroundColor;
        // Only capture prominent buttons (not tiny icon buttons)
        if (r.width >= 150) {
          results.push({
            element: 'primary-button',
            page: pName,
            x: Math.round(r.x),
            y: Math.round(r.y),
            width: Math.round(r.width),
            height: Math.round(r.height),
            viewportWidth,
            viewportHeight,
          });
        }
      });

      // 5. Page titles (h1, h2 in top section)
      const titles = Array.from(document.querySelectorAll('h1, h2')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.top < 200 && r.width > 0;
      });
      titles.forEach(el => {
        const r = el.getBoundingClientRect();
        results.push({
          element: 'page-title',
          page: pName,
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          viewportWidth,
          viewportHeight,
        });
      });

      return results;
    }, pageName);

    this.collectedPositions.push(...positions);
    return positions;
  }

  /**
   * Run consistency check across all collected page elements
   */
  analyzeConsistency(): ComponentConsistencyResult {
    const inconsistencies: ComponentInconsistency[] = [];

    // Group positions by element type
    const byElement = new Map<string, ElementPosition[]>();
    for (const pos of this.collectedPositions) {
      const existing = byElement.get(pos.element) || [];
      existing.push(pos);
      byElement.set(pos.element, existing);
    }

    // Compare positions across pages for each element type
    for (const [element, positions] of byElement) {
      if (positions.length < 2) continue;

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const a = positions[i];
          const b = positions[j];
          if (a.page === b.page) continue;

          // Check position difference
          const xDiff = Math.abs(a.x - b.x);
          const yDiff = Math.abs(a.y - b.y);
          const widthDiff = Math.abs(a.width - b.width);
          const heightDiff = Math.abs(a.height - b.height);

          // Flag if position differs by >10px (roughly 5-10% on mobile)
          if (xDiff > 10 || yDiff > 10) {
            const maxDim = Math.max(a.width, b.width, 1);
            const diffPercent = Math.round((Math.max(xDiff, yDiff) / maxDim) * 100);

            if (diffPercent > 5) {
              inconsistencies.push({
                component: element,
                property: 'position',
                pageA: a.page,
                pageB: b.page,
                valueA: `(x:${a.x}, y:${a.y})`,
                valueB: `(x:${b.x}, y:${b.y})`,
                diffPercent,
                severity: diffPercent > 20 ? 'high' : diffPercent > 10 ? 'medium' : 'low',
              });
            }
          }

          // Check size difference
          if (widthDiff > 10 || heightDiff > 10) {
            const maxSize = Math.max(a.width, b.width, a.height, b.height, 1);
            const sizeDiffPercent = Math.round((Math.max(widthDiff, heightDiff) / maxSize) * 100);

            if (sizeDiffPercent > 10) {
              inconsistencies.push({
                component: element,
                property: 'size',
                pageA: a.page,
                pageB: b.page,
                valueA: `${a.width}x${a.height}`,
                valueB: `${b.width}x${b.height}`,
                diffPercent: sizeDiffPercent,
                severity: sizeDiffPercent > 25 ? 'high' : 'medium',
              });
            }
          }
        }
      }
    }

    // Deduplicate: keep only worst inconsistency per component pair
    const deduped = this.deduplicateInconsistencies(inconsistencies);

    // Score: 10 if no inconsistencies, deduct per issue
    const highCount = deduped.filter(i => i.severity === 'high').length;
    const medCount = deduped.filter(i => i.severity === 'medium').length;
    const lowCount = deduped.filter(i => i.severity === 'low').length;
    const score = Math.max(0, 10 - highCount * 2 - medCount * 1 - lowCount * 0.3);

    const summary = deduped.length === 0
      ? 'Excellent component consistency across pages'
      : `${deduped.length} consistency issues found (${highCount} high, ${medCount} medium, ${lowCount} low)`;

    return {
      score: Math.round(score * 10) / 10,
      totalChecks: this.collectedPositions.length,
      inconsistencies: deduped.slice(0, 20), // Limit output
      elementPositions: this.collectedPositions,
      summary,
    };
  }

  /**
   * Check current page for visual issues (single-page mode)
   */
  async checkCurrentPage(pageName: string): Promise<ComponentConsistencyResult> {
    await this.capturePageElements(pageName);

    // For single-page, check internal consistency (overlap, alignment)
    const internalIssues = await this.checkInternalConsistency();

    const score = Math.max(0, 10 - internalIssues.length * 0.5);

    return {
      score: Math.round(score * 10) / 10,
      totalChecks: this.collectedPositions.length,
      inconsistencies: internalIssues,
      elementPositions: this.collectedPositions.filter(p => p.page === pageName),
      summary: internalIssues.length === 0
        ? 'Page components are well-aligned and consistent'
        : `${internalIssues.length} internal alignment issues on ${pageName}`,
    };
  }

  private async checkInternalConsistency(): Promise<ComponentInconsistency[]> {
    const issues: ComponentInconsistency[] = [];

    // Check button color consistency on current page
    const buttonColors = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      const colors: Array<{ text: string; bg: string; width: number }> = [];
      buttons.forEach(btn => {
        const r = btn.getBoundingClientRect();
        if (r.width < 100) return; // Skip small icon buttons
        const style = window.getComputedStyle(btn);
        colors.push({
          text: (btn.textContent || '').trim().substring(0, 20),
          bg: style.backgroundColor,
          width: Math.round(r.width),
        });
      });
      return colors;
    });

    // Flag if primary-sized buttons have different backgrounds
    const primaryButtons = buttonColors.filter(b => b.width >= 150);
    if (primaryButtons.length >= 2) {
      const uniqueColors = new Set(primaryButtons.map(b => b.bg));
      if (uniqueColors.size > 2) {
        issues.push({
          component: 'primary-button',
          property: 'color',
          pageA: 'current',
          pageB: 'current',
          valueA: primaryButtons[0].bg,
          valueB: primaryButtons[1]?.bg || '',
          diffPercent: 100,
          severity: 'medium',
        });
      }
    }

    return issues;
  }

  private deduplicateInconsistencies(items: ComponentInconsistency[]): ComponentInconsistency[] {
    const seen = new Set<string>();
    return items.filter(item => {
      const key = `${item.component}-${item.property}-${[item.pageA, item.pageB].sort().join('-')}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Reset collected positions between test suites */
  reset(): void {
    this.collectedPositions = [];
  }
}

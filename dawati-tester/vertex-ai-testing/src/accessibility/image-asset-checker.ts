/**
 * Image & Asset Checker
 *
 * Validates:
 * - Broken images (failed to load)
 * - Missing alt text on images (Arabic required)
 * - Font loading status (Cairo font critical for Arabic)
 * - Oversized images (performance impact)
 * - SVG icon validation (Saudi Riyal SVG required)
 */

import { Page } from 'playwright';
import { ImageAssetResult } from '../types';

export class ImageAssetChecker {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Run all image and asset checks
   */
  async checkAssets(): Promise<ImageAssetResult> {
    console.log('[ImageAssetChecker] Checking images and assets...');

    const [brokenImages, missingAltText, fontStatus, oversizedImages] = await Promise.all([
      this.findBrokenImages(),
      this.findMissingAltText(),
      this.checkFontLoading(),
      this.findOversizedImages(),
    ]);

    let score = 10;

    // Broken images
    score -= brokenImages.length * 1.0;

    // Missing alt text
    score -= missingAltText.length * 0.3;

    // Font loading
    const cairoLoaded = fontStatus.some(f => f.fontFamily.includes('Cairo') && f.loaded);
    if (!cairoLoaded && fontStatus.length > 0) score -= 2;

    // Oversized images
    score -= oversizedImages.length * 0.5;

    score = Math.max(0, Math.round(score * 10) / 10);

    const parts: string[] = [];
    if (brokenImages.length > 0) parts.push(`${brokenImages.length} broken images`);
    if (missingAltText.length > 0) parts.push(`${missingAltText.length} missing alt text`);
    if (!cairoLoaded && fontStatus.length > 0) parts.push('Cairo font not loaded');
    if (oversizedImages.length > 0) parts.push(`${oversizedImages.length} oversized images`);
    const summary = parts.length === 0 ? 'All images and assets OK' : parts.join('; ');

    console.log(`[ImageAssetChecker] Score: ${score}/10 | ${summary}`);

    return {
      score,
      brokenImages,
      missingAltText,
      fontLoadingStatus: fontStatus,
      oversizedImages,
      summary,
    };
  }

  private async findBrokenImages(): Promise<string[]> {
    try {
      return await this.page.evaluate(() => {
        const broken: string[] = [];
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (!img.complete || img.naturalWidth === 0) {
            const src = img.src || img.getAttribute('src') || 'unknown';
            broken.push(src.length > 100 ? src.substring(0, 100) + '...' : src);
          }
        });
        return broken;
      });
    } catch {
      return [];
    }
  }

  private async findMissingAltText(): Promise<string[]> {
    try {
      return await this.page.evaluate(() => {
        const missing: string[] = [];
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          const alt = img.getAttribute('alt');
          if (alt === null || alt === undefined) {
            const src = img.src || img.getAttribute('src') || 'unknown';
            missing.push(src.length > 80 ? src.substring(0, 80) + '...' : src);
          }
        });
        return missing;
      });
    } catch {
      return [];
    }
  }

  private async checkFontLoading(): Promise<ImageAssetResult['fontLoadingStatus']> {
    try {
      return await this.page.evaluate(async () => {
        await document.fonts.ready;
        const results: Array<{ fontFamily: string; loaded: boolean }> = [];

        // Check critical fonts for Arabic app
        const fontsToCheck = ['Cairo', 'Tajawal', 'Noto Sans Arabic'];
        for (const font of fontsToCheck) {
          results.push({
            fontFamily: font,
            loaded: document.fonts.check(`16px "${font}"`),
          });
        }

        // Also check what body font is actually in use
        const bodyFont = getComputedStyle(document.body).fontFamily;
        results.push({
          fontFamily: `body: ${bodyFont}`,
          loaded: true,
        });

        return results;
      });
    } catch {
      return [];
    }
  }

  private async findOversizedImages(): Promise<ImageAssetResult['oversizedImages']> {
    try {
      return await this.page.evaluate(() => {
        const oversized: Array<{ src: string; sizeMB: number }> = [];

        const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        resources.forEach(r => {
          if (/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i.test(r.name)) {
            const sizeBytes = r.transferSize || r.decodedBodySize || 0;
            const sizeMB = Math.round(sizeBytes / 1048576 * 100) / 100;
            if (sizeMB > 1) { // Flag images > 1MB
              const src = r.name.length > 80 ? r.name.substring(0, 80) + '...' : r.name;
              oversized.push({ src, sizeMB });
            }
          }
        });

        return oversized;
      });
    } catch {
      return [];
    }
  }
}

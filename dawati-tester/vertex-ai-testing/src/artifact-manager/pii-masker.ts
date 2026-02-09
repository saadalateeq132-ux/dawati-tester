import * as fs from 'fs';
import { TestConfig } from '../types';

/**
 * Masks PII (Personally Identifiable Information) before sending to AI
 * Prevents leaking sensitive data to Vertex AI
 */
export class PIIMasker {
  private config: TestConfig;
  private patterns: RegExp[];

  constructor(config: TestConfig) {
    this.config = config;

    // Compile PII patterns from config
    this.patterns = config.artifacts.piiPatterns.map((pattern) => new RegExp(pattern, 'g'));
  }

  /**
   * Mask PII in HTML content before analysis
   */
  maskHTML(html: string): string {
    if (!this.config.artifacts.maskPII) {
      return html;
    }

    console.log('[PII Masker] Masking PII in HTML content');

    let masked = html;

    // Mask phone numbers
    masked = masked.replace(/\+966[0-9]{9}/g, '+966XXXXXXXXX');
    masked = masked.replace(/05[0-9]{8}/g, '05XXXXXXXX');

    // Mask email addresses
    masked = masked.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      'user@example.com'
    );

    // Mask credit card numbers (partial)
    masked = masked.replace(
      /[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/g,
      'XXXX-XXXX-XXXX-XXXX'
    );

    // Mask Saudi National IDs
    masked = masked.replace(/[1-2][0-9]{9}/g, '1XXXXXXXXX');

    // Mask IBANs (Saudi format)
    masked = masked.replace(/SA[0-9]{2}[A-Z0-9]{18}/g, 'SAXXXXXXXXXXXXXXXXXXXX');

    // Mask API keys and tokens (generic patterns)
    masked = masked.replace(/[a-zA-Z0-9_-]{32,}/g, (match) => {
      // Only mask if it looks like a token (not regular text)
      if (/^[A-Za-z0-9_-]+$/.test(match) && match.length >= 32) {
        return 'XXXXX-MASKED-TOKEN-XXXXX';
      }
      return match;
    });

    // Mask custom patterns from config
    for (const pattern of this.patterns) {
      masked = masked.replace(pattern, 'XXXXX-MASKED-XXXXX');
    }

    const maskedCount = this.countDifferences(html, masked);
    console.log(`[PII Masker] Masked ${maskedCount} PII instances`);

    return masked;
  }

  /**
   * Mask PII in text content
   */
  maskText(text: string): string {
    if (!this.config.artifacts.maskPII) {
      return text;
    }

    return this.maskHTML(text); // Same logic
  }

  /**
   * Mask PII in image (not implemented - would require OCR + redaction)
   * For now, we just log a warning
   */
  warnAboutImagePII(screenshotPath: string): void {
    console.warn(
      `[PII Masker] WARNING: Cannot mask PII in images. Ensure ${screenshotPath} doesn't contain sensitive data.`
    );
  }

  /**
   * Save masked HTML to file
   */
  saveMaskedHTML(html: string, outputPath: string): string {
    const masked = this.maskHTML(html);
    fs.writeFileSync(outputPath, masked, 'utf-8');
    console.log(`[PII Masker] Saved masked HTML: ${outputPath}`);
    return masked;
  }

  /**
   * Check if content contains potential PII
   */
  containsPII(content: string): boolean {
    // Quick check for common PII patterns
    const quickPatterns = [
      /\+966[0-9]{9}/,
      /05[0-9]{8}/,
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
      /[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/,
      /[1-2][0-9]{9}/,
      /SA[0-9]{2}[A-Z0-9]{18}/,
    ];

    for (const pattern of quickPatterns) {
      if (pattern.test(content)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Count how many PII instances were masked
   */
  private countDifferences(original: string, masked: string): number {
    // Count occurrences of "MASKED" in masked content
    const matches = masked.match(/MASKED/g);
    return matches ? matches.length : 0;
  }

  /**
   * Get PII masking report
   */
  generateReport(originalPath: string, maskedPath: string): {
    originalLength: number;
    maskedLength: number;
    piiFound: boolean;
    maskedCount: number;
  } {
    const original = fs.readFileSync(originalPath, 'utf-8');
    const masked = fs.readFileSync(maskedPath, 'utf-8');

    return {
      originalLength: original.length,
      maskedLength: masked.length,
      piiFound: this.containsPII(original),
      maskedCount: this.countDifferences(original, masked),
    };
  }
}

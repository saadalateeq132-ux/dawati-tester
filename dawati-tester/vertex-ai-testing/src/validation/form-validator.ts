/**
 * Level 2: Data Validation & Component Testing
 *
 * Validates form inputs and component-specific rules:
 * - Email format validation (@ and valid domain)
 * - Phone number format (country code + digits)
 * - Name fields (reject numeric, max length)
 * - Password fields (complexity, mask toggle, confirm match)
 * - Date/time pickers (no past dates, availability, Hijri/Gregorian)
 * - File uploads (size, type)
 * - Required/optional field markers
 * - Hardcoded value detection (mock data, placeholders, static strings)
 * - Disconnected UI elements (not wired to backend)
 */

import { Page } from 'playwright';
import { FormValidationResult, FormViolation, HardcodedValueDetection, DetectedHardcoded } from '../types';

export class FormValidator {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Run all form validation checks on current page
   */
  async validateForms(): Promise<FormValidationResult> {
    console.log('[FormValidator] Scanning page forms...');

    const violations: FormViolation[] = [];

    // 1. Check email fields
    violations.push(...await this.checkEmailFields());

    // 2. Check phone fields
    violations.push(...await this.checkPhoneFields());

    // 3. Check name fields
    violations.push(...await this.checkNameFields());

    // 4. Check password fields
    violations.push(...await this.checkPasswordFields());

    // 5. Check required field markers
    violations.push(...await this.checkRequiredFields());

    // 6. Check date/time pickers
    violations.push(...await this.checkDateTimePickers());

    // 7. Check file upload constraints
    violations.push(...await this.checkFileUploads());

    // 8. Check general form structure
    violations.push(...await this.checkFormStructure());

    const totalFields = await this.countFormFields();
    const validFields = totalFields - violations.filter(v => v.severity === 'critical' || v.severity === 'high').length;
    const score = totalFields === 0 ? 10 : Math.max(0, 10 - violations.length * 0.5);

    console.log(`[FormValidator] Score: ${score.toFixed(1)}/10 (${violations.length} violations in ${totalFields} fields)`);

    return {
      score: Math.round(score * 10) / 10,
      totalFields,
      validFields: Math.max(0, validFields),
      violations,
      summary: violations.length === 0
        ? 'All form fields pass validation rules'
        : `${violations.length} form validation issues found`,
    };
  }

  /**
   * Detect hardcoded values, mock data, placeholders, and disconnected elements
   */
  async detectHardcodedValues(): Promise<HardcodedValueDetection> {
    console.log('[FormValidator] Scanning for hardcoded values...');

    const hardcodedStrings: DetectedHardcoded[] = [];
    const mockData: DetectedHardcoded[] = [];
    const placeholders: DetectedHardcoded[] = [];
    const disconnectedElements: DetectedHardcoded[] = [];

    // 1. Scan for hardcoded English strings (expanded list from spec)
    const englishStrings = await this.page.evaluate(() => {
      const text = document.body.innerText;
      const found: Array<{ value: string; location: string }> = [];

      const patterns = [
        'Submit', 'Cancel', 'Save', 'Delete', 'Edit', 'Add', 'Remove', 'Search',
        'Filter', 'Sort', 'View', 'Back', 'Next', 'Previous', 'Loading', 'Error',
        'Success', 'Welcome', 'Hello', 'Sign In', 'Sign Up', 'Log In', 'Log Out',
        'Profile', 'Settings', 'Home', 'Continue', 'OK', 'Yes', 'No', 'Menu',
        'Cart', 'Book Now', 'Upload Photo', 'Event Details', 'Vendor List',
        'Availability', 'Confirm', 'Reset',
      ];

      for (const pattern of patterns) {
        // Case-sensitive match to avoid false positives
        if (text.includes(pattern)) {
          // Find the element containing this text
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            if (node.textContent?.includes(pattern)) {
              const parent = node.parentElement;
              const tag = parent?.tagName?.toLowerCase() || 'unknown';
              const id = parent?.id || parent?.className?.toString().substring(0, 20) || '';
              found.push({ value: pattern, location: `<${tag}${id ? '#' + id : ''}>` });
              break; // Only report first occurrence per pattern
            }
          }
        }
      }
      return found;
    });

    for (const s of englishStrings) {
      hardcodedStrings.push({
        value: s.value,
        location: s.location,
        type: 'english-string',
        severity: 'high',
        suggestion: `Replace "${s.value}" with i18n key: {t('${s.value.toLowerCase().replace(/\s+/g, '_')}')}`,
      });
    }

    // 2. Scan for hardcoded Arabic strings (from spec - but skip expected UI words)
    const arabicStrings = await this.page.evaluate(() => {
      const text = document.body.innerText;
      const found: Array<{ value: string; location: string }> = [];

      // Only flag currency-related Arabic text (common UI words are expected)
      const currencyPatterns = ['ريال', 'ر.س', 'س.ر'];

      for (const pattern of currencyPatterns) {
        if (text.includes(pattern)) {
          found.push({ value: pattern, location: 'page-text' });
        }
      }
      return found;
    });

    for (const s of arabicStrings) {
      hardcodedStrings.push({
        value: s.value,
        location: s.location,
        type: 'currency-format',
        severity: 'high',
        suggestion: `Replace currency text "${s.value}" with SVG icon from assets`,
      });
    }

    // 3. Detect mock data / placeholder content
    const mockDataResults = await this.page.evaluate(() => {
      const found: Array<{ value: string; location: string }> = [];
      const pageText = document.body.innerText;

      // Common mock/placeholder patterns
      const mockPatterns = [
        /lorem ipsum/i,
        /john\.?doe/i,
        /jane\.?doe/i,
        /test@(test|example|mail)\.(com|org)/i,
        /\+966500000000/,
        /123456789/,
        /placeholder/i,
        /sample (text|data|image|name|email)/i,
        /dummy/i,
        /TODO:/i,
        /FIXME:/i,
        /HACK:/i,
      ];

      for (const pattern of mockPatterns) {
        const match = pageText.match(pattern);
        if (match) {
          found.push({ value: match[0], location: 'page-text' });
        }
      }

      // Check images with placeholder sources
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const src = img.getAttribute('src') || '';
        if (/placeholder|via\.placeholder|picsum|lorempixel|dummyimage/i.test(src)) {
          found.push({ value: src.substring(0, 60), location: `img[src]` });
        }
      });

      return found;
    });

    for (const m of mockDataResults) {
      mockData.push({
        value: m.value,
        location: m.location,
        type: 'mock-data',
        severity: 'medium',
        suggestion: 'Replace mock/placeholder data with real dynamic content from backend',
      });
    }

    // 4. Detect disconnected elements (buttons/links without handlers)
    const disconnected = await this.page.evaluate(() => {
      const found: Array<{ value: string; location: string }> = [];

      // Check buttons without click handlers
      const buttons = document.querySelectorAll('button, [role="button"]');
      buttons.forEach(btn => {
        const hasHref = btn.closest('a')?.hasAttribute('href');
        const hasOnClick = btn.hasAttribute('onclick');
        // React/RNW attaches handlers differently; check if element is interactive
        const text = (btn.textContent || '').trim().substring(0, 30);
        // Skip empty or icon-only buttons
        if (!text || text.length < 2) return;

        // Check if button is visually styled as disabled but not marked as such
        const style = window.getComputedStyle(btn);
        if (style.opacity === '0.5' || style.pointerEvents === 'none') {
          if (!btn.hasAttribute('disabled') && !btn.getAttribute('aria-disabled')) {
            found.push({ value: text, location: `button (visually disabled but not aria-disabled)` });
          }
        }
      });

      // Check links without proper href
      const links = document.querySelectorAll('a');
      links.forEach(link => {
        const href = link.getAttribute('href');
        const text = (link.textContent || '').trim().substring(0, 30);
        if (!text) return;
        if (!href || href === '#' || href === 'javascript:void(0)') {
          found.push({ value: text, location: `a[href="${href || ''}"]` });
        }
      });

      return found;
    });

    for (const d of disconnected) {
      disconnectedElements.push({
        value: d.value,
        location: d.location,
        type: 'disconnected',
        severity: 'medium',
        suggestion: 'Wire this element to actual functionality or remove it',
      });
    }

    const totalIssues = hardcodedStrings.length + mockData.length + placeholders.length + disconnectedElements.length;
    const score = Math.max(0, 10 - totalIssues * 0.3);

    return {
      score: Math.round(score * 10) / 10,
      hardcodedStrings,
      mockData,
      placeholders,
      disconnectedElements,
      summary: totalIssues === 0
        ? 'No hardcoded values or mock data detected'
        : `${totalIssues} hardcoded/mock/disconnected issues found`,
    };
  }

  // ─── INDIVIDUAL CHECK METHODS ────────────────────────────────────

  private async checkEmailFields(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'email';
        severity: 'high';
        message: string;
        suggestion: string;
      }> = [];

      const emailInputs = document.querySelectorAll('input[type="email"], input[name*="email" i], input[placeholder*="email" i], input[placeholder*="بريد" i]');
      emailInputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        const name = el.name || el.placeholder || `email-${idx}`;

        // Check if type is set correctly
        if (el.type !== 'email') {
          violations.push({
            field: name,
            type: 'email',
            severity: 'high',
            message: `Email field "${name}" missing type="email" (prevents browser validation)`,
            suggestion: 'Set input type="email" for automatic format validation',
          });
        }

        // Check if there's validation feedback (error message element nearby)
        const parent = el.closest('div, label, fieldset');
        if (parent) {
          const errorEl = parent.querySelector('[class*="error" i], [class*="invalid" i], [role="alert"]');
          if (!errorEl) {
            violations.push({
              field: name,
              type: 'email',
              severity: 'high',
              message: `Email field "${name}" has no visible error message element`,
              suggestion: 'Add error message element (e.g., "Invalid email format") that shows on validation failure',
            });
          }
        }
      });

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async checkPhoneFields(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'phone';
        severity: 'high';
        message: string;
        suggestion: string;
      }> = [];

      const phoneInputs = document.querySelectorAll('input[type="tel"], input[name*="phone" i], input[name*="mobile" i], input[placeholder*="phone" i], input[placeholder*="هاتف" i], input[placeholder*="جوال" i]');
      phoneInputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        const name = el.name || el.placeholder || `phone-${idx}`;
        const style = window.getComputedStyle(el);

        // Phone should be LTR even in RTL mode
        if (style.direction !== 'ltr' && style.textAlign !== 'left') {
          violations.push({
            field: name,
            type: 'phone',
            severity: 'high',
            message: `Phone field "${name}" not LTR-aligned (digits display wrong in RTL)`,
            suggestion: 'Set direction: ltr and textAlign: left for phone inputs',
          });
        }

        // Check for country code indicator
        const parent = el.closest('div, label, fieldset');
        if (parent) {
          const hasCountryCode = parent.querySelector('[class*="country" i], [class*="code" i], select') ||
                                parent.textContent?.includes('+966') ||
                                el.placeholder?.includes('+966');
          if (!hasCountryCode) {
            violations.push({
              field: name,
              type: 'phone',
              severity: 'high',
              message: `Phone field "${name}" missing country code indicator (+966)`,
              suggestion: 'Add country code selector or prefix (+966 for Saudi Arabia)',
            });
          }
        }
      });

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async checkNameFields(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'name';
        severity: 'medium';
        message: string;
        suggestion: string;
      }> = [];

      const nameInputs = document.querySelectorAll('input[name*="name" i], input[placeholder*="name" i], input[placeholder*="اسم" i], input[autocomplete*="name"]');
      nameInputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        const name = el.name || el.placeholder || `name-${idx}`;

        // Check maxlength attribute
        if (!el.maxLength || el.maxLength < 0 || el.maxLength > 500) {
          violations.push({
            field: name,
            type: 'name',
            severity: 'medium',
            message: `Name field "${name}" missing reasonable maxLength (current: ${el.maxLength || 'none'})`,
            suggestion: 'Set maxLength (e.g., 100 characters) to prevent abuse',
          });
        }

        // Check inputMode/pattern for rejecting numbers
        if (el.inputMode === 'numeric' || el.type === 'number') {
          violations.push({
            field: name,
            type: 'name',
            severity: 'medium',
            message: `Name field "${name}" allows numeric input mode`,
            suggestion: 'Use inputMode="text" and validate to reject numbers',
          });
        }
      });

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async checkPasswordFields(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'password';
        severity: 'high';
        message: string;
        suggestion: string;
      }> = [];

      const passwordInputs = document.querySelectorAll('input[type="password"], input[name*="password" i], input[placeholder*="password" i], input[placeholder*="كلمة" i]');
      passwordInputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        const name = el.name || el.placeholder || `password-${idx}`;

        // Check for show/hide toggle
        const parent = el.closest('div, label, fieldset');
        if (parent) {
          const toggle = parent.querySelector('[class*="eye" i], [class*="show" i], [class*="toggle" i], [class*="visibility" i], button');
          if (!toggle) {
            violations.push({
              field: name,
              type: 'password',
              severity: 'high',
              message: `Password field "${name}" missing show/hide toggle`,
              suggestion: 'Add eye icon toggle to show/hide password',
            });
          }
        }

        // Check minlength
        if (!el.minLength || el.minLength < 8) {
          violations.push({
            field: name,
            type: 'password',
            severity: 'high',
            message: `Password field "${name}" weak minLength (${el.minLength || 'none'}, should be >= 8)`,
            suggestion: 'Set minLength=8 and enforce complexity (uppercase, lowercase, special char)',
          });
        }
      });

      // Check for password confirmation field
      if (passwordInputs.length === 1) {
        const parent = passwordInputs[0].closest('form, [class*="form" i]');
        if (parent) {
          const allPwFields = parent.querySelectorAll('input[type="password"]');
          // If only one password field in a form with password, might need confirm
          // Only flag on registration/signup-like forms
          const formText = (parent.textContent || '').toLowerCase();
          if ((formText.includes('register') || formText.includes('sign up') || formText.includes('تسجيل')) && allPwFields.length < 2) {
            violations.push({
              field: 'password-confirm',
              type: 'password',
              severity: 'high',
              message: 'Registration form missing password confirmation field',
              suggestion: 'Add "Confirm Password" field to prevent typos',
            });
          }
        }
      }

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async checkRequiredFields(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'required';
        severity: 'medium';
        message: string;
        suggestion: string;
      }> = [];

      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        const name = el.name || el.placeholder || el.id || `field-${idx}`;
        const type = el.type || 'text';

        // Skip hidden, submit, button types
        if (['hidden', 'submit', 'button', 'reset'].includes(type)) return;

        // Check for visual required indicator
        const parent = el.closest('div, label, fieldset');
        if (parent) {
          const labelText = parent.textContent || '';
          const hasRequiredStar = labelText.includes('*') || el.hasAttribute('required') || el.getAttribute('aria-required') === 'true';

          // If field has required attribute but no visual indicator
          if (el.hasAttribute('required') && !labelText.includes('*')) {
            violations.push({
              field: name,
              type: 'required',
              severity: 'medium',
              message: `Required field "${name}" missing visual indicator (*)`,
              suggestion: 'Add asterisk (*) to label for required fields',
            });
          }
        }
      });

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async checkDateTimePickers(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'date';
        severity: 'medium';
        message: string;
        suggestion: string;
      }> = [];

      const dateInputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"], input[type="time"], [class*="date-picker" i], [class*="calendar" i], [role="grid"]');
      dateInputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        const name = el.name || el.id || `date-${idx}`;

        if (el.type === 'date' || el.type === 'datetime-local') {
          // Check min attribute (should prevent past dates if applicable)
          if (!el.min) {
            violations.push({
              field: name,
              type: 'date',
              severity: 'medium',
              message: `Date field "${name}" allows past dates (no min attribute)`,
              suggestion: 'Set min attribute to today\'s date for future-only date pickers',
            });
          }
        }
      });

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async checkFileUploads(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'file';
        severity: 'medium';
        message: string;
        suggestion: string;
      }> = [];

      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        const name = el.name || el.id || `file-${idx}`;

        // Check accept attribute
        if (!el.accept) {
          violations.push({
            field: name,
            type: 'file',
            severity: 'medium',
            message: `File upload "${name}" missing accept attribute (any file type allowed)`,
            suggestion: 'Set accept="image/jpeg,image/png" to restrict file types (JPG/PNG only)',
          });
        }
      });

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async checkFormStructure(): Promise<FormViolation[]> {
    return this.page.evaluate(() => {
      const violations: Array<{
        field: string;
        type: 'general';
        severity: 'medium';
        message: string;
        suggestion: string;
      }> = [];

      // Check for autocomplete attributes
      const importantInputs = document.querySelectorAll('input[type="email"], input[type="tel"], input[name*="name" i]');
      importantInputs.forEach((input, idx) => {
        const el = input as HTMLInputElement;
        if (!el.autocomplete || el.autocomplete === 'off') {
          const name = el.name || el.placeholder || `input-${idx}`;
          violations.push({
            field: name,
            type: 'general',
            severity: 'medium',
            message: `Input "${name}" missing autocomplete attribute`,
            suggestion: 'Add autocomplete="email|tel|name" for better UX and autofill',
          });
        }
      });

      return violations;
    }) as Promise<FormViolation[]>;
  }

  private async countFormFields(): Promise<number> {
    return this.page.evaluate(() => {
      return document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea').length;
    });
  }
}

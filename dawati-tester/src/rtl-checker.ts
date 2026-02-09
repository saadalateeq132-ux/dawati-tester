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
  // Basic actions
  'Submit', 'Cancel', 'Save', 'Delete', 'Edit', 'Add', 'Remove',
  'Search', 'Filter', 'Sort', 'View', 'Back', 'Next', 'Previous',
  'Continue', 'OK', 'Yes', 'No', 'Close', 'Done', 'Finish',

  // Status messages
  'Loading', 'Error', 'Success', 'Failed', 'Pending', 'Complete',
  'Warning', 'Info', 'Notification', 'Alert',

  // Authentication
  'Sign In', 'Sign Up', 'Log In', 'Log Out', 'Login', 'Logout',
  'Register', 'Password', 'Email', 'Phone', 'Username',
  'Forgot Password', 'Reset Password', 'Verify', 'Confirm',

  // Navigation
  'Home', 'Profile', 'Settings', 'Dashboard', 'Menu', 'Options',
  'About', 'Help', 'Support', 'Contact', 'FAQ',

  // Common UI elements
  'Welcome', 'Hello', 'Goodbye', 'Thank You', 'Please',
  'Send', 'Reply', 'Share', 'Copy', 'Paste', 'Cut',
  'Select', 'Choose', 'Pick', 'Upload', 'Download',
  'Print', 'Export', 'Import', 'Refresh', 'Reload',

  // Event planning specific (Dawati)
  'Event', 'Vendor', 'Service', 'Booking', 'Order', 'Cart',
  'Checkout', 'Payment', 'Total', 'Price', 'Cost', 'Fee',
  'Date', 'Time', 'Location', 'Venue', 'Address',
  'Category', 'Type', 'Status', 'Details', 'Description',
  'Contact', 'Phone Number', 'Email Address', 'Message',
  'Review', 'Rating', 'Feedback', 'Comment', 'Report',
  'Favorite', 'Like', 'Follow', 'Subscribe', 'Unsubscribe',

  // Form fields
  'Name', 'First Name', 'Last Name', 'Title', 'Company',
  'City', 'Country', 'ZIP', 'Postal Code', 'Street',
  'Quantity', 'Amount', 'Number', 'Count', 'Total',

  // Time-related
  'Today', 'Tomorrow', 'Yesterday', 'Now', 'Later',
  'Morning', 'Afternoon', 'Evening', 'Night',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',

  // Common verbs
  'Create', 'Update', 'Modify', 'Change', 'Rename', 'Move',
  'Open', 'Close', 'Show', 'Hide', 'Enable', 'Disable',
  'Start', 'Stop', 'Pause', 'Resume', 'Restart',
  'Connect', 'Disconnect', 'Sync', 'Backup', 'Restore',

  // Common nouns
  'Item', 'List', 'Table', 'Grid', 'Card', 'Form',
  'Page', 'Section', 'Header', 'Footer', 'Sidebar',
  'Content', 'Text', 'Image', 'Video', 'File', 'Attachment',
  'Link', 'URL', 'Website', 'App', 'Application',

  // User interface
  'Button', 'Input', 'Checkbox', 'Radio', 'Dropdown', 'Slider',
  'Toggle', 'Switch', 'Tab', 'Panel', 'Modal', 'Dialog',
  'Tooltip', 'Badge', 'Label', 'Icon', 'Avatar',

  // Placeholders
  'Enter', 'Type', 'Click', 'Tap', 'Swipe', 'Scroll',
  'Drag', 'Drop', 'Select All', 'Clear All', 'Reset',
];

// Common hardcoded Arabic strings (should use i18n keys)
const HARDCODED_ARABIC_PATTERNS = [
  // Basic actions
  'إرسال', 'إلغاء', 'حفظ', 'حذف', 'تعديل', 'إضافة', 'إزالة',
  'بحث', 'تصفية', 'ترتيب', 'عرض', 'رجوع', 'التالي', 'السابق',
  'متابعة', 'موافق', 'نعم', 'لا', 'إغلاق', 'تم', 'إنهاء',

  // Status messages
  'تحميل', 'خطأ', 'نجح', 'فشل', 'قيد الانتظار', 'مكتمل',
  'تحذير', 'معلومات', 'إشعار', 'تنبيه',

  // Authentication
  'تسجيل الدخول', 'تسجيل', 'خروج', 'كلمة المرور', 'البريد الإلكتروني',
  'رقم الهاتف', 'اسم المستخدم', 'نسيت كلمة المرور', 'إعادة تعيين',
  'تحقق', 'تأكيد',

  // Navigation
  'الرئيسية', 'الملف الشخصي', 'الإعدادات', 'لوحة التحكم', 'القائمة',
  'خيارات', 'حول', 'مساعدة', 'الدعم', 'اتصل بنا', 'الأسئلة الشائعة',

  // Common UI
  'مرحبا', 'أهلا', 'شكرا', 'من فضلك', 'وداعا',
  'إرسال', 'رد', 'مشاركة', 'نسخ', 'لصق', 'قص',
  'اختيار', 'اختر', 'التقط', 'رفع', 'تحميل',
  'طباعة', 'تصدير', 'استيراد', 'تحديث', 'إعادة تحميل',

  // Event planning (Dawati specific)
  'حدث', 'مناسبة', 'بائع', 'خدمة', 'حجز', 'طلب', 'سلة',
  'الدفع', 'إجمالي', 'سعر', 'تكلفة', 'رسوم',
  'تاريخ', 'وقت', 'موقع', 'مكان', 'عنوان',
  'فئة', 'نوع', 'حالة', 'تفاصيل', 'وصف',
  'اتصال', 'رقم الهاتف', 'عنوان البريد', 'رسالة',
  'مراجعة', 'تقييم', 'ملاحظات', 'تعليق', 'تقرير',
  'مفضل', 'إعجاب', 'متابعة', 'اشتراك', 'إلغاء الاشتراك',

  // Health/wellness (if applicable)
  'صحة', 'صحي', 'طبي', 'علاج', 'دواء', 'عيادة',

  // Form fields
  'اسم', 'الاسم الأول', 'الاسم الأخير', 'العنوان', 'الشركة',
  'المدينة', 'الدولة', 'الرمز البريدي', 'الشارع',
  'كمية', 'مبلغ', 'رقم', 'عدد', 'المجموع',

  // Time-related Arabic
  'اليوم', 'غدا', 'أمس', 'الآن', 'لاحقا',
  'صباح', 'ظهر', 'مساء', 'ليل',
  'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد',
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',

  // Hijri months
  'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني', 'جمادى الأول', 'جمادى الثاني',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',

  // Saudi-specific
  'ريال', 'ر.س', 'المملكة العربية السعودية', 'السعودية',
  'الرياض', 'جدة', 'مكة', 'المدينة', 'الدمام',
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
  log.info('Checking for hardcoded English and Arabic strings');
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
    let englishCount = 0;
    for (const pattern of HARDCODED_ENGLISH_PATTERNS) {
      const found = pageText.filter(
        (text) => text.toLowerCase() === pattern.toLowerCase()
      );
      if (found.length > 0) {
        result.hardcodedStrings.push(pattern);
        englishCount++;
      }
    }

    // Check for hardcoded Arabic patterns (should use i18n)
    let arabicCount = 0;
    for (const pattern of HARDCODED_ARABIC_PATTERNS) {
      const found = pageText.filter((text) => text === pattern);
      if (found.length > 0) {
        result.hardcodedStrings.push(pattern);
        arabicCount++;
      }
    }

    if (englishCount > 0) {
      result.issues.push({
        type: 'hardcoded',
        severity: 'high',
        description: `Found ${englishCount} hardcoded English strings (should be translated)`,
        element: result.hardcodedStrings.filter(s => /^[A-Za-z\s]+$/.test(s)).slice(0, 5).join(', '),
        suggestion: 'Replace with i18n keys: t("key") instead of hardcoded English',
      });
      result.score -= Math.min(englishCount, 5);
    }

    if (arabicCount > 0) {
      result.issues.push({
        type: 'hardcoded',
        severity: 'high',
        description: `Found ${arabicCount} hardcoded Arabic strings (should use i18n)`,
        element: result.hardcodedStrings.filter(s => /[\u0600-\u06FF]/.test(s)).slice(0, 5).join(', '),
        suggestion: 'Replace with i18n keys: t("key") instead of hardcoded Arabic',
      });
      result.score -= Math.min(arabicCount, 5);
    }

    // Check for English-only content (Latin characters in unexpected places)
    const englishOnlyElements = await page.evaluate(() => {
      const elements: string[] = [];
      const buttons = document.querySelectorAll('button, a, label, h1, h2, h3, h4, h5, h6, p, span');
      buttons.forEach((el) => {
        const text = el.textContent?.trim();
        // Check for English words (not numbers, not symbols)
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
        description: `Found ${englishOnlyElements.length} elements with English-only text`,
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

export async function checkCurrencyFormatting(): Promise<RTLCheckResult> {
  log.info('Checking currency formatting (SAR)');
  const result: RTLCheckResult = {
    category: 'Currency Formatting',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check for SAR currency formatting
    const currencyPatterns = await page.evaluate(() => {
      const text = document.body.innerText;
      const patterns: string[] = [];

      // Find various currency patterns
      const sarPatterns = [
        /\d+\s*SAR/gi, // "100 SAR"
        /SAR\s*\d+/gi, // "SAR 100"
        /\d+\s*ريال/g, // "100 ريال"
        /ريال\s*\d+/g, // "ريال 100"
        /\d+\s*ر\.س/g, // "100 ر.س"
        /ر\.س\s*\d+/g, // "ر.س 100"
        /\$\s*\d+/g,   // "$100" (should not be used)
        /\d+\.\d{2}\s*(SAR|ريال|ر\.س)/gi, // Decimal formatting
      ];

      for (const pattern of sarPatterns) {
        const matches = text.match(pattern);
        if (matches) {
          patterns.push(...matches.slice(0, 3));
        }
      }

      return patterns;
    });

    if (currencyPatterns.length > 0) {
      // Check for incorrect patterns
      const dollarSign = currencyPatterns.filter(p => p.includes('$'));
      if (dollarSign.length > 0) {
        result.issues.push({
          type: 'number',
          severity: 'high',
          description: 'Using $ symbol instead of SAR/ريال',
          element: dollarSign.join(', '),
          suggestion: 'Use SAR or ريال (Arabic) for Saudi Riyal currency',
        });
        result.score -= 3;
      }

      // Check for SAR before number (should be after in Arabic)
      const sarBefore = currencyPatterns.filter(p => /^(SAR|ريال|ر\.س)\s*\d/.test(p));
      if (sarBefore.length > 0) {
        result.issues.push({
          type: 'number',
          severity: 'medium',
          description: 'Currency symbol before number (should be after in Arabic)',
          element: sarBefore.slice(0, 3).join(', '),
          suggestion: 'Use format: "١٠٠ ر.س" or "100 ريال" (number first, then currency)',
        });
        result.score -= 2;
      }

      log.info({ patterns: currencyPatterns }, 'Currency patterns found');
    }

    // Check for basket/cart values
    const cartValues = await page.evaluate(() => {
      const values: string[] = [];
      const cartElements = document.querySelectorAll('[class*="cart"], [class*="basket"], [class*="total"], [class*="price"]');
      cartElements.forEach((el) => {
        const text = el.textContent?.trim();
        if (text && /\d+/.test(text)) {
          values.push(text);
        }
      });
      return values.slice(0, 5);
    });

    if (cartValues.length > 0) {
      log.info({ cartValues }, 'Cart/basket values found');
    }

    await takeScreenshot('rtl_currency_check', 'Currency formatting check');

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Currency formatting check failed');
    result.score = 5;
    return result;
  }
}

export async function checkBiDiTextHandling(): Promise<RTLCheckResult> {
  log.info('Checking BiDi (bidirectional) text handling');
  const result: RTLCheckResult = {
    category: 'BiDi Text Handling',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check for mixed LTR/RTL content
    const bidiIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('*');

      elements.forEach((el) => {
        const text = el.textContent?.trim();
        if (!text || text.length < 5) return;

        // Check for mixed Arabic and English text
        const hasArabic = /[\u0600-\u06FF]/.test(text);
        const hasLatin = /[A-Za-z]/.test(text);

        if (hasArabic && hasLatin) {
          // This is BiDi text - check if it's handled correctly
          const style = window.getComputedStyle(el);
          const unicodeBidi = style.unicodeBidi;
          const direction = style.direction;

          if (unicodeBidi === 'normal' && (hasArabic && hasLatin)) {
            issues.push(text.slice(0, 50));
          }
        }
      });

      return issues.slice(0, 5);
    });

    if (bidiIssues.length > 0) {
      result.issues.push({
        type: 'direction',
        severity: 'medium',
        description: 'Mixed Arabic/English text without proper BiDi handling',
        element: bidiIssues.slice(0, 2).join(' | '),
        suggestion: 'Use unicode-bidi: embed or isolate for mixed content. Wrap segments in <bdi> or use RLI/LRI Unicode controls',
      });
      result.score -= 2;
    }

    // Check for phone numbers and emails (should be LTR in RTL context)
    const ltrData = await page.evaluate(() => {
      const data: string[] = [];
      const text = document.body.innerText;

      // Find phone numbers
      const phonePattern = /\+?[\d\s()-]{10,}/g;
      const phones = text.match(phonePattern) || [];
      data.push(...phones.slice(0, 3));

      // Find emails
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = text.match(emailPattern) || [];
      data.push(...emails.slice(0, 3));

      // Find URLs
      const urlPattern = /(https?:\/\/[^\s]+)/g;
      const urls = text.match(urlPattern) || [];
      data.push(...urls.slice(0, 2));

      return data;
    });

    if (ltrData.length > 0) {
      log.info({ ltrData }, 'Found LTR data (phones, emails, URLs) - should have dir="ltr"');
      // Note: Not marking as issue unless we detect rendering problems
    }

    await takeScreenshot('rtl_bidi_check', 'BiDi text handling check');

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'BiDi text handling check failed');
    result.score = 5;
    return result;
  }
}

export async function checkHijriCalendar(): Promise<RTLCheckResult> {
  log.info('Checking Hijri calendar and date formatting');
  const result: RTLCheckResult = {
    category: 'Date & Time Formatting',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check for Hijri calendar support
    const dateInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      const info: { hijri: string[], gregorian: string[], timezone: string[] } = {
        hijri: [],
        gregorian: [],
        timezone: []
      };

      // Check for Hijri months
      const hijriMonths = ['محرم', 'صفر', 'ربيع', 'جمادى', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
      for (const month of hijriMonths) {
        if (text.includes(month)) {
          info.hijri.push(month);
        }
      }

      // Check for Gregorian date patterns
      const gregorianPattern = /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/g;
      const gregorianDates = text.match(gregorianPattern) || [];
      info.gregorian.push(...gregorianDates.slice(0, 3));

      // Check for timezone mentions
      if (text.includes('GMT') || text.includes('UTC') || text.includes('AST')) {
        info.timezone.push(text.match(/(GMT|UTC|AST)[+-]?\d{1,2}/)?.[0] || 'timezone found');
      }

      return info;
    });

    // Check if dates are formatted properly
    if (dateInfo.gregorian.length > 0) {
      // Check for MM/DD/YYYY (US format) vs DD/MM/YYYY (Saudi format)
      const usFormat = dateInfo.gregorian.filter(d => {
        const parts = d.split(/[\/-]/);
        return parts[0] && parseInt(parts[0]) > 12; // Likely day in first position
      });

      if (usFormat.length > 0) {
        result.issues.push({
          type: 'date',
          severity: 'low',
          description: 'Date format may not be localized for Saudi Arabia',
          element: dateInfo.gregorian.join(', '),
          suggestion: 'Use DD/MM/YYYY format or Arabic date format with Hijri calendar',
        });
        result.score -= 1;
      }
    }

    // Suggest Hijri calendar if not present
    if (dateInfo.hijri.length === 0 && dateInfo.gregorian.length > 0) {
      result.issues.push({
        type: 'date',
        severity: 'low',
        description: 'No Hijri calendar dates found (only Gregorian)',
        suggestion: 'Consider displaying both Hijri and Gregorian dates for Saudi users',
      });
      result.score -= 1;
    }

    log.info({ dateInfo }, 'Date formatting analysis complete');

    await takeScreenshot('rtl_hijri_check', 'Hijri calendar check');

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Hijri calendar check failed');
    result.score = 5;
    return result;
  }
}

export async function checkLayoutExpansion(): Promise<RTLCheckResult> {
  log.info('Checking layout expansion (Arabic text is ~30% longer)');
  const result: RTLCheckResult = {
    category: 'Layout Expansion',
    issues: [],
    hardcodedStrings: [],
    score: 10,
  };

  try {
    const page = await getPage();

    // Check for text overflow and truncation
    const overflowIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('button, a, label, span, p, h1, h2, h3, h4, h5, h6');

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const hasOverflow = style.overflow === 'hidden' || style.textOverflow === 'ellipsis';
        const text = el.textContent?.trim();

        if (hasOverflow && text && text.length > 10) {
          // Check if element is too small for Arabic text
          const rect = el.getBoundingClientRect();
          if (rect.width < 100 && text.length > 15) {
            issues.push(`${el.tagName}: "${text.slice(0, 30)}..." (width: ${rect.width}px)`);
          }
        }
      });

      return issues.slice(0, 5);
    });

    if (overflowIssues.length > 0) {
      result.issues.push({
        type: 'alignment',
        severity: 'medium',
        description: `Found ${overflowIssues.length} elements with potential text overflow`,
        element: overflowIssues.slice(0, 2).join(' | '),
        suggestion: 'Ensure elements have enough space for Arabic text (30% larger than English)',
      });
      result.score -= 2;
    }

    // Check button and container widths
    const buttonSizes = await page.evaluate(() => {
      const buttons: string[] = [];
      document.querySelectorAll('button').forEach((btn) => {
        const rect = btn.getBoundingClientRect();
        const text = btn.textContent?.trim();
        if (text && rect.width > 0) {
          buttons.push(`${text.slice(0, 20)}: ${Math.round(rect.width)}px`);
        }
      });
      return buttons.slice(0, 5);
    });

    log.info({ buttonSizes }, 'Button sizes measured');

    await takeScreenshot('rtl_layout_expansion_check', 'Layout expansion check');

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Layout expansion check failed');
    result.score = 5;
    return result;
  }
}

export async function runRTLChecks(): Promise<RTLCheckResult[]> {
  log.info('Running all RTL checks (comprehensive)');
  const results: RTLCheckResult[] = [];

  results.push(await checkRTLDirection());
  results.push(await checkTextAlignment());
  results.push(await checkHardcodedStrings());
  results.push(await checkNumbersAndDates());
  results.push(await checkCurrencyFormatting());
  results.push(await checkBiDiTextHandling());
  results.push(await checkHijriCalendar());
  results.push(await checkLayoutExpansion());
  results.push(await checkIconAlignment());

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  log.info({ avgScore, checks: results.length }, 'RTL checks complete');

  return results;
}

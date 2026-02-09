import { TestOrchestrator } from '../src/orchestrator/test-orchestrator';
import { TestPhase } from '../src/types';
import { loadConfig } from '../src/config/default-config';

/**
 * Test: Component-Level Deep Checks
 *
 * Focuses on individual component quality:
 * 1. Back button position (must be RIGHT side in RTL)
 * 2. Button text centering
 * 3. Input field alignment
 * 4. Phone input country code positioning
 * 5. Checkbox alignment
 * 6. Social button equal width
 * 7. Vendor login page title (was showing raw i18n key)
 * 8. Language toggle on welcome page
 */

async function main() {
  const config = loadConfig();
  const orchestrator = new TestOrchestrator(config);

  const phases: TestPhase[] = [
    // --- Welcome Page Component Checks ---
    {
      id: 'welcome-components',
      name: 'Welcome Page Components',
      description: 'Deep component check on welcome page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to welcome',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait for render',
        },
        {
          type: 'screenshot',
          description: 'Welcome page components',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: `DETAILED component check:
1. LOGO: centered horizontally, circular border, proper size (not too small/large)
2. BRAND NAME (دعوتي): centered, readable font size, Arabic text
3. TAGLINE: centered, proper line spacing, not truncated
4. LOGIN BUTTON: full-width with padding, gradient gold background, text "تسجيل الدخول / إنشاء حساب" centered vertically and horizontally, minimum touch height 48px
5. VENDOR BUTTON: full-width, bordered style, briefcase icon + text "تسجيل الدخول كمزود خدمة" properly aligned, icon on RIGHT side (RTL)
6. LANGUAGE TOGGLE: top of screen, globe icon + text, properly positioned
7. VERSION BADGE: visible, small text
8. ABOUT LINK: centered at bottom
9. NO hardcoded English text except "English" in language toggle (which is intentional)
10. NO overlapping elements, no text cut off`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Login Page Component Checks ---
    {
      id: 'login-components',
      name: 'Login Page Components',
      description: 'Deep component check on login page',
      actions: [
        {
          type: 'click',
          selector: '[data-testid="welcome-login-button"]',
          description: 'Click login button',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for login',
        },
        {
          type: 'screenshot',
          description: 'Login page detailed components',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: `DETAILED component check:
1. BACK BUTTON (chevron >): must be on RIGHT side of header (RTL layout), proper touch target size
2. HEADER TITLE "تسجيل الدخول": centered horizontally in header bar
3. ANIMATION: centered, visible (golden loading indicator or sparkle emoji on web)
4. WELCOME TEXT "مرحبا بك في دعوة": right-aligned text (RTL), proper font size
5. SUBTITLE "الرجاء إدخال رقم هاتفك": right-aligned, smaller than title
6. PHONE INPUT CARD: rounded corners, proper shadow, contains:
   a. Label "حقل رقم الهاتف" with phone icon on RIGHT (RTL)
   b. Country code selector (+966 🇸🇦) and phone input side by side
   c. Phone input placeholder "5XX XXX XXXX" left-aligned (numbers always LTR)
7. TERMS CHECKBOX: checkbox on RIGHT side (RTL), text wrapping properly, links colored gold
8. CONTINUE BUTTON "متابعة": full-width, gold background, text centered, disabled state (grayed out)
9. DIVIDER "أو استخدم": centered with lines on both sides
10. APPLE BUTTON: icon + "المتابعة مع آبل" - both in Arabic, equal width with Google button
11. GOOGLE BUTTON: icon + "المتابعة مع جوجل" - both in Arabic, equal width with Apple button
12. EMAIL BUTTON: full-width, icon + "المتابعة بالبريد الإلكتروني" in Arabic
13. NO hardcoded English text (Apple/Google should show Arabic)`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
      dependencies: ['welcome-components'],
    },

    // --- Vendor Login Component Checks ---
    {
      id: 'vendor-login-components',
      name: 'Vendor Login Components',
      description: 'Deep check that vendor login title translates correctly',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to welcome',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait for welcome',
        },
        {
          type: 'click',
          selector: '[data-testid="welcome-vendor-button"]',
          description: 'Click vendor login button',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for vendor login',
        },
        {
          type: 'screenshot',
          description: 'Vendor login components',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: `CRITICAL component check:
1. HEADER TITLE: must show "تسجيل دخول المزود" (Arabic translated), NOT "vendor_signin_title" (raw i18n key)
2. BACK BUTTON: on RIGHT side (RTL)
3. Same component checks as regular login (phone input, social buttons, etc.)
4. All social buttons showing Arabic text (المتابعة مع آبل / المتابعة مع جوجل)
5. NO raw i18n keys visible anywhere on screen
6. NO hardcoded English text`,
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Login Page Scrolled Bottom Components ---
    {
      id: 'login-bottom-components',
      name: 'Login Page Bottom Components',
      description: 'Check components at bottom of scrollable login page',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}`,
          description: 'Navigate to welcome',
        },
        {
          type: 'wait',
          timeout: 3000,
          description: 'Wait',
        },
        {
          type: 'click',
          selector: '[data-testid="welcome-login-button"]',
          description: 'Click login',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for login',
        },
        {
          type: 'scroll-to-bottom',
          description: 'Scroll to bottom of page',
        },
        {
          type: 'screenshot',
          description: 'Login bottom section',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: `Check bottom section components:
1. Social buttons (Apple + Google) visible and properly sized
2. Email button visible and full-width
3. No elements cut off at bottom
4. Proper padding at bottom of scroll area
5. Elements not overlapping with each other`,
        },
      ],
    },

    // --- Navigate Deep Pages (Auth Required - Test Redirects) ---
    {
      id: 'marketplace-deep',
      name: 'Marketplace Page',
      description: 'Try accessing marketplace - check what renders',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/marketplace`,
          description: 'Navigate to marketplace',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for page or redirect',
        },
        {
          type: 'screenshot',
          description: 'Marketplace or redirect',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check whatever page loaded: if marketplace - search bar, category chips, vendor cards all properly laid out for RTL. If redirected to login/welcome - that page should look correct. No error pages, no blank screens, no crashes.',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    {
      id: 'account-deep',
      name: 'Account Page',
      description: 'Try accessing account settings',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/account`,
          description: 'Navigate to account',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for page or redirect',
        },
        {
          type: 'screenshot',
          description: 'Account or redirect',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: if account page - profile card, settings list with RTL alignment (icons right, arrows left). If redirected - page should be correct. No errors, crashes, or blank screens.',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },

    // --- Vendor Dashboard ---
    {
      id: 'vendor-dashboard-deep',
      name: 'Vendor Dashboard',
      description: 'Try accessing vendor dashboard',
      actions: [
        {
          type: 'navigate',
          url: `${config.baseUrl}/(vendor-tabs)`,
          description: 'Navigate to vendor dashboard',
        },
        {
          type: 'wait',
          timeout: 5000,
          description: 'Wait for page or redirect',
        },
        {
          type: 'screenshot',
          description: 'Vendor dashboard or redirect',
        },
      ],
      validations: [
        {
          type: 'ai',
          description: 'Check: if vendor dashboard - stats cards aligned, bookings list RTL, tab bar at bottom. If redirected - page correct. No errors or blank screens.',
        },
        { type: 'rtl', description: 'RTL check' },
      ],
    },
  ];

  const result = await orchestrator.runTestSuite('Component Deep Checks', phases);
  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});

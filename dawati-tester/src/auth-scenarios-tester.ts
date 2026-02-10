import { getPage, navigateTo } from './browser';
import { takeScreenshot } from './screenshot-manager';
import { config } from './config';
import { createChildLogger } from './logger';

const log = createChildLogger('auth-scenarios');

export interface AuthScenarioResult {
  scenario: string;
  method: 'phone' | 'email';
  userType: 'new_customer' | 'existing_customer' | 'new_vendor' | 'existing_vendor';
  success: boolean;
  steps: AuthStep[];
  wizardDetected?: boolean;
  dashboardReached?: boolean;
  error?: string;
}

export interface AuthStep {
  name: string;
  success: boolean;
  screenshot?: string;
  error?: string;
}

/**
 * Test Scenario 1: New Customer - Phone OTP → Customer Onboarding Wizard
 */
export async function testNewCustomerPhone(): Promise<AuthScenarioResult> {
  log.info('🆕 Testing NEW CUSTOMER - Phone OTP → Onboarding Wizard');
  const steps: AuthStep[] = [];
  const scenario = 'New Customer (Phone)';

  try {
    const result = await phoneAuthFlow(
      config.testUsers.phone.newCustomer,
      config.testOtp,
      scenario,
      steps
    );

    // Expect onboarding wizard for new customer
    if (result.success && result.wizardDetected) {
      log.info('✅ NEW CUSTOMER: Onboarding wizard detected (EXPECTED)');
      return {
        scenario,
        method: 'phone',
        userType: 'new_customer',
        success: true,
        steps,
        wizardDetected: true,
      };
    } else if (result.success && !result.wizardDetected) {
      log.warn('⚠️ NEW CUSTOMER: No onboarding wizard detected (should show wizard for new users)');
      return {
        scenario,
        method: 'phone',
        userType: 'new_customer',
        success: false,
        steps,
        error: 'Expected onboarding wizard but went directly to dashboard',
      };
    }

    return {
      scenario,
      method: 'phone',
      userType: 'new_customer',
      success: false,
      steps,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'NEW CUSTOMER test failed');
    return {
      scenario,
      method: 'phone',
      userType: 'new_customer',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

/**
 * Test Scenario 2: Existing Customer - Phone OTP → Skip Wizard → Dashboard
 */
export async function testExistingCustomerPhone(): Promise<AuthScenarioResult> {
  log.info('👤 Testing EXISTING CUSTOMER - Phone OTP → Dashboard (skip wizard)');
  const steps: AuthStep[] = [];
  const scenario = 'Existing Customer (Phone)';

  try {
    const result = await phoneAuthFlow(
      config.testUsers.phone.existingCustomer,
      config.testOtp,
      scenario,
      steps
    );

    // Expect dashboard directly (no wizard) for existing customer
    if (result.success && !result.wizardDetected && result.dashboardReached) {
      log.info('✅ EXISTING CUSTOMER: Dashboard reached directly (EXPECTED)');
      return {
        scenario,
        method: 'phone',
        userType: 'existing_customer',
        success: true,
        steps,
        dashboardReached: true,
      };
    } else if (result.success && result.wizardDetected) {
      log.warn('⚠️ EXISTING CUSTOMER: Wizard shown (should skip for existing users)');
      return {
        scenario,
        method: 'phone',
        userType: 'existing_customer',
        success: false,
        steps,
        error: 'Expected to skip wizard but wizard was shown',
      };
    }

    return {
      scenario,
      method: 'phone',
      userType: 'existing_customer',
      success: false,
      steps,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'EXISTING CUSTOMER test failed');
    return {
      scenario,
      method: 'phone',
      userType: 'existing_customer',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

/**
 * Test Scenario 3: New Vendor - Phone OTP → Vendor Registration Wizard (8 steps)
 */
export async function testNewVendorPhone(): Promise<AuthScenarioResult> {
  log.info('🆕🏢 Testing NEW VENDOR - Phone OTP → Vendor Registration Wizard');
  const steps: AuthStep[] = [];
  const scenario = 'New Vendor (Phone)';

  try {
    const result = await phoneAuthFlow(
      config.testUsers.phone.newVendor,
      config.testOtp,
      scenario,
      steps
    );

    // Expect vendor registration wizard for new vendor
    if (result.success && result.wizardDetected) {
      log.info('✅ NEW VENDOR: Vendor registration wizard detected (EXPECTED)');
      return {
        scenario,
        method: 'phone',
        userType: 'new_vendor',
        success: true,
        steps,
        wizardDetected: true,
      };
    } else if (result.success && !result.wizardDetected) {
      log.warn('⚠️ NEW VENDOR: No wizard detected (should show 8-step vendor registration)');
      return {
        scenario,
        method: 'phone',
        userType: 'new_vendor',
        success: false,
        steps,
        error: 'Expected vendor registration wizard but went directly to dashboard',
      };
    }

    return {
      scenario,
      method: 'phone',
      userType: 'new_vendor',
      success: false,
      steps,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'NEW VENDOR test failed');
    return {
      scenario,
      method: 'phone',
      userType: 'new_vendor',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

/**
 * Test Scenario 4: Existing Vendor - Phone OTP → Skip Wizard → Vendor Dashboard
 */
export async function testExistingVendorPhone(): Promise<AuthScenarioResult> {
  log.info('👤🏢 Testing EXISTING VENDOR - Phone OTP → Vendor Dashboard (skip wizard)');
  const steps: AuthStep[] = [];
  const scenario = 'Existing Vendor (Phone)';

  try {
    const result = await phoneAuthFlow(
      config.testUsers.phone.existingVendor,
      config.testOtp,
      scenario,
      steps
    );

    // Expect vendor dashboard directly (no wizard) for existing vendor
    if (result.success && !result.wizardDetected && result.dashboardReached) {
      log.info('✅ EXISTING VENDOR: Vendor dashboard reached directly (EXPECTED)');
      return {
        scenario,
        method: 'phone',
        userType: 'existing_vendor',
        success: true,
        steps,
        dashboardReached: true,
      };
    } else if (result.success && result.wizardDetected) {
      log.warn('⚠️ EXISTING VENDOR: Wizard shown (should skip for existing vendors)');
      return {
        scenario,
        method: 'phone',
        userType: 'existing_vendor',
        success: false,
        steps,
        error: 'Expected to skip wizard but wizard was shown',
      };
    }

    return {
      scenario,
      method: 'phone',
      userType: 'existing_vendor',
      success: false,
      steps,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'EXISTING VENDOR test failed');
    return {
      scenario,
      method: 'phone',
      userType: 'existing_vendor',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

/**
 * Test Scenario 5: Email Sign-In (New User) → Onboarding
 */
export async function testEmailSignInNew(): Promise<AuthScenarioResult> {
  log.info('📧🆕 Testing EMAIL SIGN-IN (NEW USER) → Onboarding');
  const steps: AuthStep[] = [];
  const scenario = 'New User (Email)';

  try {
    const result = await emailAuthFlow(
      config.testUsers.email.new,
      scenario,
      steps
    );

    if (result.success && result.wizardDetected) {
      log.info('✅ EMAIL (NEW USER): Onboarding wizard detected (EXPECTED)');
      return {
        scenario,
        method: 'email',
        userType: 'new_customer', // Email assumes customer by default
        success: true,
        steps,
        wizardDetected: true,
      };
    } else if (result.success && !result.wizardDetected) {
      log.warn('⚠️ EMAIL (NEW USER): No wizard detected (should show for new users)');
      return {
        scenario,
        method: 'email',
        userType: 'new_customer',
        success: false,
        steps,
        error: 'Expected onboarding wizard but went directly to dashboard',
      };
    }

    return {
      scenario,
      method: 'email',
      userType: 'new_customer',
      success: false,
      steps,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'EMAIL (NEW USER) test failed');
    return {
      scenario,
      method: 'email',
      userType: 'new_customer',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

/**
 * Test Scenario 6: Email Sign-In (Existing User) → Dashboard
 */
export async function testEmailSignInExisting(): Promise<AuthScenarioResult> {
  log.info('📧👤 Testing EMAIL SIGN-IN (EXISTING USER) → Dashboard');
  const steps: AuthStep[] = [];
  const scenario = 'Existing User (Email)';

  try {
    const result = await emailAuthFlow(
      config.testUsers.email.existing,
      scenario,
      steps
    );

    if (result.success && !result.wizardDetected && result.dashboardReached) {
      log.info('✅ EMAIL (EXISTING USER): Dashboard reached directly (EXPECTED)');
      return {
        scenario,
        method: 'email',
        userType: 'existing_customer',
        success: true,
        steps,
        dashboardReached: true,
      };
    } else if (result.success && result.wizardDetected) {
      log.warn('⚠️ EMAIL (EXISTING USER): Wizard shown (should skip for existing users)');
      return {
        scenario,
        method: 'email',
        userType: 'existing_customer',
        success: false,
        steps,
        error: 'Expected to skip wizard but wizard was shown',
      };
    }

    return {
      scenario,
      method: 'email',
      userType: 'existing_customer',
      success: false,
      steps,
      error: result.error,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'EMAIL (EXISTING USER) test failed');
    return {
      scenario,
      method: 'email',
      userType: 'existing_customer',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

/**
 * Run all authentication scenarios
 */
export async function runAllAuthScenarios(): Promise<AuthScenarioResult[]> {
  log.info('🚀 Running ALL authentication scenarios (6 tests)');
  const results: AuthScenarioResult[] = [];

  // Phone scenarios
  results.push(await testNewCustomerPhone());
  results.push(await testExistingCustomerPhone());
  results.push(await testNewVendorPhone());
  results.push(await testExistingVendorPhone());

  // Email scenarios
  results.push(await testEmailSignInNew());
  results.push(await testEmailSignInExisting());

  const passed = results.filter(r => r.success).length;
  log.info(`✅ Auth scenarios complete: ${passed}/6 passed`);

  return results;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

interface AuthFlowResult {
  success: boolean;
  wizardDetected: boolean;
  dashboardReached: boolean;
  error?: string;
}

/**
 * Phone authentication flow (reusable for all phone scenarios)
 */
async function phoneAuthFlow(
  phoneNumber: string,
  otpCode: string,
  scenarioName: string,
  steps: AuthStep[]
): Promise<AuthFlowResult> {
  const page = await getPage();

  // Step 1: Navigate to auth page
  await navigateTo(config.dawatiUrl);
  await page.waitForTimeout(1000);
  const ss1 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_01_home`, 'Home page');
  steps.push({ name: 'Navigate to home', success: true, screenshot: ss1.filename });

  // Step 2: Find and click sign in button
  const signInSelectors = [
    'text=Sign In',
    'text=تسجيل الدخول',
    'text=Login',
    'text=دخول',
    '[data-testid="sign-in"]',
    'button:has-text("Sign")',
  ];

  for (const selector of signInSelectors) {
    try {
      await page.click(selector, { timeout: 3000 });
      log.info(`Clicked sign-in: ${selector}`);
      break;
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(1000);
  const ss2 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_02_login_page`, 'Login page');
  steps.push({ name: 'Open login page', success: true, screenshot: ss2.filename });

  // Step 3: Enter phone number
  const phoneInputSelectors = [
    'input[type="tel"]',
    'input[name="phone"]',
    'input[placeholder*="phone"]',
    'input[placeholder*="هاتف"]',
    '[data-testid="phone-input"]',
  ];

  let phoneEntered = false;
  for (const selector of phoneInputSelectors) {
    try {
      await page.fill(selector, phoneNumber, { timeout: 2000 });
      phoneEntered = true;
      log.info(`Entered phone: ${phoneNumber}`);
      break;
    } catch {
      continue;
    }
  }

  if (!phoneEntered) {
    steps.push({ name: 'Enter phone', success: false, error: 'Phone input not found' });
    return { success: false, wizardDetected: false, dashboardReached: false, error: 'Phone input not found' };
  }

  const ss3 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_03_phone_entered`, 'Phone entered');
  steps.push({ name: 'Enter phone', success: true, screenshot: ss3.filename });

  // Step 4: Check terms checkbox
  const termsCheckboxSelectors = [
    'input[type="checkbox"]',
    '[data-testid="terms-checkbox"]',
    'input[name="terms"]',
    'input[name="acceptTerms"]',
    '[role="checkbox"]',
  ];

  for (const selector of termsCheckboxSelectors) {
    try {
      const checkbox = page.locator(selector).first();
      if (await checkbox.isVisible({ timeout: 2000 })) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) {
          await checkbox.click();
          log.info('Checked terms checkbox');
        }
        break;
      }
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(500);

  // Step 5: Click send code button
  const sendCodeSelectors = [
    'text=Send Code',
    'text=Continue',
    'text=متابعة',
    'button[type="submit"]',
    '[data-testid="send-code"]',
  ];

  let codeSent = false;
  for (const selector of sendCodeSelectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      codeSent = true;
      log.info('Clicked send code');
      break;
    } catch {
      continue;
    }
  }

  if (!codeSent) {
    steps.push({ name: 'Send code', success: false, error: 'Send button not found' });
    return { success: false, wizardDetected: false, dashboardReached: false, error: 'Send button not found' };
  }

  await page.waitForTimeout(3000);
  const ss4 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_04_otp_screen`, 'OTP screen');
  steps.push({ name: 'Request OTP', success: true, screenshot: ss4.filename });

  // Step 6: Enter OTP
  let otpEntered = false;
  const otpInputSelectors = [
    'input[type="text"]',
    'input[type="number"]',
    'input[name="otp"]',
    '[data-testid="otp-input"]',
  ];

  for (const selector of otpInputSelectors) {
    try {
      const input = page.locator(selector).first();
      if (await input.isVisible({ timeout: 2000 })) {
        await input.fill(otpCode);
        otpEntered = true;
        log.info('Entered OTP');
        break;
      }
    } catch {
      continue;
    }
  }

  if (!otpEntered) {
    // Try multiple digit inputs
    const digits = otpCode.split('');
    let digitsEntered = 0;
    for (let i = 0; i < digits.length; i++) {
      try {
        const digitInput = page.locator('input[type="text"]').nth(i);
        if (await digitInput.isVisible({ timeout: 1000 })) {
          await digitInput.fill(digits[i]);
          digitsEntered++;
        }
      } catch {
        break;
      }
    }
    otpEntered = digitsEntered === digits.length;
  }

  if (!otpEntered) {
    steps.push({ name: 'Enter OTP', success: false, error: 'OTP input not found' });
    return { success: false, wizardDetected: false, dashboardReached: false, error: 'OTP input not found' };
  }

  await page.waitForTimeout(1000);
  const ss5 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_05_otp_entered`, 'OTP entered');
  steps.push({ name: 'Enter OTP', success: true, screenshot: ss5.filename });

  // Step 7: Click verify
  const verifySelectors = [
    'text=Verify',
    'text=تحقق',
    'text=Submit',
    'button[type="submit"]',
    '[data-testid="verify"]',
  ];

  for (const selector of verifySelectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      log.info('Clicked verify');
      break;
    } catch {
      continue;
    }
  }

  // Step 8: Wait for result (wizard or dashboard)
  log.info('Waiting for redirect...');
  await page.waitForTimeout(5000);

  const currentUrl = await page.url();
  log.info(`Current URL after auth: ${currentUrl}`);

  // Check for wizard
  const wizardIndicators = [
    '/onboarding',
    '/wizard',
    '/vendor-onboarding',
    'text=Welcome',
    'text=مرحباً',
    'text=Business',
    'text=Step 1',
  ];

  let wizardDetected = false;
  for (const indicator of wizardIndicators) {
    try {
      if (indicator.startsWith('/')) {
        if (currentUrl.includes(indicator)) {
          wizardDetected = true;
          log.info(`Wizard detected: URL contains ${indicator}`);
          break;
        }
      } else {
        if (await page.locator(indicator).isVisible({ timeout: 2000 })) {
          wizardDetected = true;
          log.info(`Wizard detected: Found ${indicator}`);
          break;
        }
      }
    } catch {
      continue;
    }
  }

  // Check for dashboard
  const dashboardIndicators = [
    '/dashboard',
    '/home',
    '/events',
    '/vendor-dashboard',
    'text=Dashboard',
    'text=My Events',
    '[data-testid="dashboard"]',
  ];

  let dashboardReached = false;
  for (const indicator of dashboardIndicators) {
    try {
      if (indicator.startsWith('/')) {
        if (currentUrl.includes(indicator)) {
          dashboardReached = true;
          log.info(`Dashboard detected: URL contains ${indicator}`);
          break;
        }
      } else {
        if (await page.locator(indicator).isVisible({ timeout: 2000 })) {
          dashboardReached = true;
          log.info(`Dashboard detected: Found ${indicator}`);
          break;
        }
      }
    } catch {
      continue;
    }
  }

  const ss6 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_06_final`, 'Final state');
  steps.push({
    name: wizardDetected ? 'Wizard shown' : 'Dashboard reached',
    success: true,
    screenshot: ss6.filename,
  });

  return {
    success: true,
    wizardDetected,
    dashboardReached,
  };
}

/**
 * Email authentication flow (reusable for email scenarios)
 */
async function emailAuthFlow(
  email: string,
  scenarioName: string,
  steps: AuthStep[]
): Promise<AuthFlowResult> {
  const page = await getPage();

  // Navigate to auth page
  await navigateTo(config.dawatiUrl);
  await page.waitForTimeout(1000);
  const ss1 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_email_01_home`, 'Home page');
  steps.push({ name: 'Navigate to home', success: true, screenshot: ss1.filename });

  // Click sign in
  const signInSelectors = [
    'text=Sign In',
    'text=تسجيل الدخول',
    '[data-testid="sign-in"]',
  ];

  for (const selector of signInSelectors) {
    try {
      await page.click(selector, { timeout: 3000 });
      break;
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(1000);

  // Click email tab
  const emailTabSelectors = [
    'text=Email',
    'text=البريد',
    '[data-testid="email-tab"]',
  ];

  for (const selector of emailTabSelectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      break;
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(500);
  const ss2 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_email_02_email_tab`, 'Email tab');
  steps.push({ name: 'Select email auth', success: true, screenshot: ss2.filename });

  // Enter email
  const emailInputSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    '[data-testid="email-input"]',
  ];

  let emailEntered = false;
  for (const selector of emailInputSelectors) {
    try {
      await page.fill(selector, email, { timeout: 2000 });
      emailEntered = true;
      log.info(`Entered email: ${email}`);
      break;
    } catch {
      continue;
    }
  }

  if (!emailEntered) {
    steps.push({ name: 'Enter email', success: false, error: 'Email input not found' });
    return { success: false, wizardDetected: false, dashboardReached: false, error: 'Email input not found' };
  }

  const ss3 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_email_03_entered`, 'Email entered');
  steps.push({ name: 'Enter email', success: true, screenshot: ss3.filename });

  // Click send code
  const sendCodeSelectors = [
    'text=Send Code',
    'text=Continue',
    'button[type="submit"]',
  ];

  for (const selector of sendCodeSelectors) {
    try {
      await page.click(selector, { timeout: 2000 });
      break;
    } catch {
      continue;
    }
  }

  await page.waitForTimeout(3000);
  const ss4 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_email_04_code_sent`, 'Code sent');
  steps.push({ name: 'Request email code', success: true, screenshot: ss4.filename });

  // For email, we can't automatically verify (need real email)
  // But we can check if code entry screen appears
  log.info('✅ Email auth flow tested up to code request');
  log.info('⚠️ Cannot complete email verification automatically (requires real email access)');

  return {
    success: true,
    wizardDetected: false,
    dashboardReached: false,
  };
}

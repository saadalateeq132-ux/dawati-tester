import { Page } from 'playwright';
import { getPage, navigateTo } from './browser';
import { takeScreenshot } from './screenshot-manager';
import { config } from './config';
import { createChildLogger } from './logger';
import {
  AuthStep,
  AuthFlowResult,
  navigateToHome,
  findAndClickSignIn,
  enterPhoneNumber,
  handleTermsCheckbox,
  clickSendCode,
  enterOtp,
  clickVerify,
  detectAuthRedirect,
} from './auth-helpers';

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
  return runPhoneScenario(
    'existing_vendor',
    'Existing Vendor (Phone)',
    config.testUsers.phone.existingVendor,
    'expect_dashboard'
  );
}

/**
 * Helper to run a phone authentication scenario with specific expectations
 */
export async function runPhoneScenario(
  userType: 'new_customer' | 'existing_customer' | 'new_vendor' | 'existing_vendor',
  scenarioName: string,
  phoneNumber: string,
  expectation: 'expect_wizard' | 'expect_dashboard',
  // Optional dependency injection for testing
  _authFlow = phoneAuthFlow
): Promise<AuthScenarioResult> {
  log.info(`Testing ${scenarioName}`);
  const steps: AuthStep[] = [];

  try {
    const result = await _authFlow(
      phoneNumber,
      config.testOtp,
      scenarioName,
      steps
    );

    let success = false;
    let error: string | undefined = result.error;

    if (result.success) {
      if (expectation === 'expect_wizard') {
        if (result.wizardDetected) {
          log.info(`✅ ${scenarioName}: Onboarding wizard detected (EXPECTED)`);
          success = true;
        } else {
          log.warn(`⚠️ ${scenarioName}: No onboarding wizard detected (should show wizard)`);
          error = 'Expected onboarding wizard but went directly to dashboard';
        }
      } else { // expect_dashboard
        if (!result.wizardDetected && result.dashboardReached) {
          log.info(`✅ ${scenarioName}: Dashboard reached directly (EXPECTED)`);
          success = true;
        } else if (result.wizardDetected) {
          log.warn(`⚠️ ${scenarioName}: Wizard shown (should skip for existing users)`);
          error = 'Expected to skip wizard but wizard was shown';
        }
      }
    }

    return {
      scenario: scenarioName,
      method: 'phone',
      userType,
      success,
      steps,
      wizardDetected: result.wizardDetected,
      dashboardReached: result.dashboardReached,
      error,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error({ error: errorMessage }, `${scenarioName} failed`);
    return {
      scenario: scenarioName,
      method: 'phone',
      userType,
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

  // Step 1: Navigate to home
  await navigateToHome(page, scenarioName, steps);

  // Step 2: Find and click sign in
  await findAndClickSignIn(page, log, scenarioName, steps);

  // Step 3: Enter phone number
  const phoneSuccess = await enterPhoneNumber(page, phoneNumber, log, scenarioName, steps);
  if (!phoneSuccess) {
    return { success: false, wizardDetected: false, dashboardReached: false, error: 'Phone input not found' };
  }

  // Step 4: Check terms
  await handleTermsCheckbox(page, log);

  // Step 5: Click send code
  const sendCodeSuccess = await clickSendCode(page, log, scenarioName, steps);
  if (!sendCodeSuccess) {
    return { success: false, wizardDetected: false, dashboardReached: false, error: 'Send button not found' };
  }

  // Step 6: Enter OTP
  const otpSuccess = await enterOtp(page, otpCode, log, scenarioName, steps);
  if (!otpSuccess) {
    return { success: false, wizardDetected: false, dashboardReached: false, error: 'OTP input not found' };
  }

  // Step 7: Click verify
  await clickVerify(page, log);

  // Step 8: Detect redirect
  return await detectAuthRedirect(page, log, scenarioName, steps);
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
  await findAndClick(page, signInSelectors, 'sign-in');

  await page.waitForTimeout(1000);

  // Click email tab
  const emailTabSelectors = [
    'text=Email',
    'text=البريد',
    '[data-testid="email-tab"]',
  ];
  await findAndClick(page, emailTabSelectors, 'email tab');

  await page.waitForTimeout(500);
  const ss2 = await takeScreenshot(`${scenarioName.replace(/\s+/g, '_').toLowerCase()}_email_02_email_tab`, 'Email tab');
  steps.push({ name: 'Select email auth', success: true, screenshot: ss2.filename });

  // Enter email
  const emailInputSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    '[data-testid="email-input"]',
  ];

  const emailEntered = await findAndFill(page, emailInputSelectors, email, 'email');

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
  await findAndClick(page, sendCodeSelectors, 'send code');

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

/**
 * Try to click an element using multiple selectors
 */
async function findAndClick(
  page: Page,
  selectors: string[],
  description: string
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      await page.click(selector, { timeout: 3000 });
      log.info(`Clicked ${description}: ${selector}`);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Try to fill an input using multiple selectors
 */
async function findAndFill(
  page: Page,
  selectors: string[],
  value: string,
  description: string
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      await page.fill(selector, value, { timeout: 2000 });
      log.info(`Filled ${description}: ${value}`);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

/**
 * Try to check a checkbox using multiple selectors
 */
async function findAndCheck(
  page: Page,
  selectors: string[],
  description: string
): Promise<boolean> {
  for (const selector of selectors) {
    try {
      const checkbox = page.locator(selector).first();
      if (await checkbox.isVisible({ timeout: 2000 })) {
        const isChecked = await checkbox.isChecked().catch(() => false);
        if (!isChecked) {
          await checkbox.click();
          log.info(`Checked ${description}`);
        }
        return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

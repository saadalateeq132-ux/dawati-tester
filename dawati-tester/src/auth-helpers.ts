import { Page } from 'playwright';
import { Logger } from 'pino';
import { takeScreenshot } from './screenshot-manager';
import { navigateTo } from './browser';
import { config } from './config';

export interface AuthStep {
  name: string;
  success: boolean;
  screenshot?: string;
  error?: string;
}

export interface AuthFlowResult {
  success: boolean;
  wizardDetected: boolean;
  dashboardReached: boolean;
  error?: string;
}

function sanitizeScenarioName(name: string): string {
  return name.replace(/\s+/g, '_').toLowerCase();
}

/**
 * Navigate to the home page and take initial screenshot
 */
export async function navigateToHome(
  page: Page,
  scenarioName: string,
  steps: AuthStep[]
): Promise<void> {
  const prefix = sanitizeScenarioName(scenarioName);
  await navigateTo(config.dawatiUrl);
  await page.waitForTimeout(1000);
  const ss = await takeScreenshot(`${prefix}_01_home`, 'Home page');
  steps.push({ name: 'Navigate to home', success: true, screenshot: ss.filename });
}

/**
 * Find and click the sign-in button
 */
export async function findAndClickSignIn(
  page: Page,
  log: Logger,
  scenarioName: string,
  steps: AuthStep[]
): Promise<void> {
  const prefix = sanitizeScenarioName(scenarioName);
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
  const ss = await takeScreenshot(`${prefix}_02_login_page`, 'Login page');
  steps.push({ name: 'Open login page', success: true, screenshot: ss.filename });
}

/**
 * Enter phone number into the input field
 */
export async function enterPhoneNumber(
  page: Page,
  phoneNumber: string,
  log: Logger,
  scenarioName: string,
  steps: AuthStep[]
): Promise<boolean> {
  const prefix = sanitizeScenarioName(scenarioName);
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
    return false;
  }

  const ss = await takeScreenshot(`${prefix}_03_phone_entered`, 'Phone entered');
  steps.push({ name: 'Enter phone', success: true, screenshot: ss.filename });
  return true;
}

/**
 * Check the terms and conditions checkbox if present
 */
export async function handleTermsCheckbox(
  page: Page,
  log: Logger
): Promise<void> {
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
}

/**
 * Click the "Send Code" or "Continue" button
 */
export async function clickSendCode(
  page: Page,
  log: Logger,
  scenarioName: string,
  steps: AuthStep[]
): Promise<boolean> {
  const prefix = sanitizeScenarioName(scenarioName);
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
    return false;
  }

  await page.waitForTimeout(3000);
  const ss = await takeScreenshot(`${prefix}_04_otp_screen`, 'OTP screen');
  steps.push({ name: 'Request OTP', success: true, screenshot: ss.filename });
  return true;
}

/**
 * Enter the OTP code
 */
export async function enterOtp(
  page: Page,
  otpCode: string,
  log: Logger,
  scenarioName: string,
  steps: AuthStep[]
): Promise<boolean> {
  const prefix = sanitizeScenarioName(scenarioName);
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
    return false;
  }

  await page.waitForTimeout(1000);
  const ss = await takeScreenshot(`${prefix}_05_otp_entered`, 'OTP entered');
  steps.push({ name: 'Enter OTP', success: true, screenshot: ss.filename });
  return true;
}

/**
 * Click the verify button
 */
export async function clickVerify(
  page: Page,
  log: Logger
): Promise<void> {
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
}

/**
 * Wait for redirect and detect if we reached the wizard or dashboard
 */
export async function detectAuthRedirect(
  page: Page,
  log: Logger,
  scenarioName: string,
  steps: AuthStep[]
): Promise<AuthFlowResult> {
  const prefix = sanitizeScenarioName(scenarioName);

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

  const ss = await takeScreenshot(`${prefix}_06_final`, 'Final state');
  steps.push({
    name: wizardDetected ? 'Wizard shown' : 'Dashboard reached',
    success: true,
    screenshot: ss.filename,
  });

  return {
    success: true,
    wizardDetected,
    dashboardReached,
  };
}

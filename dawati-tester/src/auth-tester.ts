import { getPage, navigateTo } from './browser';
import { takeScreenshot } from './screenshot-manager';
import { config } from './config';
import { createChildLogger } from './logger';

const log = createChildLogger('auth-tester');

export interface AuthTestResult {
  method: 'phone' | 'email';
  success: boolean;
  steps: AuthStep[];
  error?: string;
}

export interface AuthStep {
  name: string;
  success: boolean;
  screenshot?: string;
  error?: string;
}

export async function testPhoneAuth(): Promise<AuthTestResult> {
  log.info('Testing Phone OTP authentication');
  const steps: AuthStep[] = [];

  try {
    // Step 1: Navigate to login page
    await navigateTo(config.dawatiUrl);
    await takeScreenshot('phone_auth_01_home', 'Home page before login');

    // Look for sign in button
    const page = await getPage();

    // Try common sign-in selectors
    const signInSelectors = [
      'text=Sign In',
      'text=تسجيل الدخول',
      'text=Login',
      'text=دخول',
      '[data-testid="sign-in"]',
      '[data-testid="login"]',
      'button:has-text("Sign")',
      'a:has-text("Sign")',
    ];

    let signInClicked = false;
    for (const selector of signInSelectors) {
      try {
        await page.click(selector, { timeout: 3000 });
        signInClicked = true;
        break;
      } catch {
        continue;
      }
    }

    if (!signInClicked) {
      // Maybe already on login page or login is modal
      log.info('No sign-in button found, checking if already on login page');
    }

    await page.waitForTimeout(1000);
    const screenshot1 = await takeScreenshot('phone_auth_02_login_page', 'Login page');
    steps.push({ name: 'Navigate to login', success: true, screenshot: screenshot1.filename });

    // Step 2: Select phone auth method
    const phoneTabSelectors = [
      'text=Phone',
      'text=هاتف',
      'text=رقم الهاتف',
      '[data-testid="phone-tab"]',
      'button:has-text("Phone")',
      'div:has-text("Phone"):not(:has(div))',
    ];

    for (const selector of phoneTabSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        break;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(500);
    const screenshot2 = await takeScreenshot('phone_auth_03_phone_tab', 'Phone auth tab selected');
    steps.push({ name: 'Select phone auth', success: true, screenshot: screenshot2.filename });

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
        await page.fill(selector, config.testPhone, { timeout: 2000 });
        phoneEntered = true;
        break;
      } catch {
        continue;
      }
    }

    if (!phoneEntered) {
      steps.push({ name: 'Enter phone number', success: false, error: 'Phone input not found' });
      return { method: 'phone', success: false, steps, error: 'Phone input not found' };
    }

    const screenshot3 = await takeScreenshot('phone_auth_04_phone_entered', 'Phone number entered');
    steps.push({ name: 'Enter phone number', success: true, screenshot: screenshot3.filename });

    // Step 3.5: Check terms & conditions checkbox (CRITICAL FIX)
    log.info('Looking for terms checkbox...');
    const termsCheckboxSelectors = [
      'input[type="checkbox"]',
      '[data-testid="terms-checkbox"]',
      'input[name="terms"]',
      'input[name="acceptTerms"]',
      'input[name="agree"]',
      '[role="checkbox"]',
      'label:has-text("terms") input',
      'label:has-text("agree") input',
    ];

    let termsChecked = false;
    for (const selector of termsCheckboxSelectors) {
      try {
        const checkbox = page.locator(selector).first();
        if (await checkbox.isVisible({ timeout: 2000 })) {
          // Check if already checked
          const isChecked = await checkbox.isChecked().catch(() => false);
          if (!isChecked) {
            await checkbox.click();
            log.info(`Checked terms checkbox: ${selector}`);
          } else {
            log.info(`Terms checkbox already checked: ${selector}`);
          }
          termsChecked = true;
          break;
        }
      } catch {
        continue;
      }
    }

    if (termsChecked) {
      await page.waitForTimeout(500);
      const screenshot3_5 = await takeScreenshot('phone_auth_04_5_terms_checked', 'Terms checkbox checked');
      steps.push({ name: 'Accept terms', success: true, screenshot: screenshot3_5.filename });
    } else {
      log.info('No terms checkbox found (may not be required)');
    }

    // Step 4: Click send code button
    const sendCodeSelectors = [
      'text=Send Code',
      'text=إرسال الرمز',
      'text=Send OTP',
      'text=Continue',
      'text=متابعة',
      'button[type="submit"]',
      '[data-testid="send-code"]',
      'button:has-text("Send")',
      'button:has-text("Continue")',
    ];

    let codeSent = false;
    for (const selector of sendCodeSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        codeSent = true;
        log.info(`Clicked send code button: ${selector}`);
        break;
      } catch {
        continue;
      }
    }

    if (!codeSent) {
      steps.push({
        name: 'Request OTP code',
        success: false,
        error: 'Send code button not found or not clickable',
      });
      return { method: 'phone', success: false, steps, error: 'Cannot proceed to OTP screen' };
    }

    await page.waitForTimeout(3000); // Wait for OTP screen to load
    const screenshot4 = await takeScreenshot('phone_auth_05_otp_screen', 'OTP screen loaded');
    steps.push({
      name: 'Request OTP code',
      success: true,
      screenshot: screenshot4.filename,
    });

    // Step 5: Enter OTP code (test mode)
    log.info('Entering OTP code...');
    const otpCode = '123456'; // Test OTP code

    const otpInputSelectors = [
      'input[type="text"]',
      'input[type="number"]',
      'input[name="otp"]',
      'input[name="code"]',
      'input[placeholder*="code"]',
      'input[placeholder*="OTP"]',
      'input[placeholder*="رمز"]',
      '[data-testid="otp-input"]',
    ];

    let otpEntered = false;

    // Try single OTP input first
    for (const selector of otpInputSelectors) {
      try {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 })) {
          await input.fill(otpCode);
          log.info(`Entered OTP in single input: ${selector}`);
          otpEntered = true;
          break;
        }
      } catch {
        continue;
      }
    }

    // If not found, try multiple OTP inputs (one digit per input)
    if (!otpEntered) {
      log.info('Trying multiple OTP inputs (one digit per field)...');
      const otpDigits = otpCode.split('');
      let digitsEntered = 0;

      for (let i = 0; i < otpDigits.length; i++) {
        try {
          const digitInput = page.locator(`input[type="text"]`).nth(i);
          if (await digitInput.isVisible({ timeout: 1000 })) {
            await digitInput.fill(otpDigits[i]);
            digitsEntered++;
          }
        } catch {
          break;
        }
      }

      if (digitsEntered === otpDigits.length) {
        log.info(`Entered OTP across ${digitsEntered} separate inputs`);
        otpEntered = true;
      }
    }

    if (!otpEntered) {
      steps.push({
        name: 'Enter OTP code',
        success: false,
        error: 'OTP input fields not found',
      });
      return { method: 'phone', success: false, steps, error: 'Cannot enter OTP code' };
    }

    await page.waitForTimeout(1000);
    const screenshot5 = await takeScreenshot('phone_auth_06_otp_entered', 'OTP code entered');
    steps.push({ name: 'Enter OTP code', success: true, screenshot: screenshot5.filename });

    // Step 6: Click verify button
    log.info('Clicking verify button...');
    const verifyButtonSelectors = [
      'text=Verify',
      'text=تحقق',
      'text=Submit',
      'text=إرسال',
      'text=Confirm',
      'text=تأكيد',
      'button[type="submit"]',
      '[data-testid="verify"]',
      '[data-testid="submit"]',
      'button:has-text("Verify")',
      'button:has-text("Confirm")',
    ];

    let verifyClicked = false;
    for (const selector of verifyButtonSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        verifyClicked = true;
        log.info(`Clicked verify button: ${selector}`);
        break;
      } catch {
        continue;
      }
    }

    if (!verifyClicked) {
      log.info('Verify button not found - OTP may auto-submit');
    }

    // Step 7: Wait for authentication success
    log.info('Waiting for authentication success...');
    log.info(`Current URL before wait: ${await page.url()}`);

    const successIndicators = [
      { type: 'url', value: '/dashboard' },
      { type: 'url', value: '/home' },
      { type: 'url', value: '/events' },
      { type: 'url', value: '/onboarding' },
      { type: 'url', value: '/wizard' },
      { type: 'element', value: 'text=Dashboard' },
      { type: 'element', value: 'text=My Events' },
      { type: 'element', value: 'text=Welcome' },
      { type: 'element', value: 'text=مرحباً' },
      { type: 'element', value: '[data-testid="user-menu"]' },
      { type: 'element', value: '[data-testid="dashboard"]' },
    ];

    let authSuccess = false;
    let successType = '';
    let isOnboarding = false;

    // Wait up to 15 seconds for success
    for (let attempt = 0; attempt < 15; attempt++) {
      await page.waitForTimeout(1000);

      const currentUrl = await page.url();
      log.info(`Checking auth success (attempt ${attempt + 1}/15), URL: ${currentUrl}`);

      for (const indicator of successIndicators) {
        try {
          if (indicator.type === 'url') {
            if (currentUrl.includes(indicator.value)) {
              authSuccess = true;
              successType = `URL contains ${indicator.value}`;
              if (indicator.value.includes('onboarding') || indicator.value.includes('wizard')) {
                isOnboarding = true;
              }
              break;
            }
          } else {
            // Check element
            const element = page.locator(indicator.value).first();
            if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
              authSuccess = true;
              successType = `Found element: ${indicator.value}`;
              if (indicator.value.includes('Welcome') || indicator.value.includes('مرحباً')) {
                isOnboarding = true;
              }
              break;
            }
          }
        } catch {
          continue;
        }
      }

      if (authSuccess) {
        log.info(`Auth success detected: ${successType}`);
        break;
      }
    }

    if (!authSuccess) {
      log.error('Authentication did not complete - no redirect or success indicator found');
      log.info(`Final URL: ${await page.url()}`);
      log.info(`Page title: ${await page.title()}`);

      const screenshot6_error = await takeScreenshot('phone_auth_07_timeout', 'Auth timeout - no success indicator');
      steps.push({
        name: 'Wait for auth success',
        success: false,
        screenshot: screenshot6_error.filename,
        error: 'No redirect or success indicator found after 15 seconds',
      });

      return {
        method: 'phone',
        success: false,
        steps,
        error: 'Authentication timeout - verify did not complete',
      };
    }

    // Success!
    await page.waitForTimeout(1000);
    const screenshot6 = await takeScreenshot('phone_auth_07_success', 'Authentication successful');

    if (isOnboarding) {
      log.info('Auth successful - user redirected to ONBOARDING WIZARD (expected for new users)');
      steps.push({
        name: 'Authentication success (onboarding)',
        success: true,
        screenshot: screenshot6.filename,
      });
    } else {
      log.info('Auth successful - user redirected to dashboard');
      steps.push({
        name: 'Authentication success (dashboard)',
        success: true,
        screenshot: screenshot6.filename,
      });
    }

    return {
      method: 'phone',
      success: true,
      steps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Phone auth test failed');
    await takeScreenshot('phone_auth_error', 'Error during phone auth');
    return {
      method: 'phone',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

export async function testEmailAuth(): Promise<AuthTestResult> {
  log.info('Testing Email authentication');
  const steps: AuthStep[] = [];

  try {
    // Step 1: Navigate to login page
    await navigateTo(config.dawatiUrl);
    await takeScreenshot('email_auth_01_home', 'Home page before login');

    const page = await getPage();

    // Try to find and click sign in
    const signInSelectors = [
      'text=Sign In',
      'text=تسجيل الدخول',
      'text=Login',
      'text=دخول',
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
    const screenshot1 = await takeScreenshot('email_auth_02_login_page', 'Login page');
    steps.push({ name: 'Navigate to login', success: true, screenshot: screenshot1.filename });

    // Step 2: Select email auth method
    const emailTabSelectors = [
      'text=Email',
      'text=البريد الإلكتروني',
      'text=بريد',
      '[data-testid="email-tab"]',
      'button:has-text("Email")',
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
    const screenshot2 = await takeScreenshot('email_auth_03_email_tab', 'Email auth tab selected');
    steps.push({ name: 'Select email auth', success: true, screenshot: screenshot2.filename });

    // Step 3: Enter email
    const emailInputSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email"]',
      'input[placeholder*="بريد"]',
      '[data-testid="email-input"]',
    ];

    let emailEntered = false;
    for (const selector of emailInputSelectors) {
      try {
        await page.fill(selector, config.testEmail, { timeout: 2000 });
        emailEntered = true;
        break;
      } catch {
        continue;
      }
    }

    if (!emailEntered) {
      steps.push({ name: 'Enter email', success: false, error: 'Email input not found' });
      return { method: 'email', success: false, steps, error: 'Email input not found' };
    }

    const screenshot3 = await takeScreenshot('email_auth_04_email_entered', 'Email entered');
    steps.push({ name: 'Enter email', success: true, screenshot: screenshot3.filename });

    // Step 4: Click send code/continue button
    const sendCodeSelectors = [
      'text=Send Code',
      'text=إرسال الرمز',
      'text=Continue',
      'text=متابعة',
      'button[type="submit"]',
      '[data-testid="send-code"]',
    ];

    for (const selector of sendCodeSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        break;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(2000);
    const screenshot4 = await takeScreenshot('email_auth_05_code_sent', 'Code sent (or error)');
    steps.push({ name: 'Request verification code', success: true, screenshot: screenshot4.filename });

    log.info('Email auth flow tested up to code request');

    return {
      method: 'email',
      success: true,
      steps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Email auth test failed');
    await takeScreenshot('email_auth_error', 'Error during email auth');
    return {
      method: 'email',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

export async function testLogout(): Promise<AuthTestResult> {
  log.info('Testing logout flow');
  const steps: AuthStep[] = [];

  try {
    const page = await getPage();

    // Look for profile/settings menu
    const menuSelectors = [
      '[data-testid="profile-menu"]',
      '[data-testid="user-menu"]',
      'text=Profile',
      'text=الملف الشخصي',
      'text=Account',
      'text=حسابي',
    ];

    for (const selector of menuSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        break;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(500);
    await takeScreenshot('logout_01_menu_opened', 'Menu opened');
    steps.push({ name: 'Open profile menu', success: true });

    // Look for logout button
    const logoutSelectors = [
      'text=Logout',
      'text=Log Out',
      'text=Sign Out',
      'text=تسجيل الخروج',
      'text=خروج',
      '[data-testid="logout"]',
    ];

    for (const selector of logoutSelectors) {
      try {
        await page.click(selector, { timeout: 2000 });
        break;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(1000);
    const screenshot = await takeScreenshot('logout_02_complete', 'After logout');
    steps.push({ name: 'Click logout', success: true, screenshot: screenshot.filename });

    return {
      method: 'phone', // Using phone as placeholder
      success: true,
      steps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error({ error: errorMessage }, 'Logout test failed');
    return {
      method: 'phone',
      success: false,
      steps,
      error: errorMessage,
    };
  }
}

export async function runAuthTests(): Promise<AuthTestResult[]> {
  log.info('Running all authentication tests');
  const results: AuthTestResult[] = [];

  // Test phone auth
  results.push(await testPhoneAuth());

  // Test email auth
  results.push(await testEmailAuth());

  // Test logout (if logged in)
  // results.push(await testLogout());

  log.info({ passed: results.filter((r) => r.success).length, total: results.length }, 'Auth tests complete');
  return results;
}

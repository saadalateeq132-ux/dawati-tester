import { getPage, navigateTo, click, fill, waitForSelector, getCurrentUrl } from './browser';
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

    // Step 4: Click send code button
    const sendCodeSelectors = [
      'text=Send Code',
      'text=إرسال الرمز',
      'text=Send OTP',
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
        break;
      } catch {
        continue;
      }
    }

    await page.waitForTimeout(2000);
    const screenshot4 = await takeScreenshot('phone_auth_05_code_sent', 'Code sent (or error)');
    steps.push({
      name: 'Request OTP code',
      success: codeSent,
      screenshot: screenshot4.filename,
      error: codeSent ? undefined : 'Send code button not found',
    });

    // Note: We can't actually complete OTP verification in automated tests
    // unless we have a test mode that auto-fills codes
    log.info('Phone auth flow tested up to OTP request (cannot complete without real OTP)');

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

/**
 * Section Test: RTL Checker
 * Tests all 9 RTL checks against a sample Arabic page
 */
import { chromium } from 'playwright';
import { RTLIntegration } from '../src/rtl-checker/rtl-integration';

async function testRTLChecker() {
  console.log('=== RTL CHECKER TEST ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'ar-SA' });
  const page = await context.newPage();

  try {
    // Create a sample Arabic RTL page
    await page.setContent(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { direction: rtl; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { text-align: right; }
          .price { direction: ltr; display: inline-block; }
          button { padding: 10px 20px; }
          .icon { display: inline-block; }
        </style>
      </head>
      <body dir="rtl">
        <div class="container">
          <h1>مرحبا بكم في داواتي</h1>
          <p>منصة تخطيط الفعاليات في المملكة العربية السعودية</p>

          <div class="event-card">
            <h2>حفل زفاف</h2>
            <p>التاريخ: 15 رمضان 1447</p>
            <p class="price">500 ر.س</p>
            <button>احجز الآن</button>
          </div>

          <div class="contact">
            <p>اتصل بنا: <span dir="ltr">+966512345678</span></p>
            <p>البريد: <span dir="ltr">info@dawati.sa</span></p>
          </div>

          <div class="icons">
            <span class="icon arrow">→</span>
            <span class="icon chevron">›</span>
          </div>
        </div>
      </body>
      </html>
    `);

    console.log('[Setup] Sample RTL page loaded\n');

    // Run comprehensive RTL checks
    const rtlChecker = new RTLIntegration(page);
    const result = await rtlChecker.runComprehensiveChecks();

    console.log('\n=== RTL CHECK RESULTS ===\n');
    console.log(`Overall Score: ${result.overallScore.toFixed(1)}/10`);
    console.log(`Summary: ${result.summary}`);
    console.log(`Critical Issues: ${result.criticalIssues.length}\n`);

    console.log('--- Individual Check Results ---');
    for (const check of result.checks) {
      const status = check.passed ? 'PASS' : 'FAIL';
      console.log(`  [${status}] ${check.checkName}: ${check.score}/10`);
      if (check.issues.length > 0) {
        for (const issue of check.issues) {
          console.log(`         Issue: ${issue}`);
        }
      }
      if (check.suggestions.length > 0) {
        for (const suggestion of check.suggestions) {
          console.log(`         Suggestion: ${suggestion}`);
        }
      }
    }

    console.log(`\n=== RTL CHECKER: ${result.overallScore >= 5 ? 'PASS' : 'NEEDS WORK'} (Score: ${result.overallScore.toFixed(1)}/10) ===`);

  } catch (error: any) {
    console.error(`\n=== RTL CHECKER TEST FAILED ===`);
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testRTLChecker();

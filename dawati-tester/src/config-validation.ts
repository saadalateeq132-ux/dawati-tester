import path from 'path';
import fs from 'fs';

export interface Config {
  geminiApiKey: string;
  dawatiUrl: string;

  // Vertex fallback
  gcpProjectId: string;
  gcpLocation: string;

  testPhone: string;
  testEmail: string;
  testOtp: string;

  testUsers: {
    phone: {
      newCustomer: string;
      existingCustomer: string;
      newVendor: string;
      existingVendor: string;
    };
    email: {
      new: string;
      existing: string;
    };
  };

  headless: boolean;
  slowMo: number;
  viewportWidth: number;
  viewportHeight: number;

  fullPageScreenshots: boolean;
  screenshotQuality: number;

  aiModel: string;
  aiMaxTokens: number;
  aiTemperature: number;

  testResultsDir: string;
  testPlansDir: string;

  logLevel: string;
}

export function validateConfig(): Config {
  const geminiApiKey = process.env.GEMINI_API_KEY || '';
  const gcpProjectId = process.env.GCP_PROJECT_ID || '';
  const gcpLocation = process.env.GCP_LOCATION || '';
  const dawatiUrl = process.env.DAWATI_URL || process.env.BASE_URL;

  const hasGemini = !!geminiApiKey && geminiApiKey !== 'your_gemini_api_key_here';
  const hasVertex = !!gcpProjectId && !!gcpLocation;

  if (!hasGemini && !hasVertex) {
    console.warn('AI credentials not set. Configure GEMINI_API_KEY or Vertex (GCP_PROJECT_ID + GCP_LOCATION).');
  }

  if (!dawatiUrl || dawatiUrl === 'https://your-dawati-app.vercel.app') {
    throw new Error('DAWATI_URL is required. Set DAWATI_URL (or BASE_URL) to your Dawati/Firebase web URL.');
  }

  try {
    new URL(dawatiUrl);
  } catch {
    throw new Error(`Invalid DAWATI_URL: ${dawatiUrl}`);
  }

  const config: Config = {
    geminiApiKey,
    dawatiUrl,
    gcpProjectId,
    gcpLocation,
    testPhone: process.env.TEST_PHONE || '+966501234567',
    testEmail: process.env.TEST_EMAIL || 'test@dawati.app',
    testOtp: process.env.TEST_OTP || '123456',
    testUsers: {
      phone: {
        newCustomer: process.env.TEST_PHONE_NEW_CUSTOMER || '+966501111111',
        existingCustomer: process.env.TEST_PHONE_EXISTING_CUSTOMER || '+966502222222',
        newVendor: process.env.TEST_PHONE_NEW_VENDOR || '+966503333333',
        existingVendor: process.env.TEST_PHONE_EXISTING_VENDOR || '+966504444444',
      },
      email: {
        new: process.env.TEST_EMAIL_NEW || 'newuser@dawati.app',
        existing: process.env.TEST_EMAIL_EXISTING || 'existing@dawati.app',
      },
    },
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0', 10),
    viewportWidth: parseInt(process.env.VIEWPORT_WIDTH || '1280', 10),
    viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT || '720', 10),
    fullPageScreenshots: process.env.FULL_PAGE_SCREENSHOTS !== 'false',
    screenshotQuality: parseInt(process.env.SCREENSHOT_QUALITY || '80', 10),
    aiModel: process.env.AI_MODEL || process.env.GCP_MODEL || 'gemini-2.0-flash-001',
    aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    aiTemperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
    testResultsDir: path.join(process.cwd(), 'test-results'),
    testPlansDir: path.join(process.cwd(), 'test-plans'),
    logLevel: process.env.LOG_LEVEL || 'info',
  };

  if (!fs.existsSync(config.testResultsDir)) {
    fs.mkdirSync(config.testResultsDir, { recursive: true });
  }

  return config;
}

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

export interface Config {
  // Required
  geminiApiKey: string;
  dawatiUrl: string;

  // Test credentials
  testPhone: string;
  testEmail: string;

  // Browser settings
  headless: boolean;
  slowMo: number;
  viewportWidth: number;
  viewportHeight: number;

  // Screenshot settings
  fullPageScreenshots: boolean;
  screenshotQuality: number;

  // AI settings
  aiModel: string;
  aiMaxTokens: number;
  aiTemperature: number;

  // Paths
  testResultsDir: string;
  testPlansDir: string;

  // Logging
  logLevel: string;
}

function validateConfig(): Config {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const dawatiUrl = process.env.DAWATI_URL;

  if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is required. Get one from https://aistudio.google.com/apikey');
  }

  if (!dawatiUrl || dawatiUrl === 'https://your-dawati-app.vercel.app') {
    throw new Error('DAWATI_URL is required. Set the URL of your Dawati app.');
  }

  // Validate URL format
  try {
    new URL(dawatiUrl);
  } catch {
    throw new Error(`Invalid DAWATI_URL: ${dawatiUrl}`);
  }

  const config: Config = {
    geminiApiKey,
    dawatiUrl,
    testPhone: process.env.TEST_PHONE || '+966501234567',
    testEmail: process.env.TEST_EMAIL || 'test@dawati.app',
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0', 10),
    viewportWidth: parseInt(process.env.VIEWPORT_WIDTH || '1280', 10),
    viewportHeight: parseInt(process.env.VIEWPORT_HEIGHT || '720', 10),
    fullPageScreenshots: process.env.FULL_PAGE_SCREENSHOTS !== 'false',
    screenshotQuality: parseInt(process.env.SCREENSHOT_QUALITY || '80', 10),
    aiModel: process.env.AI_MODEL || 'gemini-2.0-flash-exp',
    aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    aiTemperature: parseFloat(process.env.AI_TEMPERATURE || '0.3'),
    testResultsDir: path.join(process.cwd(), 'test-results'),
    testPlansDir: path.join(process.cwd(), 'test-plans'),
    logLevel: process.env.LOG_LEVEL || 'info',
  };

  // Ensure directories exist
  if (!fs.existsSync(config.testResultsDir)) {
    fs.mkdirSync(config.testResultsDir, { recursive: true });
  }

  return config;
}

export const config = validateConfig();
export default config;

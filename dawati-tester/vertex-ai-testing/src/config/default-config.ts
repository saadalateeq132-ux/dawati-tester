import { TestConfig } from '../types';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export function loadConfig(): TestConfig {
  const rootDir = path.resolve(__dirname, '../../..');

  return {
    projectId: process.env.GCP_PROJECT_ID || 'your-project-id',
    location: 'europe-west1', // Closest to Saudi Arabia
    baseUrl: process.env.BASE_URL || 'https://dawati-v01.vercel.app',
    model: 'gemini-2.0-flash-exp',
    timeout: 30000,
    retries: 2,
    parallel: true,
    headless: process.env.HEADLESS !== 'false',
    locale: 'ar-SA',
    timezone: 'Asia/Riyadh',

    devices: [
      {
        name: 'iPhone 13 Pro',
        viewport: { width: 390, height: 844 },
      },
      {
        name: 'Samsung Galaxy S21',
        viewport: { width: 360, height: 800 },
      },
    ],

    vertexAI: {
      batchSize: 5, // Analyze 5 screenshots per request = 80% cost reduction
      streaming: true,
      functionCalling: true,
      temperature: 0.1, // Low for consistency
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
      rateLimitPerMinute: 300, // Vertex AI enterprise limit
    },

    rtl: {
      enabled: true,
      checkHardcodedStrings: true,
      checkCurrency: true,
      checkBiDi: true,
      checkHijri: true,
      checkLayoutExpansion: true,
      checkIconAlignment: true,
    },

    visualRegression: {
      enabled: true,
      threshold: 0.02, // 2% difference allowed
      updateBaselines: process.env.UPDATE_BASELINES === 'true',
      baselinesDir: path.join(rootDir, 'baselines'),
    },

    artifacts: {
      saveScreenshots: true,
      saveHTML: true,
      saveNetworkLogs: true,
      saveConsoleLogs: true,
      maskPII: true,
      piiPatterns: [
        // Phone numbers
        '\\+966[0-9]{9}',
        '05[0-9]{8}',
        // Email addresses
        '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
        // Credit cards (partial)
        '[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}[\\s-]?[0-9]{4}',
        // National IDs (Saudi)
        '[1-2][0-9]{9}',
      ],
      artifactsDir: path.join(rootDir, 'artifacts'),
    },

    reporting: {
      format: 'both',
      trackCosts: true,
      reportsDir: path.join(rootDir, 'reports'),
    },
  };
}

export const defaultConfig = loadConfig();

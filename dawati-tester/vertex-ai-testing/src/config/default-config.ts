import { TestConfig } from '../types';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export function loadConfig(): TestConfig {
  const rootDir = path.resolve(__dirname, '../..');

  return {
    // Fine-Tuning Pipeline
    fineTuning: {
      enabled: process.env.FINE_TUNING_ENABLED === 'true',
      feedbackDir: path.join(rootDir, 'feedback'),
      trainingDataDir: path.join(rootDir, 'training-data'),
      gcsBucket: process.env.GCS_TRAINING_BUCKET || '',
      gcsPrefix: process.env.GCS_TRAINING_PREFIX || 'dawati-training-images',
      tuningRegion: process.env.TUNING_REGION || 'europe-west4',
      tuningBaseModel: 'gemini-3-flash-001',
      epochs: parseInt(process.env.TUNING_EPOCHS || '4', 10),
      learningRateMultiplier: parseFloat(process.env.TUNING_LR_MULTIPLIER || '1.0'),
      adapterSize: parseInt(process.env.TUNING_ADAPTER_SIZE || '4', 10),
      tunedModelEndpoint: process.env.TUNED_MODEL_ENDPOINT || undefined,
      abTestingEnabled: process.env.AB_TESTING_ENABLED === 'true',
      minTrainingExamples: parseInt(process.env.MIN_TRAINING_EXAMPLES || '100', 10),
      autopilot: {
        enabled: process.env.AUTOPILOT_ENABLED === 'true',
        autoApproveThreshold: parseFloat(process.env.AUTOPILOT_APPROVE_THRESHOLD || '0.85'),
        autoRejectThreshold: parseFloat(process.env.AUTOPILOT_REJECT_THRESHOLD || '0.4'),
        autoTuneAtCount: parseInt(process.env.AUTOPILOT_TUNE_AT_COUNT || '100', 10),
        autoSwitchModel: process.env.AUTOPILOT_AUTO_SWITCH !== 'false',
        stateFilePath: path.join(rootDir, 'feedback', 'autopilot-state.json'),
      },
    },

    projectId: process.env.GCP_PROJECT_ID || 'your-project-id',
    location: process.env.GCP_LOCATION || 'us-central1',
    baseUrl: process.env.BASE_URL || 'http://localhost:8081',
    model: process.env.GCP_MODEL || 'gemini-3-flash-001',
    timeout: 30000,
    retries: 2,
    parallel: true,
    headless: process.env.HEADLESS !== 'false',
    locale: 'ar-SA',
    timezone: 'Asia/Riyadh',

    devices: [
      {
        name: 'iPhone 14 Pro Max',
        viewport: { width: 430, height: 932 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
      {
        name: 'iPhone 13 Pro',
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
      {
        name: 'Samsung Galaxy S23 Ultra',
        viewport: { width: 412, height: 915 },
        userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      },
      {
        name: 'Samsung Galaxy S21',
        viewport: { width: 360, height: 800 },
        userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
      },
      {
        name: 'iPad Air (Saudi market)',
        viewport: { width: 820, height: 1180 },
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
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
      checkNumberFormatting: true,
      checkAccessibility: true,
      checkDynamicContent: true,
    },

    testLevels: {
      level1Visual: true,           // Component consistency checks
      level2DataValidation: true,    // Form validation + hardcoded detection
      level3BackendIntegration: true, // API monitoring + state management
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

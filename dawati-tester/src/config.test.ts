import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConfig } from './config-validation';
import fs from 'fs';

// Mock fs to avoid creating directories during tests
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
  },
}));

describe('validateConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Set valid defaults to avoid noise
    process.env.DAWATI_URL = 'https://test.dawati.app';
    process.env.GEMINI_API_KEY = 'valid-key';

    // Clear optional env vars
    delete process.env.HEADLESS;
    delete process.env.SLOW_MO;
    delete process.env.VIEWPORT_WIDTH;
    delete process.env.FULL_PAGE_SCREENSHOTS;
    delete process.env.TEST_OTP;

    // Reset fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should validate a correct configuration', () => {
    const config = validateConfig();

    expect(config.dawatiUrl).toBe('https://test.dawati.app');
    expect(config.geminiApiKey).toBe('valid-key');
  });

  it('should throw if DAWATI_URL is missing', () => {
    process.env.DAWATI_URL = '';
    delete process.env.VITEST;

    expect(() => validateConfig()).toThrow('DAWATI_URL is required');
  });

  it('should throw if DAWATI_URL is invalid', () => {
    process.env.DAWATI_URL = 'not-a-url';

    expect(() => validateConfig()).toThrow('Invalid DAWATI_URL');
  });

  it('should warn if GEMINI_API_KEY is missing', () => {
    process.env.GEMINI_API_KEY = '';

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    validateConfig();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GEMINI_API_KEY not set'));
  });

  it('should warn if GEMINI_API_KEY is default placeholder', () => {
    process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    validateConfig();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('GEMINI_API_KEY not set'));
  });

  it('should use default values for optional settings', () => {
    const config = validateConfig();

    expect(config.headless).toBe(true); // Default is true (process.env.HEADLESS !== 'false')
    expect(config.slowMo).toBe(0);
    expect(config.viewportWidth).toBe(1280);
    expect(config.fullPageScreenshots).toBe(true);
    expect(config.testOtp).toBe('123456'); // Default OTP
  });

  it('should parse numeric environment variables', () => {
    process.env.SLOW_MO = '500';
    process.env.VIEWPORT_WIDTH = '1920';

    const config = validateConfig();

    expect(config.slowMo).toBe(500);
    expect(config.viewportWidth).toBe(1920);
  });

  it('should parse boolean environment variables', () => {
    process.env.HEADLESS = 'false';
    process.env.FULL_PAGE_SCREENSHOTS = 'false';

    const config = validateConfig();

    expect(config.headless).toBe(false);
    expect(config.fullPageScreenshots).toBe(false);
  });

  it('should parse TEST_OTP environment variable', () => {
    process.env.TEST_OTP = '654321';

    const config = validateConfig();

    expect(config.testOtp).toBe('654321');
  });

  it('should create test results directory if it does not exist', () => {
    // Override default mock behavior: directory does not exist
    vi.mocked(fs.existsSync).mockReturnValue(false);

    validateConfig();

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('test-results'), { recursive: true });
  });
});

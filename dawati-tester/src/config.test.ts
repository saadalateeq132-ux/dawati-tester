import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('validateConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  // Helper to get the function, ensuring module loads without throwing
  async function getValidateConfig() {
    // Ensure we have a valid env so the module doesn't throw on top-level execution
    if (!process.env.DAWATI_URL) {
       process.env.DAWATI_URL = 'https://setup.com';
    }

    const module = await import('./config');
    return module.validateConfig;
  }

  it('should return config when DAWATI_URL is valid', async () => {
    process.env.DAWATI_URL = 'https://valid-app.vercel.app';
    const validateConfig = await getValidateConfig();

    const config = validateConfig();
    expect(config.dawatiUrl).toBe('https://valid-app.vercel.app');
  });

  it('should throw error when DAWATI_URL is missing', async () => {
    // 1. Set valid env to load module
    process.env.DAWATI_URL = 'https://setup.com';
    const validateConfig = await getValidateConfig();

    // 2. Set invalid env for the test
    delete process.env.DAWATI_URL;

    expect(() => validateConfig()).toThrow('DAWATI_URL is required');
  });

  it('should throw error when DAWATI_URL is the default placeholder', async () => {
    process.env.DAWATI_URL = 'https://setup.com';
    const validateConfig = await getValidateConfig();

    process.env.DAWATI_URL = 'https://your-dawati-app.vercel.app';
    expect(() => validateConfig()).toThrow('DAWATI_URL is required');
  });

  it('should throw error when DAWATI_URL is invalid format', async () => {
    process.env.DAWATI_URL = 'https://setup.com';
    const validateConfig = await getValidateConfig();

    process.env.DAWATI_URL = 'not-a-valid-url';
    expect(() => validateConfig()).toThrow('Invalid DAWATI_URL');
  });

  it('should handle missing GEMINI_API_KEY gracefully', async () => {
     process.env.DAWATI_URL = 'https://setup.com';
     const validateConfig = await getValidateConfig();

     delete process.env.GEMINI_API_KEY;
     const config = validateConfig();
     expect(config.geminiApiKey).toBe('');
  });
});

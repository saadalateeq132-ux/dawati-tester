import { describe, it, expect, vi } from 'vitest';
import { runPhoneScenario } from './auth-scenarios-tester';

// Mock dependencies
vi.mock('./logger', () => ({
  createChildLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock browser dependencies since we might be importing them transitively or they might be used by default params
vi.mock('./browser', () => ({
  getPage: vi.fn(),
  navigateTo: vi.fn(),
}));

vi.mock('./screenshot-manager', () => ({
  takeScreenshot: vi.fn(),
}));

describe('runPhoneScenario', () => {
  const mockPhone = '1234567890';
  const mockScenario = 'Test Scenario';

  it('should pass when expecting wizard and wizard is detected', async () => {
    const mockFlow = vi.fn().mockResolvedValue({
      success: true,
      wizardDetected: true,
      dashboardReached: false,
    });

    const result = await runPhoneScenario(
      'new_customer',
      mockScenario,
      mockPhone,
      'expect_wizard',
      mockFlow
    );

    expect(result.success).toBe(true);
    expect(result.wizardDetected).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockFlow).toHaveBeenCalledWith(
      mockPhone,
      '123456',
      mockScenario,
      expect.any(Array)
    );
  });

  it('should fail when expecting wizard but dashboard reached', async () => {
    const mockFlow = vi.fn().mockResolvedValue({
      success: true,
      wizardDetected: false,
      dashboardReached: true,
    });

    const result = await runPhoneScenario(
      'new_customer',
      mockScenario,
      mockPhone,
      'expect_wizard',
      mockFlow
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Expected onboarding wizard');
  });

  it('should pass when expecting dashboard and dashboard reached', async () => {
    const mockFlow = vi.fn().mockResolvedValue({
      success: true,
      wizardDetected: false,
      dashboardReached: true,
    });

    const result = await runPhoneScenario(
      'existing_customer',
      mockScenario,
      mockPhone,
      'expect_dashboard',
      mockFlow
    );

    expect(result.success).toBe(true);
    expect(result.dashboardReached).toBe(true);
  });

  it('should fail when expecting dashboard but wizard shown', async () => {
    const mockFlow = vi.fn().mockResolvedValue({
      success: true,
      wizardDetected: true,
      dashboardReached: false,
    });

    const result = await runPhoneScenario(
      'existing_customer',
      mockScenario,
      mockPhone,
      'expect_dashboard',
      mockFlow
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Expected to skip wizard');
  });

  it('should handle flow failure', async () => {
    const mockFlow = vi.fn().mockResolvedValue({
      success: false,
      wizardDetected: false,
      dashboardReached: false,
      error: 'Flow failed',
    });

    const result = await runPhoneScenario(
      'new_customer',
      mockScenario,
      mockPhone,
      'expect_wizard',
      mockFlow
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Flow failed');
  });

  it('should handle exception in flow', async () => {
    const mockFlow = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await runPhoneScenario(
      'new_customer',
      mockScenario,
      mockPhone,
      'expect_wizard',
      mockFlow
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

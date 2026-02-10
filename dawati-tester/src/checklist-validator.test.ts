import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { ChecklistValidator } from './checklist-validator';

// Mock fs module
vi.mock('fs');

// Mock logger to avoid noise
vi.mock('./logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ChecklistValidator', () => {
  let validator: ChecklistValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new ChecklistValidator();
  });

  it('should throw an error if the checklist file is missing', async () => {
    // Setup mock to return false for existsSync
    vi.mocked(fs.existsSync).mockReturnValue(false);

    // Verify that loadChecklist throws the expected error
    await expect(validator.loadChecklist()).rejects.toThrow('MASTER-TEST-CHECKLIST.md not found');

    // Verify logger was called
    const { logger } = await import('./logger');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Checklist not found'));
  });

  it('should load checklist if file exists', async () => {
    // Setup mock to return true for existsSync
    vi.mocked(fs.existsSync).mockReturnValue(true);

    // Mock file content
    const mockContent = `
## 1️⃣ HOME PAGE
- [ ] **HOME-001**: Verify home page loads
    `.trim();

    vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

    // Execute
    await validator.loadChecklist();

    // Verify items were loaded
    const items = validator.getAllItems();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0].id).toBe('HOME-001');
  });
});

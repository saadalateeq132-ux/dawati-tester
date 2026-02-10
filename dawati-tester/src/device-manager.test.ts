import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeDeviceName } from './device-manager';

describe('sanitizeDeviceName', () => {
  it('should return alphanumeric strings unchanged', () => {
    assert.strictEqual(sanitizeDeviceName('iPhone12'), 'iPhone12');
  });

  it('should replace spaces with underscores', () => {
    assert.strictEqual(sanitizeDeviceName('iPhone 12'), 'iPhone_12');
  });

  it('should replace special characters with underscores', () => {
    assert.strictEqual(sanitizeDeviceName('iPhone-12!'), 'iPhone_12_');
  });

  it('should handle strings with multiple special characters', () => {
    assert.strictEqual(sanitizeDeviceName('a b-c!d'), 'a_b_c_d');
  });

  it('should return empty string for empty input', () => {
    assert.strictEqual(sanitizeDeviceName(''), '');
  });

  it('should replace all non-alphanumeric characters', () => {
    assert.strictEqual(sanitizeDeviceName('!@#$%^&*()'), '__________');
  });
});

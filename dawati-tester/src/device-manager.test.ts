import { describe, it, expect } from 'vitest';
import { parseDeviceConfigs, getDefaultDevices } from './device-manager';
import { DeviceConfig } from './types';

describe('device-manager', () => {
  describe('getDefaultDevices', () => {
    it('should return the default device configuration', () => {
      const defaults = getDefaultDevices();
      expect(defaults).toHaveLength(1);
      expect(defaults[0]).toEqual({
        name: 'Desktop 1280x720',
        viewport: { width: 1280, height: 720 },
      });
    });
  });

  describe('parseDeviceConfigs', () => {
    it('should return default devices if input is undefined', () => {
      const result = parseDeviceConfigs(undefined);
      expect(result).toEqual(getDefaultDevices());
    });

    it('should return default devices if input is an empty array', () => {
      const result = parseDeviceConfigs([]);
      expect(result).toEqual(getDefaultDevices());
    });

    it('should return the provided valid configuration', () => {
      const validConfig: DeviceConfig[] = [
        { name: 'Test Device', viewport: { width: 1024, height: 768 } },
      ];
      const result = parseDeviceConfigs(validConfig);
      expect(result).toBe(validConfig); // Check referential equality as it returns the same array
      expect(result).toEqual(validConfig);
    });

    it('should pass through configs with missing optional properties (e.g., viewport)', () => {
      // Current behavior: allows objects with just a name (viewport/playwright are optional)
      const incompleteConfig: DeviceConfig[] = [{ name: 'Incomplete Device' }];
      const result = parseDeviceConfigs(incompleteConfig);
      expect(result).toEqual(incompleteConfig);
    });

    it('should pass through mixed valid and invalid entries (runtime check)', () => {
        // Current behavior: returns the array as-is without validation
        // Using `any` to bypass TS check for this edge case test
        const mixedConfig: any[] = [
            { name: 'Valid Device', viewport: { width: 800, height: 600 } },
            null,
            { invalidProp: 'foo' }
        ];

        const result = parseDeviceConfigs(mixedConfig);
        expect(result).toBe(mixedConfig);
        expect(result).toHaveLength(3);
        expect(result[1]).toBeNull();
    });
  });
});

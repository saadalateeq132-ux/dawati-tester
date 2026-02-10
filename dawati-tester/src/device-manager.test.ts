import { describe, it, expect } from 'vitest';
import { parseDeviceConfigs, getDefaultDevices } from './device-manager';
import { DeviceConfig } from './types';

describe('device-manager', () => {
  describe('parseDeviceConfigs', () => {
    it('should return default devices when input is undefined', () => {
      const result = parseDeviceConfigs(undefined);
      expect(result).toEqual(getDefaultDevices());
    });

    it('should return default devices when input is null', () => {
      // @ts-ignore: Testing runtime safety for null input which might occur in JS usage
      const result = parseDeviceConfigs(null);
      expect(result).toEqual(getDefaultDevices());
    });

    it('should return default devices when input is empty array', () => {
      const result = parseDeviceConfigs([]);
      expect(result).toEqual(getDefaultDevices());
    });

    it('should return provided configs when valid array provided', () => {
      const customConfigs: DeviceConfig[] = [
        { name: 'Custom Device', viewport: { width: 1024, height: 768 } }
      ];
      const result = parseDeviceConfigs(customConfigs);

      // Should return the exact same array reference
      expect(result).toBe(customConfigs);

      // Verify content matches just to be sure
      expect(result).toEqual(customConfigs);
    });

    it('should return multiple provided configs correctly', () => {
      const customConfigs: DeviceConfig[] = [
        { name: 'Device 1', viewport: { width: 1024, height: 768 } },
        { name: 'Device 2', viewport: { width: 375, height: 667 } }
      ];
      const result = parseDeviceConfigs(customConfigs);
      expect(result).toBe(customConfigs);
      expect(result).toHaveLength(2);
    });
  });
});

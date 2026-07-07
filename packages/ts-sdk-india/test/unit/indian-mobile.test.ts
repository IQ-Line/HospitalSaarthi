import { describe, expect, it } from 'vitest';
import {
  INDIAN_MOBILE_RE,
  isValidIndianMobile,
  normalizeIndianMobile,
  sanitizeIndianMobileInput,
} from '../../src/indian-mobile.js';

describe('ts-sdk-india indian-mobile', () => {
  describe('INDIAN_MOBILE_RE / isValidIndianMobile boundaries', () => {
    it('accepts 10-digit numbers starting 6-9', () => {
      expect(INDIAN_MOBILE_RE.test('6123456789')).toBe(true);
      expect(INDIAN_MOBILE_RE.test('7123456789')).toBe(true);
      expect(INDIAN_MOBILE_RE.test('8123456789')).toBe(true);
      expect(INDIAN_MOBILE_RE.test('9839782567')).toBe(true);
      expect(isValidIndianMobile('9839782567')).toBe(true);
    });

    it('rejects numbers starting 0-5', () => {
      expect(isValidIndianMobile('0765432156')).toBe(false);
      expect(isValidIndianMobile('5123456789')).toBe(false);
      expect(isValidIndianMobile('2345677888')).toBe(false);
    });

    it('rejects 9-digit and 11-digit values', () => {
      expect(isValidIndianMobile('912345678')).toBe(false);
      expect(isValidIndianMobile('98765432101')).toBe(false);
    });

    it('rejects non-numeric input', () => {
      expect(isValidIndianMobile('98abc45678')).toBe(false);
      expect(isValidIndianMobile('')).toBe(false);
      expect(isValidIndianMobile(null)).toBe(false);
      expect(isValidIndianMobile(undefined)).toBe(false);
    });

    it('trims surrounding whitespace before testing', () => {
      expect(isValidIndianMobile('  9839782567  ')).toBe(true);
    });
  });

  describe('sanitizeIndianMobileInput', () => {
    it('strips non-digits and caps to 10', () => {
      expect(sanitizeIndianMobileInput('98-39-782567')).toBe('9839782567');
      expect(sanitizeIndianMobileInput('12345678901234')).toBe('1234567890');
    });

    it('honours a custom maxLength', () => {
      expect(sanitizeIndianMobileInput('123456789012', 12)).toBe('123456789012');
    });
  });

  describe('normalizeIndianMobile', () => {
    it('prefixes +91 and keeps the last 10 digits', () => {
      expect(normalizeIndianMobile('9839782567')).toBe('+919839782567');
    });

    it('strips spaces and dashes before normalising', () => {
      expect(normalizeIndianMobile('98 39 78-2567')).toBe('+919839782567');
    });

    it('takes the trailing 10 digits when a country code is included', () => {
      expect(normalizeIndianMobile('+91 98397 82567')).toBe('+919839782567');
      expect(normalizeIndianMobile('0919839782567')).toBe('+919839782567');
    });

    it('returns null when fewer than 10 digits are present', () => {
      expect(normalizeIndianMobile('98765')).toBeNull();
      expect(normalizeIndianMobile('')).toBeNull();
      expect(normalizeIndianMobile(null)).toBeNull();
      expect(normalizeIndianMobile(undefined)).toBeNull();
    });
  });
});

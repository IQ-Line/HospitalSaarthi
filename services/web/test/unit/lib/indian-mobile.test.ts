import { describe, expect, it } from 'vitest';
import {
  INDIAN_MOBILE_RE,
  indianMobileZodField,
  isValidIndianMobile,
  sanitizeIndianMobileInput,
} from '../../../src/lib/indian-mobile';

describe('indian-mobile', () => {
  it('accepts 10-digit numbers not starting with 0', () => {
    expect(isValidIndianMobile('9839782567')).toBe(true);
    expect(INDIAN_MOBILE_RE.test('9839782567')).toBe(true);
  });

  it('rejects numbers starting with 0', () => {
    expect(isValidIndianMobile('0765432156')).toBe(false);
  });

  it('rejects numbers starting with 1–5', () => {
    expect(isValidIndianMobile('2345677888')).toBe(false);
    expect(isValidIndianMobile('5123456789')).toBe(false);
  });

  it('accepts numbers starting with 6–9', () => {
    expect(isValidIndianMobile('6123456789')).toBe(true);
    expect(isValidIndianMobile('7123456789')).toBe(true);
    expect(isValidIndianMobile('8123456789')).toBe(true);
    expect(isValidIndianMobile('9123456789')).toBe(true);
  });

  it('rejects non-10-digit values', () => {
    expect(isValidIndianMobile('98765')).toBe(false);
    expect(isValidIndianMobile('98765432101')).toBe(false);
  });

  it('sanitizes non-digits and caps length', () => {
    expect(sanitizeIndianMobileInput('98-39-782567')).toBe('9839782567');
    expect(sanitizeIndianMobileInput('12345678901234')).toBe('1234567890');
  });

  it('zod field requires valid mobile', () => {
    const schema = indianMobileZodField();
    expect(schema.safeParse('9839782567').success).toBe(true);
    expect(schema.safeParse('0765432156').success).toBe(false);
    expect(schema.safeParse('2345677888').success).toBe(false);
    expect(schema.safeParse('').success).toBe(false);
  });
});

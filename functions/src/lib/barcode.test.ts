import { describe, it, expect } from 'vitest';
import { isValidBarcode, normalizeBarcode } from './barcode';

describe('isValidBarcode', () => {
  it('accepts 8-digit (EAN-8)', () => {
    expect(isValidBarcode('12345678')).toBe(true);
  });

  it('accepts 12-digit (UPC-A)', () => {
    expect(isValidBarcode('123456789012')).toBe(true);
  });

  it('accepts 13-digit (EAN-13)', () => {
    expect(isValidBarcode('8410076401119')).toBe(true);
    expect(isValidBarcode('3017620422003')).toBe(true);
  });

  it('accepts 14-digit (ITF-14)', () => {
    expect(isValidBarcode('12345678901234')).toBe(true);
  });

  it('rejects less than 8 digits', () => {
    expect(isValidBarcode('1234567')).toBe(false);
    expect(isValidBarcode('12')).toBe(false);
    expect(isValidBarcode('')).toBe(false);
  });

  it('rejects more than 14 digits', () => {
    expect(isValidBarcode('123456789012345')).toBe(false);
  });

  it('rejects strings with non-digit characters', () => {
    expect(isValidBarcode('8410abc401119')).toBe(false);
    expect(isValidBarcode('841 076 401')).toBe(false);
    expect(isValidBarcode('841-076-401')).toBe(false);
    expect(isValidBarcode('841076401 ')).toBe(false); // trailing space
  });

  it('rejects non-string values', () => {
    expect(isValidBarcode(null)).toBe(false);
    expect(isValidBarcode(undefined)).toBe(false);
    expect(isValidBarcode(8410076401119)).toBe(false); // number, not string
    expect(isValidBarcode({})).toBe(false);
    expect(isValidBarcode([])).toBe(false);
  });
});

describe('normalizeBarcode', () => {
  it('trims whitespace', () => {
    expect(normalizeBarcode('  8410076401119  ')).toBe('8410076401119');
    expect(normalizeBarcode('\t8410076401119\n')).toBe('8410076401119');
  });

  it('passes through already-clean input', () => {
    expect(normalizeBarcode('8410076401119')).toBe('8410076401119');
  });
});

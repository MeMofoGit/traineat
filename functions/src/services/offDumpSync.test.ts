import { describe, it, expect, vi } from 'vitest';
import { shouldKeepProduct } from './offDumpSync';

// Silenciar logger
vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const validProduct = {
  code: '8410076401119',
  product_name: 'Pan Integral',
  product_name_es: 'Pan Integral',
  countries_tags: ['en:spain'],
  nutriments: {
    'energy-kcal_100g': 247,
    'proteins_100g': 9.2,
    'carbohydrates_100g': 41.5,
    'fat_100g': 3.5,
  },
};

describe('shouldKeepProduct — country filter', () => {
  it('accepts products tagged en:spain', () => {
    expect(shouldKeepProduct(validProduct)).toBe(true);
  });

  it('accepts products tagged en:españa (alternate spelling)', () => {
    expect(
      shouldKeepProduct({ ...validProduct, countries_tags: ['en:españa'] })
    ).toBe(true);
  });

  it('accepts products with multiple countries including spain', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        countries_tags: ['en:france', 'en:spain', 'en:italy'],
      })
    ).toBe(true);
  });

  it('rejects products without spain tag', () => {
    expect(
      shouldKeepProduct({ ...validProduct, countries_tags: ['en:france'] })
    ).toBe(false);
  });

  it('rejects products with empty countries_tags', () => {
    expect(
      shouldKeepProduct({ ...validProduct, countries_tags: [] })
    ).toBe(false);
  });

  it('rejects products with no countries_tags', () => {
    expect(
      shouldKeepProduct({ ...validProduct, countries_tags: undefined })
    ).toBe(false);
  });

  it('is case-insensitive on country tags', () => {
    expect(
      shouldKeepProduct({ ...validProduct, countries_tags: ['EN:SPAIN'] })
    ).toBe(true);
  });
});

describe('shouldKeepProduct — name filter', () => {
  it('accepts when product_name_es present', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        product_name: undefined,
        product_name_en: undefined,
      })
    ).toBe(true);
  });

  it('accepts when only product_name (default) present', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        product_name_es: undefined,
        product_name_en: undefined,
      })
    ).toBe(true);
  });

  it('accepts when only product_name_en present', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        product_name_es: undefined,
        product_name: undefined,
        product_name_en: 'Whole Grain Bread',
      })
    ).toBe(true);
  });

  it('rejects when no name at all', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        product_name: undefined,
        product_name_es: undefined,
        product_name_en: undefined,
      })
    ).toBe(false);
  });

  it('rejects when all names are empty strings', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        product_name: '',
        product_name_es: '',
        product_name_en: '',
      })
    ).toBe(false);
  });
});

describe('shouldKeepProduct — nutriments filter', () => {
  it('accepts when all 4 mandatory macros present and non-negative', () => {
    expect(shouldKeepProduct(validProduct)).toBe(true);
  });

  it('rejects when calories missing', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        nutriments: { ...validProduct.nutriments, 'energy-kcal_100g': undefined },
      })
    ).toBe(false);
  });

  it('rejects when protein missing', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        nutriments: { ...validProduct.nutriments, 'proteins_100g': undefined },
      })
    ).toBe(false);
  });

  it('rejects when carbs missing', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        nutriments: { ...validProduct.nutriments, 'carbohydrates_100g': undefined },
      })
    ).toBe(false);
  });

  it('rejects when fat missing', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        nutriments: { ...validProduct.nutriments, 'fat_100g': undefined },
      })
    ).toBe(false);
  });

  it('rejects when nutriments object missing entirely', () => {
    expect(
      shouldKeepProduct({ ...validProduct, nutriments: undefined })
    ).toBe(false);
  });

  it('rejects when any macro is negative', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        nutriments: { ...validProduct.nutriments, 'fat_100g': -1 },
      })
    ).toBe(false);
  });

  it('rejects when macro is a string instead of number', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        nutriments: { ...validProduct.nutriments, 'energy-kcal_100g': '247' },
      })
    ).toBe(false);
  });

  it('accepts when macros are 0 (technically valid, e.g. water)', () => {
    expect(
      shouldKeepProduct({
        ...validProduct,
        nutriments: {
          'energy-kcal_100g': 0,
          'proteins_100g': 0,
          'carbohydrates_100g': 0,
          'fat_100g': 0,
        },
      })
    ).toBe(true);
  });
});

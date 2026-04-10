import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { fetchFromOpenFoodFacts, mapOffProduct, inferCategory } from './openfoodfacts';

// Mockear el logger para que no escupa en la consola de tests
vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('inferCategory', () => {
  it('returns "liquid" for drinks', () => {
    expect(inferCategory(['en:beverages'])).toBe('liquid');
    expect(inferCategory(['en:sodas'])).toBe('liquid');
    expect(inferCategory(['en:juices'])).toBe('liquid');
    expect(inferCategory(['en:milks'])).toBe('liquid');
    expect(inferCategory(['en:waters'])).toBe('liquid');
  });

  it('returns "fruit" for fruits', () => {
    expect(inferCategory(['en:fruits'])).toBe('fruit');
    expect(inferCategory(['en:fresh-fruits'])).toBe('fruit');
    expect(inferCategory(['en:berries'])).toBe('fruit');
  });

  it('returns "veggies" for vegetables', () => {
    expect(inferCategory(['en:vegetables'])).toBe('veggies');
    expect(inferCategory(['en:fresh-vegetables'])).toBe('veggies');
  });

  it('returns "protein" for meats, fish, dairy, eggs, plant protein', () => {
    expect(inferCategory(['en:meats'])).toBe('protein');
    expect(inferCategory(['en:fishes'])).toBe('protein');
    expect(inferCategory(['en:dairy'])).toBe('protein');
    expect(inferCategory(['en:eggs'])).toBe('protein');
    expect(inferCategory(['en:tofu'])).toBe('protein');
    expect(inferCategory(['en:whey'])).toBe('protein');
  });

  it('returns "fat" for oils, nuts, seeds', () => {
    expect(inferCategory(['en:oils'])).toBe('fat');
    expect(inferCategory(['en:olive-oils'])).toBe('fat');
    expect(inferCategory(['en:nuts'])).toBe('fat');
    expect(inferCategory(['en:nut-butters'])).toBe('fat');
  });

  it('returns "carbs" for cereals, bread, pasta, rice', () => {
    expect(inferCategory(['en:cereals'])).toBe('carbs');
    expect(inferCategory(['en:breads'])).toBe('carbs');
    expect(inferCategory(['en:pastas'])).toBe('carbs');
    expect(inferCategory(['en:rice'])).toBe('carbs');
  });

  it('defaults to "other" for unknown tags', () => {
    expect(inferCategory(['en:unknown-category'])).toBe('other');
    expect(inferCategory(['en:condiments'])).toBe('other');
    expect(inferCategory([])).toBe('other');
    expect(inferCategory()).toBe('other');
  });

  it('prioritizes more specific categories', () => {
    // If both fruit and beverage match, liquid wins (it comes first in regex order)
    // That's a design choice documented in inferCategory.
    expect(inferCategory(['en:juices', 'en:fruits'])).toBe('liquid');
  });
});

describe('mapOffProduct', () => {
  const validProduct = {
    code: '8410076401119',
    product_name_es: 'Pan Integral',
    product_name: 'Pan',
    product_name_en: 'Bread',
    brands: 'Bimbo, SubBrand',
    categories_tags: ['en:breads'],
    nutriments: {
      'energy-kcal_100g': 247,
      'proteins_100g': 9.2,
      'carbohydrates_100g': 41.5,
      'fat_100g': 3.5,
      'sugars_100g': 3.8,
      'fiber_100g': 6.1,
      'saturated-fat_100g': 0.7,
      'salt_100g': 1.1,
    },
  };

  it('maps a valid product correctly', () => {
    const food = mapOffProduct(validProduct, '8410076401119');
    expect(food).not.toBeNull();
    expect(food!.name).toBe('Pan Integral');
    expect(food!.category).toBe('carbs');
    expect(food!.defaultUnit).toBe('g');
    expect(food!.servingSize).toBe(100);
    expect(food!.source).toBe('custom');
    expect(food!.barcode).toBe('8410076401119');
    expect(food!.brand).toBe('Bimbo');
  });

  it('rounds macros to 2 decimals', () => {
    const food = mapOffProduct(
      {
        ...validProduct,
        nutriments: {
          ...validProduct.nutriments,
          'energy-kcal_100g': 247.123456,
          'proteins_100g': 9.199999,
        },
      },
      '8410076401119'
    );
    expect(food!.macros.calories).toBe(247.12);
    expect(food!.macros.protein).toBe(9.2);
  });

  it('prefers Spanish name, falls back to default, then English', () => {
    expect(mapOffProduct(validProduct, '1')!.name).toBe('Pan Integral');

    expect(
      mapOffProduct({ ...validProduct, product_name_es: undefined }, '1')!.name
    ).toBe('Pan');

    expect(
      mapOffProduct(
        { ...validProduct, product_name_es: undefined, product_name: undefined },
        '1'
      )!.name
    ).toBe('Bread');
  });

  it('truncates name to 80 chars', () => {
    const longName = 'x'.repeat(150);
    const food = mapOffProduct({ ...validProduct, product_name_es: longName }, '1');
    expect(food!.name.length).toBe(80);
  });

  it('only takes first brand when multiple are comma-separated', () => {
    const food = mapOffProduct({ ...validProduct, brands: 'Bimbo, Hacendado, Carrefour' }, '1');
    expect(food!.brand).toBe('Bimbo');
  });

  it('returns null when product_name is empty', () => {
    const food = mapOffProduct(
      {
        ...validProduct,
        product_name_es: undefined,
        product_name: undefined,
        product_name_en: undefined,
      },
      '1'
    );
    expect(food).toBeNull();
  });

  it('returns null when mandatory macros are missing', () => {
    const withoutCalories = {
      ...validProduct,
      nutriments: { ...validProduct.nutriments, 'energy-kcal_100g': undefined },
    };
    expect(mapOffProduct(withoutCalories, '1')).toBeNull();

    const withoutProtein = {
      ...validProduct,
      nutriments: { ...validProduct.nutriments, 'proteins_100g': undefined },
    };
    expect(mapOffProduct(withoutProtein, '1')).toBeNull();
  });

  it('returns null when mandatory macros are negative', () => {
    const negative = {
      ...validProduct,
      nutriments: { ...validProduct.nutriments, 'fat_100g': -5 },
    };
    expect(mapOffProduct(negative, '1')).toBeNull();
  });

  it('includes optional macros only when present and non-negative', () => {
    const partial = {
      ...validProduct,
      nutriments: {
        'energy-kcal_100g': 100,
        'proteins_100g': 5,
        'carbohydrates_100g': 10,
        'fat_100g': 3,
        // sugars, fiber, saturated, salt all missing
      },
    };
    const food = mapOffProduct(partial, '1');
    expect(food!.macros.sugars).toBeUndefined();
    expect(food!.macros.fiber).toBeUndefined();
    expect(food!.macros.saturated).toBeUndefined();
    expect(food!.macros.salt).toBeUndefined();
  });

  it('skips optional macros when negative', () => {
    const weird = {
      ...validProduct,
      nutriments: { ...validProduct.nutriments, 'sugars_100g': -2 },
    };
    const food = mapOffProduct(weird, '1');
    expect(food!.macros.sugars).toBeUndefined();
  });

  it('skips imageUrl if not provided', () => {
    const food = mapOffProduct(validProduct, '1');
    expect(food!.imageUrl).toBeUndefined();
  });

  it('includes imageUrl when provided', () => {
    const withImage = {
      ...validProduct,
      image_front_small_url: 'https://static.openfoodfacts.org/images/products/841/example.jpg',
    };
    const food = mapOffProduct(withImage, '1');
    expect(food!.imageUrl).toBeDefined();
  });
});

describe('fetchFromOpenFoodFacts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns mapped product on HTTP 200 with valid data', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 1,
        code: '3017620422003',
        product: {
          product_name: 'Nutella',
          product_name_es: 'Nutella',
          categories_tags: ['en:spreads'],
          nutriments: {
            'energy-kcal_100g': 539,
            'proteins_100g': 6.3,
            'carbohydrates_100g': 57.5,
            'fat_100g': 30.9,
          },
        },
      }),
    });

    const food = await fetchFromOpenFoodFacts('3017620422003');
    expect(food).not.toBeNull();
    expect(food!.name).toBe('Nutella');
    expect(food!.macros.calories).toBe(539);
  });

  // REGRESSION TEST for the bug fixed in commit 3913d3a (2026-04-10):
  // OFF API v2 returns HTTP 404 for "product not found", which we were
  // incorrectly treating as an API failure (OFF_UNAVAILABLE). Must return
  // null so the caller handles it as "not found" and lets the client
  // fall through to OCR / manual entry.
  it('returns null on HTTP 404 (product not found) — REGRESSION', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        status: 0,
        code: '9412181002307',
        status_verbose: 'product not found',
      }),
    });

    const food = await fetchFromOpenFoodFacts('9412181002307');
    expect(food).toBeNull();
  });

  it('returns null on HTTP 200 with body.status=0', async () => {
    // Some OFF endpoints return 200 with status:0 instead of 404
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 0,
        code: '1234567890',
        status_verbose: 'product not found',
      }),
    });

    const food = await fetchFromOpenFoodFacts('1234567890');
    expect(food).toBeNull();
  });

  it('throws on HTTP 5xx', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    await expect(fetchFromOpenFoodFacts('123456789012')).rejects.toThrow(/500/);
  });

  it('throws on HTTP 503 (OFF down)', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    await expect(fetchFromOpenFoodFacts('123456789012')).rejects.toThrow(/503/);
  });

  it('returns null when product exists but nutriments incomplete', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: 1,
        code: '123',
        product: {
          product_name: 'Something',
          categories_tags: [],
          nutriments: {}, // empty → incomplete
        },
      }),
    });

    const food = await fetchFromOpenFoodFacts('123456789012');
    expect(food).toBeNull();
  });

  it('propagates network errors (fetch throws)', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('network error'));
    await expect(fetchFromOpenFoodFacts('123456789012')).rejects.toThrow('network error');
  });
});

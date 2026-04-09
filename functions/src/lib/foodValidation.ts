/**
 * Validación server-side de custom foods.
 *
 * REPLICADA INTENCIONALMENTE desde `src/services/foods.js` del cliente.
 * Duplicación es deliberada: la validación cliente puede saltarse
 * trivialmente manipulando el JS; cualquier escritura server-side a
 * `productCache` o futuros endpoints que acepten custom foods debe pasar
 * también por esta función.
 *
 * REGLA: cuando cambies la validación cliente, cambia esta también.
 * El test de coherencia vive en `functions/src/__tests__/foodValidation.test.ts`
 * (cuando añadamos tests en F0).
 */

const VALID_CATEGORIES = new Set([
  'protein', 'carbs', 'fat', 'veggies', 'fruit', 'liquid', 'other',
]);
const VALID_UNITS = new Set(['g', 'ml', 'pz', 'taza', 'cda']);

export interface FoodMacrosInput {
  calories?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  sugars?: unknown;
  fiber?: unknown;
  saturated?: unknown;
  salt?: unknown;
}

export interface FoodInput {
  name?: unknown;
  category?: unknown;
  defaultUnit?: unknown;
  servingSize?: unknown;
  source?: unknown;
  barcode?: unknown;
  brand?: unknown;
  imageUrl?: unknown;
  macros?: FoodMacrosInput;
}

export interface ValidatedFood {
  name: string;
  category: string;
  defaultUnit: string;
  servingSize: number;
  source: 'custom';
  barcode?: string;
  brand?: string;
  imageUrl?: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugars?: number;
    fiber?: number;
    saturated?: number;
    salt?: number;
  };
}

export class FoodValidationError extends Error {
  public readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'FoodValidationError';
    this.field = field;
  }
}

export function validateFoodServerSide(input: FoodInput): ValidatedFood {
  if (!input || typeof input !== 'object') {
    throw new FoodValidationError('Input must be an object');
  }

  const name = String(input.name || '').trim();
  if (name.length < 1 || name.length > 80) {
    throw new FoodValidationError('name must be 1-80 chars', 'name');
  }

  if (typeof input.category !== 'string' || !VALID_CATEGORIES.has(input.category)) {
    throw new FoodValidationError('Invalid category', 'category');
  }

  if (typeof input.defaultUnit !== 'string' || !VALID_UNITS.has(input.defaultUnit)) {
    throw new FoodValidationError('Invalid defaultUnit', 'defaultUnit');
  }

  const defaultServing = (input.defaultUnit === 'g' || input.defaultUnit === 'ml') ? 100 : 1;
  const servingSize = input.servingSize != null ? Number(input.servingSize) : defaultServing;
  if (!Number.isFinite(servingSize) || servingSize <= 0) {
    throw new FoodValidationError('servingSize must be a positive number', 'servingSize');
  }

  const m: FoodMacrosInput = input.macros || {};
  const macros: ValidatedFood['macros'] = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) {
    const v = Number(m[key]);
    if (!Number.isFinite(v) || v < 0) {
      throw new FoodValidationError(`Macro "${key}" must be >= 0`, key);
    }
    macros[key] = v;
  }
  for (const key of ['sugars', 'fiber', 'saturated', 'salt'] as const) {
    if (m[key] != null && m[key] !== '') {
      const v = Number(m[key]);
      if (!Number.isFinite(v) || v < 0) {
        throw new FoodValidationError(`Macro "${key}" must be >= 0`, key);
      }
      macros[key] = v;
    }
  }

  const result: ValidatedFood = {
    name,
    category: input.category,
    defaultUnit: input.defaultUnit,
    servingSize,
    source: 'custom',
    macros,
  };

  if (input.barcode != null && input.barcode !== '') {
    const b = String(input.barcode).trim();
    if (!/^\d{8,14}$/.test(b)) {
      throw new FoodValidationError('Invalid barcode format', 'barcode');
    }
    result.barcode = b;
  }
  if (typeof input.brand === 'string' && input.brand.length > 0) {
    result.brand = input.brand.slice(0, 100);
  }
  if (typeof input.imageUrl === 'string' && /^https?:\/\//.test(input.imageUrl)) {
    result.imageUrl = input.imageUrl;
  }

  return result;
}

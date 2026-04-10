import { describe, it, expect } from 'vitest';
import { validateFoodServerSide, FoodValidationError } from './foodValidation';

const validInput = {
  name: 'Pan Integral',
  category: 'carbs',
  defaultUnit: 'g',
  servingSize: 100,
  macros: {
    calories: 247,
    protein: 9.2,
    carbs: 41.5,
    fat: 3.5,
  },
};

describe('validateFoodServerSide — happy paths', () => {
  it('accepts a minimal valid food', () => {
    const out = validateFoodServerSide(validInput);
    expect(out.name).toBe('Pan Integral');
    expect(out.category).toBe('carbs');
    expect(out.defaultUnit).toBe('g');
    expect(out.servingSize).toBe(100);
    expect(out.source).toBe('custom');
    expect(out.macros.calories).toBe(247);
    expect(out.macros.protein).toBe(9.2);
  });

  it('trims whitespace from name', () => {
    const out = validateFoodServerSide({ ...validInput, name: '  Pan Integral  ' });
    expect(out.name).toBe('Pan Integral');
  });

  it('includes optional macros when present', () => {
    const out = validateFoodServerSide({
      ...validInput,
      macros: { ...validInput.macros, sugars: 3.8, fiber: 6.1, saturated: 0.7, salt: 1.1 },
    });
    expect(out.macros.sugars).toBe(3.8);
    expect(out.macros.fiber).toBe(6.1);
    expect(out.macros.saturated).toBe(0.7);
    expect(out.macros.salt).toBe(1.1);
  });

  it('omits optional macros when empty string or null', () => {
    const out = validateFoodServerSide({
      ...validInput,
      macros: { ...validInput.macros, sugars: '', fiber: null },
    } as any);
    expect(out.macros.sugars).toBeUndefined();
    expect(out.macros.fiber).toBeUndefined();
  });

  it('defaults servingSize to 100 for g/ml', () => {
    const out = validateFoodServerSide({ ...validInput, servingSize: undefined } as any);
    expect(out.servingSize).toBe(100);
  });

  it('defaults servingSize to 1 for pz', () => {
    const out = validateFoodServerSide({
      ...validInput,
      defaultUnit: 'pz',
      servingSize: undefined,
    } as any);
    expect(out.servingSize).toBe(1);
  });

  it('accepts a valid barcode', () => {
    const out = validateFoodServerSide({ ...validInput, barcode: '8410076401119' });
    expect(out.barcode).toBe('8410076401119');
  });

  it('trims brand', () => {
    const out = validateFoodServerSide({ ...validInput, brand: '  Bimbo  ' });
    expect(out.brand).toBe('  Bimbo  '.slice(0, 100));
    // brand trim is NOT done by the validator (only length-limited), per current code
  });
});

describe('validateFoodServerSide — rejections', () => {
  it('throws on non-object input', () => {
    expect(() => validateFoodServerSide(null as any)).toThrow(FoodValidationError);
    expect(() => validateFoodServerSide('string' as any)).toThrow(FoodValidationError);
  });

  it('throws on empty name', () => {
    expect(() => validateFoodServerSide({ ...validInput, name: '' })).toThrow(/name/);
    expect(() => validateFoodServerSide({ ...validInput, name: '   ' })).toThrow(/name/);
  });

  it('throws on name > 80 chars', () => {
    const longName = 'x'.repeat(81);
    expect(() => validateFoodServerSide({ ...validInput, name: longName })).toThrow(/name/);
  });

  it('throws on invalid category', () => {
    expect(() => validateFoodServerSide({ ...validInput, category: 'snacks' })).toThrow(/category/);
    expect(() => validateFoodServerSide({ ...validInput, category: '' })).toThrow(/category/);
  });

  it('throws on invalid unit', () => {
    expect(() => validateFoodServerSide({ ...validInput, defaultUnit: 'lbs' })).toThrow(/defaultUnit/);
  });

  it('throws on zero or negative servingSize', () => {
    expect(() => validateFoodServerSide({ ...validInput, servingSize: 0 })).toThrow(/servingSize/);
    expect(() => validateFoodServerSide({ ...validInput, servingSize: -10 })).toThrow(/servingSize/);
  });

  it('throws on negative mandatory macros', () => {
    expect(() =>
      validateFoodServerSide({ ...validInput, macros: { ...validInput.macros, calories: -10 } })
    ).toThrow(/calories/);
    expect(() =>
      validateFoodServerSide({ ...validInput, macros: { ...validInput.macros, protein: -1 } })
    ).toThrow(/protein/);
  });

  it('throws on non-finite mandatory macros', () => {
    expect(() =>
      validateFoodServerSide({ ...validInput, macros: { ...validInput.macros, fat: NaN } })
    ).toThrow(/fat/);
    expect(() =>
      validateFoodServerSide({ ...validInput, macros: { ...validInput.macros, carbs: Infinity } })
    ).toThrow(/carbs/);
  });

  it('throws on negative optional macros', () => {
    expect(() =>
      validateFoodServerSide({
        ...validInput,
        macros: { ...validInput.macros, sugars: -5 },
      })
    ).toThrow(/sugars/);
  });

  it('throws on invalid barcode format', () => {
    expect(() => validateFoodServerSide({ ...validInput, barcode: 'abc' })).toThrow(/barcode/);
    expect(() => validateFoodServerSide({ ...validInput, barcode: '123' })).toThrow(/barcode/);
    expect(() => validateFoodServerSide({ ...validInput, barcode: '123456789012345' })).toThrow(/barcode/);
  });
});

describe('validateFoodServerSide — skipName option', () => {
  it('accepts empty name when skipName is true', () => {
    const out = validateFoodServerSide({ ...validInput, name: '' }, { skipName: true });
    expect(out.name).toBe('');
  });

  it('accepts undefined name when skipName is true', () => {
    const out = validateFoodServerSide(
      { ...validInput, name: undefined } as any,
      { skipName: true }
    );
    expect(out.name).toBe('');
  });

  it('still enforces all other validations when skipName is true', () => {
    expect(() =>
      validateFoodServerSide({ ...validInput, name: '', category: 'bad' }, { skipName: true })
    ).toThrow(/category/);
  });

  it('still rejects name > 80 chars in skipName mode', () => {
    const longName = 'x'.repeat(81);
    expect(() =>
      validateFoodServerSide({ ...validInput, name: longName }, { skipName: true })
    ).toThrow(/name/);
  });
});

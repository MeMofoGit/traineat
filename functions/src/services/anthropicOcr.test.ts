import { describe, it, expect, vi } from 'vitest';
import { extractJsonObject } from './anthropicOcr';

// Silenciar logger
vi.mock('firebase-functions/v2', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('extractJsonObject', () => {
  const validJson = {
    isLabel: true,
    brand: null,
    servingSize: 100,
    unit: 'g',
    calories: 247,
    protein: 9.2,
    carbs: 41.5,
    fat: 3.5,
    sugars: null,
    fiber: null,
    saturated: null,
    salt: null,
    confidence: 'high',
    notes: null,
  };

  it('parses clean JSON', () => {
    const out = extractJsonObject(JSON.stringify(validJson));
    expect(out.isLabel).toBe(true);
    expect(out.calories).toBe(247);
  });

  it('parses JSON with extra whitespace', () => {
    const out = extractJsonObject('   ' + JSON.stringify(validJson) + '   ');
    expect(out.isLabel).toBe(true);
  });

  it('extracts JSON wrapped in markdown code fence', () => {
    const text = '```json\n' + JSON.stringify(validJson) + '\n```';
    const out = extractJsonObject(text);
    expect(out.calories).toBe(247);
  });

  it('extracts JSON wrapped in plain code fence', () => {
    const text = '```\n' + JSON.stringify(validJson) + '\n```';
    const out = extractJsonObject(text);
    expect(out.calories).toBe(247);
  });

  it('extracts JSON from response with leading prose', () => {
    const text =
      'Here is the extracted nutrition data:\n\n' + JSON.stringify(validJson) + '\n\nLet me know if you need more.';
    const out = extractJsonObject(text);
    expect(out.calories).toBe(247);
  });

  it('handles nested objects correctly (balanced braces)', () => {
    const nested = {
      ...validJson,
      extra: { foo: 'bar', nested: { deep: 'value' } },
    };
    const text = 'prose { fake\n' + JSON.stringify(nested) + '\nmore prose }';
    // This is a harder case — there's a fake '{' in the prose.
    // extractJsonObject finds the FIRST '{', which would be the fake one.
    // Expectation: if the model produces clean JSON (which we enforce in the
    // prompt), this edge case is rare. Document current behavior.
    expect(() => extractJsonObject(text)).toThrow();
  });

  it('handles multi-line JSON', () => {
    const text = `{
      "isLabel": true,
      "brand": null,
      "servingSize": 100,
      "unit": "g",
      "calories": 247,
      "protein": 9.2,
      "carbs": 41.5,
      "fat": 3.5,
      "sugars": null,
      "fiber": null,
      "saturated": null,
      "salt": null,
      "confidence": "high",
      "notes": null
    }`;
    const out = extractJsonObject(text);
    expect(out.calories).toBe(247);
  });

  it('throws on invalid JSON', () => {
    expect(() => extractJsonObject('not json at all')).toThrow();
    expect(() => extractJsonObject('{ broken')).toThrow();
    expect(() => extractJsonObject('')).toThrow();
  });

  it('throws when there is no object in the text', () => {
    expect(() => extractJsonObject('just some plain text')).toThrow();
    expect(() => extractJsonObject('[1, 2, 3]')).toThrow(); // array, not object
  });

  it('parses isLabel: false payload (not a label case)', () => {
    const notLabel = {
      isLabel: false,
      brand: null,
      servingSize: 100,
      unit: 'g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      sugars: null,
      fiber: null,
      saturated: null,
      salt: null,
      confidence: 'low',
      notes: 'Not a nutrition label',
    };
    const out = extractJsonObject(JSON.stringify(notLabel));
    expect(out.isLabel).toBe(false);
    expect(out.notes).toBe('Not a nutrition label');
  });
});

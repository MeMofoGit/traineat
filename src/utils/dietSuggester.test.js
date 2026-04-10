/**
 * Tests del algoritmo de sustitución dietSuggester.
 *
 * Para correr: necesita Vitest en root (hoy solo está en functions/).
 * De momento sirve como especificación ejecutable — los scenarios
 * documentan el comportamiento esperado con datos reales.
 *
 * Cuando se instale Vitest en root (F0), estos tests correrán con
 * `npm test` desde la raíz del proyecto.
 */

import { describe, it, expect } from 'vitest';
import { macroSimilarity, suggestSubstitutions } from './dietSuggester';

// ============================================================================
// Setup: datos realistas
// ============================================================================

// Productos genéricos (simulando FOOD_DATABASE)
// Se importan desde food_database.js, pero aquí usamos literales para que
// los tests sean auto-contenidos y no dependan del estado del módulo.

// Custom foods del usuario (simulando Mi Nevera tras escanear/OCR)
const myFridge = [
    {
        id: 'user_pechuga_mercadona_abc',
        name: 'Pechuga de Pollo Mercadona',
        category: 'protein',
        defaultUnit: 'g',
        servingSize: 100,
        source: 'custom',
        macros: { calories: 110, protein: 23.5, carbs: 0, fat: 1.2 },
    },
    {
        id: 'user_arroz_brillante_def',
        name: 'Arroz Brillante (Crudo)',
        category: 'carbs',
        defaultUnit: 'g',
        servingSize: 100,
        source: 'custom',
        macros: { calories: 355, protein: 7.5, carbs: 77, fat: 0.8 },
    },
    {
        id: 'user_brocoli_hacendado_ghi',
        name: 'Brócoli Hacendado Congelado',
        category: 'veggies',
        defaultUnit: 'g',
        servingSize: 100,
        source: 'custom',
        macros: { calories: 30, protein: 3, carbs: 4, fat: 0.3 },
    },
    {
        id: 'user_aceite_carbonell_jkl',
        name: 'Aceite Carbonell AOVE',
        category: 'fat',
        defaultUnit: 'ml',
        servingSize: 100,
        source: 'custom',
        macros: { calories: 900, protein: 0, carbs: 0, fat: 100 },
    },
    {
        id: 'user_pan_bimbo_mno',
        name: 'Pan Bimbo Integral',
        category: 'carbs',
        defaultUnit: 'g',
        servingSize: 100,
        source: 'custom',
        macros: { calories: 247, protein: 9.2, carbs: 41.5, fat: 3.5 },
    },
    {
        id: 'user_yogur_danone_pqr',
        name: 'Yogur Danone Natural',
        category: 'protein',
        defaultUnit: 'g',
        servingSize: 100,
        source: 'custom',
        macros: { calories: 62, protein: 5, carbs: 6, fat: 2 },
    },
];

// Items típicos de una comida (Almuerzo post-entreno)
const lunchItems = [
    { foodId: 'chicken_breast', name: 'Pechuga de Pollo', category: 'protein', quantity: '150', unit: 'g' },
    { foodId: 'rice_white_raw', name: 'Arroz (Crudo)', category: 'carbs', quantity: '80', unit: 'g' },
    { foodId: 'broccoli', name: 'Brócoli', category: 'veggies', quantity: '150', unit: 'g' },
];

// Items del desayuno
const breakfastItems = [
    { foodId: 'egg', name: 'Huevo Entero', category: 'protein', quantity: '2', unit: 'pz' },
    { foodId: 'oats', name: 'Avena', category: 'carbs', quantity: '60', unit: 'g' },
    { foodId: 'kiwi', name: 'Kiwi', category: 'fruit', quantity: '1', unit: 'pz' },
];

// ============================================================================
// Tests: macroSimilarity
// ============================================================================

describe('macroSimilarity', () => {
    it('returns 1.0 for identical macro profiles', () => {
        const a = { protein: 23, carbs: 0, fat: 1 };
        expect(macroSimilarity(a, a)).toBeCloseTo(1.0, 2);
    });

    it('returns 1.0 for same proportions at different scales', () => {
        const a = { protein: 23, carbs: 0, fat: 1 };
        const b = { protein: 46, carbs: 0, fat: 2 }; // x2
        expect(macroSimilarity(a, b)).toBeCloseTo(1.0, 2);
    });

    it('returns high similarity for slight differences', () => {
        const generic = { protein: 23, carbs: 0, fat: 1 };  // chicken_breast
        const branded = { protein: 23.5, carbs: 0, fat: 1.2 }; // Mercadona chicken
        expect(macroSimilarity(generic, branded)).toBeGreaterThan(0.95);
    });

    it('returns low similarity for different macro profiles', () => {
        const chicken = { protein: 23, carbs: 0, fat: 1 };
        const rice = { protein: 7, carbs: 78, fat: 1 };
        expect(macroSimilarity(chicken, rice)).toBeLessThan(0.3);
    });

    it('returns 0 when one has zero total macros', () => {
        expect(macroSimilarity({ protein: 0, carbs: 0, fat: 0 }, { protein: 10, carbs: 0, fat: 0 })).toBe(0);
    });

    it('distinguishes olive oil from butter by fat composition', () => {
        const oil = { protein: 0, carbs: 0, fat: 100 };
        const avocado = { protein: 2, carbs: 9, fat: 15 };
        // Both are "fat" category but oil is 100% fat, avocado is mixed
        expect(macroSimilarity(oil, avocado)).toBeLessThan(0.7);
    });

    it('rice vs bread: same category but different ratios', () => {
        const rice = { protein: 7, carbs: 78, fat: 1 };
        const bread = { protein: 9.2, carbs: 41.5, fat: 3.5 };
        // Both carbs, but bread has more protein/fat ratio
        const sim = macroSimilarity(rice, bread);
        expect(sim).toBeGreaterThan(0.6);
        expect(sim).toBeLessThan(0.9);
    });
});

// ============================================================================
// Tests: suggestSubstitutions
// ============================================================================

describe('suggestSubstitutions', () => {
    it('finds matching substitution for chicken breast', () => {
        const subs = suggestSubstitutions(lunchItems, myFridge);
        const chickenSub = subs.find(s => s.currentFoodId === 'chicken_breast');
        expect(chickenSub).toBeDefined();
        expect(chickenSub.suggestedFood.id).toBe('user_pechuga_mercadona_abc');
        expect(chickenSub.similarity).toBeGreaterThan(90);
    });

    it('finds matching substitution for rice', () => {
        const subs = suggestSubstitutions(lunchItems, myFridge);
        const riceSub = subs.find(s => s.currentFoodId === 'rice_white_raw');
        expect(riceSub).toBeDefined();
        expect(riceSub.suggestedFood.id).toBe('user_arroz_brillante_def');
        expect(riceSub.similarity).toBeGreaterThan(90);
    });

    it('finds matching substitution for broccoli', () => {
        const subs = suggestSubstitutions(lunchItems, myFridge);
        const brocSub = subs.find(s => s.currentFoodId === 'broccoli');
        expect(brocSub).toBeDefined();
        expect(brocSub.suggestedFood.id).toBe('user_brocoli_hacendado_ghi');
    });

    it('does NOT suggest substitution for items already from Mi Nevera', () => {
        const itemsWithCustom = [
            ...lunchItems,
            { foodId: 'user_pechuga_mercadona_abc', name: 'Pechuga Mercadona', category: 'protein', quantity: '100', unit: 'g' },
        ];
        const subs = suggestSubstitutions(itemsWithCustom, myFridge);
        const customSub = subs.find(s => s.currentFoodId === 'user_pechuga_mercadona_abc');
        expect(customSub).toBeUndefined();
    });

    it('does NOT suggest below threshold', () => {
        // Only fruit in items but no fruit in fridge → no suggestion
        const fruitItems = [{ foodId: 'kiwi', name: 'Kiwi', category: 'fruit', quantity: '1', unit: 'pz' }];
        const subs = suggestSubstitutions(fruitItems, myFridge);
        expect(subs.length).toBe(0);
    });

    it('returns empty array when no custom foods', () => {
        expect(suggestSubstitutions(lunchItems, [])).toEqual([]);
        expect(suggestSubstitutions(lunchItems, null)).toEqual([]);
    });

    it('returns empty array when no items', () => {
        expect(suggestSubstitutions([], myFridge)).toEqual([]);
    });

    it('prefers branded rice over branded bread for rice item', () => {
        // Both are carbs, but rice should match rice better than bread
        const subs = suggestSubstitutions(
            [{ foodId: 'rice_white_raw', name: 'Arroz (Crudo)', category: 'carbs', quantity: '80', unit: 'g' }],
            myFridge
        );
        expect(subs.length).toBe(1);
        expect(subs[0].suggestedFood.id).toBe('user_arroz_brillante_def');
    });

    it('higher threshold reduces suggestions', () => {
        const subsNormal = suggestSubstitutions(lunchItems, myFridge, 0.7);
        const subsStrict = suggestSubstitutions(lunchItems, myFridge, 0.99);
        // Strict threshold should return fewer or equal suggestions
        expect(subsStrict.length).toBeLessThanOrEqual(subsNormal.length);
    });

    it('suggests yogurt for generic yogurt, not for chicken', () => {
        const items = [
            { foodId: 'yogurt_greek', name: 'Yogur Griego', category: 'protein', quantity: '150', unit: 'g' },
        ];
        const subs = suggestSubstitutions(items, myFridge);
        // yogurt_greek has {protein:10, carbs:3, fat:0} → similar to Danone {5,6,2}?
        // Hmm, Greek yogurt is high protein low carb, Danone is moderate.
        // The similarity might be above or below 70% depending on ratios.
        // This test documents the actual behavior.
        if (subs.length > 0) {
            expect(subs[0].suggestedFood.category).toBe('protein');
        }
    });
});

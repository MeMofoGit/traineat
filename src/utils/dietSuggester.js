/**
 * Algoritmo de sugerencias para comidas.
 *
 * Dos funciones independientes que se pueden usar por separado o juntas:
 *
 * 1. `suggestSubstitutions(items, customFoods, foodDatabase)`:
 *    Para cada item genérico (de FOOD_DATABASE), busca en customFoods del
 *    usuario el producto con macros más parecidos. Usa distancia euclidiana
 *    normalizada de ratios de macros (P/C/G como porcentaje del total).
 *
 * 2. `suggestQuantities(items, targets, findFoodFn)`:
 *    Escala las cantidades de los items para que el total de macros de la
 *    comida se acerque lo más posible a los targets. Respeta constraints:
 *    mínimos por item, redondeo a enteros para piezas, a múltiplos de 5
 *    para gramos.
 *
 * Ambas son funciones puras (sin side effects, sin hooks, sin Firebase).
 * Testables con Vitest directamente.
 */

import { FOOD_DATABASE } from '../data/food_database';

/**
 * Calcula la similaridad entre dos perfiles de macros (0 = opuesto, 1 = idéntico).
 *
 * Usa ratios normalizados de P/C/G (qué porcentaje del total de macros es cada
 * uno) en lugar de valores absolutos. Así "100g pollo (23P/0C/1F)" y "150g pollo
 * (23P/0C/1F)" tienen similaridad 1.0 (misma proporción, diferente cantidad).
 *
 * La distancia euclidiana de los 3 ratios se normaliza a [0, 1] donde sqrt(2)
 * es la distancia máxima posible.
 *
 * @param {{ protein: number, carbs: number, fat: number }} a
 * @param {{ protein: number, carbs: number, fat: number }} b
 * @returns {number} 0-1
 */
export function macroSimilarity(a, b) {
    const totalA = (a.protein || 0) + (a.carbs || 0) + (a.fat || 0);
    const totalB = (b.protein || 0) + (b.carbs || 0) + (b.fat || 0);
    if (totalA === 0 || totalB === 0) return 0;

    const rA = { p: a.protein / totalA, c: a.carbs / totalA, f: a.fat / totalA };
    const rB = { p: b.protein / totalB, c: b.carbs / totalB, f: b.fat / totalB };

    const dist = Math.sqrt(
        (rA.p - rB.p) ** 2 +
        (rA.c - rB.c) ** 2 +
        (rA.f - rB.f) ** 2
    );

    // sqrt(2) ≈ 1.414 es la distancia máxima teórica
    return Math.max(0, 1 - dist / Math.SQRT2);
}

/**
 * Para cada item de una comida que usa un alimento genérico (FOOD_DATABASE),
 * busca en los customFoods del usuario el producto más similar por macros.
 *
 * Solo sugiere sustituciones con similaridad >= threshold (default 0.7).
 * No sugiere para items que ya usan un customFood (source === 'custom').
 *
 * @param {Array} items - items de la comida [{foodId, name, category, quantity, unit}]
 * @param {Array} customFoods - productos del usuario [{id, name, category, macros, ...}]
 * @param {number} [threshold=0.7] - mínimo de similaridad para sugerir
 * @returns {Array} [{itemIndex, currentFoodId, currentName, suggestedFood, similarity}]
 */
export function suggestSubstitutions(items, customFoods, threshold = 0.7) {
    if (!items?.length || !customFoods?.length) return [];

    const suggestions = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // No sugerir para items que ya son de Mi Nevera
        const isCustom = customFoods.some(cf => cf.id === item.foodId);
        if (isCustom) continue;

        // Buscar el alimento genérico original
        const original = FOOD_DATABASE.find(f => f.id === item.foodId);
        if (!original?.macros) continue;

        // Buscar candidatos en customFoods de la misma categoría (o similar)
        const candidates = customFoods.filter(cf =>
            cf.category === original.category && cf.macros
        );

        if (candidates.length === 0) continue;

        // Calcular similaridad de cada candidato
        let bestMatch = null;
        let bestSim = 0;

        for (const candidate of candidates) {
            const sim = macroSimilarity(original.macros, candidate.macros);
            if (sim > bestSim) {
                bestSim = sim;
                bestMatch = candidate;
            }
        }

        if (bestMatch && bestSim >= threshold) {
            suggestions.push({
                itemIndex: i,
                currentFoodId: item.foodId,
                currentName: item.name,
                suggestedFood: bestMatch,
                similarity: Math.round(bestSim * 100),
            });
        }
    }

    return suggestions;
}

/**
 * Sugiere cantidades ajustadas para que el total de macros de la comida
 * se acerque a los targets.
 *
 * Algoritmo: escalado proporcional por calorías como primera aproximación,
 * con ajuste iterativo para proteínas (el macro más restrictivo en fitness).
 *
 * Constraints:
 *   - Cantidades mínimas: 5g para g/ml, 1 para pz, 1 para taza/cda
 *   - Redondeo: múltiplos de 5 para g/ml, enteros para pz
 *   - Items "locked" no se tocan (el usuario los marca)
 *
 * @param {Array} items - items de la comida [{foodId, quantity, unit, ...}]
 * @param {{ calories: number, protein: number, carbs: number, fat: number }} targets
 * @param {Function} findFoodFn - (foodId) => Food | null
 * @param {Set} [lockedIndices] - indices de items que no se tocan
 * @returns {Array} [{...item, suggestedQty, currentQty, deltaPct}]
 */
export function suggestQuantities(items, targets, findFoodFn, lockedIndices = new Set()) {
    if (!items?.length || !targets) return items;

    // Calcular macros actuales por item
    const itemData = items.map((item, i) => {
        const food = findFoodFn(item.foodId);
        const qty = parseFloat(item.quantity) || 0;
        const locked = lockedIndices.has(i);
        return { item, food, qty, locked, index: i };
    });

    // Current totals (solo de items unlocked)
    const currentTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const lockedTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const d of itemData) {
        if (!d.food?.macros) continue;
        const m = calcMacros(d.food, d.qty);
        if (d.locked) {
            lockedTotal.calories += m.calories;
            lockedTotal.protein += m.protein;
            lockedTotal.carbs += m.carbs;
            lockedTotal.fat += m.fat;
        } else {
            currentTotal.calories += m.calories;
            currentTotal.protein += m.protein;
            currentTotal.carbs += m.carbs;
            currentTotal.fat += m.fat;
        }
    }

    // Lo que falta cubrir (targets menos lo que aportan los locked)
    const remaining = {
        calories: Math.max(0, targets.calories - lockedTotal.calories),
        protein: Math.max(0, targets.protein - lockedTotal.protein),
        carbs: Math.max(0, targets.carbs - lockedTotal.carbs),
        fat: Math.max(0, targets.fat - lockedTotal.fat),
    };

    // Ratio de escalado basado en calorías
    const calorieRatio = currentTotal.calories > 0
        ? remaining.calories / currentTotal.calories
        : 1;

    return itemData.map(d => {
        if (d.locked || !d.food?.macros) {
            return {
                ...d.item,
                suggestedQty: d.item.quantity,
                currentQty: d.item.quantity,
                deltaPct: 0,
            };
        }

        let suggestedQty = d.qty * calorieRatio;

        // Redondeo según unidad
        const unit = d.food.defaultUnit || d.item.unit;
        if (unit === 'pz') {
            suggestedQty = Math.max(1, Math.round(suggestedQty));
        } else if (unit === 'taza' || unit === 'cda') {
            suggestedQty = Math.max(0.5, Math.round(suggestedQty * 2) / 2); // múltiplos de 0.5
        } else {
            // g o ml: múltiplos de 5
            suggestedQty = Math.max(5, Math.round(suggestedQty / 5) * 5);
        }

        const deltaPct = d.qty > 0
            ? Math.round((suggestedQty / d.qty - 1) * 100)
            : 0;

        return {
            ...d.item,
            suggestedQty: String(suggestedQty),
            currentQty: d.item.quantity,
            deltaPct,
        };
    });
}

/**
 * Calcula macros de un food para una cantidad dada.
 */
function calcMacros(food, qty) {
    if (!food?.macros) return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const isWV = food.defaultUnit === 'g' || food.defaultUnit === 'ml';
    const serving = food.servingSize ?? (isWV ? 100 : 1);
    const ratio = qty / serving;
    return {
        calories: food.macros.calories * ratio,
        protein: food.macros.protein * ratio,
        carbs: food.macros.carbs * ratio,
        fat: food.macros.fat * ratio,
    };
}

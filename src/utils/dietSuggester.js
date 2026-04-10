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
 * Calcula la similaridad entre dos perfiles de macros per 100g (0 = opuesto, 1 = idéntico).
 *
 * Combina dos señales (50/50):
 *   1. Distancia euclidiana de valores absolutos per 100g (P, C, G),
 *      normalizada contra un rango máximo razonable (50P, 80C, 50G).
 *   2. Distancia euclidiana de ratios (qué porcentaje del total es cada macro),
 *      para penalizar alimentos del mismo rango pero perfil distinto.
 *
 * Un producto de categoría "protein" pondera más la diferencia en proteína,
 * etc. (vía el parámetro `category` opcional).
 *
 * @param {{ protein: number, carbs: number, fat: number, calories?: number }} a - macros per 100g
 * @param {{ protein: number, carbs: number, fat: number, calories?: number }} b - macros per 100g
 * @param {string} [category] - categoría del alimento original para ponderar
 * @returns {number} 0-1
 */
export function macroSimilarity(a, b, category) {
    const pa = a.protein || 0,
        ca = a.carbs || 0,
        fa = a.fat || 0;
    const pb = b.protein || 0,
        cb = b.carbs || 0,
        fb = b.fat || 0;
    const totalA = pa + ca + fa;
    const totalB = pb + cb + fb;
    if (totalA === 0 || totalB === 0) return 0;

    // Pesos por categoría: potencia la diferencia del macro dominante
    const w = { p: 1, c: 1, f: 1 };
    if (category === 'protein') w.p = 2;
    else if (category === 'carbs') w.c = 2;
    else if (category === 'fat') w.f = 2;

    // 1) Distancia absoluta per 100g (normalizada contra rangos máximos típicos)
    const maxP = 50,
        maxC = 80,
        maxF = 50;
    const absDist = Math.sqrt(
        w.p * ((pa - pb) / maxP) ** 2 + w.c * ((ca - cb) / maxC) ** 2 + w.f * ((fa - fb) / maxF) ** 2
    );
    const maxAbsDist = Math.sqrt(w.p + w.c + w.f); // worst case: all diffs = 1
    const absSim = Math.max(0, 1 - absDist / maxAbsDist);

    // 2) Distancia de ratios (perfil proporcional)
    const rA = { p: pa / totalA, c: ca / totalA, f: fa / totalA };
    const rB = { p: pb / totalB, c: cb / totalB, f: fb / totalB };
    const ratioDist = Math.sqrt(w.p * (rA.p - rB.p) ** 2 + w.c * (rA.c - rB.c) ** 2 + w.f * (rA.f - rB.f) ** 2);
    const maxRatioDist = (Math.sqrt(w.p + w.c + w.f) * Math.SQRT2) / 2;
    const ratioSim = Math.max(0, 1 - ratioDist / maxRatioDist);

    return absSim * 0.5 + ratioSim * 0.5;
}

/**
 * Para cada item de una comida que usa un alimento genérico (FOOD_DATABASE),
 * busca en los customFoods del usuario el producto más similar por macros.
 *
 * Solo sugiere sustituciones con similaridad >= threshold (default 0.80).
 * No sugiere para items que ya usan un customFood.
 *
 * Además calcula la cantidad ajustada del nuevo producto para que aporte
 * macros equivalentes al original (prioriza el macro dominante de la categoría).
 *
 * @param {Array} items - items de la comida [{foodId, name, category, quantity, unit}]
 * @param {Array} customFoods - productos del usuario [{id, name, category, macros, ...}]
 * @param {number} [threshold=0.80] - mínimo de similaridad para sugerir
 * @returns {Array} [{itemIndex, currentFoodId, currentName, suggestedFood, similarity, adjustedQty, originalMacros, suggestedMacros}]
 */
export function suggestSubstitutions(items, customFoods, threshold = 0.8) {
    if (!items?.length || !customFoods?.length) return [];

    const suggestions = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // No sugerir para items que ya son de Mi Nevera
        const isCustom = customFoods.some((cf) => cf.id === item.foodId);
        if (isCustom) continue;

        // Buscar el alimento genérico original
        const original = FOOD_DATABASE.find((f) => f.id === item.foodId);
        if (!original?.macros) continue;

        // Buscar candidatos en customFoods de la misma categoría (o similar)
        const candidates = customFoods.filter((cf) => cf.category === original.category && cf.macros);

        if (candidates.length === 0) continue;

        // Calcular similaridad de cada candidato (con categoría para ponderar)
        let bestMatch = null;
        let bestSim = 0;

        for (const candidate of candidates) {
            const sim = macroSimilarity(original.macros, candidate.macros, original.category);
            if (sim > bestSim) {
                bestSim = sim;
                bestMatch = candidate;
            }
        }

        if (bestMatch && bestSim >= threshold) {
            const qty = parseFloat(item.quantity) || 0;
            const origMacros = calcMacros(original, qty);
            const adjustedQty = calcAdjustedQty(original, bestMatch, qty, item.unit);
            const sugMacros = calcMacros(bestMatch, adjustedQty);

            suggestions.push({
                itemIndex: i,
                currentFoodId: item.foodId,
                currentName: item.name,
                suggestedFood: bestMatch,
                similarity: Math.round(bestSim * 100),
                adjustedQty: String(adjustedQty),
                originalMacros: roundMacros(origMacros),
                suggestedMacros: roundMacros(sugMacros),
            });
        }
    }

    return suggestions;
}

/**
 * Calcula la cantidad del nuevo producto que aporta macros equivalentes al original.
 * Prioriza el macro dominante de la categoría del alimento.
 */
function calcAdjustedQty(originalFood, newFood, originalQty, unit) {
    if (!originalFood?.macros || !newFood?.macros || originalQty <= 0) return originalQty;

    const origM = calcMacros(originalFood, originalQty);

    // Macro dominante según categoría
    const dominantMacro =
        originalFood.category === 'protein'
            ? 'protein'
            : originalFood.category === 'carbs'
              ? 'carbs'
              : originalFood.category === 'fat'
                ? 'fat'
                : 'calories';

    const targetValue = dominantMacro === 'calories' ? origM.calories : origM[dominantMacro];
    if (targetValue <= 0) return originalQty;

    // Macros per unidad del nuevo food
    const newServing = newFood.servingSize ?? (newFood.defaultUnit === 'g' || newFood.defaultUnit === 'ml' ? 100 : 1);
    const newPer1 =
        dominantMacro === 'calories'
            ? (newFood.macros.calories || 0) / newServing
            : (newFood.macros[dominantMacro] || 0) / newServing;

    if (newPer1 <= 0) return originalQty;

    let adjusted = targetValue / newPer1;

    // Redondeo según unidad
    const effectiveUnit = newFood.defaultUnit || unit;
    if (effectiveUnit === 'pz') {
        adjusted = Math.max(1, Math.round(adjusted));
    } else if (effectiveUnit === 'taza' || effectiveUnit === 'cda') {
        adjusted = Math.max(0.5, Math.round(adjusted * 2) / 2);
    } else {
        adjusted = Math.max(5, Math.round(adjusted / 5) * 5);
    }

    return adjusted;
}

function roundMacros(m) {
    return {
        calories: Math.round(m.calories),
        protein: Math.round(m.protein * 10) / 10,
        carbs: Math.round(m.carbs * 10) / 10,
        fat: Math.round(m.fat * 10) / 10,
    };
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
    const calorieRatio = currentTotal.calories > 0 ? remaining.calories / currentTotal.calories : 1;

    return itemData.map((d) => {
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

        const deltaPct = d.qty > 0 ? Math.round((suggestedQty / d.qty - 1) * 100) : 0;

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

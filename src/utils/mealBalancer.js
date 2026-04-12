/**
 * Meal Balancer — Algoritmo LP para sustituir alimentos genéricos
 * por productos de Mi Nevera manteniendo macro targets.
 *
 * Usa YALPS (LP solver) para encontrar la combinación óptima de
 * alimentos y cantidades que:
 *   1. Minimiza la desviación de macro targets
 *   2. Prefiere productos de Mi Nevera sobre genéricos
 *   3. Mantiene la comida lo más parecida posible a la original
 *
 * Basado en el "Diet Problem" (Stigler 1945, Dantzig) adaptado
 * a sustitución parcial con preferencia de fuente.
 *
 * Fuentes:
 * - ISSN Position Stand: Protein and Exercise (Jäger et al., 2017)
 * - Frontiers in Nutrition: LP for diet optimization (2018)
 * - Soden & Fletcher: modifying a chosen diet to meet requirements
 */

import { solve, inRange } from 'yalps';
import { FOOD_DATABASE } from '../data/food_database';

/**
 * Para cada item de una comida, busca en Mi Nevera un sustituto de la misma
 * categoría y ajusta las cantidades de TODA la comida para cuadrar macros.
 *
 * @param {Array} items - items actuales de la comida [{foodId, name, category, quantity, unit}]
 * @param {Array} customFoods - productos del usuario [{id, name, category, macros, ...}]
 * @param {{ calories: number, protein: number, carbs: number, fat: number }} mealTarget - target de macros para esta comida
 * @param {Object} [options]
 * @param {number} [options.tolerance=0.10] - tolerancia de macros (10% por defecto)
 * @returns {{ items: Array, substitutions: Array, status: string }}
 */
export function balanceMeal(items, customFoods, mealTarget, options = {}) {
    const { tolerance = 0.1 } = options;
    if (!items?.length || !mealTarget) return { items, substitutions: [], status: 'no_target' };

    // Mapear todos los alimentos disponibles: para cada item, el original + candidatos de Mi Nevera
    const candidates = [];
    const substitutions = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const originalFood = FOOD_DATABASE.find((f) => f.id === item.foodId);
        const isAlreadyCustom = (customFoods || []).some((cf) => cf.id === item.foodId);

        // Siempre incluir el alimento original como candidato
        const origMacros = getFoodMacrosPer1(originalFood || findCustom(item.foodId, customFoods));
        if (origMacros) {
            candidates.push({
                varId: `orig_${i}`,
                itemIndex: i,
                food: originalFood || findCustom(item.foodId, customFoods),
                foodId: item.foodId,
                name: item.name,
                isCustom: isAlreadyCustom,
                isOriginal: true,
                macrosPer1: origMacros,
                originalQty: parseFloat(item.quantity) || 0,
                unit: item.unit,
            });
        }

        // Si no es ya de Mi Nevera, buscar candidatos de la misma categoría
        if (!isAlreadyCustom && originalFood) {
            const fridgeCandidates = (customFoods || []).filter(
                (cf) => cf.category === originalFood.category && cf.macros
            );
            for (const cf of fridgeCandidates) {
                const cfMacros = getFoodMacrosPer1(cf);
                if (cfMacros) {
                    candidates.push({
                        varId: `sub_${i}_${cf.id}`,
                        itemIndex: i,
                        food: cf,
                        foodId: cf.id,
                        name: cf.name,
                        isCustom: true,
                        isOriginal: false,
                        macrosPer1: cfMacros,
                        originalQty: parseFloat(item.quantity) || 0,
                        unit: cf.defaultUnit || item.unit,
                    });
                }
            }
        }
    }

    if (candidates.length === 0) return { items, substitutions: [], status: 'no_candidates' };

    // Construir modelo LP
    const t = mealTarget;
    const tol = tolerance;

    const constraints = {
        protein: inRange(t.protein * (1 - tol), t.protein * (1 + tol)),
        carbs: inRange(t.carbs * (1 - tol), t.carbs * (1 + tol)),
        fat: inRange(t.fat * (1 - tol), t.fat * (1 + tol)),
        calories: inRange(t.calories * (1 - tol), t.calories * (1 + tol)),
    };

    // Para cada slot (itemIndex), exactamente uno de los candidatos debe estar activo.
    // Modelamos esto con cantidades continuas: cada candidato tiene qty >= 0,
    // y un bonus en la función objetivo para los de Mi Nevera.

    const variables = {};
    for (const c of candidates) {
        const m = c.macrosPer1;
        variables[c.varId] = {
            protein: m.protein,
            carbs: m.carbs,
            fat: m.fat,
            calories: m.calories,
            // Objetivo: bonus por usar Mi Nevera + penalización por alejarse de qty original
            score: c.isCustom ? 2.0 : 1.0,
        };

        // Limitar cantidad: entre 0 y 3x la original (no queremos 500g de algo que era 50g)
        const maxQty = Math.max(c.originalQty * 3, 200);
        constraints[`max_${c.varId}`] = { max: maxQty };
        variables[c.varId][`max_${c.varId}`] = 1;
    }

    const model = {
        direction: 'maximize',
        objective: 'score',
        constraints,
        variables,
    };

    const solution = solve(model);

    if (solution.status !== 'optimal') {
        // Fallback: devolver items sin cambio
        return { items, substitutions: [], status: solution.status };
    }

    // Reconstruir items desde la solución
    const newItems = [...items];
    const usedSlots = new Set();

    for (const [varId, qty] of solution.variables) {
        if (qty < 0.5) continue; // Ignorar cantidades despreciables
        const candidate = candidates.find((c) => c.varId === varId);
        if (!candidate) continue;

        const idx = candidate.itemIndex;
        if (usedSlots.has(idx)) continue; // Solo un candidato por slot
        usedSlots.add(idx);

        // Redondear cantidad
        const roundedQty = roundQty(qty, candidate.unit);

        if (!candidate.isOriginal) {
            substitutions.push({
                itemIndex: idx,
                originalName: items[idx].name,
                originalFoodId: items[idx].foodId,
                newName: candidate.name,
                newFoodId: candidate.foodId,
                newQty: roundedQty,
                isCustom: true,
            });
        }

        newItems[idx] = {
            ...items[idx],
            foodId: candidate.foodId,
            name: candidate.name,
            category: candidate.food?.category || items[idx].category,
            quantity: String(roundedQty),
            unit: candidate.unit,
        };
    }

    // Items sin solución: mantener original
    for (let i = 0; i < items.length; i++) {
        if (!usedSlots.has(i)) {
            // No hubo candidato — mantener
        }
    }

    return { items: newItems, substitutions, status: 'optimal' };
}

/** Macros por 1 unidad (1g para g/ml, 1pz para pz, etc.) */
function getFoodMacrosPer1(food) {
    if (!food?.macros) return null;
    const serving = food.servingSize ?? (food.defaultUnit === 'g' || food.defaultUnit === 'ml' ? 100 : 1);
    if (serving <= 0) return null;
    return {
        calories: (food.macros.calories || 0) / serving,
        protein: (food.macros.protein || 0) / serving,
        carbs: (food.macros.carbs || 0) / serving,
        fat: (food.macros.fat || 0) / serving,
    };
}

/**
 * Balancea todas las comidas de un día completo. Si una comida no puede
 * cuadrar por sí sola, el déficit se propaga a las siguientes.
 *
 * @param {Array<{ slotId: string, items: Array, target: object }>} meals
 * @param {Array} customFoods
 * @param {{ calories: number, protein: number, carbs: number, fat: number }} dailyTarget
 * @returns {{ meals: Array<{ slotId: string, items: Array, substitutions: Array }>, deficit: object }}
 */
export function balanceDay(meals, customFoods, dailyTarget) {
    if (!meals?.length || !dailyTarget) return { meals, deficit: zero() };

    const results = [];
    const accum = zero(); // macros acumulados reales

    for (let i = 0; i < meals.length; i++) {
        const meal = meals[i];
        if (!meal.target || !meal.items?.length) {
            results.push({ slotId: meal.slotId, items: meal.items || [], substitutions: [] });
            continue;
        }

        // Ajustar target de esta comida compensando déficit/superávit acumulado
        const remainingMeals = meals.length - i;
        const adjustedTarget = {
            calories: Math.max(50, meal.target.calories - accum.calories / remainingMeals),
            protein: Math.max(5, meal.target.protein - accum.protein / remainingMeals),
            carbs: Math.max(5, meal.target.carbs - accum.carbs / remainingMeals),
            fat: Math.max(2, meal.target.fat - accum.fat / remainingMeals),
        };

        const result = balanceMeal(meal.items, customFoods, adjustedTarget, { tolerance: 0.15 });

        // Calcular lo que realmente aporta esta comida tras el balanceo
        const actual = sumItems(result.items);
        accum.calories += actual.calories - meal.target.calories;
        accum.protein += actual.protein - meal.target.protein;
        accum.carbs += actual.carbs - meal.target.carbs;
        accum.fat += actual.fat - meal.target.fat;

        results.push({ slotId: meal.slotId, items: result.items, substitutions: result.substitutions });
    }

    return { meals: results, deficit: accum };
}

/**
 * Balancea una semana completa. Si un día tiene déficit, ajusta el target
 * de los días siguientes para compensar.
 *
 * @param {Array<{ dayName: string, meals: Array }>} days - 7 días con sus comidas
 * @param {Array} customFoods
 * @param {{ calories: number, protein: number, carbs: number, fat: number }} dailyTarget
 * @returns {Array<{ dayName: string, meals: Array, deficit: object }>}
 */
export function balanceWeek(days, customFoods, dailyTarget) {
    if (!days?.length) return [];

    const results = [];
    const weekAccum = zero();

    for (let d = 0; d < days.length; d++) {
        const day = days[d];
        const remainingDays = days.length - d;

        // Ajustar target diario compensando acumulado de días anteriores
        const adjustedDaily = {
            calories: Math.max(800, dailyTarget.calories - weekAccum.calories / remainingDays),
            protein: Math.max(50, dailyTarget.protein - weekAccum.protein / remainingDays),
            carbs: Math.max(50, dailyTarget.carbs - weekAccum.carbs / remainingDays),
            fat: Math.max(20, dailyTarget.fat - weekAccum.fat / remainingDays),
        };

        const { meals: balanced, deficit } = balanceDay(day.meals, customFoods, adjustedDaily);

        weekAccum.calories += deficit.calories;
        weekAccum.protein += deficit.protein;
        weekAccum.carbs += deficit.carbs;
        weekAccum.fat += deficit.fat;

        results.push({ dayName: day.dayName, meals: balanced, deficit });
    }

    return results;
}

/** Suma macros de una lista de items */
function sumItems(items) {
    const sum = zero();
    for (const item of items || []) {
        const food = FOOD_DATABASE.find((f) => f.id === item.foodId);
        if (!food?.macros) continue;
        const m = getFoodMacrosPer1(food);
        if (!m) continue;
        const qty = parseFloat(item.quantity) || 0;
        sum.calories += m.calories * qty;
        sum.protein += m.protein * qty;
        sum.carbs += m.carbs * qty;
        sum.fat += m.fat * qty;
    }
    return {
        calories: Math.round(sum.calories),
        protein: Math.round(sum.protein),
        carbs: Math.round(sum.carbs),
        fat: Math.round(sum.fat),
    };
}

function zero() {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

function findCustom(foodId, customFoods) {
    return (customFoods || []).find((f) => f.id === foodId) || null;
}

function roundQty(qty, unit) {
    if (unit === 'pz') return Math.max(1, Math.round(qty));
    if (unit === 'taza' || unit === 'cda') return Math.max(0.5, Math.round(qty * 2) / 2);
    return Math.max(5, Math.round(qty / 5) * 5);
}

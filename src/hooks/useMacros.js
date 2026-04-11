import { useMemo, useCallback } from 'react';
import { FOOD_DATABASE } from '../data/food_database';
import { PLAN_DATA } from '../data/plan';
import { usePlan } from './usePlan';

/**
 * Lookup unificado: busca un food por id primero en FOOD_DATABASE (alimentos
 * predefinidos) y después en el mapa de customFoods del usuario. Devuelve
 * `null` si no existe en ninguna fuente (caso "orphan": item de comida
 * apuntando a un producto borrado).
 *
 * @param {string} foodId
 * @param {Record<string, import('../data/food_database.js').Food>} customFoodsMap
 * @returns {import('../data/food_database.js').Food | null}
 */
export function findFood(foodId, customFoodsMap = {}) {
    if (!foodId) return null;
    const predefined = FOOD_DATABASE.find((f) => f.id === foodId);
    if (predefined) return predefined;
    return customFoodsMap[foodId] || null;
}

/**
 * HELPER FUNCTIONS (Hoisted / Defined before use)
 */

export function calculateAge(birthday) {
    if (!birthday) return null;
    const b = new Date(birthday);
    if (isNaN(b)) return null;
    const today = new Date();
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
    return age;
}

// 1. Feature: BMR & TDEE
function calculateBMR(weight, height, age, gender = 'male') {
    return 10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161);
}

function calculateTDEE(bmr, activityLevel) {
    const multipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    };
    return Math.round(bmr * (multipliers[activityLevel] || 1.375));
}

/**
 * Targets de macros por fase — basados en ISSN Position Stands,
 * Helms et al. (2014), Aragon et al. (2017).
 *
 * Cada goal define: ajuste calórico vs TDEE, y g/kg para P/C/G.
 * La grasa se calcula como "resto" si no se especifica explícitamente.
 */
const PHASE_TARGETS = {
    bulk: { calAdj: 0.15, protPerKg: 2.0, carbPerKg: 5.0, fatPerKg: 1.0 },
    cut: { calAdj: -0.2, protPerKg: 2.5, carbPerKg: 3.0, fatPerKg: 0.7 },
    recomp: { calAdj: -0.05, protPerKg: 2.2, carbPerKg: 4.0, fatPerKg: 0.9 },
    maintain: { calAdj: 0, protPerKg: 1.8, carbPerKg: 4.0, fatPerKg: 1.0 },
};

/** Exportado para que otros módulos (LP solver, nutrientTiming) puedan leerlo */
export { PHASE_TARGETS };

function getGoalCalories(tdee, goal) {
    const phase = PHASE_TARGETS[goal] || PHASE_TARGETS.maintain;
    return Math.round(tdee * (1 + phase.calAdj));
}

function getTargetMacros(calories, weight, isTrainingDay, goal) {
    const phase = PHASE_TARGETS[goal] || PHASE_TARGETS.maintain;

    // Proteína y grasa fijas por kg
    const proteinGrams = Math.round(weight * phase.protPerKg);
    const fatGrams = Math.round(weight * phase.fatPerKg);

    // Carbos: lo que queda de calorías, ajustado por día de entreno
    const proteinCals = proteinGrams * 4;
    const fatCals = fatGrams * 9;
    const remainingCals = calories - proteinCals - fatCals;
    let carbGrams = Math.max(0, Math.round(remainingCals / 4));

    // Días de descanso: reducir carbos un 20%, compensar con grasa
    if (!isTrainingDay) {
        carbGrams = Math.round(carbGrams * 0.8);
    }

    return {
        calories: isTrainingDay ? calories : Math.round(proteinCals + fatCals + carbGrams * 4),
        protein: proteinGrams,
        fat: fatGrams,
        carbs: carbGrams,
    };
}

// 2. Feature: Item Macros
//
// Helper puro: busca el food (predefinido o custom) y calcula los macros
// del item según `quantity`. Soporta servingSize variable: para 'g'/'ml'
// el ratio es qty/servingSize (default 100). Para otras unidades el ratio
// es qty/servingSize (default 1) — ej. cereales con servingSize=30 g.
//
// Devuelve adicionalmente `orphan: true` si el foodId no existe en ninguna
// fuente, para que la UI pueda avisar al usuario sin reventar el cálculo.
function calculateItemMacrosPure(item, customFoodsMap = {}) {
    const food = findFood(item.foodId, customFoodsMap);
    if (!food || !food.macros) {
        return { protein: 0, carbs: 0, fat: 0, calories: 0, orphan: true };
    }

    const qty = parseFloat(item.quantity) || 0;
    const isWeightVolume = food.defaultUnit === 'g' || food.defaultUnit === 'ml';
    const servingSize = food.servingSize ?? (isWeightVolume ? 100 : 1);
    const ratio = qty / servingSize;

    return {
        protein: Math.round(food.macros.protein * ratio),
        carbs: Math.round(food.macros.carbs * ratio),
        fat: Math.round(food.macros.fat * ratio),
        calories: Math.round(food.macros.calories * ratio),
    };
}

function sumMacrosPure(items, customFoodsMap = {}) {
    if (!items) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    return items.reduce(
        (acc, item) => {
            const m = calculateItemMacrosPure(item, customFoodsMap);
            return {
                protein: acc.protein + m.protein,
                carbs: acc.carbs + m.carbs,
                fat: acc.fat + m.fat,
                calories: acc.calories + m.calories,
            };
        },
        { protein: 0, carbs: 0, fat: 0, calories: 0 }
    );
}

/**
 * Hook to calculate macros for a list of items or the entire day.
 *
 * Las funciones expuestas (`calculateItemMacros`, `sumMacros`) son
 * conscientes del usuario actual: tienen lookup en FOOD_DATABASE +
 * los customFoods del usuario. Items que apunten a foods inexistentes
 * devuelven `orphan: true` para que la UI pueda marcarlos.
 */
export function useMacros(isTrainingDay = true) {
    const { plan, customFoods } = usePlan();

    // Mapa { foodId -> Food } memoizado a partir del array que viene del context.
    const customFoodsMap = useMemo(() => {
        const map = {};
        for (const f of customFoods || []) map[f.id] = f;
        return map;
    }, [customFoods]);

    // Versiones bound al mapa actual. Estables salvo que cambien los customFoods.
    const calculateItemMacros = useCallback((item) => calculateItemMacrosPure(item, customFoodsMap), [customFoodsMap]);
    const sumMacros = useCallback((items) => sumMacrosPure(items, customFoodsMap), [customFoodsMap]);

    // 1. Calculate TDEE & Targets (Moved inputs to useMemo for efficiency)

    // --- HOOK STATE ---
    // In a real app, these would come from user profile in PlanContext
    const stats = useMemo(() => {
        const user = plan.user || {};
        const weight =
            plan.weightLog && plan.weightLog.length > 0
                ? plan.weightLog[plan.weightLog.length - 1].weight
                : user.start_weight || 75;

        const derivedAge = calculateAge(user.birthday);

        return {
            weight: weight,
            height: user.height || 180,
            age: derivedAge ?? user.age ?? 30,
            gender: user.gender || 'male',
            activity: user.activity || 'moderate',
            goal: user.goalType || 'recomp',
        };
    }, [plan.weightLog, plan.user]);

    // Calculate BMR & TDEE
    const bmr = calculateBMR(stats.weight, stats.height, stats.age, stats.gender);
    const tdee = calculateTDEE(bmr, stats.activity);

    // Adjust calories based on Training Day (Cycling)
    const dailyCalories = isTrainingDay
        ? getGoalCalories(tdee, stats.goal) + 200 // Training Boost
        : getGoalCalories(tdee, stats.goal) - 200; // Rest Deficit

    const targets = getTargetMacros(dailyCalories, stats.weight, isTrainingDay, stats.goal);

    // Calculate Consumed — usa datos reales del diary si existen
    const todayKey = new Date().toISOString().split('T')[0];
    const todayLog = plan.dailyLog?.[todayKey];

    const dailyConsumed = useMemo(() => {
        return plan.schedule.default
            .filter((slot) => slot.type === 'meal')
            .reduce(
                (acc, slot) => {
                    // Si hay log de comida real, usar esos items
                    const log = todayLog?.[slot.id];
                    let items;
                    if (log?.status === 'modified' && log.items) {
                        items = log.items;
                    } else {
                        const meal = plan.meals[slot.id];
                        if (!meal) return acc;
                        const activeIndex = meal.selectedOptionIndex || 0;
                        const option = meal.options?.[activeIndex];
                        items = option?.items;
                    }

                    if (items) {
                        const mealMacros = sumMacrosPure(items, customFoodsMap);
                        return {
                            calories: acc.calories + mealMacros.calories,
                            protein: acc.protein + mealMacros.protein,
                            carbs: acc.carbs + mealMacros.carbs,
                            fat: acc.fat + mealMacros.fat,
                        };
                    }
                    return acc;
                },
                { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );
    }, [plan.schedule, plan.meals, todayLog, customFoodsMap]);

    return {
        targets,
        calculateItemMacros,
        sumMacros,
        dailyConsumed,
    };
}

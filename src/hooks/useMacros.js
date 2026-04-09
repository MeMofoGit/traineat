import { useMemo } from 'react';
import { FOOD_DATABASE } from '../data/food_database';
import { PLAN_DATA } from '../data/plan';
import { usePlan } from './usePlan';

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
    return (10 * weight) + (6.25 * height) - (5 * age) + (gender === 'male' ? 5 : -161);
}

function calculateTDEE(bmr, activityLevel) {
    const multipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9
    };
    return Math.round(bmr * (multipliers[activityLevel] || 1.375));
}

function getGoalCalories(tdee, goal) {
    switch (goal) {
        case 'cut': return tdee - 500;
        case 'bulk': return tdee + 300;
        case 'recomp': return tdee - 200;
        default: return tdee;
    }
}

function getTargetMacros(calories, weight, isTrainingDay) {
    const proteinGrams = Math.round(weight * 2.2);
    const fatGrams = Math.round(weight * (isTrainingDay ? 0.8 : 1.0));
    const proteinCals = proteinGrams * 4;
    const fatCals = fatGrams * 9;
    const remainingCals = calories - proteinCals - fatCals;
    const carbGrams = Math.max(0, Math.round(remainingCals / 4));

    return {
        calories,
        protein: proteinGrams,
        fat: fatGrams,
        carbs: carbGrams
    };
}

// 2. Feature: Item Macros
function calculateItemMacros(item) {
    const food = FOOD_DATABASE.find(f => f.id === item.foodId);
    if (!food || !food.macros) return { protein: 0, carbs: 0, fat: 0, calories: 0 };

    const qty = parseFloat(item.quantity) || 0;
    let ratio = 0;
    if (food.defaultUnit === 'g' || food.defaultUnit === 'ml') {
        ratio = qty / 100;
    } else {
        ratio = qty; // assumed pieces
    }

    return {
        protein: Math.round(food.macros.protein * ratio),
        carbs: Math.round(food.macros.carbs * ratio),
        fat: Math.round(food.macros.fat * ratio),
        calories: Math.round(food.macros.calories * ratio)
    };
}

function sumMacros(items) {
    if (!items) return { protein: 0, carbs: 0, fat: 0, calories: 0 };
    return items.reduce((acc, item) => {
        const m = calculateItemMacros(item);
        return {
            protein: acc.protein + m.protein,
            carbs: acc.carbs + m.carbs,
            fat: acc.fat + m.fat,
            calories: acc.calories + m.calories
        };
    }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
}

/**
 * Hook to calculate macros for a list of items or the entire day.
 */
export function useMacros(isTrainingDay = true) {
    const { plan } = usePlan();

    // 1. Calculate TDEE & Targets (Moved inputs to useMemo for efficiency)

    // --- HOOK STATE ---
    // In a real app, these would come from user profile in PlanContext
    const user = plan.user || {};
    const stats = useMemo(() => {
        const weight = (plan.weightLog && plan.weightLog.length > 0)
            ? plan.weightLog[plan.weightLog.length - 1].weight
            : user.start_weight || 75;

        const derivedAge = calculateAge(user.birthday);

        return {
            weight: weight,
            height: user.height || 180,
            age: derivedAge ?? user.age ?? 30,
            gender: user.gender || 'male',
            activity: user.activity || 'moderate',
            goal: user.goalType || 'recomp'
        };
    }, [plan.weightLog, user]);

    // Calculate BMR & TDEE
    const bmr = calculateBMR(stats.weight, stats.height, stats.age, stats.gender);
    const tdee = calculateTDEE(bmr, stats.activity);

    // Adjust calories based on Training Day (Cycling)
    const dailyCalories = isTrainingDay
        ? getGoalCalories(tdee, stats.goal) + 200 // Training Boost
        : getGoalCalories(tdee, stats.goal) - 200; // Rest Deficit

    const targets = getTargetMacros(dailyCalories, stats.weight, isTrainingDay);

    // Calculate Consumed
    const dailyConsumed = useMemo(() => {
        return plan.schedule.default
            .filter(slot => slot.type === 'meal')
            .reduce((acc, slot) => {
                const meal = plan.meals[slot.id];
                if (!meal) return acc;

                // Get selected option
                const activeIndex = meal.selectedOptionIndex || 0;
                const option = meal.options?.[activeIndex];

                if (option && option.items) {
                    const mealMacros = sumMacros(option.items);
                    return {
                        calories: acc.calories + mealMacros.calories,
                        protein: acc.protein + mealMacros.protein,
                        carbs: acc.carbs + mealMacros.carbs,
                        fat: acc.fat + mealMacros.fat
                    };
                }
                return acc;
            }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [plan.schedule, plan.meals, sumMacros]);


    return {
        targets,
        calculateItemMacros,
        sumMacros,
        dailyConsumed
    };
}



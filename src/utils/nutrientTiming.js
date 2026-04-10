/**
 * Nutrient Timing — asigna un rol nutricional a cada comida del schedule
 * según la hora del entreno y el goalType (bulk/cut/recomp/maintain).
 *
 * Roles:
 *   - pre:    comida inmediatamente anterior al entreno
 *   - post:   comida inmediatamente posterior al entreno
 *   - normal: resto de comidas
 *
 * Cada rol tiene una distribución de macros sugerida (% de carbos, proteínas, grasas)
 * que varía según goalType. Esto permite al usuario ver cómo debería repartir
 * sus macros diarias entre comidas para optimizar rendimiento/recuperación.
 */

/**
 * Reglas de distribución de carbos por goalType y rol.
 * Los valores son multiplicadores relativos (se normalizan al total de comidas).
 * Ejemplo: si pre=1.5 y post=2.0, esas comidas reciben 1.5x y 2x más carbos
 * que una comida "normal" (1.0).
 */
const CARB_RULES = {
    bulk: { pre: 1.5, post: 2.0, normal: 1.0 },
    cut: { pre: 0.3, post: 1.8, normal: 0.2 },
    recomp: { pre: 1.0, post: 1.5, normal: 0.7 },
    maintain: { pre: 1.0, post: 1.0, normal: 1.0 },
};

/**
 * Labels y colores por rol, para UI.
 */
export const TIMING_ROLES = {
    pre: { label: 'Pre-Entreno', short: 'PRE', color: 'amber' },
    post: { label: 'Post-Entreno', short: 'POST', color: 'emerald' },
    normal: { label: '', short: '', color: '' },
};

/**
 * Dada una lista de slots del schedule y la hora de entreno, asigna un rol
 * a cada comida.
 *
 * @param {Array} schedule - plan.schedule.default [{time, type, id, label}]
 * @param {string} trainingTime - hora del entreno "HH:MM" (ej: "13:00")
 * @returns {Object} { [mealId]: 'pre' | 'post' | 'normal' }
 */
export function assignMealRoles(schedule, trainingTime) {
    if (!schedule?.length || !trainingTime) return {};

    const meals = schedule.filter((s) => s.type === 'meal').sort((a, b) => a.time.localeCompare(b.time));
    if (meals.length === 0) return {};

    const roles = {};

    // Encontrar la comida justo antes y justo después del entreno
    let preIndex = -1;
    let postIndex = -1;

    for (let i = 0; i < meals.length; i++) {
        if (meals[i].time <= trainingTime) {
            preIndex = i;
        }
    }
    for (let i = 0; i < meals.length; i++) {
        if (meals[i].time > trainingTime) {
            postIndex = i;
            break;
        }
    }

    for (let i = 0; i < meals.length; i++) {
        const id = meals[i].id;
        if (i === preIndex) roles[id] = 'pre';
        else if (i === postIndex) roles[id] = 'post';
        else roles[id] = 'normal';
    }

    return roles;
}

/**
 * Calcula targets de macros POR COMIDA, distribuyendo el total diario
 * según el rol y goalType.
 *
 * La proteína se reparte equitativamente. Los carbos se ponderan por rol.
 * La grasa cubre el resto de calorías.
 *
 * @param {{ calories: number, protein: number, carbs: number, fat: number }} dailyTargets
 * @param {Object} mealRoles - { [mealId]: 'pre' | 'post' | 'normal' }
 * @param {string} goalType - 'bulk' | 'cut' | 'recomp' | 'maintain'
 * @returns {Object} { [mealId]: { calories, protein, carbs, fat } }
 */
export function distributeMacros(dailyTargets, mealRoles, goalType) {
    if (!dailyTargets || !mealRoles) return {};

    const mealIds = Object.keys(mealRoles);
    const n = mealIds.length;
    if (n === 0) return {};

    const rules = CARB_RULES[goalType] || CARB_RULES.maintain;

    // Calcular peso total de carbos para normalizar
    const totalCarbWeight = mealIds.reduce((sum, id) => sum + (rules[mealRoles[id]] || 1), 0);

    const result = {};

    for (const id of mealIds) {
        const role = mealRoles[id];
        const carbWeight = rules[role] || 1;

        // Proteína: equitativa
        const protein = Math.round(dailyTargets.protein / n);

        // Carbos: proporcional al peso del rol
        const carbs = Math.round(dailyTargets.carbs * (carbWeight / totalCarbWeight));

        // Grasa: equitativa (la grasa no se timing-optimiza tanto)
        const fat = Math.round(dailyTargets.fat / n);

        // Calorías derivadas
        const calories = Math.round(protein * 4 + carbs * 4 + fat * 9);

        result[id] = { calories, protein, carbs, fat };
    }

    return result;
}

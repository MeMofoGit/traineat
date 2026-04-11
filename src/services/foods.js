/**
 * Servicio de custom foods.
 *
 * REGLA: este es el ÚNICO fichero del proyecto autorizado a importar de
 * `firebase/firestore` para gestionar custom foods. Componentes y hooks
 * NUNCA deben importar Firestore directo para foods — siempre vía las
 * funciones de este módulo. Razón: aislar el SDK del resto del código
 * para que migrar a otro backend en el futuro cambie 1 fichero, no 30.
 *
 * Persistencia: subcolección `users/{uid}/customFoods/{foodId}` en Firestore.
 * Cada producto = 1 documento independiente para escalabilidad y queries.
 *
 * Shape de Food: definido en `src/data/food_database.js` (JSDoc).
 */

import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    serverTimestamp,
    query,
    orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';

const VALID_CATEGORIES = new Set(['protein', 'carbs', 'fat', 'veggies', 'fruit', 'liquid', 'other']);
const VALID_UNITS = new Set(['g', 'ml', 'pz', 'taza', 'cda']);

/**
 * Genera un id único tipo `user_<slug>_<rand>` para un custom food.
 * El slug viene del nombre, normalizado: minúsculas, espacios → _, sin acentos,
 * sin caracteres especiales, max 30 chars. El sufijo aleatorio evita colisiones
 * cuando dos productos tienen el mismo nombre (ej. "Pan" del usuario A y B).
 *
 * @param {string} name
 * @returns {string} foodId
 */
export function generateFoodId(name) {
    const slug =
        (name || 'food')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // strip diacritics
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 30) || 'food';
    const rand = Math.random().toString(36).slice(2, 8);
    return `user_${slug}_${rand}`;
}

/**
 * Valida el shape de un food antes de persistirlo. Lanza Error con mensaje
 * en español si algo está mal. Devuelve un objeto normalizado listo para guardar.
 *
 * Reglas:
 * - name obligatorio, 1-80 chars tras trim.
 * - category debe ser una de VALID_CATEGORIES.
 * - defaultUnit debe ser una de VALID_UNITS.
 * - servingSize > 0, default 100 para g/ml, default 1 para resto.
 * - macros: calories/protein/carbs/fat obligatorios y >= 0.
 * - macros opcionales (sugars/fiber/saturated/salt): si presentes, >= 0.
 * - barcode si presente: string de dígitos 8-14 chars (EAN-8/UPC/EAN-13).
 *
 * @param {Partial<import('../data/food_database.js').Food>} input
 * @returns {import('../data/food_database.js').Food}
 */
export function validateFood(input) {
    if (!input || typeof input !== 'object') {
        throw new Error('Producto inválido');
    }

    const name = String(input.name || '').trim();
    if (name.length < 1 || name.length > 80) {
        throw new Error('El nombre debe tener entre 1 y 80 caracteres');
    }

    if (!VALID_CATEGORIES.has(input.category)) {
        throw new Error('Categoría inválida');
    }

    if (!VALID_UNITS.has(input.defaultUnit)) {
        throw new Error('Unidad inválida');
    }

    const defaultServing = input.defaultUnit === 'g' || input.defaultUnit === 'ml' ? 100 : 1;
    const servingSize = input.servingSize != null ? Number(input.servingSize) : defaultServing;
    if (!Number.isFinite(servingSize) || servingSize <= 0) {
        throw new Error('servingSize debe ser un número positivo');
    }

    const m = input.macros || {};
    const required = ['calories', 'protein', 'carbs', 'fat'];
    const macros = {};
    for (const key of required) {
        const v = Number(m[key]);
        if (!Number.isFinite(v) || v < 0) {
            throw new Error(`Macro "${key}" debe ser un número >= 0`);
        }
        macros[key] = v;
    }
    for (const key of ['sugars', 'fiber', 'saturated', 'salt']) {
        if (m[key] != null && m[key] !== '') {
            const v = Number(m[key]);
            if (!Number.isFinite(v) || v < 0) {
                throw new Error(`Macro opcional "${key}" debe ser un número >= 0`);
            }
            macros[key] = v;
        }
    }

    let barcode;
    if (input.barcode != null && input.barcode !== '') {
        const b = String(input.barcode).trim();
        if (!/^\d{8,14}$/.test(b)) {
            throw new Error('Código de barras inválido');
        }
        barcode = b;
    }

    const food = {
        id: input.id || generateFoodId(name),
        name,
        category: input.category,
        defaultUnit: input.defaultUnit,
        servingSize,
        source: 'custom',
        macros,
        ...(barcode ? { barcode } : {}),
    };

    // Campos opcionales de OFF: pasar si vienen, no validar estrictamente
    if (input.brand) food.brand = String(input.brand).slice(0, 100);
    if (input.imageUrl) food.imageUrl = String(input.imageUrl);
    if (input.nutriscoreGrade) food.nutriscoreGrade = String(input.nutriscoreGrade).toLowerCase();
    if (input.novaGroup != null) food.novaGroup = Number(input.novaGroup) || undefined;

    return food;
}

// ----------------------------------------------------------------------------
// Firestore I/O
// ----------------------------------------------------------------------------

function customFoodsCol(uid) {
    if (!uid) throw new Error('uid requerido');
    return collection(db, 'users', uid, 'customFoods');
}

function customFoodDoc(uid, foodId) {
    if (!uid) throw new Error('uid requerido');
    if (!foodId) throw new Error('foodId requerido');
    return doc(db, 'users', uid, 'customFoods', foodId);
}

/**
 * Crea un custom food. Valida, genera id si no se pasa, persiste con timestamps.
 * @param {string} uid
 * @param {Partial<import('../data/food_database.js').Food>} input
 * @returns {Promise<import('../data/food_database.js').Food>} food persistido
 */
export async function createCustomFood(uid, input) {
    const food = validateFood(input);
    const ref = customFoodDoc(uid, food.id);
    await setDoc(ref, {
        ...food,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return food;
}

/**
 * Lee un custom food por id. Devuelve null si no existe.
 * @param {string} uid
 * @param {string} foodId
 * @returns {Promise<import('../data/food_database.js').Food | null>}
 */
export async function getCustomFood(uid, foodId) {
    const snap = await getDoc(customFoodDoc(uid, foodId));
    return snap.exists() ? snap.data() : null;
}

/**
 * Lista todos los custom foods de un usuario, ordenados por nombre asc.
 * @param {string} uid
 * @returns {Promise<import('../data/food_database.js').Food[]>}
 */
export async function listCustomFoods(uid) {
    const q = query(customFoodsCol(uid), orderBy('name'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
}

/**
 * Actualiza un custom food. Solo aplica los campos pasados (patch parcial).
 * Re-valida el resultado fusionado contra el shape antes de persistir.
 *
 * @param {string} uid
 * @param {string} foodId
 * @param {Partial<import('../data/food_database.js').Food>} patch
 * @returns {Promise<import('../data/food_database.js').Food>} food actualizado
 */
export async function updateCustomFood(uid, foodId, patch) {
    const current = await getCustomFood(uid, foodId);
    if (!current) throw new Error('Producto no encontrado');

    // Merge profundo solo a un nivel para macros
    const merged = {
        ...current,
        ...patch,
        id: foodId, // no permitir cambiar id
        macros: { ...(current.macros || {}), ...(patch.macros || {}) },
    };
    const validated = validateFood(merged);

    await updateDoc(customFoodDoc(uid, foodId), {
        ...validated,
        updatedAt: serverTimestamp(),
    });
    return validated;
}

/**
 * Borra un custom food. NO comprueba referencias en comidas — el cliente
 * debe avisar al usuario y manejar fallback de "orphan" en la lectura.
 *
 * @param {string} uid
 * @param {string} foodId
 */
export async function deleteCustomFood(uid, foodId) {
    await deleteDoc(customFoodDoc(uid, foodId));
}

/**
 * Suscripción en vivo a los custom foods de un usuario. Devuelve función
 * unsubscribe para cleanup.
 *
 * @param {string} uid
 * @param {(foods: import('../data/food_database.js').Food[]) => void} onChange
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeCustomFoods(uid, onChange, onError) {
    const q = query(customFoodsCol(uid), orderBy('name'));
    return onSnapshot(
        q,
        (snap) => onChange(snap.docs.map((d) => d.data())),
        (err) => {
            if (onError) onError(err);
            else console.error('subscribeCustomFoods error', err);
        }
    );
}

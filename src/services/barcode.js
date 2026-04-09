/**
 * Servicio de lookup por código de barras.
 *
 * Wrapper sobre la Cloud Function `lookupBarcode` (backend en
 * `functions/src/api/lookupBarcode.ts`). Añade una capa extra de
 * caché en memoria de sesión para evitar re-llamar a la Function
 * ante re-escaneos accidentales del mismo producto en un periodo corto.
 *
 * Cadena completa desde el punto de vista del usuario:
 *   1. Session cache (este fichero, en memoria, TTL 10min).
 *   2. Cloud Function lookupBarcode:
 *      2a. productCache/{barcode} en Firestore (cacheado de por vida).
 *      2b. API live OpenFoodFacts.
 *   3. Si miss total → error BARCODE_NOT_FOUND → UI cae a manual/OCR.
 *
 * REGLA: este es el ÚNICO sitio del cliente autorizado a llamar a
 * `httpsCallable` para barcode. Componentes y modales llaman a
 * `lookupBarcode()` de aquí.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const SESSION_CACHE = new Map(); // barcode -> { food, source, timestamp }
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

/**
 * Códigos de error estables compartidos con el servidor.
 * Usar `err.code === BarcodeErrors.NOT_FOUND` para discriminar.
 */
export const BarcodeErrors = {
    NOT_FOUND: 'BARCODE_NOT_FOUND',
    INVALID: 'BARCODE_INVALID',
    UNAVAILABLE: 'OFF_UNAVAILABLE',
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
    RATE_LIMITED: 'RATE_LIMITED',
};

/**
 * Busca un producto por barcode.
 *
 * @param {string} barcode - EAN-8/EAN-13/UPC-A (8-14 dígitos).
 * @returns {Promise<{ food: object, source: 'session_cache' | 'cache' | 'off_api' }>}
 * @throws {Error} con propiedad `code` en una de `BarcodeErrors`.
 */
export async function lookupBarcode(barcode) {
    const normalized = String(barcode || '').trim();
    if (!/^\d{8,14}$/.test(normalized)) {
        throw makeError(BarcodeErrors.INVALID, 'Formato de código inválido');
    }

    // --- 1. Session cache ---
    const cached = SESSION_CACHE.get(normalized);
    if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL_MS) {
        return { food: cached.food, source: 'session_cache' };
    }

    // --- 2. Cloud Function ---
    const callable = httpsCallable(functions, 'lookupBarcode');
    try {
        const result = await callable({ barcode: normalized });
        const data = result.data;
        if (!data?.food) {
            throw makeError(BarcodeErrors.NOT_FOUND, 'Producto no encontrado');
        }
        SESSION_CACHE.set(normalized, { food: data.food, timestamp: Date.now() });
        return { food: data.food, source: data.source };
    } catch (err) {
        // Los Callable de Firebase envuelven errores: err.code = 'functions/...',
        // err.details es el payload que devolvimos en el servidor.
        const serverCode = err?.details?.code;

        if (serverCode === BarcodeErrors.NOT_FOUND) {
            throw makeError(
                BarcodeErrors.NOT_FOUND,
                'No encontramos este producto. Puedes añadirlo a mano o sacar una foto de la etiqueta.'
            );
        }
        if (serverCode === BarcodeErrors.INVALID) {
            throw makeError(BarcodeErrors.INVALID, 'Formato de código inválido');
        }
        if (serverCode === BarcodeErrors.UNAVAILABLE) {
            throw makeError(
                BarcodeErrors.UNAVAILABLE,
                'Servicio temporalmente no disponible. Prueba de nuevo en unos minutos.'
            );
        }
        if (err?.code === 'functions/unauthenticated') {
            throw makeError(BarcodeErrors.NOT_AUTHENTICATED, 'Sesión no iniciada');
        }

        // Fallback para errores de red u otros
        throw makeError(
            BarcodeErrors.UNAVAILABLE,
            err?.message || 'Error al consultar el servicio'
        );
    }
}

function makeError(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
}

/**
 * Limpia el caché de sesión. Útil si el usuario cierra sesión o
 * si queremos forzar refresh.
 */
export function clearBarcodeSessionCache() {
    SESSION_CACHE.clear();
}

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

const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 800;

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Busca un producto por barcode con retry automático en errores transitorios.
 *
 * Reintentos: solo para `OFF_UNAVAILABLE` (fallo de red o API OFF caído).
 * Backoff lineal 800ms * intento. NO reintenta `NOT_FOUND` (no tiene sentido,
 * el producto simplemente no existe) ni `INVALID` (mismo input fallaría).
 *
 * @param {string} barcode - EAN-8/EAN-13/UPC-A (8-14 dígitos).
 * @param {{ maxRetries?: number }} [options]
 * @returns {Promise<{ food: object, source: 'session_cache' | 'cache' | 'off_api' }>}
 * @throws {Error} con propiedad `code` en una de `BarcodeErrors`.
 */
export async function lookupBarcode(barcode, options = {}) {
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    const normalized = String(barcode || '').trim();
    if (!/^\d{8,14}$/.test(normalized)) {
        throw makeError(BarcodeErrors.INVALID, 'Formato de código inválido');
    }

    // --- Session cache (no cuenta como "intento") ---
    const cached = SESSION_CACHE.get(normalized);
    if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL_MS) {
        return { food: cached.food, source: 'session_cache' };
    }

    // --- Cloud Function con retry para UNAVAILABLE ---
    let lastUnavailableErr = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const callable = httpsCallable(functions, 'lookupBarcode');
            const result = await callable({ barcode: normalized });
            const data = result.data;
            if (!data?.food) {
                throw makeError(BarcodeErrors.NOT_FOUND, 'Producto no encontrado');
            }
            SESSION_CACHE.set(normalized, { food: data.food, timestamp: Date.now() });
            return { food: data.food, source: data.source };
        } catch (err) {
            const serverCode = err?.details?.code;

            // Errores terminales: no reintentar
            if (serverCode === BarcodeErrors.NOT_FOUND) {
                throw makeError(
                    BarcodeErrors.NOT_FOUND,
                    'No encontramos este producto. Puedes añadirlo a mano o sacar una foto de la etiqueta.'
                );
            }
            if (serverCode === BarcodeErrors.INVALID) {
                throw makeError(BarcodeErrors.INVALID, 'Formato de código inválido');
            }
            if (err?.code === 'functions/unauthenticated') {
                throw makeError(BarcodeErrors.NOT_AUTHENTICATED, 'Sesión no iniciada');
            }

            // Errores transitorios: reintentar con backoff
            const isUnavailable =
                serverCode === BarcodeErrors.UNAVAILABLE ||
                err?.code === 'functions/unavailable' ||
                err?.code === 'functions/deadline-exceeded' ||
                err?.code === 'functions/internal';

            if (isUnavailable) {
                lastUnavailableErr = err;
                if (attempt < maxRetries) {
                    await sleep(RETRY_BASE_DELAY_MS * (attempt + 1));
                    continue;
                }
                throw makeError(
                    BarcodeErrors.UNAVAILABLE,
                    'Servicio temporalmente no disponible. Prueba de nuevo en unos minutos.'
                );
            }

            // Cualquier otro error inesperado: propagar como UNAVAILABLE para que
            // la UI siempre tenga un code conocido.
            throw makeError(
                BarcodeErrors.UNAVAILABLE,
                err?.message || 'Error al consultar el servicio'
            );
        }
    }

    // Teóricamente inalcanzable (el loop siempre lanza o retorna)
    throw makeError(
        BarcodeErrors.UNAVAILABLE,
        lastUnavailableErr?.message || 'Error al consultar el servicio'
    );
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

/**
 * Servicio cliente de OCR de etiquetas nutricionales.
 *
 * Wrapper sobre la Cloud Function `ocrLabel` (Fase 3). Normaliza errores
 * con códigos estables y maneja el preprocesado de la imagen (resize,
 * compress a JPEG, conversión a base64) antes de enviarla al servidor.
 *
 * Flujo completo desde la UI:
 *   1. Usuario pulsa "Foto" → abrir picker/cámara con <input type=file>.
 *   2. File → preprocessImage(file): EXIF rotate, resize a 1200px max, JPEG 0.85.
 *   3. ocrLabelFromBase64(base64, mimeType, barcode?) → Function → Claude Haiku.
 *   4. Respuesta: { food, confidence, notes } con el food mapeado listo para revisar.
 *
 * El preprocesado cliente es IMPORTANTE para el coste:
 *   - Sin preprocesado, una foto JPEG de móvil pesa 3-5 MB.
 *   - Con preprocesado, ~150-500 KB.
 *   - Menor latencia upload + menor payload para Claude = menos tokens + menos coste.
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const MAX_DIMENSION = 1200;     // lado mayor máximo en px tras resize
const JPEG_QUALITY = 0.85;      // calidad JPEG del resize

export const OcrErrors = {
    NOT_A_LABEL: 'OCR_NOT_A_LABEL',
    INCOMPLETE: 'OCR_INCOMPLETE',
    API_ERROR: 'OCR_API_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
    IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
    IMAGE_INVALID: 'IMAGE_INVALID',
    NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
};

/**
 * Preprocesa un File de imagen: auto-rotación según EXIF, resize a máx
 * MAX_DIMENSION en el lado mayor, re-compresión a JPEG quality 0.85,
 * conversión a base64.
 *
 * Usa `createImageBitmap` con `imageOrientation: 'from-image'` para que
 * el navegador respete la orientación EXIF automáticamente. Soportado en
 * Chrome/Edge/Firefox modernos y Safari 16.4+. Si el browser no lo soporta,
 * la imagen puede aparecer rotada — el usuario puede verla en el preview
 * y rehacer la foto si hace falta.
 *
 * @param {File} file
 * @returns {Promise<{ base64: string, mimeType: 'image/jpeg', sizeBytes: number }>}
 */
export async function preprocessImage(file) {
    if (!file || !file.type?.startsWith('image/')) {
        throw makeError(OcrErrors.IMAGE_INVALID, 'El fichero no es una imagen');
    }

    let bitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
        // Fallback: createImageBitmap sin opciones (puede no respetar EXIF)
        bitmap = await createImageBitmap(file);
    }

    // Calcular dimensiones target manteniendo aspect ratio
    let { width, height } = bitmap;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width >= height) {
            height = Math.round((height / width) * MAX_DIMENSION);
            width = MAX_DIMENSION;
        } else {
            width = Math.round((width / height) * MAX_DIMENSION);
            height = MAX_DIMENSION;
        }
    }

    // Dibujar en canvas y exportar como JPEG
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw makeError(OcrErrors.IMAGE_INVALID, 'No se pudo inicializar el canvas');
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('toBlob devolvió null'))),
            'image/jpeg',
            JPEG_QUALITY
        );
    });

    const base64 = await blobToBase64(blob);

    // Liberar recursos
    try { bitmap.close?.(); } catch { /* ignore */ }

    return {
        base64,
        mimeType: 'image/jpeg',
        sizeBytes: blob.size,
    };
}

/**
 * Lee un producto de una foto de etiqueta vía Cloud Function ocrLabel.
 *
 * @param {string} base64         - imagen ya preprocesada en base64 (sin data URL prefix)
 * @param {string} mimeType       - image/jpeg | image/png | image/webp
 * @param {string} [hintBarcode]  - si se conoce (ej. tras un NOT_FOUND), se asocia al food
 * @returns {Promise<{ food: object, confidence: 'high'|'medium'|'low', notes: string | null }>}
 * @throws {Error} con `code` en OcrErrors.
 */
export async function ocrLabelFromBase64(base64, mimeType, hintBarcode) {
    const callable = httpsCallable(functions, 'ocrLabel');
    try {
        const result = await callable({
            imageBase64: base64,
            mimeType,
            ...(hintBarcode ? { hintBarcode } : {}),
        });
        const data = result.data;
        if (!data?.food) {
            throw makeError(OcrErrors.API_ERROR, 'Respuesta del servidor inválida');
        }
        return {
            food: data.food,
            confidence: data.confidence || 'medium',
            notes: data.notes || null,
        };
    } catch (err) {
        const serverCode = err?.details?.code;

        if (serverCode === OcrErrors.NOT_A_LABEL) {
            throw makeError(
                OcrErrors.NOT_A_LABEL,
                'No reconocemos esta imagen como una etiqueta nutricional. Asegúrate de que se vea la tabla de valores.'
            );
        }
        if (serverCode === OcrErrors.INCOMPLETE) {
            throw makeError(
                OcrErrors.INCOMPLETE,
                'No pudimos leer todos los valores. Prueba con mejor luz o más cerca.'
            );
        }
        if (serverCode === OcrErrors.RATE_LIMITED) {
            throw makeError(
                OcrErrors.RATE_LIMITED,
                err?.details?.message || 'Has alcanzado el límite de escaneos. Espera un momento e inténtalo de nuevo.'
            );
        }
        if (serverCode === OcrErrors.IMAGE_TOO_LARGE) {
            throw makeError(
                OcrErrors.IMAGE_TOO_LARGE,
                'La imagen es demasiado grande. Prueba de nuevo.'
            );
        }
        if (serverCode === OcrErrors.IMAGE_INVALID) {
            throw makeError(OcrErrors.IMAGE_INVALID, 'Imagen inválida');
        }
        if (err?.code === 'functions/unauthenticated') {
            throw makeError(OcrErrors.NOT_AUTHENTICATED, 'Sesión no iniciada');
        }

        throw makeError(
            OcrErrors.API_ERROR,
            err?.message || 'Servicio de OCR no disponible'
        );
    }
}

// ============================================================================
// Helpers
// ============================================================================

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            if (typeof dataUrl !== 'string') {
                reject(new Error('FileReader no devolvió string'));
                return;
            }
            const comma = dataUrl.indexOf(',');
            resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
        };
        reader.onerror = () => reject(reader.error || new Error('FileReader error'));
        reader.readAsDataURL(blob);
    });
}

function makeError(code, message) {
    const e = new Error(message);
    e.code = code;
    return e;
}

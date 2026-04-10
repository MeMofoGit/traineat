import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { defineSecret } from 'firebase-functions/params';
import { requireAuth } from '../lib/auth';
import {
  notFound,
  unavailable,
  invalidArgument,
  resourceExhausted,
  ErrorCodes,
} from '../lib/errors';
import { checkRateLimit } from '../lib/rateLimit';
import {
  extractNutritionFromImage,
  OcrFailedError,
} from '../services/anthropicOcr';
import { validateFoodServerSide, FoodValidationError } from '../lib/foodValidation';
import type { MappedFood } from '../services/openfoodfacts';

/**
 * OCR de una etiqueta nutricional vía Claude Haiku con visión.
 *
 * Input (callable data):
 *   {
 *     imageBase64: string   // raw base64, sin data URL prefix
 *     mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
 *     hintBarcode?: string  // opcional: si viene de flujo post-barcode NOT_FOUND
 *   }
 *
 * Output:
 *   {
 *     food: MappedFood,
 *     confidence: 'high' | 'medium' | 'low',
 *     notes: string | null
 *   }
 *
 * Errores posibles (details.code):
 *   - NOT_AUTHENTICATED   (401)
 *   - IMAGE_TOO_LARGE     (413)
 *   - IMAGE_INVALID       (400)
 *   - RATE_LIMITED        (429)
 *   - OCR_NOT_A_LABEL     (400) — la imagen no es una etiqueta
 *   - OCR_INCOMPLETE      (400) — valores obligatorios no legibles
 *   - OCR_API_ERROR       (503) — Anthropic unreachable / timeout
 *
 * Secret: requiere ANTHROPIC_API_KEY cargado previamente con
 *   `firebase functions:secrets:set ANTHROPIC_API_KEY`
 *
 * Region: europe-west1 (menor latencia desde España).
 * Memory: 512 MiB (SDK de Anthropic + imagen base64 en memoria pueden
 *   sumar ~100-200 MB de uso pico).
 * Timeout: 60s (llamadas a Claude Haiku con visión pueden tardar 5-15s
 *   bajo carga, más margen por si acaso).
 */

const ANTHROPIC_KEY = defineSecret('ANTHROPIC_API_KEY');

// Límites de tamaño. El cliente preprocesa a max 1200px + JPEG quality 0.85
// así que una foto optimizada suele pesar 150-500 KB. Max base64 = 4 MB da
// margen de sobra (base64 inflaba ~33% sobre binario).
const MAX_BASE64_LENGTH = 4 * 1024 * 1024; // 4 MB base64 ≈ 3 MB imagen real
const VALID_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

// Rate limiting: 5 OCRs por minuto por usuario, 50 por día.
// El de minuto es el anti-bucle; el diario es el anti-abuso.
const RATE_LIMIT_MINUTE = { max: 5, windowMs: 60 * 1000 };
const RATE_LIMIT_DAY = { max: 50, windowMs: 24 * 60 * 60 * 1000 };

interface OcrLabelRequest {
  imageBase64?: string;
  mimeType?: string;
  hintBarcode?: string;
}

interface OcrLabelResponse {
  food: MappedFood;
  confidence: 'high' | 'medium' | 'low';
  notes: string | null;
}

export const ocrLabel = onCall<OcrLabelRequest>(
  {
    region: 'europe-west1',
    memory: '512MiB',
    maxInstances: 10,
    timeoutSeconds: 60,
    cors: true,
    secrets: [ANTHROPIC_KEY],
  },
  async (request: CallableRequest<OcrLabelRequest>): Promise<OcrLabelResponse> => {
    const uid = requireAuth(request);

    // --- Rate limit per-user ---
    const minuteCheck = checkRateLimit(`${uid}:min`, RATE_LIMIT_MINUTE);
    if (!minuteCheck.allowed) {
      logger.info('OCR rate limited (minute)', { uid, retryAfterMs: minuteCheck.retryAfterMs });
      throw resourceExhausted(
        ErrorCodes.RATE_LIMITED,
        `Demasiadas peticiones. Espera ${Math.ceil(minuteCheck.retryAfterMs / 1000)}s.`
      );
    }
    const dayCheck = checkRateLimit(`${uid}:day`, RATE_LIMIT_DAY);
    if (!dayCheck.allowed) {
      logger.warn('OCR rate limited (day)', { uid });
      throw resourceExhausted(
        ErrorCodes.RATE_LIMITED,
        'Has alcanzado el límite diario de escaneos por foto.'
      );
    }

    // --- Validación de input ---
    const imageBase64 = request.data?.imageBase64;
    const mimeType = request.data?.mimeType;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw invalidArgument(ErrorCodes.IMAGE_INVALID, 'imageBase64 requerido');
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      throw invalidArgument(
        ErrorCodes.IMAGE_TOO_LARGE,
        'La imagen supera el tamaño máximo. Usa una foto más comprimida.'
      );
    }
    if (!mimeType || typeof mimeType !== 'string' || !VALID_MIME_TYPES.has(mimeType)) {
      throw invalidArgument(
        ErrorCodes.IMAGE_INVALID,
        'mimeType debe ser image/jpeg, image/png o image/webp'
      );
    }

    // Sanitizar: el cliente puede enviar accidentalmente un data URL
    const cleanBase64 = imageBase64.includes(',')
      ? imageBase64.split(',').pop() || ''
      : imageBase64;

    // --- Llamada a Claude Haiku ---
    let extraction;
    try {
      extraction = await extractNutritionFromImage(
        cleanBase64,
        mimeType as 'image/jpeg' | 'image/png' | 'image/webp'
      );
    } catch (err) {
      if (err instanceof OcrFailedError) {
        logger.info('OCR failed', { uid, reason: err.reason, message: err.message });
        if (err.reason === 'not_a_label') {
          throw notFound(ErrorCodes.OCR_NOT_A_LABEL, err.message);
        }
        if (err.reason === 'incomplete') {
          throw invalidArgument(ErrorCodes.OCR_INCOMPLETE, err.message);
        }
        // parse_error y api_error → tratamos como servicio caído
        throw unavailable(ErrorCodes.OCR_API_ERROR, err.message);
      }
      logger.error('Unexpected OCR error', {
        uid,
        error: err instanceof Error ? err.message : String(err),
      });
      throw unavailable(ErrorCodes.OCR_API_ERROR, 'Servicio OCR no disponible');
    }

    // Si viene hint del barcode previo (tras un NOT_FOUND en lookupBarcode),
    // lo preservamos en el food para que el usuario mantenga el enlace.
    if (request.data?.hintBarcode && /^\d{8,14}$/.test(request.data.hintBarcode)) {
      extraction.food.barcode = request.data.hintBarcode;
    }

    // --- Validación server-side del food mapeado ---
    try {
      validateFoodServerSide(extraction.food);
    } catch (err) {
      const msg = err instanceof FoodValidationError ? err.message : String(err);
      logger.error('OCR food failed validation', { uid, msg, food: extraction.food });
      throw unavailable(ErrorCodes.OCR_API_ERROR, 'Datos extraídos incoherentes');
    }

    logger.info('OCR success', {
      uid,
      confidence: extraction.confidence,
      name: extraction.food.name,
    });

    return {
      food: extraction.food,
      confidence: extraction.confidence,
      notes: extraction.notes,
    };
  }
);

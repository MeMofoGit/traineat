import { onCall, CallableRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { requireAuth } from '../lib/auth';
import { isValidBarcode, normalizeBarcode } from '../lib/barcode';
import { notFound, unavailable, invalidArgument, ErrorCodes } from '../lib/errors';
import { fetchFromOpenFoodFacts, MappedFood } from '../services/openfoodfacts';
import { validateFoodServerSide, FoodValidationError } from '../lib/foodValidation';

interface LookupBarcodeRequest {
  barcode?: string;
}

export interface LookupBarcodeResponse {
  source: 'mirror' | 'cache' | 'off_api';
  food: MappedFood;
}

/**
 * Busca un producto por código de barras.
 *
 * Cadena de búsqueda (Fase 4):
 *   1. offProducts/{barcode} — mirror nocturno pre-poblado por nightlyOFFSync.
 *   2. productCache/{barcode} — cache perezoso de lookups previos al API live.
 *   3. API live de OpenFoodFacts — fallback para productos no en mirror ni cache.
 *   4. Si miss total → lanza BARCODE_NOT_FOUND (el cliente cae a OCR/manual).
 *
 * Justificación del orden:
 *   - mirror primero porque tiene los productos populares pre-poblados,
 *     es rápido (sin tocar OFF) y siempre fresco (refrescado cada noche).
 *   - productCache segundo porque sirve productos no-mirror que algún
 *     usuario ya escaneó alguna vez (típicamente productos rare / de marca
 *     blanca / regionales que no entran al mirror por filtros de calidad).
 *   - API live como último recurso para productos completamente nuevos.
 *
 * Región: europe-west1 (minimiza latencia desde España).
 * Memory: 256 MiB (es solo IO, no necesita más).
 * Auth: OBLIGATORIA.
 */
export const lookupBarcode = onCall<LookupBarcodeRequest>(
  {
    region: 'europe-west1',
    memory: '256MiB',
    maxInstances: 10,
    timeoutSeconds: 30,
    cors: true,
  },
  async (
    request: CallableRequest<LookupBarcodeRequest>
  ): Promise<LookupBarcodeResponse> => {
    const uid = requireAuth(request);

    // --- Input validation ---
    const rawBarcode = request.data?.barcode;
    if (!isValidBarcode(rawBarcode)) {
      throw invalidArgument(ErrorCodes.BARCODE_INVALID, 'Formato de código inválido');
    }
    const barcode = normalizeBarcode(rawBarcode);

    const db = getFirestore();
    const mirrorRef = db.collection('offProducts').doc(barcode);
    const cacheRef = db.collection('productCache').doc(barcode);

    // --- 1. Mirror check (Fase 4) ---
    // El mirror nocturno (nightlyOFFSync) pre-puebla esta colección con
    // productos españoles de OFF que pasan los filtros de calidad. Es la
    // ruta más rápida y siempre fresca.
    const mirrored = await mirrorRef.get();
    if (mirrored.exists) {
      logger.info('lookupBarcode mirror hit', { uid, barcode });
      const data = mirrored.data() as MappedFood;
      // Quitar campos internos del mirror que no van al cliente
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (data as any).syncedAt;
      return { source: 'mirror', food: data };
    }

    // --- 2. Cache check ---
    const cached = await cacheRef.get();
    if (cached.exists) {
      logger.info('lookupBarcode cache hit', { uid, barcode });
      const data = cached.data() as MappedFood;
      return { source: 'cache', food: data };
    }

    // --- 3. OFF API live ---
    let offResult: MappedFood | null;
    try {
      offResult = await fetchFromOpenFoodFacts(barcode);
    } catch (err) {
      logger.error('OFF API error', {
        uid,
        barcode,
        error: err instanceof Error ? err.message : String(err),
      });
      throw unavailable(ErrorCodes.OFF_UNAVAILABLE, 'OpenFoodFacts no disponible');
    }

    if (!offResult) {
      logger.info('lookupBarcode not found in OFF', { uid, barcode });
      throw notFound(ErrorCodes.BARCODE_NOT_FOUND, 'Producto no encontrado');
    }

    // --- 4. Validación server-side del resultado mapeado antes de cachear ---
    // Esto evita que un producto con datos corruptos entre a productCache
    // y envenene lookups futuros.
    try {
      validateFoodServerSide(offResult);
    } catch (err) {
      const msg = err instanceof FoodValidationError ? err.message : String(err);
      logger.error('OFF product failed server validation', { uid, barcode, msg });
      throw unavailable(
        ErrorCodes.OFF_UNAVAILABLE,
        'Datos del producto incoherentes'
      );
    }

    // --- 5. Cachear para la próxima vez ---
    // `cachedAt` como server timestamp (no se puede dentro de un objeto anidado
    // con spread, así que lo ponemos top-level junto con el food).
    await cacheRef.set({
      ...offResult,
      cachedAt: FieldValue.serverTimestamp(),
      firstLookupBy: uid,
    });

    logger.info('lookupBarcode cache miss → OFF API → cached', { uid, barcode });
    return { source: 'off_api', food: offResult };
  }
);

import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { logger } from 'firebase-functions/v2';
import { getFirestore, FieldValue, WriteBatch } from 'firebase-admin/firestore';
import { mapOffProduct } from './openfoodfacts';

/**
 * Streaming sync del dump JSONL.gz de OpenFoodFacts a la colección
 * `offProducts/{barcode}` en Firestore.
 *
 * Diseño:
 *   1. fetch del dump → response.body es Web ReadableStream
 *   2. Readable.fromWeb → Node Readable stream (Node 17+)
 *   3. .pipe(gunzip) → línea de bytes descomprimidos
 *   4. readline.createInterface → líneas individuales JSONL
 *   5. JSON.parse + filtros (país, completitud nutricional)
 *   6. mapOffProduct(producto, barcode) → MappedFood
 *   7. batch.set() en lotes de BATCH_SIZE
 *   8. flush() cuando el batch se llena, al final, y al hit de MAX_ITEMS
 *
 * Memoria: streaming end-to-end. Solo se mantienen en RAM:
 *   - El batch actual (max 500 docs × ~3 KB = ~1.5 MB)
 *   - El buffer interno de gunzip (~64 KB)
 *   - Un par de líneas en cola
 *   Pico esperado: <300 MB. Función con 2 GiB tiene margen sobrado.
 *
 * Idempotencia: `set` con merge implícito (no merge explícito porque
 * queremos overwrite total — el dump es siempre canonical). Reprocesar
 * el mismo dump produce el mismo estado final.
 *
 * Estado: persiste progreso en `_meta/offSync` para diagnóstico y
 * para monitoring/alertas externas.
 */

const OFF_DUMP_URL = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';
const BATCH_SIZE = 500;
const PROGRESS_LOG_EVERY = 50000; // log cada 50k líneas procesadas

// Country tag(s) que aceptamos. Empezamos con España; expandible cuando
// llegue la internacionalización.
const TARGET_COUNTRY_TAGS = ['en:spain', 'en:españa'];

// Pre-filter regex que verifica que `en:spain` (o `en:españa`) aparezca
// específicamente DENTRO del array `countries_tags`, no en otros campos
// como `origins_tags` o `manufacturing_places_tags` (donde aparecen
// productos manufacturados/originados en España pero NO vendidos allí).
//
// Sin esta especificidad, el sync vio 247k matches en 1.15M líneas con un
// substring naive `"en:spain"` pero solo 4 eran realmente vendidos en
// España (los demás eran "originario de España" pero vendido en Francia, etc.).
//
// La regex es lineal (`[^\]]*` no hace backtracking patológico) y para
// líneas de ~20 KB cuesta microsegundos. Mucho más rápido que JSON.parse
// pero mucho más selectivo que un substring naive.
const COUNTRIES_TAGS_SPAIN_REGEX = /"countries_tags"\s*:\s*\[[^\]]*"en:spa(?:in|ña)"/;

// User-Agent obligatorio según las normas de OFF para clientes.
const OFF_USER_AGENT = 'FitnessApp/1.0 (https://fitness-6d907.web.app) - nightly-mirror';

export interface SyncOptions {
  /**
   * Límite máximo de productos a procesar (no líneas — productos que pasan
   * los filtros y se escriben). Útil para validación inicial. `undefined` = sin límite.
   */
  maxItems?: number;
  /**
   * Si true, no escribe a Firestore — solo cuenta y reporta. Para validar
   * que el parser y filtros funcionan sin ensuciar producción.
   */
  dryRun?: boolean;
}

export type SyncStatus = 'running' | 'success' | 'failed';

export interface SyncResult {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  status: SyncStatus;
  linesRead: number;
  linesParsed: number;
  productsAccepted: number;
  productsSkipped: number;
  productsErrored: number;
  itemsWritten: number;
  errors: string[];
  dryRun: boolean;
}

/**
 * Mínima forma raw que esperamos de cada línea del dump. La estructura
 * real tiene >300 campos, ignoramos todo lo demás.
 */
interface RawDumpProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  product_name_en?: string;
  brands?: string;
  countries_tags?: string[];
  categories_tags?: string[];
  nutriments?: Record<string, unknown>;
  image_front_small_url?: string;
}

/**
 * Ejecuta un sync completo del dump OFF.
 * Es resiliente a errores de parseo de líneas individuales (las salta y
 * cuenta), pero un fallo de red/IO total aborta y propaga.
 */
export async function runOffSync(opts: SyncOptions = {}): Promise<SyncResult> {
  const { maxItems, dryRun = false } = opts;
  const startedAt = Date.now();
  const errors: string[] = [];

  let linesRead = 0;
  let linesParsed = 0;
  let productsAccepted = 0;
  let productsSkipped = 0;
  let productsErrored = 0;
  let itemsWritten = 0;

  const db = getFirestore();
  await writeMetaState(db, {
    startedAt,
    status: 'running',
    dryRun,
    linesRead: 0,
    productsAccepted: 0,
    itemsWritten: 0,
  });

  let batch: WriteBatch | null = dryRun ? null : db.batch();
  let batchCount = 0;

  const flushBatch = async (): Promise<void> => {
    if (dryRun || !batch || batchCount === 0) return;
    try {
      await batch.commit();
      itemsWritten += batchCount;
    } catch (err) {
      productsErrored += batchCount;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`batch commit failed: ${msg}`);
      logger.error('OFF sync batch commit failed', { msg });
    } finally {
      batch = db.batch();
      batchCount = 0;
    }
  };

  let aborted = false;

  try {
    const lineIter = streamDumpLines();
    for await (const line of lineIter) {
      linesRead++;
      if (linesRead % PROGRESS_LOG_EVERY === 0) {
        logger.info('OFF sync progress', {
          linesRead,
          productsAccepted,
          itemsWritten,
          linesParsed,
        });
      }

      // PRE-FILTER por regex antes del parse caro.
      // Descartamos líneas donde `en:spain` no aparece DENTRO de
      // `countries_tags`. La regex es lineal y para líneas de ~20 KB
      // cuesta microsegundos vs los milisegundos de JSON.parse.
      // Sin esto, el sync ve 247k matches en 1.15M líneas pero solo 4
      // son realmente "vendido en España" — el resto son origins/manufacturing.
      if (!COUNTRIES_TAGS_SPAIN_REGEX.test(line)) {
        productsSkipped++;
        continue;
      }

      // Parse defensivo (solo para líneas que pasaron el pre-filter)
      let raw: RawDumpProduct;
      try {
        raw = JSON.parse(line) as RawDumpProduct;
        linesParsed++;
      } catch {
        productsErrored++;
        if (errors.length < 10) errors.push(`parse error at line ${linesRead}`);
        continue;
      }

      // Filtros completos (verifica shape real, no solo substring)
      if (!shouldKeepProduct(raw)) {
        productsSkipped++;
        continue;
      }

      const barcode = String(raw.code || '').trim();
      if (!/^\d{8,14}$/.test(barcode)) {
        productsSkipped++;
        continue;
      }

      // Map a shape interno (reutiliza la función existente para coherencia
      // con el flujo de lookupBarcode → API live)
      const mapped = mapOffProduct(raw, barcode);
      if (!mapped) {
        productsSkipped++;
        continue;
      }

      productsAccepted++;

      if (!dryRun && batch) {
        const ref = db.collection('offProducts').doc(barcode);
        batch.set(ref, {
          ...mapped,
          syncedAt: FieldValue.serverTimestamp(),
        });
        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await flushBatch();
        }
      }

      if (maxItems && productsAccepted >= maxItems) {
        aborted = true;
        logger.info('OFF sync hit maxItems limit', { maxItems });
        break;
      }
    }

    // Flush último batch parcial
    await flushBatch();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`fatal: ${msg}`);
    logger.error('OFF sync fatal error', { msg });
    const failResult: SyncResult = {
      startedAt,
      finishedAt: Date.now(),
      durationMs: Date.now() - startedAt,
      status: 'failed',
      linesRead,
      linesParsed,
      productsAccepted,
      productsSkipped,
      productsErrored,
      itemsWritten,
      errors,
      dryRun,
    };
    await writeMetaState(db, failResult);
    return failResult;
  }

  const finishedAt = Date.now();
  const result: SyncResult = {
    startedAt,
    finishedAt,
    durationMs: finishedAt - startedAt,
    status: 'success',
    linesRead,
    linesParsed,
    productsAccepted,
    productsSkipped,
    productsErrored,
    itemsWritten,
    errors,
    dryRun,
  };

  await writeMetaState(db, result);
  logger.info('OFF sync finished', {
    ...result,
    aborted,
    errorsCount: errors.length,
  });

  return result;
}

/**
 * Filtra productos del dump:
 *   1. Debe tener al menos un country_tag de TARGET_COUNTRY_TAGS.
 *   2. Debe tener `code` (barcode).
 *   3. Debe tener algún `product_name*` no vacío.
 *   4. Debe tener nutriments básicos (calories, protein, carbs, fat).
 *
 * @internal exportado para tests
 */
export function shouldKeepProduct(p: RawDumpProduct): boolean {
  const tags = p.countries_tags || [];
  const matchesCountry = tags.some((t) => TARGET_COUNTRY_TAGS.includes(t.toLowerCase()));
  if (!matchesCountry) return false;

  const hasName = !!(p.product_name_es || p.product_name || p.product_name_en);
  if (!hasName) return false;

  const n = p.nutriments || {};
  const hasCals = typeof n['energy-kcal_100g'] === 'number' && (n['energy-kcal_100g'] as number) >= 0;
  const hasProt = typeof n['proteins_100g'] === 'number' && (n['proteins_100g'] as number) >= 0;
  const hasCarbs = typeof n['carbohydrates_100g'] === 'number' && (n['carbohydrates_100g'] as number) >= 0;
  const hasFat = typeof n['fat_100g'] === 'number' && (n['fat_100g'] as number) >= 0;

  return hasCals && hasProt && hasCarbs && hasFat;
}

/**
 * Iterador async sobre las líneas del dump descomprimido.
 * Streaming end-to-end: nunca carga el fichero entero en memoria.
 */
async function* streamDumpLines(): AsyncGenerator<string> {
  logger.info('Fetching OFF dump', { url: OFF_DUMP_URL });

  const response = await fetch(OFF_DUMP_URL, {
    headers: { 'User-Agent': OFF_USER_AGENT },
    redirect: 'follow',
  });

  if (!response.ok || !response.body) {
    throw new Error(`OFF dump fetch failed: HTTP ${response.status}`);
  }

  // Web ReadableStream → Node Readable
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodeStream = Readable.fromWeb(response.body as any);
  const gunzip = createGunzip();
  nodeStream.pipe(gunzip);

  const rl = createInterface({ input: gunzip, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.length === 0) continue;
    yield line;
  }
}

/**
 * Persiste el estado del sync en _meta/offSync.
 */
async function writeMetaState(
  db: FirebaseFirestore.Firestore,
  state: Partial<SyncResult> & { status: string }
): Promise<void> {
  try {
    await db.collection('_meta').doc('offSync').set(
      {
        ...state,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    logger.warn('Failed to write _meta/offSync', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

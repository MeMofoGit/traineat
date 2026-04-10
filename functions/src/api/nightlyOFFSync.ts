import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { runOffSync, SyncResult } from '../services/offDumpSync';
import { requireAuth } from '../lib/auth';
import { unauthenticated } from '../lib/errors';

/**
 * Sync diario del dump de OpenFoodFacts a `offProducts/{barcode}`.
 *
 * Cron: 03:00 hora de Madrid cada día. Elegida porque (a) es noche en
 * España (sin tráfico de usuarios), (b) coincide con la ventana en la
 * que OFF tiene el dump regenerado del día (suelen actualizarlo al final
 * del día UTC).
 *
 * Memory: 2 GiB. El streaming mantiene el pico bajo (~300 MB típicos)
 * pero damos margen para variaciones del runtime.
 *
 * Timeout: 1800s (30 min, máximo permitido para Gen 2 background functions
 * disparadas por Pub/Sub/Schedule — los HTTP/callable pueden hasta 60 min).
 * Estimación con dump actual: 5-15 minutos para filtrado España + escritura.
 * Margen suficiente. Si el dump crece y dejamos de caber, hay que paginar
 * (stateful sync con cursor en _meta/offSync).
 *
 * maxInstances: 1. Nunca queremos dos syncs en paralelo (race conditions
 * en batches).
 *
 * retryCount: 0. Si falla, no auto-reintentar — el log queda en
 * Cloud Logging y al día siguiente vuelve a intentarlo. Reintentar
 * automáticamente puede duplicar coste si el fallo es transitorio
 * (mejor diagnosticar y arreglar).
 */
export const nightlyOFFSync = onSchedule(
  {
    schedule: '0 3 * * 0', // Domingo 03:00 Madrid (semanal, no diario — ahorra ~85% en writes)
    timeZone: 'Europe/Madrid',
    region: 'europe-west1',
    memory: '2GiB',
    timeoutSeconds: 1800,
    maxInstances: 1,
    concurrency: 1, // SIN esto, una instancia podía manejar 80 req concurrentes y maxInstances:1 no garantizaba 1 ejecución total
    retryCount: 0,
  },
  async () => {
    logger.info('nightlyOFFSync triggered');
    const result = await runOffSync();
    logger.info('nightlyOFFSync completed', { result });
  }
);

/**
 * Endpoint manual para forzar el sync (validación inicial, debugging).
 *
 * Auth: requiere usuario autenticado Y que su uid coincida con la lista
 * de admins (hardcoded por ahora — cuando llegue F6 con custom claims,
 * cambiar a `request.auth.token.admin === true`).
 *
 * Permite pasar `maxItems` para validar con un dataset reducido antes
 * del primer sync completo, y `dryRun` para testear el parser sin
 * escribir a Firestore.
 *
 * Una vez validado el sync nocturno, este handler puede mantenerse
 * disponible para diagnóstico bajo demanda — bajo coste (solo se ejecuta
 * cuando un admin lo invoca).
 */

// Lista provisional de uids admin. Igor solo, por ahora.
// Cuando llegue Auth con email/Google (F6), migrar a custom claims.
const ADMIN_UIDS = new Set<string>([
  'l4mauQrot6X8BrNdOQxwKQiHxXe2', // Igor (uid anónimo actual, ver logs)
]);

interface TriggerOffSyncRequest {
  maxItems?: number;
  dryRun?: boolean;
}

export const triggerOffSync = onCall<TriggerOffSyncRequest, Promise<SyncResult>>(
  {
    region: 'europe-west1',
    memory: '2GiB',
    timeoutSeconds: 1800,
    maxInstances: 1,
    concurrency: 1,
    cors: true,
  },
  async (request) => {
    const uid = requireAuth(request);
    if (!ADMIN_UIDS.has(uid)) {
      logger.warn('triggerOffSync denied — non-admin', { uid });
      throw unauthenticated('Solo administradores pueden forzar el sync');
    }

    const maxItems = typeof request.data?.maxItems === 'number' ? request.data.maxItems : undefined;
    const dryRun = request.data?.dryRun === true;

    logger.info('triggerOffSync invoked manually', { uid, maxItems, dryRun });
    const result = await runOffSync({ maxItems, dryRun });
    logger.info('triggerOffSync completed', { uid, result });
    return result;
  }
);

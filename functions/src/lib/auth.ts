import { CallableRequest } from 'firebase-functions/v2/https';
import { unauthenticated } from './errors';

/**
 * Extrae y verifica el uid del request autenticado. Lanza HttpsError
 * `unauthenticated` si no hay auth. Usar como primera línea en cualquier
 * callable para garantizar que el usuario está identificado.
 */
export function requireAuth(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw unauthenticated();
  }
  return uid;
}

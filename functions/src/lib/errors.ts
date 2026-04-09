import { HttpsError } from 'firebase-functions/v2/https';

/**
 * Códigos de error estables compartidos con el cliente.
 * El cliente discrimina por `details.code` para decidir el flujo:
 *   BARCODE_NOT_FOUND → sugerir OCR / entrada manual
 *   OFF_UNAVAILABLE   → reintentar más tarde / fallback
 *   RATE_LIMITED      → mostrar tiempo de espera
 *
 * Añadir aquí cuando aparezca un nuevo caso + actualizar
 * `src/services/barcode.js` (cliente) a la par.
 */
export const ErrorCodes = {
  BARCODE_NOT_FOUND: 'BARCODE_NOT_FOUND',
  BARCODE_INVALID: 'BARCODE_INVALID',
  OFF_UNAVAILABLE: 'OFF_UNAVAILABLE',
  NOT_AUTHENTICATED: 'NOT_AUTHENTICATED',
  RATE_LIMITED: 'RATE_LIMITED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export function notFound(code: ErrorCode, message?: string): HttpsError {
  return new HttpsError('not-found', message || code, { code });
}

export function unavailable(code: ErrorCode, message?: string): HttpsError {
  return new HttpsError('unavailable', message || code, { code });
}

export function invalidArgument(code: ErrorCode, message?: string): HttpsError {
  return new HttpsError('invalid-argument', message || code, { code });
}

export function unauthenticated(message?: string): HttpsError {
  return new HttpsError('unauthenticated', message || 'NOT_AUTHENTICATED', {
    code: ErrorCodes.NOT_AUTHENTICATED,
  });
}

export function resourceExhausted(code: ErrorCode, message?: string): HttpsError {
  return new HttpsError('resource-exhausted', message || code, { code });
}

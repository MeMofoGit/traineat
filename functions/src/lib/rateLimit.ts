/**
 * Rate limiter simple en memoria, per-instance.
 *
 * Limitación: Cloud Functions puede escalar a múltiples instancias; cada
 * una tiene su propia Map. Con `maxInstances: N`, el límite "real" es
 * N veces el configurado. Es best-effort — suficiente para evitar abuso
 * accidental y proteger el coste frente a bucles en el cliente. Para
 * rate limiting estricto usar Firestore (contador atómico con transacción)
 * o Memorystore/Redis. Diferido.
 *
 * El timer se limpia cada vez que se llama a `check()` — pasea las
 * entries y elimina las caducadas. Sin setInterval para no dejar
 * handlers colgados que puedan evitar que la instancia duerma.
 */

interface Entry {
  count: number;
  windowStart: number; // epoch ms
}

const buckets = new Map<string, Entry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export interface RateLimitOptions {
  /** Máximo de requests permitidos en la ventana */
  max: number;
  /** Tamaño de la ventana en ms */
  windowMs: number;
}

/**
 * Verifica si `key` (típicamente un uid) puede hacer otro request.
 * Incrementa el contador en caso de allowed, no lo hace si denied.
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  // Sin entry previa o ventana caducada → crear nueva
  if (!entry || now - entry.windowStart >= opts.windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    cleanup(now, opts.windowMs);
    return { allowed: true, remaining: opts.max - 1, retryAfterMs: 0 };
  }

  // Dentro de la ventana: verificar si hay cupo
  if (entry.count >= opts.max) {
    const retryAfterMs = opts.windowMs - (now - entry.windowStart);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  entry.count += 1;
  return { allowed: true, remaining: opts.max - entry.count, retryAfterMs: 0 };
}

/**
 * Limpieza oportunista: elimina entries cuya ventana ya caducó.
 * Se llama de forma lazy desde checkRateLimit. No es exhaustiva pero
 * evita que buckets crezca indefinidamente en instancias warm.
 */
function cleanup(now: number, windowMs: number): void {
  // Limitar el coste del cleanup a 100 entries por llamada
  let i = 0;
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart >= windowMs) {
      buckets.delete(key);
    }
    if (++i >= 100) break;
  }
}

/** Solo para tests. */
export function _resetRateLimiter(): void {
  buckets.clear();
}

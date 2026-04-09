/**
 * useEntitlements — fuente de verdad sobre qué features tiene activas
 * el usuario actual (free vs premium).
 *
 * IMPLEMENTACIÓN ACTUAL (Fase 1): valores hardcoded a `true` para que
 * en desarrollo todo esté desbloqueado. Esto significa que `<Gate>`
 * no oculta nada, pero la infraestructura de gating ya está montada
 * en los puntos de entrada (botones de "Mi Nevera", crear producto, etc.)
 * — el día que conectemos Stripe/RevenueCat (Fase 6/7) solo cambia el
 * origen del dato en este fichero, no los call sites.
 *
 * IMPLEMENTACIÓN FUTURA (Fase 6): leer de `users/{uid}/profile/main`
 * en Firestore, donde el webhook de Stripe escribe el estado de la
 * suscripción. Probablemente integrado en `usePlan` con suscripción
 * onSnapshot, mismo patrón que `customFoods`.
 *
 * Shape de un entitlements objeto:
 *   {
 *     customFoods: boolean,    // crear/editar productos personalizados
 *     barcodeScan: boolean,    // escaneo barcode (Fase 2)
 *     ocrLabel: boolean,       // OCR de etiqueta (Fase 3)
 *     smartSuggest: boolean,   // sugeridor de cantidades (Fase 5)
 *     plan: 'free' | 'premium',
 *   }
 */

const DEV_ENTITLEMENTS = {
    customFoods: true,
    barcodeScan: true,
    ocrLabel: true,
    smartSuggest: true,
    plan: 'free',
};

export function useEntitlements() {
    return DEV_ENTITLEMENTS;
}

/**
 * Helper directo, fuera de React, para checks puntuales.
 * @param {string} feature
 * @returns {boolean}
 */
export function hasFeature(feature) {
    return Boolean(DEV_ENTITLEMENTS[feature]);
}

/**
 * Entry point de Firebase Cloud Functions.
 *
 * Solo inicializa la Admin SDK y re-exporta los handlers. Cada handler
 * vive en su propio fichero bajo `src/api/` para mantener cold-starts
 * pequeños (tree-shakeable por función cuando Firebase despliega).
 *
 * Región por defecto: europe-west1 (se fija en cada handler).
 */

import { initializeApp } from 'firebase-admin/app';

initializeApp();

// --- API handlers ---
export { lookupBarcode } from './api/lookupBarcode';

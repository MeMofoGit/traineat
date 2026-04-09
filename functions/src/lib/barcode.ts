/**
 * Utilidades de validación de códigos de barras.
 * Formato soportado: EAN-8, EAN-13, UPC-A, UPC-E (solo dígitos, 8-14 chars).
 * NO validamos checksum — solo la forma. Si el barcode es sintácticamente
 * válido pero inexistente, OFF API devolverá status:0 y caemos a NOT_FOUND.
 */

export function isValidBarcode(code: unknown): code is string {
  if (typeof code !== 'string') return false;
  return /^\d{8,14}$/.test(code);
}

export function normalizeBarcode(code: string): string {
  return code.trim();
}

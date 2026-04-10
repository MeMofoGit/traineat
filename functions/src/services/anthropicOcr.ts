import Anthropic from '@anthropic-ai/sdk';
import { logger } from 'firebase-functions/v2';
import type { FoodCategory, MappedFood } from './openfoodfacts';

/**
 * OCR de etiquetas nutricionales vía Claude Haiku 4.5 con visión.
 *
 * Flujo:
 *   1. Recibe imagen base64 + mimeType.
 *   2. Envía a Claude con un system prompt estricto pidiendo JSON schema fijo.
 *   3. Parsea el JSON de la respuesta (defensivo: busca el primer {...} en el texto).
 *   4. Mapea al shape interno `MappedFood`.
 *   5. Devuelve null si el modelo indica `isLabel: false` o si faltan macros obligatorios.
 *
 * Coste esperado: ~$0.001 por imagen con Haiku 4.5 según pricing 2025.
 * Latencia típica: 2-5 segundos.
 *
 * IMPORTANTE: la API key se carga desde `process.env.ANTHROPIC_API_KEY`,
 * que Firebase Functions inyecta cuando el handler declara el secret
 * correspondiente vía `secrets: [ANTHROPIC_KEY]` en la config.
 */

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `You are a nutrition label OCR assistant. You will receive a photo and must extract the nutritional values from a food product's nutrition facts label. Return ONLY a single JSON object, no markdown, no prose, no explanation outside the JSON.

IMPORTANT: You do NOT need to extract the product name. The user will type it manually after reviewing your extraction. Focus EXCLUSIVELY on the numeric nutritional values and any brand visible ON the label itself. Do NOT put text like "Información nutricional" or "Nutrition Facts" anywhere in the output.

REQUIRED SCHEMA:
{
  "isLabel": boolean,          // true if the image shows a readable nutrition facts label
  "brand": string | null,       // brand name IF clearly visible on the label/package (optional, omit if unsure)
  "servingSize": number,        // the reference amount the values refer to
  "unit": "g" | "ml" | "pz",    // unit of the serving size
  "calories": number,           // kcal per servingSize
  "protein": number,            // grams per servingSize
  "carbs": number,              // total carbohydrates in grams per servingSize
  "fat": number,                // total fat in grams per servingSize
  "sugars": number | null,      // grams, subset of carbs
  "fiber": number | null,       // grams
  "saturated": number | null,   // grams, subset of fat
  "salt": number | null,        // grams (if sodium given, multiply by 2.5)
  "confidence": "high" | "medium" | "low",
  "notes": string | null        // brief caveat if any (blurry, partial, ambiguous)
}

CRITICAL RULES:
- If the image is NOT a nutrition label (a random photo, menu, receipt, etc.), return {"isLabel": false, "brand": null, "servingSize": 100, "unit": "g", "calories": 0, "protein": 0, "carbs": 0, "fat": 0, "sugars": null, "fiber": null, "saturated": null, "salt": null, "confidence": "low", "notes": "Not a nutrition label"}
- NEVER invent values. If you cannot read a specific value clearly, use null for optional fields. For mandatory fields (calories, protein, carbs, fat) use 0 and set confidence to "low".
- Labels in Spanish/EU format use comma as decimal: "3,5" means 3.5
- "por 100 g" / "per 100g" → servingSize: 100, unit: "g"
- "por 100 ml" → servingSize: 100, unit: "ml"
- If only a per-serving value is given (e.g. "por porción: 30 g"), use that: servingSize: 30, unit: "g"
- If energy is given in kJ only, convert: kcal = kJ / 4.184
- If label shows "sodio" instead of "sal", convert: sal_g = sodio_g × 2.5
- "Hidratos de carbono" = "carbohydrates" = carbs
- "Grasas" / "Lípidos" = fat
- "Saturadas" / "Saturated" = saturated
- "Azúcares" / "Sugars" = sugars
- "Fibra alimentaria" = fiber
- "Sal" = salt
- Round values to 2 decimal places.
- Set confidence: "high" if everything readable, "medium" if some fields estimated, "low" if image is hard to read.
- brand: ONLY include if you see a recognizable brand name/logo text on the package. If in doubt, use null. Never guess.

Return ONLY the JSON. No opening "Here is:", no markdown fences, no trailing text.`;

export interface OcrExtraction {
  food: MappedFood;
  confidence: 'high' | 'medium' | 'low';
  notes: string | null;
}

/** Error interno — el handler lo mapea a HttpsError. */
export class OcrFailedError extends Error {
  public readonly reason: 'not_a_label' | 'incomplete' | 'parse_error' | 'api_error';
  constructor(reason: OcrFailedError['reason'], message: string) {
    super(message);
    this.name = 'OcrFailedError';
    this.reason = reason;
  }
}

/**
 * Llama a Claude Haiku con la imagen y devuelve los macros extraídos.
 * @throws OcrFailedError en cualquier fallo de extracción.
 */
export async function extractNutritionFromImage(
  imageBase64: string,
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<OcrExtraction> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new OcrFailedError('api_error', 'ANTHROPIC_API_KEY not configured');
  }

  const client = new Anthropic({ apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'Extract the nutrition facts from this label and return the JSON object as specified.',
            },
          ],
        },
      ],
    });
  } catch (err) {
    logger.error('Anthropic API error', {
      error: err instanceof Error ? err.message : String(err),
    });
    throw new OcrFailedError('api_error', 'Anthropic API unavailable');
  }

  // Claude devuelve un array de content blocks. Esperamos uno de tipo text.
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new OcrFailedError('parse_error', 'No text in Claude response');
  }

  const rawText = textBlock.text.trim();
  let parsed: RawOcrResult;
  try {
    parsed = extractJsonObject(rawText);
  } catch (err) {
    logger.error('Failed to parse Claude JSON', { rawText, error: String(err) });
    throw new OcrFailedError('parse_error', 'Respuesta del modelo no es JSON válido');
  }

  // Validaciones semánticas
  if (!parsed.isLabel) {
    throw new OcrFailedError('not_a_label', parsed.notes || 'La imagen no parece una etiqueta nutricional');
  }

  // Macros obligatorios numéricos
  if (
    !isFiniteNumber(parsed.calories) ||
    !isFiniteNumber(parsed.protein) ||
    !isFiniteNumber(parsed.carbs) ||
    !isFiniteNumber(parsed.fat)
  ) {
    throw new OcrFailedError(
      'incomplete',
      'No se pudieron leer los valores obligatorios (kcal, proteínas, carbos, grasas)'
    );
  }

  if (parsed.calories < 0 || parsed.protein < 0 || parsed.carbs < 0 || parsed.fat < 0) {
    throw new OcrFailedError('incomplete', 'Valores negativos detectados');
  }

  // Construir el MappedFood. Categoría default 'other' — el usuario la
  // ajusta en la pantalla de revisión manual.
  // El nombre SIEMPRE queda vacío — el usuario lo rellena manualmente tras
  // la revisión. La foto típicamente es de la tabla nutricional, que no
  // contiene el nombre comercial del producto (está en la parte delantera
  // del envase). Extraer nombre del OCR introducía basura tipo
  // "Información nutricional" o texto aleatorio.
  const food: MappedFood = {
    name: '',
    category: 'other' as FoodCategory,
    defaultUnit: validUnit(parsed.unit),
    servingSize: isFiniteNumber(parsed.servingSize) && parsed.servingSize > 0 ? parsed.servingSize : 100,
    source: 'custom',
    // barcode queda undefined — el handler lo puede setear si viene hint del cliente
    macros: {
      calories: round2(parsed.calories),
      protein: round2(parsed.protein),
      carbs: round2(parsed.carbs),
      fat: round2(parsed.fat),
    },
  };

  if (parsed.brand && parsed.brand.trim()) {
    food.brand = parsed.brand.trim().slice(0, 100);
  }
  if (isFiniteNumber(parsed.sugars) && parsed.sugars >= 0) food.macros.sugars = round2(parsed.sugars);
  if (isFiniteNumber(parsed.fiber) && parsed.fiber >= 0) food.macros.fiber = round2(parsed.fiber);
  if (isFiniteNumber(parsed.saturated) && parsed.saturated >= 0) food.macros.saturated = round2(parsed.saturated);
  if (isFiniteNumber(parsed.salt) && parsed.salt >= 0) food.macros.salt = round2(parsed.salt);

  return {
    food,
    confidence: parsed.confidence || 'medium',
    notes: parsed.notes || null,
  };
}

// ============================================================================
// Helpers
// ============================================================================

interface RawOcrResult {
  isLabel: boolean;
  brand: string | null;
  servingSize: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugars: number | null;
  fiber: number | null;
  saturated: number | null;
  salt: number | null;
  confidence: 'high' | 'medium' | 'low';
  notes: string | null;
}

/**
 * Extrae el primer objeto JSON completo del texto. Defensivo ante modelos
 * que envuelven la respuesta en markdown (```json ... ```) o añaden prosa.
 *
 * Valida explícitamente que el valor parseado sea un plain object — si
 * fuera array, string, number, etc. lanzaría. Esto evita que un modelo
 * confundido devolviendo `[1,2,3]` o `"ok"` llegue al mapper y produzca
 * un food corrupto.
 *
 * @internal exportado para testing
 */
export function extractJsonObject(text: string): RawOcrResult {
  let parsed: unknown;
  try {
    // Primero intento directo
    parsed = JSON.parse(text);
  } catch {
    // Buscar el primer '{' y su '}' correspondiente (balanceado)
    const start = text.indexOf('{');
    if (start === -1) throw new Error('No opening brace in text');
    let depth = 0;
    let end = -1;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) throw new Error('No matching closing brace');
    parsed = JSON.parse(text.slice(start, end + 1));
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Parsed JSON is not a plain object');
  }
  return parsed as RawOcrResult;
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function validUnit(u: unknown): 'g' | 'ml' | 'pz' {
  if (u === 'g' || u === 'ml' || u === 'pz') return u;
  return 'g';
}

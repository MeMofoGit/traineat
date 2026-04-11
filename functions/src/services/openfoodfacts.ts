import { logger } from 'firebase-functions/v2';

/**
 * Cliente + mapper para la API pública de OpenFoodFacts.
 *
 * Flujo:
 *   GET https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 *   → JSON con status: 0 (not found) | 1 (found)
 *   → si found: mapeamos a nuestro shape Food
 *   → descartamos productos con nutriments incompletos (los tratamos como "not found")
 *
 * Licencia OFF: Open Database License (ODbL). Requiere atribución
 * visible en la UI (ver C4.8).
 */

const OFF_API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_TIMEOUT_MS = 8000;
const OFF_USER_AGENT = 'FitnessApp/1.0 (https://fitness-6d907.web.app)';

/**
 * Shape mínimo que nos importa de la respuesta de OFF.
 * La respuesta real tiene >300 campos, filtramos con `fields=` en el query.
 */
interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  product_name_en?: string;
  brands?: string;
  categories_tags?: string[];
  nutriments?: {
    'energy-kcal_100g'?: number;
    'proteins_100g'?: number;
    'carbohydrates_100g'?: number;
    'fat_100g'?: number;
    'sugars_100g'?: number;
    'fiber_100g'?: number;
    'saturated-fat_100g'?: number;
    'salt_100g'?: number;
  };
  serving_size?: string;
  image_front_small_url?: string;
  image_front_url?: string;
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  nova_group?: number;
}

interface OffResponse {
  status: 0 | 1;
  product?: OffProduct;
  code: string;
}

export type FoodCategory =
  | 'protein' | 'carbs' | 'fat' | 'veggies' | 'fruit' | 'liquid' | 'other';

export interface MappedFood {
  name: string;
  category: FoodCategory;
  defaultUnit: 'g' | 'ml' | 'pz';
  servingSize: number;
  source: 'custom';
  barcode?: string;
  brand?: string;
  imageUrl?: string;
  nutriscoreGrade?: string;   // 'a' | 'b' | 'c' | 'd' | 'e' — Nutri-Score
  ecoscore?: string;          // 'a' | 'b' | 'c' | 'd' | 'e' — Eco-Score
  novaGroup?: number;         // 1-4 — NOVA classification
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sugars?: number;
    fiber?: number;
    saturated?: number;
    salt?: number;
  };
}

/**
 * Consulta el API live de OpenFoodFacts para un barcode.
 *
 * Comportamiento de OFF v2:
 *   - Producto existe y completo  → HTTP 200 + { code, product: {...} }
 *   - Producto NO existe          → HTTP 404 + { code, status: 0, status_verbose: "product not found" }
 *   - Producto existe pero macros → HTTP 200 pero nutriments[energy-kcal_100g] etc. ausentes
 *
 * @returns MappedFood si existe con macros completos; null si no existe o macros incompletos.
 * @throws Error SOLO en fallo de red, timeout, HTTP 5xx, o JSON inválido.
 *         Es decir, distingue "el producto no está" (null) de "OFF no responde" (throw).
 */
export async function fetchFromOpenFoodFacts(barcode: string): Promise<MappedFood | null> {
  const fields = [
    'code',
    'product_name',
    'product_name_es',
    'product_name_en',
    'brands',
    'categories_tags',
    'nutriments',
    'serving_size',
    'image_front_small_url',
    'image_front_url',
    'nutriscore_grade',
    'ecoscore_grade',
    'nova_group',
  ].join(',');

  const url = `${OFF_API_BASE}/${encodeURIComponent(barcode)}.json?fields=${fields}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OFF_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': OFF_USER_AGENT,
        'Accept': 'application/json',
      },
    });

    // 404 = producto no encontrado en OFF. Es un "miss" válido, no un error.
    if (res.status === 404) {
      logger.info('OFF product not found (HTTP 404)', { barcode });
      return null;
    }

    // Cualquier otro status no-OK sí es fallo real del servicio.
    if (!res.ok) {
      throw new Error(`OFF API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as OffResponse;

    // Algunas rutas de OFF devuelven 200 con status:0 en el body.
    // Lo tratamos también como "not found".
    if (data.status !== 1 || !data.product) {
      logger.info('OFF product not found (body status=0)', { barcode });
      return null;
    }

    const mapped = mapOffProduct(data.product, barcode);
    if (!mapped) {
      logger.info('OFF product found but nutriments incomplete', { barcode });
      return null;
    }
    return mapped;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Mapea un producto de OFF a nuestro shape interno de Food.
 * Devuelve null si falta info crítica (nutriments incompletos, sin nombre).
 */
export function mapOffProduct(p: OffProduct, barcode: string): MappedFood | null {
  const n = p.nutriments || {};
  const calories = n['energy-kcal_100g'];
  const protein = n['proteins_100g'];
  const carbs = n['carbohydrates_100g'];
  const fat = n['fat_100g'];

  // Macros obligatorios — si OFF no los tiene, no podemos usar el producto
  if (
    typeof calories !== 'number' || calories < 0 ||
    typeof protein !== 'number' || protein < 0 ||
    typeof carbs !== 'number' || carbs < 0 ||
    typeof fat !== 'number' || fat < 0
  ) {
    return null;
  }

  const name = (p.product_name_es || p.product_name || p.product_name_en || '').trim();
  if (!name) return null;

  const food: MappedFood = {
    name: name.slice(0, 80),
    category: inferCategory(p.categories_tags),
    defaultUnit: 'g',
    servingSize: 100,
    source: 'custom',
    barcode,
    macros: {
      calories: round2(calories),
      protein: round2(protein),
      carbs: round2(carbs),
      fat: round2(fat),
    },
  };

  if (p.brands) {
    const firstBrand = p.brands.split(',')[0]?.trim();
    if (firstBrand) food.brand = firstBrand.slice(0, 100);
  }
  if (p.image_front_url || p.image_front_small_url) {
    food.imageUrl = p.image_front_url || p.image_front_small_url;
  }

  // Scores nutricionales / ambientales
  if (p.nutriscore_grade) food.nutriscoreGrade = p.nutriscore_grade.toLowerCase();
  if (p.ecoscore_grade) food.ecoscore = p.ecoscore_grade.toLowerCase();
  if (typeof p.nova_group === 'number' && p.nova_group >= 1 && p.nova_group <= 4) {
    food.novaGroup = p.nova_group;
  }

  // Macros opcionales — incluir solo si OFF los trae y son válidos
  if (typeof n['sugars_100g'] === 'number' && n['sugars_100g'] >= 0) {
    food.macros.sugars = round2(n['sugars_100g']);
  }
  if (typeof n['fiber_100g'] === 'number' && n['fiber_100g'] >= 0) {
    food.macros.fiber = round2(n['fiber_100g']);
  }
  if (typeof n['saturated-fat_100g'] === 'number' && n['saturated-fat_100g'] >= 0) {
    food.macros.saturated = round2(n['saturated-fat_100g']);
  }
  if (typeof n['salt_100g'] === 'number' && n['salt_100g'] >= 0) {
    food.macros.salt = round2(n['salt_100g']);
  }

  return food;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Infiere la categoría interna a partir de los `categories_tags` de OFF.
 * OFF usa tags jerárquicos tipo "en:breads", "en:meats", "en:vegetables".
 * Mapeo heurístico best-effort. En caso de duda → 'other'. El usuario
 * puede corregir la categoría manualmente desde el modal de revisión.
 *
 * Orden importa: lo más específico primero.
 *
 * @internal exportado para testing
 */
export function inferCategory(tags: string[] = []): FoodCategory {
  const joined = tags.join(' ').toLowerCase();

  if (/\b(en:)?(beverages|sodas|juices|waters|milks|plant-milks|drinks|teas|coffees)\b/.test(joined)) {
    return 'liquid';
  }
  if (/\b(en:)?(fruits|berries|fresh-fruits|dried-fruits)\b/.test(joined)) {
    return 'fruit';
  }
  if (/\b(en:)?(vegetables|leafy|legume-vegetables|root-vegetables|fresh-vegetables)\b/.test(joined)) {
    return 'veggies';
  }
  if (/\b(en:)?(meats|fishes|poultries|seafood|eggs|dairy|cheeses|yogurts|protein|seitan|tofu|tempeh|whey|protein-powders)\b/.test(joined)) {
    return 'protein';
  }
  if (/\b(en:)?(oils|fats|nuts|seeds|nut-butters|olive-oils|butters)\b/.test(joined)) {
    return 'fat';
  }
  if (/\b(en:)?(cereals|breads|pastas|rice|breakfast-cereals|grains|flours|biscuits|starches)\b/.test(joined)) {
    return 'carbs';
  }

  return 'other';
}

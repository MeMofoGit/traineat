#!/usr/bin/env node
/**
 * Análisis local del dump JSONL de OpenFoodFacts.
 *
 * Streamea el fichero línea por línea (sin cargarlo en RAM), aplica los
 * mismos filtros que el sync de producción (`functions/src/services/offDumpSync.ts`)
 * y reporta estadísticas + samples para validar el comportamiento esperado.
 *
 * Útil para iterar sobre el filtro localmente sin tener que redeployar la
 * Function cada vez. Soporta tanto el fichero .jsonl plano como .jsonl.gz.
 *
 * Uso:
 *   node scripts/analyze-off-dump.js <path-al-jsonl-o-jsonl.gz> [--limit N] [--country en:spain]
 *
 * Ejemplos:
 *   node scripts/analyze-off-dump.js D:/dumps/openfoodfacts-products.jsonl
 *   node scripts/analyze-off-dump.js D:/dumps/openfoodfacts-products.jsonl --limit 100000
 *   node scripts/analyze-off-dump.js D:/dumps/openfoodfacts-products.jsonl --country en:france
 *
 * Output:
 *   - Total líneas leídas / parseadas
 *   - Cuántas pasan el pre-filter regex
 *   - Cuántas pasan el filter completo (country + name + nutriments)
 *   - Razones de rechazo (counters por filtro)
 *   - Top 20 países en countries_tags
 *   - 5 samples de productos aceptados
 *   - 5 samples de productos rechazados con razón
 *   - Tiempo de proceso y throughput
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const readline = require('readline');

// ============================================================================
// Args parsing
// ============================================================================

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Uso: node scripts/analyze-off-dump.js <path> [--limit N] [--country en:xx]');
  process.exit(0);
}

const filePath = args[0];
let limit = Infinity;
let targetCountry = 'en:spain';

for (let i = 1; i < args.length; i++) {
  if (args[i] === '--limit' && args[i + 1]) {
    limit = parseInt(args[++i], 10);
  } else if (args[i] === '--country' && args[i + 1]) {
    targetCountry = args[++i];
  }
}

if (!fs.existsSync(filePath)) {
  console.error(`Fichero no encontrado: ${filePath}`);
  process.exit(1);
}

const stats = fs.statSync(filePath);
const sizeGB = (stats.size / (1024 ** 3)).toFixed(2);
const isGzipped = filePath.endsWith('.gz');

console.log(`\nAnalizando: ${filePath}`);
console.log(`Tamaño: ${sizeGB} GB ${isGzipped ? '(comprimido)' : '(descomprimido)'}`);
console.log(`Country target: ${targetCountry}`);
console.log(`Limit: ${limit === Infinity ? 'sin límite' : limit + ' líneas'}\n`);

// ============================================================================
// Filters (réplica EXACTA de offDumpSync.ts — mantener en sync)
// ============================================================================

// Mismo regex que functions/src/services/offDumpSync.ts
const COUNTRIES_TAGS_SPAIN_REGEX = /"countries_tags"\s*:\s*\[[^\]]*"en:spa(?:in|ña)"/;

// Para otros países, generar regex dinámico
function buildCountryRegex(countryTag) {
  if (countryTag === 'en:spain') return COUNTRIES_TAGS_SPAIN_REGEX;
  // Escape regex special chars
  const escaped = countryTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`"countries_tags"\\s*:\\s*\\[[^\\]]*"${escaped}"`);
}

const countryRegex = buildCountryRegex(targetCountry);

function shouldKeepProduct(p) {
  // 1. Country
  const tags = p.countries_tags || [];
  const matchesCountry = tags.some(
    (t) => typeof t === 'string' && t.toLowerCase() === targetCountry
  );
  if (!matchesCountry) return { ok: false, reason: 'country' };

  // 2. Name
  const hasName = !!(p.product_name_es || p.product_name || p.product_name_en);
  if (!hasName) return { ok: false, reason: 'name' };

  // 3. Mandatory macros
  const n = p.nutriments || {};
  const hasCals =
    typeof n['energy-kcal_100g'] === 'number' && n['energy-kcal_100g'] >= 0;
  const hasProt =
    typeof n['proteins_100g'] === 'number' && n['proteins_100g'] >= 0;
  const hasCarbs =
    typeof n['carbohydrates_100g'] === 'number' && n['carbohydrates_100g'] >= 0;
  const hasFat = typeof n['fat_100g'] === 'number' && n['fat_100g'] >= 0;

  if (!hasCals) return { ok: false, reason: 'no_kcal' };
  if (!hasProt) return { ok: false, reason: 'no_protein' };
  if (!hasCarbs) return { ok: false, reason: 'no_carbs' };
  if (!hasFat) return { ok: false, reason: 'no_fat' };

  return { ok: true };
}

// ============================================================================
// Streaming
// ============================================================================

const startTime = Date.now();
let inputStream = fs.createReadStream(filePath);
if (isGzipped) {
  inputStream = inputStream.pipe(zlib.createGunzip());
}
const rl = readline.createInterface({ input: inputStream, crlfDelay: Infinity });

let linesRead = 0;
let prefilterPassed = 0;
let parsed = 0;
let parseErrors = 0;
let accepted = 0;

const rejections = {
  country: 0,
  name: 0,
  no_kcal: 0,
  no_protein: 0,
  no_carbs: 0,
  no_fat: 0,
};

const countryCounts = new Map();
const acceptedSamples = [];
const rejectedSamples = [];
let lastProgressTime = Date.now();

(async () => {
  try {
    for await (const line of rl) {
      if (!line) continue;
      linesRead++;

      // Progress log cada 100k líneas
      if (linesRead % 100000 === 0) {
        const now = Date.now();
        const rate = Math.round(100000 / ((now - lastProgressTime) / 1000));
        const elapsedMin = ((now - startTime) / 60000).toFixed(1);
        console.log(
          `  ${linesRead.toLocaleString()} líneas | parsed:${parsed} | accepted:${accepted} | ${rate}/s | ${elapsedMin}min`
        );
        lastProgressTime = now;
      }

      if (linesRead >= limit) break;

      // Pre-filter regex (mismo que producción)
      if (!countryRegex.test(line)) continue;
      prefilterPassed++;

      // Parse
      let p;
      try {
        p = JSON.parse(line);
        parsed++;
      } catch {
        parseErrors++;
        continue;
      }

      // Country counts (de los que pasaron el pre-filter)
      const tags = p.countries_tags || [];
      for (const t of tags) {
        if (typeof t === 'string') {
          countryCounts.set(t, (countryCounts.get(t) || 0) + 1);
        }
      }

      // Filter completo
      const result = shouldKeepProduct(p);
      if (result.ok) {
        accepted++;
        if (acceptedSamples.length < 5) {
          acceptedSamples.push({
            code: p.code,
            name: p.product_name_es || p.product_name,
            brand: p.brands?.split(',')[0]?.trim(),
            countries: p.countries_tags?.slice(0, 5),
            kcal: p.nutriments['energy-kcal_100g'],
            protein: p.nutriments['proteins_100g'],
            carbs: p.nutriments['carbohydrates_100g'],
            fat: p.nutriments['fat_100g'],
          });
        }
      } else {
        rejections[result.reason]++;
        if (rejectedSamples.length < 5) {
          rejectedSamples.push({
            code: p.code,
            name: p.product_name_es || p.product_name || '(sin nombre)',
            countries: p.countries_tags?.slice(0, 5),
            reason: result.reason,
            nutKeys: Object.keys(p.nutriments || {})
              .filter((k) => k.includes('100g'))
              .slice(0, 8),
          });
        }
      }
    }
  } catch (err) {
    console.error('\nError durante el streaming:', err.message);
  }

  const elapsedSec = (Date.now() - startTime) / 1000;
  const throughput = Math.round(linesRead / elapsedSec);

  console.log('\n============================================================');
  console.log('RESUMEN');
  console.log('============================================================');
  console.log(`Tiempo total:            ${elapsedSec.toFixed(1)}s (${(elapsedSec / 60).toFixed(1)} min)`);
  console.log(`Líneas leídas:           ${linesRead.toLocaleString()}`);
  console.log(`Throughput medio:        ${throughput.toLocaleString()} líneas/s`);
  console.log(`Pasaron pre-filter:      ${prefilterPassed.toLocaleString()} (${((100 * prefilterPassed) / linesRead).toFixed(3)}%)`);
  console.log(`Parseadas (JSON.parse):  ${parsed.toLocaleString()}`);
  console.log(`Errores de parse:        ${parseErrors.toLocaleString()}`);
  console.log(`Aceptados (filter full): ${accepted.toLocaleString()} (${((100 * accepted) / Math.max(parsed, 1)).toFixed(2)}% de los parseados)`);

  console.log('\nRECHAZOS por razón:');
  console.log(`  country (no es ${targetCountry}):  ${rejections.country.toLocaleString()}`);
  console.log(`  name (sin nombre):               ${rejections.name.toLocaleString()}`);
  console.log(`  no_kcal:                         ${rejections.no_kcal.toLocaleString()}`);
  console.log(`  no_protein:                      ${rejections.no_protein.toLocaleString()}`);
  console.log(`  no_carbs:                        ${rejections.no_carbs.toLocaleString()}`);
  console.log(`  no_fat:                          ${rejections.no_fat.toLocaleString()}`);

  console.log('\nTop 15 countries_tags más comunes (de los que pasaron pre-filter):');
  const top = [...countryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [tag, count] of top) {
    console.log(`  ${tag.padEnd(35)} ${count.toLocaleString()}`);
  }

  console.log('\nSAMPLES — productos aceptados (los primeros 5):');
  console.log(JSON.stringify(acceptedSamples, null, 2));

  console.log('\nSAMPLES — productos rechazados (los primeros 5):');
  console.log(JSON.stringify(rejectedSamples, null, 2));
})();

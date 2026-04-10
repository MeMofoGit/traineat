# PROJECT PLAN — Fitness App

> Documento vivo. Roadmap, decisiones arquitectónicas, cross-cutting concerns y estado del proyecto.
>
> **Actualizar** al cerrar cada tarea, al cambiar arquitectura, al desbloquear/bloquear algo, o al tomar una decisión nueva sobre la marcha.
>
> Para historial detallado de cambios concretos por commit/sesión, ver `DEVLOG.md`.
> Para reglas de código, convenciones y workflow, ver `CLAUDE.md`.

---

## 1. Visión

App de nutrición y entrenamiento. Hoy app personal de Igor en web. Objetivo: producto multi-usuario distribuible en App Store y Google Play, con versión gratis y features de pago.

**Propuesta de valor free**: plan nutricional con base de alimentos predefinida, rutinas de entrenamiento, sesiones, peso, dashboard.

**Features premium** (lista preliminar, ajustable):
- Crear productos personalizados (manual / barcode / OCR de etiqueta).
- Sugeridor inteligente de cantidades para cuadrar macros.
- Productos personalizados ilimitados (free permitirá hasta 3 como teaser).
- (Futuras: chatbot nutricional, integración wearables, planes compartidos…)

---

## 2. Stack

### Actual (web)
- **React 19** + **Vite 7** (SPA)
- **Tailwind 4** (`@tailwindcss/postcss`)
- **Firebase 12** (Firestore + Auth anónima)
- **React Router 7**
- **lucide-react**, **date-fns**

### Decidido próximo
- **Firebase Functions** (backend, TypeScript)
- **Anthropic API** (Claude Haiku con visión, OCR)
- **`@zxing/browser`** (escáner barcode en cliente web)
- **RevenueCat** (gestión IAPs cuando llegue mobile)
- **Sentry** (error tracking client + functions) — desde Fase 0
- **Stripe** (pagos web)

### Tooling de desarrollo (sub-agentes Claude Code + MCP)
- **`.claude/agents/plan-keeper.md`** — sub-agente que mantiene PROJECT_PLAN.md y DEVLOG.md sincronizados tras cada bloque de trabajo. Invocar proactivamente al cerrar features.
- **`.claude/agents/firebase-security-reviewer.md`** — sub-agente que revisa firestore.rules y Functions buscando issues de seguridad multi-tenant. Invocar antes de cualquier deploy a producción.
- **`.claude/agents/food-data-validator.md`** — sub-agente que valida coherencia nutricional (Atwater, sub-macros, rangos plausibles) de productos parseados por OCR/OFF antes de guardarlos.
- **`.mcp.json`** — config MCP project-scoped con **Playwright MCP** (`@playwright/mcp@latest`) para automatización de browser y testing E2E manual.

### Decidido medio plazo
- **PWA** (paso intermedio antes de mobile nativo)
- **React Native + Expo + EAS** (mobile)
- **`@react-native-firebase`** (SDK mobile de Firebase)
- **i18next** o **react-intl** (i18n cuando toque)

### Anotado para reevaluar
- **Migración a Supabase** si se dispara alguno de estos triggers:
  - Necesitamos queries SQL complejas sobre el mirror OFF que Firestore no soporta bien.
  - Coste mensual de Firebase > 50€ consistentemente.
  - Queremos self-host por soberanía de datos.
- **Migración a TypeScript** del frontend (las Functions arrancan ya en TS): ver decisión pendiente §17.

---

## 3. Decisiones arquitectónicas

### 2026-04-09 — Backend = Firebase Functions
**Alternativas evaluadas**: Supabase (Postgres + Edge Functions), Cloudflare Workers, Node propio en VPS.
**Razones**:
- Cero migración: data y auth ya en Firebase.
- `@react-native-firebase` es el SDK RN más maduro; horizonte mobile cercano.
- Cache offline persistente Firestore en mobile cubre el requisito "datos disponibles offline".
- Auth context integrado en Functions, sin parsear tokens manualmente.
- Scheduled functions de serie para sync nocturno OFF.
- 99% de queries son por clave (barcode, uid+foodId): la ventaja de Postgres no se materializa hoy.
**Trade-off aceptado**: vendor lock-in profundo. **Mitigación**: capa de servicios `src/services/` que aísla todas las llamadas a Firestore.

### 2026-04-09 — Custom foods como subcolección
`users/{uid}/customFoods/{foodId}` en lugar de meterlo dentro de `users/{uid}/data/plan`.
**Razones**:
- Documentos Firestore tienen límite de 1 MB → 200+ productos en el plan lo rompe.
- Cada CRUD afecta solo a un documento, no reescribe todo el plan.
- Permite paginación, queries por nombre, índices independientes.
- Sync incremental: ediciones puntuales no traen el resto.

### 2026-04-09 — Repository pattern ligero (`src/services/`)
Toda la lógica que habla con Firestore vive en `src/services/`. Componentes y hooks importan funciones de servicio, **nunca** `firebase/firestore` directamente.
**Razones**:
- Aísla el SDK del resto del código → migración futura cambia 1 fichero, no 30.
- Tests unitarios más fáciles (mockear el servicio).
- Punto único para añadir logging, retries, métricas.

### 2026-04-09 — OCR server-side via Claude Haiku con visión
**Alternativas evaluadas**: Tesseract.js cliente, VLM local (Moondream/SmolVLM), Google Cloud Vision, AWS Textract.
**Razones**:
- Mejor calidad real en etiquetas (Tesseract falla en letra pequeña, etiquetas curvadas, bajo contraste).
- Devuelve JSON estructurado directamente con buen prompt → no hace falta parser regex.
- No infla bundle del cliente.
- Coste irrisorio: ~$1 por 1000 imágenes.
- Centralizado en backend → control de abuso (rate limit per user) y métricas.
- Reusable para futuras features con LLM.
**Trade-off aceptado**: requiere internet para crear vía OCR. Aceptable porque solo afecta al momento de creación, no al uso normal.

### 2026-04-09 — Estrategia OFF: mirror nocturno + caché + API live
**Implementación en cascada** (ver Fase 4):
- **Mirror principal** `offProducts/{barcode}`: scheduled function nocturna procesa JSONL.gz con filtros (país, calidad).
- **Cache de fallbacks** `productCache/{barcode}`: para productos no en mirror, primera consulta cachea de por vida.
- **API live**: solo como tercer recurso, llamado desde Function (nunca cliente).
- **Atribución ODbL** obligatoria.
**Coste estimado**: 200-400 MB en Firestore (~$0.07/mes) + céntimos compute.

### 2026-04-09 — Pagos: Stripe (web) + RevenueCat (mobile)
**Razón**: Apple/Google obligan IAP nativos en mobile, no permiten Stripe para bienes digitales (15-30% comisión). RevenueCat abstrae IAP Apple + Google + Stripe en una sola API y gestiona estado de suscripción. Cuando llegue mobile, RevenueCat también para web aunque proxee a Stripe, para tener una sola fuente de verdad.

### 2026-04-09 — Functions arrancan en TypeScript desde día 1
Frontend sigue en JS por ahora (decisión pendiente §17). Pero Functions nuevas → TypeScript desde el principio: setup gratis si arrancamos así, doloroso si migramos después.

### 2026-04-10 — Mi Nevera = página propia bajo Diet (no sub-sección de Profile)
**Decisión inicial**: meter "Mi Nevera" como sub-sección dentro de `/profile`.
**Decisión revisada**: convertirla en página completa `/fridge`, accesible desde un botón destacado en la cabecera de `/diet`.
**Razones**:
- Encaja semánticamente mejor en el contexto de Diet (productos que se usan al construir comidas) que en Profile (datos personales del usuario).
- A página completa la tabla con buscador, filtros y sort respira mejor que apretada en una card embebida.
- Mantiene Profile centrado exclusivamente en perfil. Evita acoplar dos conceptos en una sola pantalla.
- Patrón consistente con el resto de la app: cosas con su propio listado/CRUD = página propia (Profile, Training, Diet…).
**Implementación**: nueva ruta `/fridge` con `src/pages/Fridge.jsx`, eliminado `MyFridgeSection.jsx` (era la versión embebida).

---

## 4. Modelo de datos (estado objetivo)

```
users/{uid}/data/plan                    ← plan, rutinas, fases, weightLog, etc. (ya existe)
users/{uid}/history/{sessionId}          ← historial sesiones (ya existe)
users/{uid}/customFoods/{foodId}         ← NUEVO: productos personalizados
users/{uid}/profile/main                 ← NUEVO: entitlements, settings, suscripción

offProducts/{barcode}                    ← NUEVO: mirror público OFF (read-only clientes)
productCache/{barcode}                   ← NUEVO: cache fallbacks API OFF (solo Functions)

_meta/schemaVersion                      ← NUEVO: versionado de schema para migraciones
_meta/offSync                            ← NUEVO: estado del último sync nocturno OFF
```

**Reglas Firestore objetivo**:
```
match /users/{uid}/{document=**}        { allow read,write: if request.auth.uid == uid; }
match /offProducts/{barcode}            { allow read: if request.auth != null;
                                          allow write: if false; /* solo Functions */ }
match /productCache/{barcode}           { allow read: if request.auth != null;
                                          allow write: if false; /* solo Functions */ }
match /_meta/{doc}                      { allow read: if true; allow write: if false; }
```

**Versionado de schema**:
- Cada cliente lee `_meta/schemaVersion` al arrancar y compara con su versión local.
- Las migraciones se ejecutan en `usePlan` al cargar (idempotentes), pero los cambios de schema mayor avisan al usuario.
- Estrategia: migraciones forward-compatible siempre. Si necesitamos romper, bumpeamos versión major y forzamos refresh.

---

## 5. Cross-cutting concerns

Concerns que tocan varias fases. Cada uno con status, fase donde se aborda y notas. **Esta sección es el checklist global** para "no olvidamos nada".

| Concern | Status | Aborda | Notas |
|---|---|---|---|
| **Testing (unit + integration)** | ☐ TODO | F0 + ongoing | Vitest. Cobertura mínima: parsers, calculators, services. UI tests defer. |
| **CI/CD** | ☐ TODO | F0 | GitHub Actions: lint + test + build en PR. Auto-deploy a Firebase Hosting en main. |
| **TypeScript frontend** | ☐ Decisión pendiente | §17 | Functions ya en TS. Frontend: ver §17. |
| **Linting + formatting** | ◐ Parcial | F0 | ESLint existe. Añadir Prettier, husky, lint-staged. |
| **Error tracking (Sentry)** | ☐ TODO | F0 | Cliente y Functions. Source maps. Free tier suficiente. |
| **Cost monitoring + alertas** | ☐ TODO | F2 | Firebase budget alerts + Anthropic usage alerts. |
| **Secrets management** | ☐ TODO | F2 | Firebase Functions secrets (`firebase functions:secrets:set`). NUNCA en código. |
| **Security audit reglas Firestore** | ☐ TODO | F2, F6 | Tests con simulador antes de cada deploy de reglas. |
| **Schema versioning + migrations** | ◐ Parcial | F1+ | Hoy hay migraciones idempotentes en `usePlan`. Formalizar con `_meta/schemaVersion`. |
| **Empty states** | ☐ TODO | F1+ | Cada lista necesita "estado vacío" con CTA claro. |
| **Loading states (skeletons)** | ☐ TODO | F1+ | Componente `<Skeleton>` reutilizable. |
| **Error states / toasts** | ☐ TODO | F1+ | Sistema de toasts global. Mensajes user-friendly, no stacktraces. |
| **Onboarding flow** | ☐ TODO | F6 | Primer launch: tour de 3-4 pantallas + setup inicial perfil. |
| **Offline indicator** | ☐ TODO | F6 | Banner cuando no hay conexión. Acciones que requieren red marcadas. |
| **Internacionalización (i18n)** | ☐ TODO | F6 | Sacar strings a JSON. Mínimo ES + EN antes de stores. Unidades locales. |
| **Accesibilidad (a11y)** | ☐ TODO | F1+ | Focus trap modales, ARIA labels, contraste, navegación teclado. |
| **Performance budget** | ☐ TODO | F6 | Bundle < 300 KB gzipped inicial. Lazy load rutas grandes. Lighthouse > 90. |
| **SEO + meta tags** | ☐ TODO | F6 | Open Graph, Twitter Cards, sitemap (solo para landing/marketing). |
| **Health disclaimer** | ☐ TODO | F6 | **CRÍTICO**. App da consejos nutricionales → disclaimer "no es consejo médico" obligatorio para stores. |
| **Privacy policy + ToS** | ☐ TODO | F6 | Generador legal + revisión humana. Linkeable desde app y stores. |
| **GDPR completo** | ☐ TODO | F6 | Consent, derecho borrado, derecho portabilidad, DPA con Firebase/Anthropic/Stripe. |
| **Cookie banner** | ☐ TODO | F6 | Si usamos analytics o cookies de terceros. |
| **Privacy nutrition label (Apple)** | ☐ TODO | F7 | Apple obliga declarar qué datos recogemos. |
| **App Tracking Transparency** | ☐ TODO | F7 | Solo si trackeamos cross-app. Probablemente NO. |
| **Push notifications** | ☐ TODO | F7 | Recordatorios comidas, entrenos, peso. FCM. |
| **Apple Health / Google Fit** | ☐ TODO | F7 | Lectura peso, calorías quemadas, pasos. |
| **Deep linking / Universal Links** | ☐ TODO | F7 | Compartir productos/planes vía link. |
| **App Store Optimization (ASO)** | ☐ TODO | F7 | Keywords, descripción, screenshots, vídeo. |
| **Brand assets (logo, iconos N tamaños)** | ☐ TODO | F6, F7 | Hoy sin branding. |
| **Beta testing program** | ☐ TODO | F6, F7 | Web beta cerrada → TestFlight → Play Internal → soft launch. |
| **Analytics de uso** | ☐ TODO | F6 | PostHog o Firebase Analytics. Privacy-first. |
| **Customer support** | ☐ TODO | F6 | Email + formulario in-app. |
| **Documentación usuario / FAQ** | ☐ TODO | F6 | Página de ayuda básica. |
| **Backup / data recovery** | ☐ TODO | F6 | Firestore PITR (Point-in-Time Recovery, plan Blaze). |
| **Admin tools** | ☐ TODO | F6 | Para inspeccionar problemas reportados. Custom claims auth. |

---

## 6. Roadmap

**Estados**: ☐ TODO | ◐ IN PROGRESS | ☑ DONE | ⊘ BLOCKED | ✗ CANCELLED

### Fase 0 — Foundations técnicas
*Setup que NO ata features pero las hace sostenibles. Se hace en paralelo a Fase 1, no la bloquea.*

- ☐ **F0.1** Prettier + husky + lint-staged. Format on commit.
- ☐ **F0.2** ESLint config revisada — **hay ~100 errores heredados** del commit inicial en `src/pages/Training.jsx` y otros (variables sin usar, `routine` usado antes de declararse, etc.). Deuda técnica: limpiar antes de añadir el step de lint al CI.
- ☑ **F0.3** Vitest setup en `functions/`. 76 tests cubriendo: `barcode.ts` (isValidBarcode variantes, normalize), `foodValidation.ts` (happy paths, rejections, skipName option), `rateLimit.ts` (ventanas, isolación per-key, decay de retryAfterMs con fakeTimers), `openfoodfacts.ts` (inferCategory, mapOffProduct nombre es>default>en, optionales, rangos inválidos, fetchFromOpenFoodFacts con global.fetch mockeado incluyendo **regresión del HTTP 404**), `anthropicOcr.ts` (extractJsonObject con markdown wrap, prosa, JSON multi-línea, inválido, arrays rechazados). **Vitest cliente pendiente** — solo functions por ahora.
- ☑ **F0.4** GitHub Actions `ci.yml` con jobs `functions` (build + test) y `client` (build, lint pendiente). Corre en push a main y PRs.
- ☐ **F0.5** Sentry cliente: SDK, init, source maps en build, captura errores no controlados.
- ☐ **F0.6** Componente `<Toast>` global + provider para errores y mensajes user-friendly.
- ☐ **F0.7** Componente `<Skeleton>` reutilizable para loading states.
- ☐ **F0.8** Componente `<EmptyState>` reutilizable (icono + texto + CTA).
- ☐ **F0.9** Documentar en `CLAUDE.md` la disciplina: nuevos componentes con loading + empty + error desde el principio.

> **Nota F0.3 (tests)**: escribir el test `extractJsonObject > throws when there is no object in the text` cazó un bug real en el código original que aceptaba arrays como `RawOcrResult`. Corregido añadiendo verificación `typeof parsed === 'object' && !Array.isArray(parsed)`. Ejemplo canónico de por qué escribir tests antes de que haya bugs en producción merece la pena.

---

### Fase 1 — Custom foods MVP (cliente puro, sin backend)
*Objetivo: usuario puede crear, listar, editar y borrar productos a mano y usarlos en sus comidas. Sin OCR, sin barcode, sin Functions.*
*Independiente de bloqueantes. Arrancable inmediatamente.*

#### C1.1 Extender shape de food ☑
- ☑ Definir JSDoc type `Food` con campos opcionales: `sugars`, `fiber`, `saturated`, `salt`, `servingSize`, `source`, `barcode`, `createdAt`, `updatedAt`.
- ☑ Documentar en comment-block en `food_database.js` el shape completo (predefined + custom unificados).
- ☑ Verificar que `useMacros.calculateItemMacros` funciona igual con campos extra.
- ☑ NO se añade `customFoods` a `planData` — vive en subcolección Firestore (C1.2).

> **Nota C1.1**: commit puramente definicional. Los typedefs JSDoc dan IntelliSense en VSCode sin necesidad de migrar a TS. `calculateItemMacros` actual asume `servingSize: 100` hardcodeado (qty/100); en C1.4 al introducir lookup de customFoods se sustituye por `servingSize ?? 100` para soportar variantes (ej. cereales con servingSize 30g).

#### C1.2 Capa de servicios `src/services/foods.js` ☑
- ☑ Crear `src/services/foods.js`. **Único** sitio del proyecto autorizado a importar `firebase/firestore` para foods.
- ☑ Funciones: `createCustomFood`, `getCustomFood`, `listCustomFoods`, `updateCustomFood`, `deleteCustomFood`, `subscribeCustomFoods`.
- ☑ `generateFoodId(name)`: slug normalizado (NFD + strip diacritics) + sufijo random para evitar colisiones.
- ☑ `validateFood(input)`: campos obligatorios, números >= 0, categoría/unidad en whitelist, barcode con regex EAN, mensajes de error en español.
- ☐ Test unitario de slug generator y validación. **Diferido** a F0.3 (Vitest aún no instalado).

> **Nota C1.2**: el merge en `updateCustomFood` es profundo solo en `macros` (un nivel). Suficiente para nuestro shape. El servicio NO comprueba referencias desde comidas al borrar — el cliente avisa al usuario y la lectura cae en fallback orphan (C1.4).

#### C1.3 Integrar customFoods en `usePlan` (estado + suscripción + actions) ☑
*Decisión de diseño en flight*: en lugar de un hook standalone `useCustomFoods`, integro la suscripción dentro del PlanProvider — mismo patrón que `historyList`, mantiene un único contexto global, evita prop drilling y duplicación de auth state. Consumers usan `usePlan()` y desestructuran `customFoods`.
- ☑ State `customFoods` en `PlanProvider`.
- ☑ Suscripción a `subscribeCustomFoods(uid, ...)` en el effect de auth.
- ☑ Cleanup del unsubscribe (junto con plan e history).
- ☑ Actions: `addCustomFood`, `editCustomFood`, `removeCustomFood` como wrappers del servicio.
- ☑ Expuestos en context value: `customFoods` + las 3 actions.

#### C1.4 Lookup unificado en `useMacros` ☑
- ☑ Helper exportado `findFood(foodId, customFoodsMap)`: predefined → custom → null.
- ☑ Helpers puros `calculateItemMacrosPure` y `sumMacrosPure` que reciben `customFoodsMap` explícito (testables sin React).
- ☑ Hook lee `customFoods` del context, crea `customFoodsMap` memoizado, expone versiones bound de las funciones (API backwards-compatible: `Diet.jsx` no necesita cambios).
- ☑ Soporte `servingSize` con default 100 para g/ml y 1 para resto. Antes asumía 100 hardcoded.
- ☑ Items huérfanos devuelven `{...zero, orphan: true}` en vez de romper el render.
- ☐ Test unitario del lookup (matrix predefinido/custom/no-existe). **Diferido** a F0.3.

> **Nota C1.4**: `dailyConsumed` usa `sumMacrosPure` directo (no la versión bound) para evitar incluir un useCallback en su dependency array. Mismo resultado, dependencias más limpias.

#### C1.5 Página "Mi Nevera" `/fridge` ☑
*Originalmente sub-sección de `/profile`, refactorizada a página propia el 2026-04-10. Ver §3 decisión arquitectónica.*
- ☑ Nueva ruta `/fridge` en `App.jsx`.
- ☑ `src/pages/Fridge.jsx` con header propio (icono Refrigerator + título + back button + botón Nuevo).
- ☑ Listado con cards por categoría (icono, nombre, kcal, P/C/G, serving).
- ☑ Buscador por nombre.
- ☑ Filtro por categoría (chips horizontales).
- ☑ Sort alfabético / recientes.
- ☑ Empty state a página completa con CTA y mención de barcode/foto futuras.
- ☑ Contador "X productos guardados" en el header.
- ☑ Confirmación inline antes de borrar (transforma la card en aviso rose).
- ☑ Botón "Mi Nevera" destacado en la cabecera de `/diet` (link cyan con icono).
- ☑ Eliminado `src/components/MyFridgeSection.jsx` (era el wrapper embebido, ya no necesario).
- ☐ Loading state con skeleton. **Diferido** a F0 (componente `<Skeleton>` reutilizable).

> **Nota C1.5**: el icono `Refrigerator` de lucide-react encaja perfectamente con la marca "Mi Nevera". Color cyan elegido para diferenciarse del resto del menú (azul = nutrición, verde = entreno, ámbar = objetivos, cyan = nevera).

#### C1.6 Modal `CustomFoodModal` con entrada manual ☑
- ☑ `src/components/CustomFoodModal.jsx` con modos `create` y `edit`.
- ☑ Campos: nombre, categoría (chips visuales con FOOD_CATEGORIES), defaultUnit (select), servingSize (auto-ajusta a 100 para g/ml, 1 para resto).
- ☑ Macros principales: calories, protein, carbs, fat (siempre visibles).
- ☑ Macros opcionales (sugars, fiber, saturated, salt) en sección colapsable. Auto-expandida en edit si hay valores.
- ☑ Hint sobre conversión sodio→sal.
- ☑ Validación delegada a `validateFood` del servicio (errores en español, mostrados en footer).
- ☑ A11y: ESC cierra, autofocus primer campo, role dialog, aria-modal, aria-labelledby.
- ☑ Responsive: bottom-sheet en móvil, modal centrado en sm+.
- ☑ Detección dirty con confirm() antes de cerrar.
- ☑ Inputs numéricos con `inputMode="decimal"` para teclado adecuado en móvil, tolerantes a coma decimal española.

#### C1.7 Botón "+ Crear producto" en Diet.jsx ☑
- ☑ Botón "Sparkles + Nuevo" junto al `<select>` de alimento en `StructuredMealEditor`.
- ☑ Abre `CustomFoodModal` en modo create.
- ☑ `availableFoods` incluye custom + predefinidos. Custom va arriba en `<optgroup label="🧊 Mi Nevera">`.
- ☑ `onSaved` callback: pre-selecciona el food recién creado, ajusta unidad y categoría, pre-rellena qty con servingSize si está vacío.
- ☐ Toast de confirmación "Producto creado". **Diferido** a F0.6 (sistema de toasts global).

#### C1.8 Feature flag `entitlements.customFoods` ☑
- ☑ `src/hooks/useEntitlements.js` con shape `{ customFoods, barcodeScan, ocrLabel, smartSuggest, plan }`. Devuelve constantes hardcoded a `true` en dev.
- ☑ `src/components/Gate.jsx` reutilizable con `feature` y `fallback` opcional. Default upsell estilo "Lock + texto Premium".
- ☑ Botón "Nuevo" en `MyFridgeSection` gated: si `canCreate=false` muestra botón disabled "Lock Premium".
- ☑ Botón "Sparkles + Nuevo" en `Diet.jsx` editor también gated con el mismo patrón.
- ☐ Documento `users/{uid}/profile/main` en Firestore. **Diferido** a Fase 6: cuando llegue Stripe webhook, el documento se crea ahí y el hook cambia su origen — los call sites no se tocan.

> **Decisión C1.8 (simplificación)**: en lugar de crear ya el documento Firestore + suscripción + migración, hago una versión lightweight: hook con constantes. Ventaja: cero deuda de datos hoy, infraestructura visible (los call sites están gateados ya), switch a Firestore en Fase 6 = un solo fichero a tocar (`useEntitlements.js`). Anotado en JSDoc del hook como TODO de Fase 6.

**Notas Fase 1**:
- Toda la fase es cliente puro. No requiere Functions ni dependencias nuevas.
- El feature flag se construye desde el principio para no tener que retrofittear gating después.
- Cuando se borra un customFood, las comidas que lo referencian quedan con macros 0 hasta que el usuario edite. Aceptable como MVP. Mejorar en F1.4+ con flag visual `orphan`.

---

### Fase 2 — Backend mínimo + barcode scanner
*Objetivo: Functions desplegadas, `lookupBarcode` operativa, scanner integrado.*
*Bloqueante: Plan Blaze activado.*

- ☑ **C2.0** Activar plan **Blaze** en consola Firebase. *Hecho 2026-04-10.*
- ☑ **C2.1** Estructura `functions/` TypeScript manual (equivalente a `firebase init functions`). Package.json con scripts build/serve/deploy/logs, tsconfig strict, Node 22, firebase-functions ^6.1 + firebase-admin ^12.7.
- ☑ **C2.2** Estructura modular de functions:
  - `src/index.ts` — entry, initializeApp + re-exports (cold-starts pequeños).
  - `src/lib/` — auth, errors, barcode, foodValidation (reusables).
  - `src/services/` — openfoodfacts (API client + mapper + inferencia de categoría).
  - `src/api/` — handlers por función (`lookupBarcode.ts`).
- ☑ **C2.3a** **Validación server-side de customFood** en `functions/src/lib/foodValidation.ts`. Replicada intencionalmente desde el cliente. Aplicada en `lookupBarcode` antes de escribir a `productCache` — protege contra datos incoherentes de OFF que envenenen la caché. Pendiente: aplicar también si en el futuro hay Functions que escriben a `users/{uid}/customFoods`.
- ☑ **C2.3** Function callable `lookupBarcode(code)` (`europe-west1`, 256 MiB, maxInstances 10):
  - Auth obligatoria vía `requireAuth(request)`.
  - Validación barcode con regex `^\d{8,14}$`.
  - Cadena: `productCache/{barcode}` → API OFF v2 live → mapper → validación server-side → upsert en cache.
  - Mapper (`mapOffProduct`) extrae nombre (es > default > en), marca, imagen, nutriments, infiere categoría con regex sobre `categories_tags`.
  - Errores con `details.code` estables (`BARCODE_NOT_FOUND`, `OFF_UNAVAILABLE`, `BARCODE_INVALID`, `NOT_AUTHENTICATED`).
  - Logging structured con `firebase-functions/v2 logger` incluyendo uid y barcode.
  - Timeout OFF 8s con AbortController.
- ☑ **C2.4** `firestore.rules` NUEVO con multi-tenant estricto (`users/{uid}/**` solo owner), `offProducts`/`productCache` read auth write false, `_meta` read público. `firebase.json` y `.firebaserc` NUEVOS.
- ☑ **C2.5** Cliente: `@zxing/browser` instalado como dep.
- ☑ **C2.6** Componente `src/components/BarcodeScanner.jsx` con import dinámico de `@zxing/browser` (lazy → chunk separado 412 KB, confirmado en build).
  - Permisos: detecta NotAllowedError, NotFoundError, NotReadableError con mensajes en español.
  - Usa `decodeFromVideoDevice(undefined, …)` que selecciona cámara trasera por defecto en móvil.
  - Overlay visual con marco cyan + corner markers + línea animada.
  - Guarda `controls` para poder `.stop()` en unmount — previene leaks de stream.
- ☑ **C2.7** Integración en `CustomFoodModal`:
  - Source picker top (barcode / foto / manual) solo en modo create.
  - Foto deshabilitada con "Próximamente" (Fase 3).
  - Handler `handleBarcodeDetected` llama al servicio, rellena form, abre opcionales si vienen datos, muestra notice de éxito.
  - En NOT_FOUND muestra notice amber y pre-rellena solo el barcode en el form, el usuario completa a mano.
  - Notice con Info icon y colores por kind (info=cyan, warn=amber).
  - Añadidos fields `brand` (input editable) y `barcode` (badge read-only con botón "Quitar").
- ☑ **C2.8** Cache de sesión en `src/services/barcode.js` — Map en memoria con TTL 10 min, evita re-llamar Function en re-escaneos inmediatos. Eviction por TTL lazy, clearBarcodeSessionCache exportado para logout futuro.
- ☑ **C2.9** Manejo de errores end-to-end:
  - NOT_FOUND, UNAVAILABLE, INVALID, permisos cámara denegados, lazy-load fallido → todos con mensajes localizados.
  - **Retry automático en `barcode.js`**: hasta 2 reintentos con backoff lineal 800ms·n solo para errores transitorios (`OFF_UNAVAILABLE`, `functions/unavailable`, `deadline-exceeded`, `internal`). NOT_FOUND e INVALID NO se reintentan (sería desperdicio). Transparente para la UI.
  - Form reset en todos los errores para no dejar datos residuales entre escaneos (fix 2026-04-10).
  - Pendiente "guardar intento offline" para cuando no hay red — diferido, requiere infra de cola local.
- ☐ **C2.10** Cost monitoring: budget alerts. **Acción del usuario** (no es código). Pasos:
  1. Firebase Console → Settings (⚙) → Usage and billing → Details & settings → Modify plan → abre Google Cloud Console Billing.
  2. En GCP: Billing → Budgets & alerts → Create budget.
  3. **Budget 1 — Firebase total**: Scope = project `fitness-6d907`, Amount = **5 €/mes**, alerts al 50%/90%/100%.
  4. **Budget 2 — Solo Anthropic** (recomendado para vigilar el coste de OCR por separado): no aplicable desde GCP porque Anthropic no factura ahí. Vigilar directamente en console.anthropic.com → Usage, configurar "monthly usage limit" en los Settings de la organización a **10$/mes** como techo.
  5. Email de notificación al correo del propietario. Alertas al 50%/90%/100% del budget.

**Despliegue pendiente** (acción del usuario):
1. `npm run build` dentro de `functions/` — ya verificado limpio.
2. `firebase login` (si no lo ha hecho, interactivo).
3. `firebase deploy --only firestore:rules,firestore:indexes` — despliega las reglas.
4. `firebase deploy --only functions` — despliega `lookupBarcode`.
5. (Opcional emulators) `firebase emulators:start --only functions,firestore,auth` + en el cliente `VITE_USE_FIREBASE_EMULATOR=true npm run dev`.

**Notas Fase 2**:
- Sin mirror todavía, depende del API live de OFF para la primera consulta de cada producto. Aceptable porque cada producto se cachea de por vida en `productCache` tras la primera vez.
- El mirror nocturno llega en Fase 4. Arrancamos barebones, mejoramos después.
- `lookupBarcode` no usa rate limiting explícito; la protección viene de `maxInstances: 10` + que cada producto se cachea tras la primera consulta (no hay forma de un user malicioso "quemar" coste llamando repetidamente al mismo barcode).

---

### Fase 3 — OCR de etiqueta vía Claude Haiku
*Objetivo: usuario hace foto a etiqueta, recibe macros parseados, los revisa y confirma.*
*Bloqueante: API key Anthropic.*

> **Decisión UX (2026-04-10)**: cuando el flujo de barcode devuelve `BARCODE_NOT_FOUND`, la opción recomendada debe ser **"Foto de la etiqueta"** (no "manual"). El relleno manual queda como último recurso. Hoy el mensaje ya menciona que la foto está "muy pronto disponible"; al implementar Fase 3 hay que:
> - Actualizar el texto del notice NOT_FOUND para decir "Haz una foto a la etiqueta" (sin el "próximamente").
> - Destacar visualmente el botón "Foto" en el source picker cuando el notice NOT_FOUND esté activo (border amber animado o similar), guiando al usuario al siguiente paso natural.
> - Considerar auto-enfocar / auto-scroll al botón Foto, o incluso auto-trigger el picker de imagen si la UX lo permite sin ser intrusivo.

- ☑ **C3.0** Obtener API key Anthropic. *Hecha por el usuario 2026-04-10.*
- ☑ **C3.0a** Cargar el secret en Firebase: `firebase functions:secrets:set ANTHROPIC_API_KEY` (vía `--data-file` con temporal). **Version 1** del secret creada 2026-04-10. Service account de Functions recibió `roles/secretmanager.secretAccessor` automáticamente al desplegar `ocrLabel`.
- ☑ **C3.1** Function callable `ocrLabel` (europe-west1, 512 MiB, maxInstances 10, timeout 60s, `secrets: [ANTHROPIC_API_KEY]`):
  - Auth obligatoria.
  - Rate limit per user (5/min, 50/día) en memoria vía `lib/rateLimit.ts` (per-instance, best-effort; aceptable para MVP).
  - Imagen máx 4 MB base64 (~3 MB real). Validación mimeType (jpeg/png/webp).
  - Sanitiza accidentales data URL prefixes (`data:image/jpeg;base64,...`).
  - Llama a `services/anthropicOcr.ts` → Claude Haiku 4.5 con visión → parsea JSON → mapea a shape interno.
  - Errores estables con `details.code`: `OCR_NOT_A_LABEL`, `OCR_INCOMPLETE`, `OCR_API_ERROR`, `RATE_LIMITED`, `IMAGE_TOO_LARGE`, `IMAGE_INVALID`.
  - Si viene `hintBarcode` (flujo post-NOT_FOUND de lookupBarcode), lo asocia al food.
  - Validación server-side del food extraído antes de devolver.
- ☑ **C3.2** Prompt engineering inicial en `anthropicOcr.ts`: system prompt con schema estricto, reglas de conversión (kJ→kcal, sodio→sal, coma decimal europea), instrucciones de "never invent" y manejo de "isLabel: false". **Actualizado 2026-04-10**: `productName` eliminado del schema porque el nombre del producto casi nunca aparece en la tabla nutricional (está en la parte delantera del envase). Ahora el nombre lo rellena el usuario manualmente. El servidor envía `name: ''` y `validateFoodServerSide` se llama con `{ skipName: true }`.
- ☑ **C3.3** Cliente:
  - `src/services/ocr.js` con `preprocessImage(file)` y `ocrLabelFromBase64(base64, mimeType, hintBarcode?)`.
  - Preprocesado con `createImageBitmap({ imageOrientation: 'from-image' })` + Canvas resize a max 1200px + `toBlob` JPEG quality 0.85 + `FileReader.readAsDataURL` para base64. Fallback sin EXIF si el browser no soporta.
  - En `CustomFoodModal.jsx`: botón "Foto" activado (antes disabled/comingSoon), `<input type="file" accept="image/*" capture="environment">` oculto disparado por ref, handler `handleFileSelected` que preprocesa, llama a `ocrLabelFromBase64`, rellena form y muestra notice con confidence.
  - En móvil, `capture="environment"` abre directamente la cámara trasera; en desktop abre el file picker.
- ☑ **C3.4** Pantalla de revisión editable: **ya existe** — es el mismo form del modal. Los campos con baja confianza no están resaltados visualmente (el modelo solo devuelve un `confidence` global, no per-field). **Deuda**: resaltar fields específicos requeriría que el prompt pida `confidence` per-field.
- ☑ **C3.5** Manejo errores end-to-end:
  - `NOT_A_LABEL` → notice warn "No reconocemos esta imagen como etiqueta nutricional".
  - `INCOMPLETE` → notice warn "No pudimos leer todos los valores. Prueba con mejor luz/más cerca".
  - `RATE_LIMITED` → notice warn con tiempo de espera.
  - `IMAGE_TOO_LARGE`/`IMAGE_INVALID` → notice warn.
  - `API_ERROR` → notice warn "Servicio OCR no disponible".
- ☐ **C3.6** Telemetría de diff (user-editó vs OCR): **diferido**. Para iterar el prompt con datos reales. Pendiente.

**Notas Fase 3**:
- Coste estimado con Claude Haiku 4.5: ~$0.001 por imagen (imagen optimizada ~500 KB + ~200 tokens de respuesta). 1000 escaneos/mes = $1.
- El prompt está en inglés pero pide salida en nombres de campos inglés — el modelo igualmente lee etiquetas en español/catalán/inglés/francés sin problema. Si detectamos fallos con labels en idiomas raros, localizar el prompt.
- El rate limit en memoria es lax: con `maxInstances: 10`, un usuario puede hacer hasta 50 req/min y 500 req/día en el peor caso. Suficiente para MVP; endurecer con Firestore cuando haya abuso real.
- La imagen **NO se guarda** en ningún sitio — solo vive en memoria durante la request y se descarta al terminar. Sin Firebase Storage, sin logs de la imagen.
- Opcional futuro: preservar la imagen en `<img>` visible al lado del form mientras el usuario revisa, para poder comparar valor-a-valor. Hoy el form pierde la referencia visual al confirmar.

**Notas Fase 3**:
- El preprocesado cliente es **importante para coste**: subir imagen 4 MB original = 4x más caro y lento que 200 KB optimizada. Mismo resultado de OCR.
- "Imagen no parece etiqueta" = prompt al modelo "si no es una etiqueta nutricional, devuelve `{error: 'NOT_A_LABEL'}`".

---

### Fase 4 — OFF mirror nocturno
*Objetivo: tener copia local de productos OFF, refrescada cada noche, para no depender del API live de OFF.*
*La pieza más grande, pero independiente del usuario final.*

> **Estado actual (2026-04-10)**: **NADA DE ESTO EXISTE AÚN**. Hoy `lookupBarcode` solo tiene el cache perezoso `productCache` (se puebla orgánicamente con escaneos reales) y llama al API live de OFF en cada miss. Lo que ves en Firestore bajo `productCache/` son únicamente los productos que alguien ya ha escaneado. Cuando se implemente esta fase, aparecerá una colección nueva `offProducts/` con ~30-80k productos españoles pre-cacheados y `lookupBarcode` la consultará antes que `productCache`.

- ☐ **C4.1** Function scheduled `nightlyOFFSync` (`pubsub.schedule('0 3 * * *', timezone='Europe/Madrid')`).
  - **Generation 2** (necesaria por timeout largo: 1st gen = 9 min máx, 2nd gen = 60 min).
  - Memory: 2 GB (streaming pero seguros).
- ☐ **C4.2** Pipeline:
  - Descarga `openfoodfacts-products.jsonl.gz` con streaming HTTP (no carga todo en RAM).
  - Decompress on the fly con `zlib.createGunzip()`.
  - Parse línea a línea con `readline`.
  - Filtros:
    - `countries_tags` contiene `en:spain` (configurable, expandible).
    - `nutriments` contiene mínimos: `energy-kcal_100g`, `proteins_100g`, `carbohydrates_100g`, `fat_100g`.
    - `product_name` no vacío.
    - Opcional: popularidad mínima si filtra demasiado bajo.
  - Mapping a shape interno (mismo que customFoods).
  - Upsert por **batches de 500** en `offProducts/{barcode}` (Firestore batch limit).
  - **Deduplicación**: mismo barcode aparece varias veces en el dump, quedarse con el más reciente / más completo.
- ☐ **C4.3** Estado del sync en `_meta/offSync`: `{ lastRunAt, status, itemsProcessed, itemsInserted, itemsSkipped, errors[], dumpVersion }`.
- ☐ **C4.4** Retomar sync interrumpido: si la function muere a mitad, próximo run lee `_meta/offSync.lastProcessedLine` y arranca desde ahí. (O simplemente reprocesa todo si es idempotente, lo que es).
- ☐ **C4.5** Primera ejecución manual con dataset reducido (top 1000) para validar pipeline antes de soltar el sync nocturno completo.
- ☐ **C4.6** Modificar `lookupBarcode` (Fase 2) para consultar `offProducts` ANTES que cache/API live.
- ☐ **C4.7** Cliente: opcional, lectura directa de `offProducts/{barcode}` para tener cache offline gratis vía SDK Firestore (lookup sin Function).
- ☐ **C4.8** Atribución ODbL en footer global + página "Acerca de" con texto:
  > Información de productos por Open Food Facts contributors, disponible bajo Open Database License (ODbL).
- ☐ **C4.9** Monitoring: alerta si el sync nocturno falla 2 veces seguidas. Email a admin.
- ☐ **C4.10** Retention: borrar productos del mirror que llevan 30 días sin aparecer en el dump (productos retirados).

**Notas Fase 4**:
- 50-100k productos × ~5 KB = 250-500 MB Firestore. Coste storage: ~$0.10/mes.
- Costo Functions: ~$0.05 por ejecución (1 hora 2nd gen 2GB RAM). 30/mes = $1.50/mes.
- Total: irrisorio para producto serio.
- Expansión geográfica futura: parámetro `COUNTRIES = ['es', 'fr', 'it']`. Cuando llegue.

---

### Fase 5 — Sugeridor de cantidades (algoritmo local)
*Premium feature. JS puro, sin LLM.*

- ☐ **C5.1** Función `suggestQuantities(meal, targets)`:
  - Inputs: items con macros y cantidad actual, targets de macros (kcal, p, c, f).
  - Algoritmo: escalado proporcional inicial, refinable a programación lineal con constraints (mín/máx por item, locked items).
  - Output: array `[{ itemId, currentQty, suggestedQty, deltaPct }]`.
- ☐ **C5.2** Edge cases: items en piezas (huevo, fruta) → sugerir múltiplos enteros, no 1.7 huevos.
- ☐ **C5.3** UI panel sugerencias en `Diet.jsx`:
  - Botón "Optimizar comida" debajo de los items.
  - Modal con propuesta lado a lado (actual vs sugerido).
  - Cada item con switch para incluirlo o lockearlo.
  - Botón "Aplicar".
- ☐ **C5.4** Gating: tras `entitlements.smartSuggest`.

**Notas Fase 5**:
- Empezar con escalado proporcional simple. Si los resultados son malos, evolucionar a optimización con `javascript-lp-solver` o similar.
- No bloquear publicación si esta fase no está pulida — es premium.

---

### Fase 6 — Pre-publicación (PWA + Auth + Pagos + Compliance)
*Bloqueante para cualquier release pública. La fase más densa.*

#### Auth
- ☐ **C6.1** Auth con **Email/Password**, **Google**, **Apple Sign-In** (obligatorio para iOS si hay otros).
- ☐ **C6.2** Flujo de **linking anónima → cuenta real** (mantiene plan, customFoods, history).
- ☐ **C6.3** Email verification flow.
- ☐ **C6.4** Password reset flow.
- ☐ **C6.5** Pantalla "Mi cuenta" en /profile: email, proveedor, cambiar password, logout.

#### PWA
- ☐ **C6.6** `manifest.json` completo (name, short_name, icons múltiples, theme_color, display, start_url, scope).
- ☐ **C6.7** Service worker con Workbox: precache assets, runtime cache imágenes, offline fallback.
- ☐ **C6.8** Iconos en todos los tamaños (192, 512, maskable, apple-touch-icon).
- ☐ **C6.9** Splash screens iOS.
- ☐ **C6.10** Lighthouse PWA audit > 90.

#### Pagos
- ☐ **C6.11** Setup Stripe: productos, precios (mensual + anual), checkout session.
- ☐ **C6.12** Function `createCheckoutSession({ priceId })` callable.
- ☐ **C6.13** Webhook Stripe `/stripeWebhook` (con verificación firma) que actualiza `users/{uid}/profile/main.subscription`.
- ☐ **C6.14** Función `cancelSubscription` callable.
- ☐ **C6.15** Customer Portal Stripe (gestión auto-servicio: facturas, cambiar tarjeta, cancelar).
- ☐ **C6.16** Free trial 7 días (decisión pendiente §17).
- ☐ **C6.17** Manejo de fallos de pago: grace period 3 días antes de degradar a free.
- ☐ **C6.18** Pantalla "Suscripción" en /profile: estado actual, próximo cobro, gestionar.
- ☐ **C6.19** Conectar `<Gate>` a estado real de suscripción (deja de ser hardcoded).

#### Compliance + Legal
- ☐ **C6.20** **Health disclaimer** prominente: pantalla inicial al primer login y página "Acerca de". Texto revisado: "Esta app no proporciona consejo médico. Consulta un profesional sanitario antes de cambios significativos en dieta o ejercicio."
- ☐ **C6.21** Política de privacidad (generador + revisión humana). Lista de datos recogidos, terceros, retención, derechos GDPR.
- ☐ **C6.22** Términos de servicio.
- ☐ **C6.23** Página "Acerca de" con: versión, créditos, atribuciones ODbL, links legales.
- ☐ **C6.24** Function `deleteMyAccount`: borra plan, customFoods, history, profile, subscription Stripe, auth user. Confirmación doble.
- ☐ **C6.25** Function `exportMyData`: ZIP con JSON de todo. Email al usuario.
- ☐ **C6.26** Cookie banner (si usamos analytics o cookies de terceros).
- ☐ **C6.27** DPAs firmados con Firebase (Google), Anthropic, Stripe — formularios online estándar.
- ☐ **C6.28** Age gate: declarar 13+ en stores, mensaje al registrarse.

#### UX / Polish / Quality
- ☐ **C6.29** Onboarding flow primer launch (4-5 pantallas: bienvenida, perfil básico, primer plan, listo).
- ☐ **C6.30** Empty states de TODAS las pantallas revisados.
- ☐ **C6.31** Loading states con skeletons en TODAS las cargas async.
- ☐ **C6.32** Error states con toasts globales.
- ☐ **C6.33** Offline indicator en cabecera + banners en acciones que requieren red.
- ☐ **C6.34** A11y audit: focus trap modales, ARIA labels, contraste WCAG AA, navegación teclado.
- ☐ **C6.35** Performance audit: bundle < 300 KB inicial, lazy load rutas grandes, Lighthouse > 90.
- ☐ **C6.36** **i18n**: extraer strings a `locales/es.json`, `locales/en.json`. Setup `react-i18next`. Mínimo ES + EN.
- ☐ **C6.37** Unidades locales: g/oz, ml/floz, kg/lb, kcal/kJ. Setting en perfil.

#### Operaciones / Soporte
- ☐ **C6.38** Sentry release tracking + source maps de producción.
- ☐ **C6.39** Firebase Analytics o PostHog: eventos clave (signup, plan creado, customFood creado, subscription started, churn).
- ☐ **C6.40** Email transaccional (welcome, password reset, payment failed) con Firebase Extension o Resend.
- ☐ **C6.41** Customer support: formulario `/contact` o link a email. Auto-respuesta.
- ☐ **C6.42** Página "Ayuda / FAQ" con preguntas comunes.
- ☐ **C6.43** Admin tool: panel interno (custom claims auth) para inspeccionar usuarios reportando bugs.
- ☐ **C6.44** Backup: activar Firestore PITR (Point-in-Time Recovery) en plan Blaze.

#### Beta
- ☐ **C6.45** Beta cerrada web: invitación por email, código de acceso, formulario de feedback in-app.
- ☐ **C6.46** Iterar 2-3 ciclos de feedback antes de soft launch.

---

### Fase 7 — Mobile (React Native + Expo) y stores

#### Estructura
- ☐ **C7.1** Decidir monorepo vs repos separados. **Recomendación previa**: monorepo con npm workspaces o Turborepo (`apps/web`, `apps/mobile`, `packages/core`).
- ☐ **C7.2** Mover lógica reusable a `packages/core`: hooks, services, parsers, types, constants. Cero dependencias de DOM.

#### Setup Expo
- ☐ **C7.3** `npx create-expo-app apps/mobile`. SDK más reciente.
- ☐ **C7.4** `expo-router` para navegación file-based.
- ☐ **C7.5** `nativewind` para Tailwind en RN.
- ☐ **C7.6** `@react-native-firebase/app + auth + firestore + functions`. Config con `google-services.json` y `GoogleService-Info.plist`.
- ☐ **C7.7** Reusar `packages/core` desde la app.

#### UI mobile
- ☐ **C7.8** Reescribir componentes UI con primitives RN. Mantener estructura de pantallas similar a web.
- ☐ **C7.9** Bottom tab navigation con `expo-router`.
- ☐ **C7.10** Modales nativos (`react-native-modal` o nativo).
- ☐ **C7.11** Theming consistente con web.

#### Integraciones nativas
- ☐ **C7.12** Cámara con `expo-camera`.
- ☐ **C7.13** Barcode con `expo-barcode-scanner` (reemplaza @zxing).
- ☐ **C7.14** Image picker con `expo-image-picker`.
- ☐ **C7.15** Push notifications con `expo-notifications` + FCM.
- ☐ **C7.16** Apple Health con `react-native-health`. Lectura peso, calorías, pasos.
- ☐ **C7.17** Google Fit con `react-native-google-fit`.

#### Pagos mobile (RevenueCat)
- ☐ **C7.18** Setup RevenueCat: dashboard, productos en App Store Connect y Google Play Console.
- ☐ **C7.19** SDK `react-native-purchases`. Identify user con uid Firebase.
- ☐ **C7.20** Webhook RevenueCat → Function que actualiza `users/{uid}/profile/main.subscription`. Una sola fuente de verdad.
- ☐ **C7.21** Migración del estado de suscripción web (Stripe) → RevenueCat unified.
- ☐ **C7.22** Restore purchases flow.

#### Stores compliance
- ☐ **C7.23** App Store Connect: app id, bundle id, certificados, perfiles aprovisionamiento.
- ☐ **C7.24** Google Play Console: app id, signing, internal testing track.
- ☐ **C7.25** **Privacy Manifest** (Apple, obligatorio desde 2024). Declarar APIs sensibles y datos.
- ☐ **C7.26** **Required Reason API** declarations (Apple).
- ☐ **C7.27** **Privacy nutrition label** App Store: data types collected, purposes.
- ☐ **C7.28** **App Tracking Transparency** prompt (probablemente "no track" para esta app).
- ☐ **C7.29** Google Play Data Safety form.
- ☐ **C7.30** Iconos en todos los tamaños (Asset Catalog iOS + mipmap Android).
- ☐ **C7.31** Splash screens.
- ☐ **C7.32** Screenshots para stores (mínimo 3 device sizes, mínimo 3 screenshots cada uno).
- ☐ **C7.33** App description, keywords, ASO research.

#### Build & release
- ☐ **C7.34** EAS Build: perfiles `development`, `preview`, `production`.
- ☐ **C7.35** EAS Submit: configuración para envío automático tras build.
- ☐ **C7.36** **TestFlight** beta interna y externa.
- ☐ **C7.37** **Google Play Internal Testing** track.
- ☐ **C7.38** Beta cerrada con beta testers reales (10-30 personas).
- ☐ **C7.39** Submit a review Apple. Iterar feedback típico (rejection rate ~30% primera vez).
- ☐ **C7.40** Submit a review Google.
- ☐ **C7.41** Soft launch en mercado pequeño (España solo) antes de internacional.

---

## 7. Pre-publication checklist (gate antes de cualquier release pública)

Hay que tener TODO esto en verde antes de invitar a un usuario externo:

### Producto
- ☐ Onboarding funciona end-to-end sin atascos
- ☐ Empty states en todas las pantallas
- ☐ Loading states en todas las pantallas
- ☐ Error states / toasts globales
- ☐ Offline indicator funcional
- ☐ Health disclaimer visible
- ☐ Versión visible en algún lugar de la app (about page)

### Datos / Cuenta
- ☐ Auth con email/Google/Apple
- ☐ Linking anónima → real funciona
- ☐ Borrado de cuenta funciona y borra todo
- ☐ Exportación de datos funciona
- ☐ Política de privacidad publicada y linkeada
- ☐ Términos de servicio publicados y linkeados

### Pagos
- ☐ Checkout funciona end-to-end
- ☐ Webhook actualiza estado correctamente
- ☐ Customer portal accesible
- ☐ Cancelación funciona
- ☐ Grace period configurado

### Calidad
- ☐ Lighthouse > 90 en todas las categorías web
- ☐ Bundle inicial < 300 KB gzipped
- ☐ Sin warnings en consola producción
- ☐ Sentry capturando y agrupando errores correctamente
- ☐ A11y audit pasado
- ☐ Tested en Chrome, Safari, Firefox, Edge
- ☐ Tested en iPhone Safari real, Android Chrome real

### Operaciones
- ☐ Backup PITR activado
- ☐ Budget alerts Firebase configuradas
- ☐ Budget alerts Anthropic configuradas
- ☐ Reglas Firestore auditadas con simulador
- ☐ Secrets en Firebase secrets manager (no en código)
- ☐ Sync nocturno OFF estable durante mínimo 7 días
- ☐ Customer support funcional

### Legal
- ☐ DPAs firmados (Firebase, Anthropic, Stripe)
- ☐ GDPR: derechos garantizados (acceso, borrado, portabilidad, rectificación)
- ☐ Cookie banner si aplica
- ☐ Health disclaimer en pantalla inicial
- ☐ Atribución ODbL visible

---

## 8. Consideraciones futuras (fuera de scope inmediato)

- **Sincronización offline avanzada en mobile**: Firestore tiene cache offline persistente built-in pero con límites. Para mobile robusto valorar Realm o SQLite local con sync custom.
- **Búsqueda semántica de alimentos**: con base grande, búsqueda por embeddings. Postgres + pgvector si migramos a Supabase, o Algolia SaaS.
- **Sugeridor con LLM**: cuando el algoritmo local de F5 quede corto, fallback a Claude.
- **Compartir planes entre usuarios**: feature social. Modelo de visibilidad pública/privada en customFoods y planes.
- **Coach virtual / chatbot**: chat con Claude que conozca el plan del usuario. Punto natural para el `buildAIContext()` ya pendiente en DEVLOG.
- **Watch apps**: Apple Watch / Wear OS. Logging rápido, recordatorios.
- **Integración con apps de delivery / supermercados**: lista de la compra automática.
- **Analítica de progreso a largo plazo**: gráficas de medidas, fotos progreso, comparativas mes a mes.
- **Recetas** como agrupación de ingredientes con macros pre-calculados.
- **Plan generator**: dado objetivos + preferencias, generar plan automáticamente con Claude.

---

## 9. Decisiones pendientes

- ☐ **TypeScript frontend**: ¿migramos? Mi recomendación: **sí, en Fase 6** (antes de stores). Frontend en JS para MVP es OK porque es 1 dev. Para multi-user serio, TS reduce bugs significativamente. Migración progresiva fichero a fichero, no big bang.
- ☐ **Pricing concreto**: precio mensual y anual de premium. Free trial sí/no. Cuántos días.
- ☐ **Free tier exacto**: ¿N customFoods gratis como teaser? Mi propuesta: 3 gratis.
- ☐ **Branding**: nombre comercial del producto, logo, paleta. Hoy sin nombre.
- ☐ **Dominio web propio** o seguir con `*.firebaseapp.com`.
- ☐ **Mercados objetivo iniciales**: España solo o desde el inicio España + LATAM + UK?
- ☐ **Política de soporte**: tiempo de respuesta SLA, canales (email solo o también chat).
- ☐ **Modelo de monetización a futuro**: ¿solo premium subscription o también one-time purchases / créditos?

---

## 10. Bloqueantes activos

- ☑ ~~Plan Blaze de Firebase no activado~~. **Resuelto 2026-04-10**: usuario lo activó. Fase 2+ desbloqueada.
- 🔥 **API key Anthropic comprometida** (2026-04-10): la primera key generada se pasó por chat en plano. **Acción urgente del usuario**: rotarla en console.anthropic.com → Settings → API Keys → revocar la antigua + generar nueva. La nueva NO se debe pegar en chats; se cargará en producción con `firebase functions:secrets:set ANTHROPIC_API_KEY` (comando interactivo, no toca ningún fichero del repo) y en dev local en `functions/.env.local` (gitignored desde ya). Mientras tanto, la key actual sigue siendo válida pero NO debe usarse para nada productivo.
- ⚠ **Decisión TypeScript frontend** pendiente §9. No bloquea Fase 1, pero sí condiciona cómo escribimos código nuevo.

---

## 11. Cómo usar este documento

1. **Antes de empezar una sesión de trabajo**: leer la fase activa y los bloqueantes.
2. **Al cerrar una tarea**: marcar ☑ y añadir nota debajo si hay algo que recordar (problema, decisión sobre la marcha, deuda).
3. **Al tomar una decisión arquitectónica nueva**: añadir entrada en §3 con fecha.
4. **Al cambiar el roadmap**: editar las fases y dejar nota del por qué.
5. **Al desbloquear/bloquear algo**: actualizar §10.
6. **Al descubrir un cross-cutting concern nuevo**: añadirlo a §5.
7. **Para historial detallado de commits**: ver `DEVLOG.md` (cronológico inverso).

---

*Última actualización: 2026-04-09 — expansión exhaustiva con cross-cutting concerns, Fase 0 foundations, detalle granular por fase, pre-publication checklist, y consideraciones legales/compliance.*

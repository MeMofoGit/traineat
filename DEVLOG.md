# DEVLOG

Bitácora de desarrollo. Lo más reciente arriba. Lee las últimas 3-5 entradas antes de tocar nada para no contradecir decisiones previas. Formato y reglas en `CLAUDE.md`.

> Para roadmap, decisiones arquitectónicas y estado de tareas pendientes ver **`PROJECT_PLAN.md`**. Este DEVLOG es el log cronológico de cambios concretos por sesión/commit.

---

## 2026-04-10 — Tooling: sub-agentes Claude Code + Playwright MCP + bloqueantes resueltos

**Contexto**: Igor activó plan Blaze de Firebase y obtuvo API key de Anthropic, desbloqueando Fase 2+ y Fase 3. También pidió auto-configurar sub-agentes y MCPs útiles para el flujo de desarrollo.

**Cambio**:
- `.claude/agents/plan-keeper.md` — **NUEVO**. Sub-agente que mantiene PROJECT_PLAN.md y DEVLOG.md sincronizados. Lee ambos al invocarse, mapea trabajo descrito a tareas, marca status, añade notas y devlog entries con formato consistente. Modelo: sonnet. Tools: Read, Edit, Grep, Glob.
- `.claude/agents/firebase-security-reviewer.md` — **NUEVO**. Sub-agente que audita firestore.rules y functions/ buscando vulnerabilidades multi-tenant, validación, secrets en código, webhook signatures, rate limits, OWASP-style. Modelo: opus (decisiones de seguridad merecen el modelo más capaz). Tools: Read, Grep, Glob, Bash. Output formato estructurado con verdict + critical/warnings/suggestions.
- `.claude/agents/food-data-validator.md` — **NUEVO**. Sub-agente que valida coherencia nutricional de productos parseados (de OCR Claude Haiku, de OFF mirror, etc.) antes de guardarlos. Aplica regla Atwater (kcal ≈ 4P+4C+9F ±15%), sub-macro hierarchy (sugars ≤ carbs, saturated ≤ fat), rangos plausibles, coherencia categoría↔macros. Modelo: haiku (es validación de patrones, no necesita razonamiento profundo). Tool: Read.
- `.mcp.json` — **NUEVO**. Config MCP project-scoped con Playwright MCP (`npx @playwright/mcp@latest`). Permite automatización de browser para testing E2E manual de la SPA.
- `.gitignore` — Refinado: ahora `.claude/settings.local.json` se ignora (personal del usuario) pero `.claude/agents/` y `.mcp.json` SÍ se commitean (config compartible del proyecto). `.agent/` (de Cursor/Windsurf, no de Claude Code) sigue ignorado. Añadidas reglas preventivas para `functions/.env*` y `functions/.runtimeconfig.json` ante el inicio futuro de Functions.
- `PROJECT_PLAN.md` — Bloqueante Blaze marcado como resuelto (☑). C2.0 marcado como hecho. Bloqueante de API key reescrito como **🔥 comprometida** (ver Notas). Stack actualizado con sección "Tooling de desarrollo" listando los 3 agentes y el MCP.

**Por qué así**:
- **Tres sub-agentes, no más**: la tentación es crear 10 agentes especulativos. Elegí 3 alineados con necesidades reales del roadmap. plan-keeper (necesidad continua, actual), firebase-security-reviewer (necesidad fuerte cuando arranque F2), food-data-validator (necesidad cuando arranque F3 OCR). Cada uno con un trigger claro y un output estructurado.
- **Modelos diferentes por agente**: opus para seguridad (decisiones críticas), sonnet para plan-keeper (balance), haiku para validador de datos (patrones simples y verificables). Esto optimiza coste sin perder calidad donde importa.
- **`.claude/agents/` no `.agent/`**: el directorio `.agent/` que ya existía es de Cursor/Windsurf (frontmatter `trigger: always_on`). Claude Code solo reconoce sub-agentes en `.claude/agents/`. Lo dejé claro al usuario, no toqué `.agent/rules/perfil.md` (sigue siendo válido para esa otra herramienta).
- **Playwright MCP solo, no más**: la regla del minimalismo. Filesystem MCP es redundante con las tools de Claude Code, Git MCP es redundante con Bash, los demás añaden ruido. Playwright sí aporta porque permite probar la SPA en navegador real (rellenar formularios, hacer clicks, screenshots) que con las tools básicas no se puede.
- **API key NO se guardó en ningún fichero del repo**. Cuando arranque Fase 2 (functions/), se cargará vía `firebase functions:secrets:set ANTHROPIC_API_KEY` (Google Secret Manager, sin tocar ficheros) en producción y `functions/.env.local` (gitignored) en dev local.

**Notas**:
- 🔥 **API key Anthropic comprometida**: Igor pegó la primera key generada en plano en el chat. Aunque no se guardó en ningún fichero del repo, queda en logs de conversación. **Acción urgente para Igor**: rotarla en console.anthropic.com (revocar antigua + generar nueva) ANTES de cualquier uso productivo. La nueva key debe meterse SOLO vía `firebase functions:secrets:set` o `.env.local` gitignored, nunca por chat.
- Para que los agentes funcionen, hay que reiniciar la sesión de Claude Code para que se cargue el directorio `.claude/agents/`.
- Para que el MCP Playwright funcione, Claude Code lo arranca automáticamente al detectar `.mcp.json` (si el usuario aprueba la primera vez la ejecución del binario).
- Próxima sesión: arrancar **Fase 2** (`firebase init functions` + lookupBarcode), ya desbloqueada por Blaze.

---

## 2026-04-10 — Mi Nevera movida a página propia bajo Diet

**Contexto**: tras montar Mi Nevera como sub-sección dentro de `/profile` (ver entrada anterior), Igor pidió moverla a la sección de Dieta porque encaja mejor semánticamente — los productos personalizados son herramientas del editor de comidas, no datos de perfil.

**Cambio**:
- `src/pages/Fridge.jsx` — **NUEVO**. Página completa con header propio (icono Refrigerator + título + back + botón Nuevo), búsqueda, filtros, sort, lista, empty state. Misma lógica que el componente anterior pero con layout de página (padding generoso, tipografía mayor, empty state ocupando media pantalla).
- `src/App.jsx` — Nueva ruta `<Route path="fridge" element={<Fridge />} />`.
- `src/pages/Profile.jsx` — Eliminada la importación y montaje de `<MyFridgeSection />`. Profile vuelve a ser exclusivamente perfil de usuario.
- `src/pages/Diet.jsx` — Cabecera reorganizada: ahora tiene dos filas. Fila 1 = título "Tu Nutrición" + toggle entreno/descanso (igual que antes). Fila 2 = botón destacado tipo card cyan que linkea a `/fridge` con icono Refrigerator + título + descripción + flecha "Abrir →".
- `src/components/MyFridgeSection.jsx` — **BORRADO**. Era el wrapper embebido, ya no se usa en ningún sitio (verificado con grep). Elimino para no dejar código muerto.
- `PROJECT_PLAN.md` — Decisión arquitectónica del 2026-04-10 documentada en §3 con razones. Tarea C1.5 actualizada para reflejar página propia en lugar de sub-sección.

**Por qué así**:
- **Página propia, no popup**: Igor sugirió "popup o navegar a área propia". Elegí navegar porque la tabla con buscador, filtros, sort y modales internos respira mejor a página completa que en un popup que ya tiene su propio scroll y compite con un modal hijo (CustomFoodModal). Los popups dentro de popups son una pesadilla de UX en móvil.
- **Botón destacado en lugar de item del bottom nav**: el bottom nav ya tiene 4 items (Home, Dieta, Entreno, Perfil) y añadir un quinto lo satura. Mejor un acceso prominente desde dentro de Diet, donde el contexto natural es "voy a usar productos personalizados".
- **Borrar `MyFridgeSection.jsx`**: era una indirección que solo servía para el wrap inicial. Mantenerlo "por si acaso" sería violar el principio de no dejar deuda. La lógica vive ahora directamente en `Fridge.jsx`.

**Notas**:
- El acceso desde `Diet` es sólo un punto de entrada de muchos posibles a futuro. El día de mañana, Dashboard también podría tener un acceso rápido a Mi Nevera ("Tienes 12 productos en tu nevera, gestiona →").
- La página `Fridge` no aparece todavía en `bottom nav` (ni hace falta). Si en uso real Igor o usuarios beta echan en falta acceso más directo, valoramos.
- Botón "Volver" usa `navigate(-1)` (history) en lugar de `to="/diet"` hardcoded, para preservar el flujo del usuario (puede haber llegado desde Dashboard u otra parte en el futuro).

---

## 2026-04-10 — Fase 1 completa: Mi Nevera (custom foods MVP cliente)

**Contexto**: primera fase del feature de productos personalizados. 100% cliente, sin backend nuevo, sin dependencias añadidas. Objetivo: que el usuario pueda crear/listar/editar/borrar productos a mano, usarlos en sus comidas y que los macros se calculen con sus valores reales. Toda la infra para barcode/OCR/mirror OFF (Fases 2-4) se construye encima de esta base.

**Cambio (8 commits agrupados)**:
- `src/data/food_database.js` — JSDoc completo del shape `Food` (predefined + custom unificados) con todos los campos opcionales (`sugars`, `fiber`, `saturated`, `salt`, `servingSize`, `source`, `barcode`, `createdAt`, `updatedAt`). Sin cambios funcionales, solo documentación / IntelliSense.
- `src/services/foods.js` — **NUEVO**. Capa de servicio (repository pattern). Único sitio del proyecto autorizado a importar `firebase/firestore` para foods. Funciones: `generateFoodId` (slug + random), `validateFood` (validación con mensajes en español), `createCustomFood`, `getCustomFood`, `listCustomFoods`, `updateCustomFood`, `deleteCustomFood`, `subscribeCustomFoods`. Persistencia en subcolección `users/{uid}/customFoods/{foodId}`.
- `src/hooks/usePlan.jsx` — Estado `customFoods` añadido al PlanProvider, suscripción onSnapshot dentro del effect de auth (cleanup junto a los otros), actions wrappers `addCustomFood`/`editCustomFood`/`removeCustomFood`. Mismo patrón que `historyList` (single source of truth global).
- `src/hooks/useMacros.js` — Helper exportado `findFood(id, customFoodsMap)`: busca primero en FOOD_DATABASE, después en customFoods. `calculateItemMacrosPure` y `sumMacrosPure` ahora son helpers puros que reciben el map explícito (testables sin React). El hook crea versiones bound al map memoizado del context y las expone — API backwards-compatible (Diet.jsx no necesitó cambios). Soporte `servingSize` variable (default 100 para g/ml, 1 resto). Items huérfanos devuelven `{...zero, orphan: true}` en vez de romper.
- `src/components/CustomFoodModal.jsx` — **NUEVO**. Modal create/edit con: chips visuales por categoría (FOOD_CATEGORIES), select unidad con auto-ajuste de servingSize, macros principales (4 campos), macros opcionales colapsables (4 campos + hint sodio→sal), validación delegada al servicio, errores en footer en rojo, A11y (ESC, autofocus, role dialog, aria-modal), bottom-sheet móvil + modal sm+, detección dirty con confirm.
- `src/components/MyFridgeSection.jsx` — **NUEVO**. Sección "Mi Nevera" con header (icono Refrigerator, contador, botón Nuevo), buscador, chips de filtro por categoría, sort alfabético/recientes, lista de food cards (icono cat + nombre + kcal + P/C/G + serving), confirmación inline antes de borrar (transforma la card en aviso rose), empty state con CTA. Color cyan para diferenciar del resto del Profile.
- `src/pages/Profile.jsx` — Import + montaje de `<MyFridgeSection />` al final.
- `src/pages/Diet.jsx` — `StructuredMealEditor` extendido: `availableFoods` ahora incluye custom foods del usuario filtrados por categoría, render con `<optgroup label="🧊 Mi Nevera">` separado de "Base de datos". Botón "Sparkles + Nuevo" junto al select que abre `CustomFoodModal` en modo create. `onSaved` callback pre-selecciona el food creado, ajusta unidad/categoría, pre-rellena qty con servingSize.
- `src/hooks/useEntitlements.js` — **NUEVO**. Hook que devuelve `{ customFoods, barcodeScan, ocrLabel, smartSuggest, plan }` hardcoded a `true` en dev. JSDoc anota explícitamente que en Fase 6 cambia el origen a Firestore (`users/{uid}/profile/main`) sin tocar call sites.
- `src/components/Gate.jsx` — **NUEVO**. Componente reutilizable `<Gate feature="..." fallback={...}>` con DefaultUpsell. Estructura lista para Fase 6.
- `MyFridgeSection.jsx` y `Diet.jsx` — Botones de "Nuevo producto" gateados con `useEntitlements.customFoods`. Hoy el flag está en `true` así que no se ve cambio visual, pero la infra de gating está cableada en los puntos de entrada.

**Por qué así**:
- **Subcolección Firestore para customFoods**: límite 1 MB doc + escalabilidad de queries + ediciones independientes (no reescribe el plan entero). Clave para pasar a multi-usuario sin reñir con la realidad.
- **Service layer (`src/services/foods.js`)**: aísla `firebase/firestore` del resto del código. Migración futura a Supabase u otro = cambiar 1 fichero, no 30. Coste hoy: prácticamente 0.
- **Custom foods integrados en `usePlan` (no hook standalone)**: una sola suscripción global, no parpadeos de loading entre componentes, mismo patrón que `historyList`. Razón rechazada: hooks standalone eran más "Reacty" pero suponían N suscripciones N componentes.
- **Helpers puros + bound versions en `useMacros`**: los puros son testables sin React (cuando llegue Vitest en F0.3), las bound mantienen la API anterior. Cero call sites tocados.
- **Modal con macros opcionales colapsables**: el formulario pide los 4 obligatorios siempre y los 4 opcionales solo si el usuario los abre. Etiquetas de productos sin info detallada (típicas) no obligan a rellenar 8 campos.
- **`<Gate>` simplificado con constantes**: la estructura del gating está visible en los call sites, pero los datos hoy son hardcoded. Cuando llegue Stripe en Fase 6, cambia 1 fichero (`useEntitlements.js`) y todo lo gateado se activa solo.

**Notas / pendientes**:
- ⏳ **Toast global** para confirmaciones ("Producto creado") — diferido a F0.6.
- ⏳ **Skeleton** para estado de carga — diferido a F0.7.
- ⏳ **Tests unitarios** de `validateFood`, `generateFoodId`, `findFood` — diferidos a F0.3 (Vitest no instalado).
- ⏳ **Documento `users/{uid}/profile/main`** en Firestore — diferido a Fase 6 (Stripe webhook).
- ⏳ **Validación server-side** de customFood en Firestore Trigger — diferida a C2.3a (cuando haya Functions). Tarea ya añadida al plan en Fase 2 con explicación de por qué la validación cliente sola no basta para multi-usuario.
- ⚠ **Items huérfanos**: si el usuario borra un customFood, las comidas que lo referencian devuelven macros 0 + flag `orphan: true`. Hoy nada en la UI consume ese flag para avisar visualmente. Aceptable como MVP, mejorar con badge ⚠ en el item de comida en una iteración futura.
- ⚠ **`generateFoodId` con random**: usa `Math.random()` con sufijo de 6 chars base36 → ~2.176M combinaciones por slug. Suficiente para evitar colisión en práctica de 1 usuario, no garantizado para escala. Cuando lleguen Functions, usar `crypto.randomUUID()` o el id auto de Firestore.
- ⚠ **`isDirty` en CustomFoodModal**: heurística simple comparando JSON. Funciona pero no es bonita. Refactor opcional cuando toque pulir UX.
- Próxima sesión: arrancar **Fase 0** (Vitest + Sentry + tools básicas) en paralelo, o saltar a **Fase 2** cuando Igor active Blaze.

---

## 2026-04-09 — Replanteo estratégico: multi-usuario, backend, mobile

**Contexto**: cambio de horizonte del producto. Pasa de "app personal de Igor" a "producto multi-usuario distribuible en App Store / Google Play, con features premium". Esto invalida varias asunciones previas (caché perezosa cliente, OCR en navegador, no backend).

**Cambio**:
- Creado `PROJECT_PLAN.md` — roadmap vivo con 7 fases, decisiones arquitectónicas con fecha, modelo de datos objetivo, bloqueantes, consideraciones futuras y proceso de uso del documento.
- DEVLOG.md sigue como log cronológico de cambios concretos. PROJECT_PLAN como roadmap forward-looking.
- Inicializado git en este repo con commit `1189f4f` (snapshot inicial).

**Decisiones tomadas (resumen, detalles en PROJECT_PLAN.md)**:
- **Backend = Firebase Functions** (no Supabase, no migración hoy). Razón decisiva: `@react-native-firebase` es el SDK RN más maduro y el horizonte mobile es cercano. Migración a Supabase queda anotada como salida si dispara alguno de tres triggers (queries SQL complejas, coste >50€/mes, querer self-host).
- **`customFoods` como subcolección** Firestore (`users/{uid}/customFoods/{foodId}`), no dentro del documento `plan`. Razón: límite 1 MB doc + escalabilidad de queries.
- **Capa `src/services/`** para aislar todas las llamadas a Firestore. Repository pattern ligero. Disciplina: ningún componente importa `firebase/firestore` para foods.
- **OCR server-side via Claude Haiku con visión** (no Tesseract cliente, no VLM local). Razón: mejor calidad, JSON estructurado directo, no infla bundle, control de abuso, reusable para futuras features LLM.
- **Estrategia OFF**: mirror nocturno propio en Firestore (fase 4) + cache de fallbacks + API live como tercer recurso. NO depender solo del API live de OFF (rate limit + disponibilidad).
- **Pagos**: Stripe + RevenueCat. Apple/Google obligan IAP nativos en mobile, RevenueCat abstrae las tres pasarelas. Custom foods será **feature premium**.
- **Feature flag `entitlements.customFoods`** desde el commit C1.8: en dev hardcoded `true`, conectable a estado real de suscripción cuando llegue fase 6.

**Por qué así**:
- Replanteo motivado por la frase del usuario "esta app no está destinada a un solo usuario, queremos distribuirla en stores". Cualquier decisión "personal" tomada ayer se reevaluó.
- La regla rectora del replanteo: **no atarse innecesariamente** pero **tampoco migrar prematuramente**. Hacer lo mínimo para mantener puertas abiertas, no rehacer nada que ya funciona.
- Documentación en PROJECT_PLAN porque las decisiones de arquitectura necesitan vivir en un sitio estable y consultable, no solo en el historial cronológico.

**Notas / pendientes**:
- ⚠ **Plan Blaze Firebase**: usuario debe activarlo. Bloquea Fase 2+.
- ⚠ **API key Anthropic**: usuario debe obtenerla en console.anthropic.com (separada de Claude MAX, son productos distintos con facturación distinta). Bloquea Fase 3.
- ⏳ Decidir pricing concreto del premium y exact free tier (¿3 customFoods gratis?).
- ⏳ Branding y dominio.
- Próxima acción: arrancar **Fase 1** (custom foods MVP cliente puro), que es independiente de los bloqueantes.

---

## 2026-04-09 — Fechas de fase editables

**Contexto**: Cada fase tenía `dates: { start, end }` en el modelo desde siempre, pero no había forma de editarlas desde la UI; solo era editable el `monthLabel` (texto libre tipo "Ene - Mar"). Igor quería poder definir el periodo real de cada fase.

**Cambio**:
- `src/pages/Training.jsx` — En la cabecera de fase, el modo edición (`editingHeader`) ahora muestra además dos `<input type="date">` (start/end) junto al input de `monthLabel`, más un botón "Hecho" para cerrar (antes cerraba con `onBlur` del único input). Cuando no se edita, se muestra el rango formateado en pequeño debajo del label. Helper `formatPhaseDateRange` añadido al top del fichero.
- `src/pages/Dashboard.jsx` — `PhaseSelector` añade fila "Fechas" con `start → end` en formato ISO bajo la fila "Periodo" cuando hay alguna fecha definida.

**Por qué así**:
- Reaproveché el toggle `editingHeader` que ya existía en lugar de meter un modal aparte: las fechas conviven semánticamente con el `monthLabel` (ambos describen "cuándo"), y editar todo en el mismo bloque evita un segundo punto de entrada.
- Cambié el cierre de `onBlur` a un botón explícito porque con varios inputs el `onBlur` del primero cerraba el editor en cuanto el usuario tabulaba a las fechas.
- En el Dashboard mostré las fechas en ISO (no formato corto humano) para que cuadre con los `<input type="date">` y no haya ambigüedad de zona horaria — el componente es informativo, no decorativo.
- `updatePhase` hace merge superficial, así que para no perder `start` al editar `end` (o viceversa) hago el spread `{ ...(activePhase.dates || {}), [campo]: valor }` en el handler.

**Notas**:
- No añadí validación de `end >= start`. Si se vuelve molesto, meter un check ligero antes de llamar a `updatePhase`.
- Sigue sin haber detección automática de "qué fase debería estar activa hoy" en base a las fechas — `activePhaseId` se mantiene manual. Posible mejora futura: en `useSchedule` o en Dashboard, sugerir cambio de fase si `today` cae fuera del rango de la activa.

---

## 2026-04-09 — Fase activa global + perfil de usuario estructurado

**Contexto**: Hacía falta poder declarar en qué fase está el usuario (volumen / definición / recomp / mantenimiento) y tener su perfil bien tipado para poder, más adelante, mandar contexto a un LLM. Además, `activePhaseId` vivía sólo como `useState` local en `Training.jsx` (el propio comentario en `useSchedule.js` ya lo señalaba) y `useMacros` esperaba un `user.goal` enum que en realidad estaba como string libre — contrato roto silenciosamente.

**Cambio**:
- `src/data/plan.js` — Añadidos `activePhaseId: 1` top-level y campos nuevos en `user`: `birthday`, `gender`, `activity`, `goalType`. Mantenido `goal` como descripción libre.
- `src/hooks/usePlan.jsx` — Migración para crear `activePhaseId` y mergear `user` con defaults de `PLAN_DATA.user` cuando se lee data vieja. Nueva action `setActivePhaseId`.
- `src/hooks/useMacros.js` — Nueva helper exportada `calculateAge(birthday)`. `useMacros` ahora deriva `age` de `user.birthday` (fallback a `user.age` y luego a 30) y lee `user.goalType` en lugar de `user.goal`.
- `src/hooks/useSchedule.js` — `getCurrentPhase()` ahora respeta `plan.activePhaseId` en vez de devolver `phases[0]` siempre.
- `src/pages/Training.jsx` — Eliminado `useState(activePhaseId)` local; ahora viene de `usePlan` (`setActivePhaseId` global).
- `src/pages/Dashboard.jsx` — Nuevo `<PhaseSelector>` debajo del header con dropdown de fases + datos resumidos (periodo, foco, peso objetivo). Bug fix: `PLAN_DATA.user.name` → `plan.user?.name` (estaba leyendo del módulo en vez del estado vivo).
- `src/pages/Profile.jsx` — **Nuevo** `/profile` ("Mis Datos") con secciones Identidad, Físico, Actividad, Objetivo. Edita todo el `user` y muestra la edad derivada en vivo.
- `src/App.jsx` + `src/components/Layout.jsx` — Ruta `/profile` y nuevo item de navegación inferior (icono `User`).
- `CLAUDE.md` — Documentado el modelo de usuario y la regla de "fase activa global".

**Por qué así**:
- **`activePhaseId` global**: era ya un anti-patrón conocido (estaba comentado en el código). Promoverlo a `planData` evita drift entre Dashboard/Training y nos permite que el contexto de IA sepa la fase real sin hacks.
- **`birthday` en vez de `age`**: la edad cambia sola cada año, guardarla sería estado duplicado. Se deriva con `calculateAge` en cada render.
- **`goalType` separado de `goal`**: `goal` era string libre humano ("Recomposición Corporal Estética") pero `useMacros` esperaba enum. En vez de romper uno u otro, los separamos: `goalType` máquina, `goal` humano.
- **`PhaseSelector` en Dashboard, editor en `/profile`**: el usuario lo pidió así explícitamente. Cambiar de fase es algo frecuente (acceso rápido en Home), editar perfil es algo raro (datos que casi nunca cambian → pantalla aparte).
- **Nueva ruta vs modal**: `/profile` como pantalla completa con su entrada en la nav inferior. Es más descubrible y deja sitio para crecer (más adelante: historial de medidas, fotos progreso, etc.) sin hinchar el Dashboard.

**Notas / pendientes**:
- ⏳ **`buildAIContext()` PENDIENTE**: helper que devuelva un objeto JSON-serializable con perfil de usuario, fase activa, targets de macros, último peso + tendencia, y resumen de últimas N sesiones. Idea: vivir en `usePlan` o en un hook nuevo `useAIContext`. Lo dejamos para cuando empecemos a integrar el LLM real (así definimos la forma según lo que pida el modelo en vez de adivinar). Cuando lo hagamos, actualizar también `CLAUDE.md`.
- ⚠️ Los chevrons de fase en `Training.jsx` (líneas ~267 y ~291) hardcodean `Math.min(3, ...)`. Si se añade una 4ª fase no se podrá navegar a ella desde ahí. Bug menor, fuera de scope hoy.
- ⚠️ `handleAddPhase` en `Training.jsx` sigue usando un `setTimeout(100)` para esperar a que el plan se actualice antes de cambiar de fase. Funciona pero es frágil; refactorizar a leer el id devuelto por `addPhase` cuando toque.
- Datos viejos en localStorage/Firestore: la migración solo añade campos por defecto, **no inventa edad ni cumpleaños**. Igor (o quien use la app) tiene que entrar a `/profile` y rellenarlos para que `useMacros` tenga datos reales. Hasta entonces, defaults conservadores (30 años, hombre, moderado, recomp).

---

## 2026-04-09 — Eliminado formato de comidas legacy (texto)

**Contexto**: La página de Nutrición mostraba un aviso "Formato antiguo (Texto)" en algunas comidas porque convivían dos esquemas: `ingredients` (array de strings) y `items` (array estructurado con `foodId`/`quantity`/`unit`). El usuario no entendía por qué aparecía y pidió quedarse solo con el nuevo.

**Cambio**:
- `src/data/plan.js` — Las 5 comidas semilla (`breakfast`, `snack1`, `lunch`, `snack2`, `dinner`) reescritas al formato `options[].items[]` con `foodId` válidos contra `FOOD_DATABASE`.
- `src/hooks/usePlan.jsx` — Migración ahora elimina `ingredients` de las opciones cargadas (legacy strip) y `addMealOption` ya no crea ese campo.
- `src/pages/Diet.jsx` — Eliminado el bloque fallback que renderizaba la lista de strings + el aviso "Formato antiguo". Import `Layers` quitado.
- `src/pages/Dashboard.jsx` — La card "Próxima Comida" ahora lee `options[selectedOptionIndex].items` y muestra `name + quantity + unit`.
- `src/hooks/useSchedule.js` — Bonus fix: el `defaultSchedule` hardcodeado tenía IDs (`desayuno`, `comida`...) que no coincidían con los reales del plan (`breakfast`, `lunch`...), por lo que el Dashboard nunca encontraba la comida correcta. Ahora lee `plan.schedule.default`.

**Por qué así**:
- Mantener dos formatos era pura deuda; el viejo no calcula macros (sin `foodId`), así que conservarlo solo añadía ramas muertas.
- Las equivalencias de la migración son razonables (ej. "150g Pollo/Pavo/Ternera" → 150g Pechuga de Pollo, "80g Arroz" → 80g Arroz Crudo). Si el usuario quiere precisión real, edita desde el editor estructurado.
- El bug del schedule mismatch no estaba en el ticket pero era trivial de arreglar y necesario para que la card del Dashboard mostrase algo distinto a "Sin datos" — se incluyó.

**Notas**:
- La migración aún preserva el destructuring `const { ingredients, ...rest } = opt` para limpiar data vieja en localStorage/Firestore. No quitar hasta que estemos seguros de que ningún cliente tiene data legacy.

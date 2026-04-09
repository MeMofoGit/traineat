# DEVLOG

Bitácora de desarrollo. Lo más reciente arriba. Lee las últimas 3-5 entradas antes de tocar nada para no contradecir decisiones previas. Formato y reglas en `CLAUDE.md`.

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

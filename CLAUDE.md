# CLAUDE.md

Guía de desarrollo para Claude trabajando en este proyecto. Léelo al empezar cualquier sesión.

## Resumen del proyecto

App personal de fitness/nutrición de **Igor**. SPA en React + Vite que gestiona:
- **Plan nutricional**: comidas estructuradas con macros calculadas desde una base de alimentos.
- **Rutinas de entrenamiento**: fases, días, ejercicios, sesiones activas con timers.
- **Historial de sesiones** y seguimiento de peso.

Persistencia dual: `localStorage` (inmediato) + Firestore (debounced 2s) con auth anónima.

## Stack

- **React 19** + **Vite 7** + **React Router 7**
- **Tailwind 4** (`@tailwindcss/postcss`)
- **Firebase 12** (Firestore + Auth anónima)
- **lucide-react** para iconos
- **date-fns** para fechas

No hay TypeScript. No hay tests. No hay backend propio.

## Comandos

```bash
npm run dev      # Vite dev server (puerto 5173)
npm run build    # Build de producción
npm run lint     # ESLint
npm run preview  # Preview del build
```

## Arquitectura

### Estructura

```
src/
├── App.jsx                 # Router + PlanProvider
├── main.jsx                # Entry
├── firebase.js             # Init de Firestore + Auth (config inline)
├── components/
│   ├── Layout.jsx          # Layout con bottom nav (Home/Dieta/Entreno/Mis Datos)
│   └── ExerciseModal.jsx
├── pages/
│   ├── Dashboard.jsx       # Home: phase selector + próxima comida + entreno + peso
│   ├── Diet.jsx            # Editor de comidas con StructuredMealEditor
│   ├── Training.jsx        # Fases, rutinas, sesión activa
│   └── Profile.jsx         # "Mis Datos": identidad, físico, actividad, objetivo
├── hooks/
│   ├── usePlan.jsx         # CONTEXTO GLOBAL: plan + actions + sync Firestore
│   ├── useMacros.js        # Cálculo BMR/TDEE/targets/consumed (+ calculateAge)
│   └── useSchedule.js      # Próxima comida + entreno activo según hora
├── data/
│   ├── plan.js             # PLAN_DATA por defecto (semilla inicial)
│   ├── food_database.js    # FOOD_DATABASE + FOOD_CATEGORIES
│   └── templates.js
└── assets/exercises/       # Imágenes de ejercicios (importadas estáticas)
```

### Estado global: `usePlan`

Único contexto que mantiene `planData` (todo menos historial) y `historyList` (subcolección Firestore). Actions clave:

- **Comidas**: `updateMealOption`, `addMealOption`, `deleteMealOption`, `setSelectedOption`
- **Rutinas**: `updateExercise`, `addExercise`, `deleteExercise`, `reorderExercises`, `moveExerciseToDay`, `updateDayRoutine`
- **Fases**: `updatePhase`, `addPhase`, `deletePhase`, `setActivePhaseId`
- **Sesiones**: `startSession`, `toggleSetCompletion`, `toggleSessionPause`, `finishSession`, `cancelSession`
- **Usuario**: `updateUser`, `logWeight`

`finishSession` hace **optimistic UI**: limpia `activeSession` antes de subir a Firestore (fire-and-forget). NO bloquees el UI esperando sync.

### Modelo de datos: comidas

**Formato actual (único soportado)**:

```js
meals: {
  breakfast: {
    goal: "string descriptiva",
    macros: "etiqueta tipo 'High Carb / High Protein'",
    note: "opcional, aviso especial",
    selectedOptionIndex: 0,
    options: [
      {
        id: 1,
        name: "Opción 1",
        items: [
          { foodId: 'egg', name: 'Huevo Entero', category: 'protein', quantity: '2', unit: 'pz' },
          ...
        ],
        note: ''
      }
    ]
  }
}
```

- Cada `item.foodId` debe existir en `FOOD_DATABASE` (`src/data/food_database.js`) para que `useMacros` calcule kcal/proteína/carbos/grasa.
- Unidades soportadas: `g`, `ml`, `pz`, `taza`, `cda`. Para `g`/`ml` se usa ratio `qty/100`; el resto se asume "por unidad".
- **Nunca** introduzcas el campo `ingredients` (formato texto antiguo, ya eliminado).

### Modelo de datos: usuario y fase activa

```js
planData: {
  activePhaseId: 1,            // ID de la fase actualmente activa (global)
  user: {
    name: "Igor",
    birthday: "YYYY-MM-DD",     // ISO; la edad se deriva con calculateAge()
    gender: "male" | "female",
    height: 180,                // cm
    start_weight: 75,           // kg (sólo seed inicial; el peso real vive en weightLog)
    activity: "sedentary" | "light" | "moderate" | "active" | "very_active",
    goalType: "cut" | "bulk" | "recomp" | "maintain",  // <- usado por useMacros
    goal: "string libre",       // descripción larga (sólo display)
    deadline: "YYYY-MM-DD"
  }
}
```

- **`activePhaseId` es global y persistido**. La página `Training` y `Dashboard` lo comparten. `useSchedule.getCurrentPhase()` lo respeta. **Nunca** lo guardes como `useState` local.
- **`useMacros` lee `goalType`** (no `goal`). El campo `goal` es solo para mostrar.
- La edad real se deriva de `birthday` mediante `calculateAge()` exportada por `useMacros.js`. Hay fallback a `user.age` si por algún motivo `birthday` está vacío.
- El editor de estos campos vive en `pages/Profile.jsx` (`/profile`).

### Modelo de datos: rutinas

```js
routines: {
  [phaseId]: {
    [dayId]: { // 0=Dom, 1=Lun, ..., 6=Sab
      label, focus,
      exercises: [{ name, sets, reps, rest, note, gifUrl }]
    }
  }
}
```

Las imágenes/gifs se mapean desde `GIF_MAP` en `plan.js` durante la migración para asegurar rutas locales.

### Persistencia y migraciones

- `usePlan.jsx` ejecuta migraciones en el inicializador del `useState`. Si añades campos nuevos al plan, **añade aquí defaults seguros** para no romper datos viejos en localStorage/Firestore.
- Firestore paths:
  - Plan: `users/{uid}/data/plan`
  - Historial: `users/{uid}/history/{sessionId}` (subcolección)
- Hay migración legacy desde `users/{uid}` (path antiguo) que solo se ejecuta si no existe el nuevo path.

## Convenciones de código

- **Componentes funcionales** con hooks. Sin clases.
- **Tailwind only** para estilos. No CSS modules ni styled-components. Paleta: slate (fondo), blue (nutrición), emerald (entrenamiento), rose/amber/yellow (macros).
- **Iconos**: `lucide-react`. Importa solo los que uses.
- **Strings de UI en español**. Código y nombres de variables en inglés.
- **Sin TypeScript**: confía en defaults y `?.` para acceso seguro.
- **No añadas comentarios obvios** ni documentación a código que no estás cambiando.

## Reglas críticas (no romper)

1. **Mutar `planData` siempre vía setter inmutable**. Las actions de `usePlan` hacen deep copy hasta el nivel modificado para no compartir referencias entre fases (hubo bugs por eso — busca "DEEP COPY PHASE" en el código).
2. **No bloquear UI esperando Firestore**. Usa optimistic updates como hace `finishSession`.
3. **Cualquier cambio en el shape de `meals`/`routines` requiere migración** en el inicializador de `usePlan`.
4. **Antes de borrar un campo del plan**: busca todos los usos (Grep en `src/`), incluyendo `useMacros`, `useSchedule`, `Dashboard`.
5. **Las claves de `plan.schedule.default` deben coincidir con las claves de `plan.meals`**. `useSchedule` ya lee del schedule real — no vuelvas a hardcodear IDs.
6. **`activePhaseId` es global**. Si necesitas la fase activa fuera de Training, léela de `usePlan().plan.activePhaseId` y muta con `setActivePhaseId`. Nada de `useState` local.
7. **Para la edad usa siempre `calculateAge(user.birthday)`** desde `useMacros.js`. No guardes `user.age` derivado en el plan — sería estado duplicado que se desactualiza solo.
8. **No commitear sin que lo pida el usuario explícitamente**.
9. **Las credenciales de Firebase están inline en `firebase.js`**. Es una app personal de un solo usuario con auth anónima — no las muevas a `.env` salvo que el usuario lo pida.

## Workflow esperado

1. Lee este archivo y `DEVLOG.md` (si existe) al empezar.
2. Antes de tocar código, lee los ficheros relevantes — no propongas cambios a ciegas.
3. Cambios pequeños y enfocados. Nada de refactors espontáneos.
4. Tras terminar una tarea no trivial, **añade una entrada a `DEVLOG.md`** (ver siguiente sección).
5. Verifica que el dev server compila (HMR) antes de dar por terminado.

## DEVLOG.md — historial de desarrollo

Para no perder el hilo entre sesiones, mantén un fichero `DEVLOG.md` en la raíz con bitácora cronológica inversa (lo más reciente arriba).

**Cuándo añadir entrada**:
- Cambios estructurales (modelo de datos, migraciones, refactors).
- Decisiones de diseño no obvias (por qué se eligió X en vez de Y).
- Bugs encontrados y cómo se arreglaron.
- Features nuevas.
- NO entradas para typos, ajustes de estilos o cambios triviales.

**Formato de cada entrada**:

```markdown
## YYYY-MM-DD — Título corto

**Contexto**: qué problema/necesidad disparó el cambio.
**Cambio**: qué se hizo (ficheros tocados, en una línea cada uno).
**Por qué así**: la decisión de diseño y alternativas descartadas.
**Notas**: efectos colaterales, deudas, cosas a vigilar.
```

Si `DEVLOG.md` no existe al empezar una tarea relevante, créalo. Si existe, **lee las últimas 3-5 entradas antes de tocar nada** para no repetir errores ya resueltos o contradecir decisiones previas.

## Cosas que SÍ hacer

- Preguntar al usuario cuando una decisión tenga varias opciones razonables.
- Confirmar antes de borrar datos o ejecutar acciones destructivas.
- Mantener el español en mensajes al usuario y los strings de UI.
- Aprovechar el `FOOD_DATABASE` existente antes de inventar entradas nuevas.

## Cosas que NO hacer

- No introducir TypeScript, tests, o nuevas dependencias sin pedir permiso.
- No tocar el `firebaseConfig`.
- No reintroducir el formato `ingredients` (texto plano).
- No hardcodear schedules paralelos al de `plan.schedule.default`.
- No commitear con `--no-verify` ni amend de commits ya creados.
- No crear archivos `.md` nuevos salvo que el usuario lo pida explícitamente (excepción: `DEVLOG.md` y este `CLAUDE.md`).

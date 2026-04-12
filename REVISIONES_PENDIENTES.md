# Revisiones y Mejoras Pendientes

> Documento para anotar issues, mejoras y observaciones detectadas durante testing que no se abordan inmediatamente. Revisar antes de cada sesión de trabajo.

---

## ~~Algoritmo de sustitución "Mi Nevera"~~ — RESUELTO 2026-04-10

**Reportado**: 2026-04-10 | **Resuelto**: 2026-04-10

- [x] **Similaridad mixta**: 50% valores absolutos per 100g + 50% ratios, ponderada por categoría. Threshold subido a 80%.
- [x] **Ajuste de cantidad**: `calcAdjustedQty` calcula qty equivalente por macro dominante de la categoría.
- [x] **Comparativa visual**: `SuggestionPanel` muestra tabla lado a lado (qty, kcal, P, C, G) con colores según desviación.
- [ ] **Validar impacto en comida total**: pendiente — mostrar macros totales post-sustitución vs targets.

---

## "Ya lo hice" / "Saltar" no marca el día como completado (Fase 5b)

**Reportado**: 2026-04-10
**Prioridad**: MEDIA

Cuando el usuario pulsa "Ya lo hice" o "Saltar" en el banner de entreno pendiente, el banner desaparece (decisión en localStorage) pero si navegas al día, sigue apareciendo como no entrenado — puedes iniciar sesión.

### Mejora necesaria

- [ ] Al pulsar **"Ya lo hice"**: crear entrada en `history` con `doneElsewhere: true`, `durationSeconds: 0`, `completedSets: {}`. Así el día aparece como completado visualmente y las estadísticas lo cuentan como "hecho" sin inflar métricas de rendimiento.
- [ ] Al pulsar **"Saltar"**: crear entrada con `skipped: true` y métricas vacías. El día aparece como "saltado" (icono distinto al completado) y no se cuenta en "X/5 entrenamientos esta semana".
- [ ] En Training.jsx, al navegar a un día con `skipped` o `doneElsewhere`, mostrar un badge ("Saltado" / "Hecho fuera") y NO mostrar el botón "Comenzar sesión" (o mostrarlo con opción de "rehacer").

---

## Cascada del banner "Entrenar hoy" (Fase 5b)

**Reportado**: 2026-04-10
**Prioridad**: MEDIA

Al elegir "Entrenar hoy" para un workout pendiente, el workout planificado para HOY pasa a ser el nuevo "pendiente" para mañana. Esto puede crear una cadena de banners toda la semana.

### Pendiente de análisis

- ~~¿Limitar a 1 banner máximo y no mostrar más tras elegir "Entrenar hoy"?~~ **RESUELTO 2026-04-10** — "Entrenar hoy" marca el día actual como `displaced`.
- ¿Ofrecer "reagrupar semana" si se acumulan 2+ pendientes?
- ¿Aceptar la cascada como comportamiento natural (el usuario siempre puede "Saltar")?

---

## Iconos PWA en formato PNG — pendiente del usuario

**Reportado**: 2026-04-11
**Prioridad**: MEDIA (afecta instalación en iOS/Safari)

Los iconos actuales del manifest son SVG (`icon-192.svg`, `icon-512.svg`). Chrome los acepta pero **Safari/iOS requiere PNG** para apple-touch-icon y para que la instalación se vea correcta.

### Acción necesaria

- [ ] Generar `icon-192.png` (192x192) y `icon-512.png` (512x512) desde los SVG existentes (usar svgtopng.com o similar).
- [ ] Colocarlos en `public/`.
- [ ] Actualizar `vite.config.js` manifest icons para apuntar a los PNG (añadir entradas `image/png` junto a las SVG existentes).
- [ ] Actualizar `index.html` apple-touch-icon para apuntar al PNG.

---

## i18n — strings secundarios pendientes de migrar

**Reportado**: 2026-04-12
**Prioridad**: BAJA (no afecta funcionalidad, solo consistencia al cambiar idioma)

Los strings principales de todas las páginas están migrados a `useTranslation()`. Quedan strings secundarios dentro de sub-componentes que aún están hardcodeados en español:

### Dashboard

- [ ] WeightBadge: "Peso", "Registrar peso", labels de tendencia
- [ ] PhaseSelector: nombres de fases (vienen del plan, no traducibles), labels de fechas
- [ ] WeeklyProgress: "Rest", labels de días (L,M,X,J,V,S,D)

### Diet

- [ ] StructuredMealEditor: labels de categorías en el select, "Añadir Alimento", "Cancelar" (parcial)
- [ ] SuggestionPanel: "Sustituciones de Mi Nevera", "Aplicar", "Cancelar"
- [ ] FoodItemRow (editor): labels de macros "Proteína", "Carbos", "Grasas"
- [ ] MealCard: "Día:", "Comido", "Deshacer", "Comida registrada (diferente al plan)"
- [ ] Nota de proteína por toma (>50g)
- [ ] `confirm()` dialogs nativos (eliminar comida, etc.)

### Training

- [ ] Botones "Comenzar Sesión", "Cancelar Sesión", "Pausar", "Reanudar"
- [ ] Labels de ejercicios: "series", "reps", "descanso"
- [ ] Banner de entreno pendiente: "Entrenar hoy", "Saltar", "Ya lo hice"
- [ ] WorkoutStatsModal: todas las estadísticas
- [ ] Nombres de días (Lunes-Domingo) hardcodeados en usePendingWorkouts

### Fridge

- [ ] FoodCard: labels de macros (P, C, G)
- [ ] FoodDetailModal: labels de nutrientes ("Proteínas", "Carbohidratos", etc.)
- [ ] Confirmación de borrado
- [ ] "Crear mi primer producto" en empty state

### Profile

- [ ] Labels de actividad (Sedentario, Ligero, Moderado, Activo, Muy activo) y sus descripciones
- [ ] Labels de objetivo (Definición, Recomposición, Mantenimiento, Volumen)
- [ ] AccountSection: "Cuenta anónima", "Vincular con Google/email", etc.
- [ ] "Hombre"/"Mujer" en selector de sexo

### CustomFoodModal

- [ ] Todos los strings del modal (labels de campos, notices, errores)

### Enfoque recomendado

Migrar por componente, de mayor a menor impacto visual. Los JSON (`es.json`/`en.json`) ya tienen las traducciones preparadas para la mayoría — solo falta conectar `t('key')` en cada sitio.

---

## Balanceo LP — probar a fondo toda la funcionalidad

**Reportado**: 2026-04-12
**Prioridad**: ALTA (funcionalidad core sin validar manualmente)

### Pendiente de probar

- [ ] **Botón "Balancear semana con Mi Nevera"**: aparece al final de Diet en modo Entreno si hay productos en Mi Nevera. Verificar que aparece, que ejecuta y que aplica cambios.
- [ ] **`balanceMeal`**: sustitución individual por comida con LP (YALPS). Verificar que sustituye genéricos por Mi Nevera, ajusta cantidades, respeta tolerancia 10%.
- [ ] **`balanceDay`**: propagación de déficit intra-día. Si desayuno excede target, las comidas siguientes reducen su target proporcionalmente.
- [ ] **`balanceWeek`**: propagación cross-day. Si lunes tiene exceso, martes-domingo compensan.
- [ ] **Mínimos de seguridad**: verificar que no baja de 50kcal/comida, 800kcal/día, 50g prot/día.
- [ ] **Botón "Rellenar con Mi Nevera" por comida**: usa LP cuando hay mealTarget disponible, fallback a algoritmo simple sin targets.
- [ ] **Edge cases**: Mi Nevera vacía, comidas sin items, targets a 0, solo 1 día con comidas.
- [ ] **Visual**: items de Mi Nevera con borde cyan vs genéricos en slate.

### Referencia

Los test cases detallados están en `TEST_CASES.md` secciones 1, 2 y 3.

---

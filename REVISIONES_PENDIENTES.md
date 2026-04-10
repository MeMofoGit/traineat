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

- ¿Limitar a 1 banner máximo y no mostrar más tras elegir "Entrenar hoy"?
- ¿Ofrecer "reagrupar semana" si se acumulan 2+ pendientes?
- ¿Aceptar la cascada como comportamiento natural (el usuario siempre puede "Saltar")?

---

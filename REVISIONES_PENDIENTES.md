# Revisiones y Mejoras Pendientes

> Documento para anotar issues, mejoras y observaciones detectadas durante testing que no se abordan inmediatamente. Revisar antes de cada sesión de trabajo.

---

## Algoritmo de sustitución "Mi Nevera" — necesita afinamiento

**Reportado**: 2026-04-10
**Prioridad**: ALTA (afecta la utilidad real del feature)

### Problema observado

Al aplicar "Rellenar con Mi Nevera" en la merienda, el yogur griego genérico (15P / 6C / 0G / 89 kcal) fue sustituido con 77% similaridad por un producto de test (30P / 23C / 8G / 75 kcal). Los valores NO son parecidos en absoluto excepto las calorías.

### Causas identificadas

1. **El algoritmo de similaridad usa RATIOS, no valores absolutos**: compara la PROPORCIÓN de P/C/G (qué porcentaje del total es cada macro), no las cantidades reales. Un alimento con 15P/6C/0G tiene ratio ~71%P/29%C/0%G. Uno con 30P/23C/8G tiene ratio ~49%P/38%C/13%G. Son bastante distintos, pero el 77% puede deberse a que el denominador (distancia máxima) es generoso.

2. **No ajusta la cantidad al sustituir**: hoy mantiene la misma cantidad del producto original. Si cambias 150g de yogur griego por 150g del otro producto, los macros de la comida cambian drásticamente. Debería recalcular la cantidad del nuevo producto para que aporte macros similares al original (ej: si el original aportaba 15g proteína con 150g, y el nuevo tiene 30g prot/100g, la cantidad debería ser ~50g).

3. **No valida el impacto en la comida total**: la sustitución es item-a-item sin considerar cómo afecta al balance global de la comida.

### Mejoras necesarias

- [ ] **Ajustar cantidad al sustituir**: calcular qué cantidad del nuevo producto aporta macros equivalentes al original. Priorizar por el macro dominante de la categoría (proteína para category=protein, carbos para carbs, etc.).
- [ ] **Mejorar la métrica de similaridad**: considerar usar distancia euclidiana de valores absolutos per 100g además de (o en lugar de) ratios. Ponderar por la categoría del alimento (para proteínas, pesar más la diferencia en proteínas).
- [ ] **Subir el threshold**: 70% es demasiado permisivo. Probablemente 85% sería más adecuado, o mostrar un warning visual cuando la similaridad es <85%.
- [ ] **Mostrar comparativa de macros en el SuggestionPanel**: antes de aplicar, mostrar lado a lado los macros del original vs el sugerido para que el usuario vea la diferencia real.
- [ ] **Validar impacto en la comida**: tras aplicar todas las sustituciones, mostrar cómo quedan los macros totales de la comida vs los targets.

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

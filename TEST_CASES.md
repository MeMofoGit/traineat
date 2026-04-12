# Casos de Uso / Test Cases

> Documento para anotar escenarios de prueba de cada feature. Usar como base para tests manuales y futuros tests automatizados (Vitest).

---

## 1. Balanceo LP — `balanceMeal`

### 1.1 Sustitución simple (misma categoría, macros similares)

- **Setup**: Comida con Pechuga de Pollo 150g. Mi Nevera tiene "Pechuga Mercadona" con macros similares.
- **Esperado**: Sustituye pollo genérico por Mercadona. Cantidad ajustada para cuadrar target. Status "optimal".

### 1.2 Sin candidatos de Mi Nevera

- **Setup**: Comida con alimentos genéricos. Mi Nevera vacía.
- **Esperado**: No hace sustituciones. Items originales sin cambio. Status "no_candidates".

### 1.3 Item ya es de Mi Nevera

- **Setup**: Comida con un producto que ya es customFood.
- **Esperado**: No lo sustituye por otro. Lo mantiene y ajusta cantidad si falta.

### 1.4 Target imposible (muy bajo)

- **Setup**: Target de 50kcal para una comida con 3 items.
- **Esperado**: LP devuelve "infeasible" o cantidades mínimas. Fallback a items originales.

### 1.5 Tolerancia

- **Setup**: Comida que cuadra al 95% del target.
- **Esperado**: Con tolerancia 10%, la acepta como óptima. No hace cambios innecesarios.

### 1.6 Redondeo por unidad

- **Setup**: Huevos (pz) sugeridos a 1.7 → debe redondear a 2. Arroz (g) a 83g → debe redondear a 85.
- **Esperado**: pz=enteros, g=múltiplos de 5, taza=múltiplos de 0.5.

---

## 2. Balanceo cross-day — `balanceDay`

### 2.1 Día equilibrado

- **Setup**: 5 comidas todas cuadrando su target individual.
- **Esperado**: Déficit final ≈ 0 en todos los macros.

### 2.2 Primera comida con exceso de proteína

- **Setup**: Desayuno tiene +20g proteína sobre target. Resto de comidas normales.
- **Esperado**: Las comidas posteriores reducen su target de proteína proporcionalmente. Déficit final del día < 5g.

### 2.3 Comida vacía en el medio

- **Setup**: 5 comidas, la 3ª sin items.
- **Esperado**: Se salta sin error. El déficit se propaga a la 4ª y 5ª.

### 2.4 Todas las comidas con déficit

- **Setup**: Cada comida tiene items que aportan 70% del target.
- **Esperado**: Los targets se ajustan progresivamente al alza. El déficit acumulado del día refleja la diferencia.

### 2.5 Mínimos de seguridad

- **Setup**: Target por comida de 30kcal (artificialmente bajo).
- **Esperado**: Se clampea a mínimo 50kcal, 5g proteína, 5g carbos, 2g grasa.

---

## 3. Balanceo cross-week — `balanceWeek`

### 3.1 Lunes con cheat meal (+500kcal)

- **Setup**: Lunes come 500kcal más del plan. Martes a domingo normales.
- **Esperado**: Martes a domingo tienen ~80kcal menos cada uno para compensar. Déficit semanal ≈ 0.

### 3.2 Semana completa equilibrada

- **Setup**: 7 días todos cuadrando.
- **Esperado**: Déficit semanal ≈ 0 en todos los macros.

### 3.3 Viernes y sábado sin plan (descanso)

- **Setup**: Solo 5 días con comidas, 2 vacíos.
- **Esperado**: Se saltan sin error. Déficit se propaga correctamente a los días con comidas.

### 3.4 Mínimos diarios

- **Setup**: Target diario de 500kcal (artificialmente bajo tras acumulado).
- **Esperado**: Se clampea a 800kcal/día, 50g prot, 50g carbs, 20g grasa.

---

## 4. Food Diary

### 4.1 Confirmar comida planificada

- **Setup**: Comida con alimentos. Pulsar "Comí esto".
- **Esperado**: Icono cambia a check verde. Estado "confirmed" en dailyLog. Macros no cambian.

### 4.2 Registrar comida diferente

- **Setup**: Pulsar "Comí otra cosa". Añadir un alimento distinto. Guardar.
- **Esperado**: Icono cambia a cubiertos ámbar. Macros del MealCard actualizados con los del log.

### 4.3 Deshacer confirmación

- **Setup**: Comida confirmada. Pulsar "Deshacer".
- **Esperado**: Vuelve a estado "planned". Icono vuelve a ChefHat azul.

### 4.4 Macros diarias con comida modificada

- **Setup**: Plan dice 500kcal en almuerzo. Usuario registra 800kcal.
- **Esperado**: MacroSummary muestra +300kcal en consumido. Barras reflejan el exceso.

### 4.5 Banner de rebalanceo tras confirmar

- **Setup**: Confirmar desayuno con +20g proteína sobre target.
- **Esperado**: Banner aparece antes de la siguiente comida sin confirmar: "Reduce: 20g proteína".

---

## 5. Nutrient Timing

### 5.1 Cambiar hora de entreno

- **Setup**: Entreno a las 13:00. Comidas: desayuno 7:15, snack 10:30, comida 14:30.
- **Esperado**: Snack 10:30 = PRE. Comida 14:30 = POST. Resto = normal.

### 5.2 Entreno temprano

- **Setup**: Entreno a las 7:00. Desayuno a las 7:15.
- **Esperado**: Desayuno = POST (primera comida después del entreno). Ninguna PRE.

### 5.3 Distribución de carbos según goalType

- **Setup**: Cut + hora entreno 13:00.
- **Esperado**: POST tiene 1.8x carbos. Normal tiene 0.2x. PRE tiene 0.3x.

### 5.4 Modo descanso

- **Setup**: Toggle "Modo: Descanso".
- **Esperado**: No hay PRE/POST (no hay entreno). Selector de hora desaparece. Targets ajustados (-20% carbos).

---

## 6. Comidas editables

### 6.1 Añadir nueva comida

- **Setup**: Pulsar "Añadir comida".
- **Esperado**: Nueva comida aparece con hora 12:00, label "Comida", una opción "Lunes" vacía.

### 6.2 Eliminar comida

- **Setup**: Pulsar papelera en una comida. Confirmar.
- **Esperado**: Comida desaparece del schedule y de meals.

### 6.3 Clonar día

- **Setup**: Lunes con 3 alimentos. Pulsar clonar.
- **Esperado**: Se crea "Martes" con los mismos 3 alimentos. Ordenado Lun-Mar.

### 6.4 Máximo 7 días

- **Setup**: Añadir opciones hasta Domingo.
- **Esperado**: Botones clonar/añadir desaparecen. No se puede crear 8ª opción.

### 6.5 Auto-selección del día actual

- **Setup**: Hoy es miércoles. Comida tiene Lun-Mié-Vie.
- **Esperado**: Al abrir Diet, "Miércoles" está seleccionado.

### 6.6 Borrar día del medio y re-añadir

- **Setup**: Borrar Miércoles. Añadir nuevo.
- **Esperado**: Se crea "Miércoles" (no "Jueves"). Se inserta en orden correcto.

---

## 7. Auth

### 7.1 Login con Google

- **Setup**: Pulsar "Continuar con Google". Seleccionar cuenta.
- **Esperado**: Login exitoso. Muestra Dashboard. Selector de cuentas aparece siempre.

### 7.2 Login con email/password

- **Setup**: Registrar con email + password. Logout. Login de nuevo.
- **Esperado**: Datos persisten entre sesiones.

### 7.3 Linking anónimo → Google

- **Setup**: Usuario anónimo. Ir a Profile → "Vincular con Google".
- **Esperado**: Mismos datos, mismo uid. Email visible en Mi Cuenta.

### 7.4 Logout limpia estado

- **Setup**: Login, crear datos, logout.
- **Esperado**: user=null, history=[], customFoods=[]. Pantalla de Auth.

### 7.5 Eliminar cuenta

- **Setup**: Profile → Eliminar cuenta → Confirmar → Escribir ELIMINAR.
- **Esperado**: Todos los datos borrados. Auth user borrado. localStorage limpio. Toast de éxito.

### 7.6 Eliminar cuenta — palabra incorrecta

- **Setup**: Escribir "eliminar" (minúscula).
- **Esperado**: Toast rojo: "Escribiste eliminar — se esperaba ELIMINAR. Cuenta NO eliminada."

---

## 8. Link nutricionista

### 8.1 Generar enlace

- **Setup**: Diet → icono compartir → "Generar y copiar enlace".
- **Esperado**: URL copiada al portapapeles. Toast de éxito. Token visible en Profile.

### 8.2 Vista compartida — lectura

- **Setup**: Abrir enlace en incógnito (sin login).
- **Esperado**: Ve nombre, perfil, todas las comidas con tabs de días, macros.

### 8.3 Notas del nutricionista

- **Setup**: Desde enlace editable, escribir nota en una comida.
- **Esperado**: Nota guardada. Visible en SharedView. El usuario ve la nota en su Diet (💬).

### 8.4 Enlace expirado

- **Setup**: Enlace de >7 días.
- **Esperado**: Mensaje "Este enlace ha expirado".

### 8.5 Revocar enlace

- **Setup**: Profile → lista de enlaces → botón papelera.
- **Esperado**: Token borrado. Enlace ya no funciona.

---

## 9. Onboarding + Tutorial

### 9.1 Nuevo usuario completo

- **Setup**: Registro nuevo. Disclaimer → Onboarding → Tutorial → Dashboard.
- **Esperado**: Flujo completo sin errores. Datos guardados. No se repite al recargar.

### 9.2 T&C bloquea botón

- **Setup**: Último paso del onboarding sin marcar T&C.
- **Esperado**: Botón "¡Empezar!" deshabilitado.

### 9.3 T&C popup

- **Setup**: Pulsar link "Términos de Servicio" en onboarding.
- **Esperado**: Popup scrollable con contenido legal. Se cierra con botón "Cerrar".

### 9.4 Tutorial navega a pantallas reales

- **Setup**: Tutorial activo.
- **Esperado**: Cada paso navega a la ruta correcta. Icono del nav parpadea y se agranda. Overlay semitransparente.

---

## 10. Timer de descanso

### 10.1 Progresión de colores

- **Setup**: Iniciar timer de 60s.
- **Esperado**: Verde >30s. Amarillo 15-30s. Naranja 6-15s. Rojo parpadeante <6s (últimos 10s blink).

### 10.2 Cuenta negativa

- **Setup**: Timer llega a 0.
- **Esperado**: No se cierra. Muestra -1s, -2s... en rojo parpadeante. Label "¡Tiempo pasado!".

### 10.3 +30s suma

- **Setup**: Timer en 20s. Pulsar +30s.
- **Esperado**: Timer muestra 50s. No resetea.

### 10.4 Pegado al nav

- **Setup**: Timer activo en cualquier dispositivo.
- **Esperado**: Sin gap entre timer y nav inferior. Usa --nav-height CSS variable.

---

## 11. Persistencia

### 11.1 Save rápido + refresh

- **Setup**: Editar comida, guardar, refresh inmediato (<2s).
- **Esperado**: Cambios persisten (dirty flag + localStorage priority).

### 11.2 Offline + online

- **Setup**: Editar en offline. Recuperar conexión.
- **Esperado**: localStorage tiene los cambios. Al reconectar, Firestore se sincroniza.

---

## 12. Mi Nevera

### 12.1 Escanear producto nuevo

- **Setup**: Escanear barcode de producto no existente en Mi Nevera.
- **Esperado**: Busca en OFF → rellena form → usuario confirma → se guarda con imagen/nutriscore.

### 12.2 Escanear producto existente

- **Setup**: Escanear barcode de producto que ya está en Mi Nevera.
- **Esperado**: Aviso "ya está en tu Nevera". Guardar hace update (no duplica).

### 12.3 Detalle de producto

- **Setup**: Pulsar en un producto de la lista.
- **Esperado**: Modal con imagen grande, nombre, marca, barcode, nutriscore, NOVA, tabla nutricional completa.

### 12.4 Imagen HD

- **Setup**: Producto con imageUrl de OFF.
- **Esperado**: Imagen nítida (image_front_url, no small). Visible en Mi Nevera, Diet, y SharedView.

---

## 13. Warnings nutricionales

### 13.1 Comida excede target

- **Setup**: Comida con 150% de kcal sobre el target.
- **Esperado**: Triángulo ámbar en header. Barras de macros en rojo con "!".

### 13.2 Proteína >50g por toma

- **Setup**: Comida con 65g de proteína.
- **Esperado**: Nota: "la síntesis muscular es óptima con 30-40g..."

### 13.3 Comida dentro de rango

- **Setup**: Comida que cuadra ±10% del target.
- **Esperado**: Sin warning. Barras en colores normales.

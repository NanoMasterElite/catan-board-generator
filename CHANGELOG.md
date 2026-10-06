# Registro de Cambios (Changelog) - Generador de Tableros Catán

Este documento registra las modificaciones realizadas al código, las fechas en las que se implementaron y la justificación técnica de cada cambio para mantener un historial claro del proyecto.

## [2026-10-05] - V4.5: Corrección de puertos faltantes en Navegantes + Pescadores

### Modificaciones en main_monolith.js

1. **Relajación progresiva por puerto en `assignPorts`**
   - **Por qué:** Cuando las cuatro restricciones simultáneas (vértice compartido, arista bloqueada por caladero, `tooClose` a 38px y hexágono de agua ya usado por otro puerto) no dejaban ninguna arista válida, el puerto se descartaba silenciosamente y `poolIdx` no avanzaba. Resultado: se perdía el último tipo del pool barajado (2:1 madera en 5–6j, 3:1 genérico en 4j).
   - **Solución:** Se refactorizó la búsqueda a un helper `findEdgeForPort(baseIdx, relaxLevel, ...)` y se introdujo un bucle de reintento por puerto con tres niveles crecientes de relajación:
     - `lvl 1`: omite la exclusividad de `usedWaterHexIds` (dos puertos pueden mirar al mismo hexágono de agua).
     - `lvl 2`: además baja el umbral de `tooClose` de 38px a 30px.
     - `lvl 3`: además omite por completo la comprobación `tooClose`.
     La exclusión por **vértice compartido** (`usedVertices`) y las **aristas bloqueadas por caladeros** (`blockedEdgeKeys`) se respetan en todos los niveles: son garantías geométricas y de reglamento, no estéticas.

2. **Selección de rotación por `(puertos colocados, −relaxLevel)`**
   - **Por qué:** Antes se elegía la primera rotación que colocase más puertos y se rompía el bucle. Con la relajación, dos rotaciones pueden colocar la misma cantidad pero con distinto coste estético.
   - **Solución:** El bucle de rotaciones ahora compara tuplas y solo corta cuando coloca todos los puertos **con relajación 0**.

3. **Metadato `_relaxLevel` expuesto en el array de puertos**
   - **Por qué:** Permite que la UI informe al usuario si se relajó alguna restricción estética para no perder puertos.
   - **Solución:** `tryAssignPorts` devuelve el array de puertos con la propiedad `_relaxLevel` (entero 0–3). `assignPorts` la propaga.

4. **Aviso en `doGenerate`**
   - **Por qué:** Transparencia: el usuario debe saber cuándo un puerto se colocó con separación reducida.
   - **Solución:** Se añade un badge `⚠ Puertos con separación reducida` cuando `board.ports._relaxLevel > 0`.

### Bump de versión

- `GENERATOR_VERSION`: `'44'` → `'45'`
- Título e interfaz del HTML: V4.4 → V4.5
- Motivo: la relajación progresiva cambia la salida para una misma semilla en escenarios con caladeros activos. Las semillas V4.4 no reproducirán el mismo mapa en V4.5.

### Verificación

- Combinaciones Navegantes + Pescadores (`fishermenMode: 'full'`) verificadas:
  - `rumboNuevasOrillas4` → 9/9 puertos.
  - `rumboNuevasOrillas6` → 11/11 puertos.
  - `cuatroIslas` → 9/9 puertos.
- Ningún par de puertos comparte vértice (comprobación estricta mantenida).
- El selftest existente (`?selftest`) sigue pasando; se recomienda ampliar con la columna `avg_relax` para monitorizar cuántos escenarios requieren relajación.


## [2026-10-05] - V4.4: Corrección de superposición y pérdida de puertos

### Modificaciones en main_monolith.js

1. **Bloqueo por vértice compartido en assignPorts**
   - **Por qué:** Dos puertos podían compartir el mismo vértice físico cuando sus aristas eran contiguas. El chequeo de distancia comparaba midpoints (43.3px, por encima del umbral de 42), pero los puertos se dibujan desplazados 34px hacia afuera, y sus posiciones finales podían quedar a ~9px entre sí. Con radio de 16px, se superponían por completo.
   - **Solución:** Se añadió un Set `usedVertices` que impide que dos puertos compartan cualquiera de sus dos vértices. Es una garantía geométrica, no probabilística.

2. **Comparación por posición dibujada en lugar de midpoint**
   - **Por qué:** El chequeo `tooClose` comparaba `p.x, p.y` que son los midpoints de las aristas, no la posición final del puerto. Ajustando el umbral a 38px y comparando posiciones desplazadas se alinea con la representación visual.
   - **Solución:** Se calcula `drawX = mx + (dirX/len)*34` para cada candidato y se compara contra la posición dibujada de los puertos ya colocados.

3. **Fallback explícito cuando no hay arista válida**
   - **Por qué:** Si el bucle de offsets agotaba candidatos, `bestIdx` quedaba igual a `baseIdx` y el código pusheaba el puerto sobre una arista bloqueada o contigua a otro puerto. Visualmente el puerto "desaparecía" (se solapaba con otro) o quedaba en zona inválida.
   - **Solución:** Ahora `bestIdx` arranca en `null` y si tras el bucle sigue null, se hace `continue` sin pushear. Se separó `poolIdx` de `i` para que un puerto fallido no consuma una entrada del pool.

4. **Reporte de puertos faltantes en la UI**
   - **Por qué:** El fallback silencioso hacía que el usuario viera mapas con menos puertos de los esperados sin saberlo.
   - **Solución:** Si `board.ports.length < expectedPorts`, aparece un badge "⚠ N/M puertos" en el statsBox.

5. **Chequeo de déficit de puertos en el selftest**
   - **Por qué:** Necesitamos detectar automáticamente qué plantillas tienen problemas de geometría que impiden colocar todos los puertos.
   - **Solución:** Columna `port_deficit` en la tabla de resultados de `?selftest`.

### Bump de versión

- `GENERATOR_VERSION`: `'42'` → `'44'`
- Título e interfaz: V4.3 → V4.4
- Motivo: los cambios en assignPorts alteran el resultado para una misma semilla. Las semillas V4.3 no reproducirán el mismo mapa en V4.4, y eso está bien: la corrección es prioritaria.

## [2026-10-05] - Integración del módulo Pescadores en Navegantes y validación V4.3

### Modificaciones en main_monolith.js

1. **Reordenamiento de `generateBoard` (Caladeros antes que Puertos)**
   - **Por qué:** Al jugar escenarios de Navegantes (como "Rumbo a Nuevas Orillas") junto con el módulo de Pescadores, los puertos se generaban antes que los caladeros. Al ocupar tantas costas, bloqueaban los vértices válidos para los caladeros, impidiendo colocar la cantidad correcta de caladeros exigida por las reglas.
   - **Solución:** Se invirtió el orden de generación. Ahora se asignan los lagos, luego los caladeros (reservando sus bordes a través de un `Set` `fisheryBlockedEdges`), y finalmente se generan los puertos respetando los bordes ya ocupados. Esto garantiza que haya suficiente espacio para ambas entidades.

2. **Confinamiento de caladeros a la isla principal**
   - **Por qué:** En escenarios de islas separadas (como "Rumbo a Nuevas Orillas" o "Cuatro Islas"), los caladeros se generaban de forma aleatoria en islotes remotos, violando las reglas oficiales.
   - **Solución:** Se introdujo la propiedad `FisheryAllowedIds` en los templates. Al igual que con los puertos, esto permite restringir la ubicación de los caladeros exclusivamente a las regiones definidas (usualmente la región principal).

3. **Lógica de `lakeTouchesWater` agnóstica de familias**
   - **Por qué:** La validación de que un lago no tocara el mar solo se ejecutaba si la familia del escenario era estrictamente "pescadores", haciendo que el módulo fallara o colocara lagos mal en escenarios mixtos con Navegantes.
   - **Solución:** Se generalizó el check. Ahora, `lakeTouchesWater` se activa globalmente si la variable `fishermenMode` es verdadera (es decir, el módulo está activo), independientemente del escenario base.

4. **Prevención de colisiones Vértices-Puertos (`blockedEdgeKeys`)**
   - **Por qué:** El generador de caladeros usaba un mapa rudimentario para evitar los puertos, y el generador de puertos solo miraba colisiones de costas simples, lo que a veces terminaba en caladeros dibujados sobre puentes de puertos.
   - **Solución:** Se implementó `blockedEdgeKeys`, enviando desde la asignación de caladeros un registro estricto de cada vértice costero que ocupa el caladero hacia `assignPorts`. Así, la lógica de puertos descarta por completo los vértices ya empleados.

## [2026-10-05] - Fase 1: Quick Wins (Bugs y Estabilidad)

### Modificaciones en `main_monolith.js`

1. **Corrección de distancia en `assignFisheries` (Puertos vs Caladeros)**
   - **Por qué:** Antes, para evitar que los caladeros se colocaran sobre puertos existentes, se utilizaba una fórmula de distancia euclidiana (`Math.hypot < 5`). Esto era frágil y propenso a fallos visuales y lógicos.
   - **Solución:** Se reemplazó la lógica de distancia por una verificación de vértices exactos (`edgeKey`), asegurando matemáticamente que un caladero nunca comparta el mismo borde con un puerto.

2. **Solución a mutaciones en `normalizeTemplate`**
   - **Por qué:** La función `normalizeTemplate` modificaba directamente los objetos dentro de `BOARD_TEMPLATES`. Si un template pasaba por ahí más de una vez, los arrays se acumulaban o se corrompían.
   - **Solución:** Se añadió una clonación profunda (`JSON.parse(JSON.stringify(original))`) antes de aplicar la normalización, protegiendo las plantillas originales de cualquier alteración tóxica y estabilizando la generación de múltiples tableros en una misma sesión.

3. **Corrección de la coexistencia del Ladrón y Pescadores (`computeRobberHexId`)**
   - **Por qué:** El generador desactivaba al Ladrón (desierto) si existía cualquier caladero en el tablero, incluso si solo se estaban usando "lagos" (lakes_only) como añadido de expansión sin quitar el desierto.
   - **Solución:** Se ajustó la regla para que el ladrón solo sea removido si el template especifica explícitamente `autoFishermen === 'full'` y existen caladeros.

4. **Corrección de Restauración de Estado (`restoreBoardSnapshot`)**
   - **Por qué:** Al cargar una partida previa (snapshot), el código buscaba `snap.template`, lo cual daba `undefined` e impedía cargar las reglas de los pescadores correctamente porque la propiedad guardada era `templateId`.
   - **Solución:** Se cambió `snap.template` a `snap.templateId`, restaurando completamente el comportamiento al retroceder o cargar estados guardados.

5. **Aviso de diseño en "El Pueblo Perdido" (`puebloPerdido4`)**
   - **Por qué:** La plantilla 5 (El Pueblo Perdido para 4 jugadores) reutiliza la silueta de "Rumbo a Nuevas Orillas" (`frameCellsFrom: 'rumboNuevasOrillas4'`), pero reglamentariamente tiene una silueta de 49 celdas y no coincide. 
   - **Solución:** Se añadió la propiedad `dataWarning: 'Diseño aproximado (no coincide la silueta)'` para ser transparentes en la UI con los usuarios.

### Verificación en `Generador CATAN V4.3.html`

1. **Validación de UI (`fishermenModuleContainer`)**
   - **Por qué:** El reporte externo indicaba que faltaba un contenedor en el HTML para poder ocultar el panel de pescadores, pero al revisar el archivo actual se confirmó que la etiqueta `<div id="fishermenModuleContainer">` ya existe en la versión V4.3, por lo que no se requirieron cambios adicionales.

### Ajuste en Escenario 1: Los Pescadores de Catán

- **Por qué:** Al seleccionar el escenario 1 de Mercaderes y Bárbaros (Los Pescadores de Catán), el generador mostraba un mapa normal sin lagos ni caladeros, ya que la UI de la expansión requería ser activada manualmente y esto causaba confusión. Además, el módulo en sí debía ocultarse ya que el escenario completo se trata de la expansión.
- **Solución:** Se refactorizó la lógica en main_monolith.js (`renderFishermenSeg` y `renderExpansionSeg`) para delegar el control de visualización y estado. Ahora, al seleccionar explícitamente el escenario pescadores, se fuerza internamente el modo de pescadores a 'full' (Lagos y Caladeros) y se oculta el panel de selección, garantizando la correcta generación automática del escenario.

### Correcciones en Generación de Escenario 1 (Pescadores de Catán)

- **Por qué:** 
  1. En 4 jugadores, el lago casi nunca se generaba en el hexágono central.
  2. En 5/6 jugadores, los lagos siempre se generaban en los mismos lugares.
  3. No todos los caladeros se generaban (solo 3 en lugar de 6 u 8) debido a la estricta restricción de ubicación con los puertos.
- **Solución:** 
  - Se modificó la plantilla pescadores4 estableciendo `fixedHexes: { 9: 'desert' }` para que el lago siempre aparezca en el centro (hex 9).
  - Se modificó la plantilla pescadores6 quitando el `fixedHexes` y agregando 2 desiertos en `resourceCounts` para que los dos lagos se ubiquen de manera aleatoria cada vez que se genere el tablero.
  - En la función `assignFisheries`, se eliminó la restricción que limitaba los caladeros solo a los vértices de intersección entre dos hexágonos terrestres costeros, permitiendo su ubicación en todos los vértices costeros (concordante con las reglas oficiales donde se ubican en todo el borde). También se redujo la distancia de separación entre caladeros (`nearFishery`) de 55 a 45 para garantizar espacio suficiente sin traslapar la lógica.

### Optimización de Algoritmo de Generación y MRV

- **Por qué:** 
  1. Los usuarios reportaron que "ha dejado de funcionar la restricción de recursos iguales adyacentes" y que los mapas "tardan más en cargar".
  2. La causa raíz era que el algoritmo MRV de Backtracking usaba un ordenamiento puramente estático (`order.sort`). Cuando se enfrentaba a configuraciones difíciles (especialmente en 6 jugadores), caía en los mismos caminos sin salida durante los 100 reinicios de 5000 iteraciones (500k pasos inútiles), para finalmente rendirse y generar un tablero con las restricciones relajadas (recursos iguales adyacentes).
- **Solución:** 
  - Se introdujo aleatoriedad controlada (`rng() - 0.5`) dentro de la ordenación inicial para desempatar hexágonos con la misma cantidad de vecinos tanto en `assignResourcesRegionOnce` como en `assignNumbersRegionOnce`. 
  - Al explorar distintos órdenes de variables en cada reinicio, el algoritmo evita estancarse en "trampas tempranas" del árbol de decisiones. Esto resuelve la demora (tiempos de carga lentos) y asegura que casi siempre logre ubicar los recursos respetando la regla `noSameAdjacent` en menos intentos, sin tener que recurrir a relajar la regla.

## [2026-10-05] - Verificación final y recuperación de opciones

### Modificaciones en main_monolith.js

1. **Recuperación de la opción de puertos aleatorios**
   - **Por qué:** La UI permitía marcar la casilla de 'Puertos aleatorios', pero la lógica de generación (`assignPorts`) no leía esta configuración de opts ni barajaba el pool de recursos del puerto, provocando que los puertos siempre tuvieran el mismo orden fijo de distribución según las claves del objeto, incluso si el usuario quería aleatoriedad.
   - **Solución:** Se añadió la captura del valor de `optRandomPorts` en la función `getOpts` y se ajustó la firma de `assignPorts` para aceptar el objeto opts. Dentro de `assignPorts`, ahora el array base solo se mezcla (`shuffle(pool)`) si `opts.randomPorts !== false`, devolviendo la aleatoriedad total u orden preestablecido de manera correcta y esperada.

2. **Migración final de dataWarning a `approximate: true` para escenarios de expansión**
   - **Por qué:** Faltaba aplicar la bandera de aproximación en los escenarios de 'Mercaderes y Bárbaros' y en la variante de 'Las Seis Islas' y 'Oceanía 3', lo que provocaba que el motor MRV lanzara una excepción (`free !== eff`) deteniendo la generación por pequeñas variaciones (como la limpieza de duplicados o conteos incompletos).
   - **Solución:** Se completó el reemplazo de dataWarning por `approximate: true` en todas estas plantillas, permitiendo que el motor ignore advertencias no críticas sobre número de casillas de tierra.

3. **Refactorización de la variable acumulada isRelaxed**
   - **Por qué:** La variable isRelaxed estaba declarada fuera del bucle de intentos de balanceo (`maxPipAttempts`), lo que causaba que, si un intento de generación era 'relajado' (por agotamiento de restricciones), se marcara todo el resultado final como relajado, a pesar de que un intento posterior fuera perfecto (no relajado).
   - **Solución:** Se movió la evaluación de isRelaxed (ahora localRelaxed) al interior del bucle de cada intento de asignación (`pipAttempts`). De esta manera, cada intento mantiene su propia variable independiente de restricción relajada y la guarda en el objeto `best`, reportando la verdad del intento que finalmente se escoge.

4. **Independencia de las banderas `approximate` y `dataWarning`**
   - **Por qué:** El validador silenciaba errores de conteo de hexágonos cuando la bandera `approximate: true` estaba activa. Ambas banderas cumplen propósitos distintos: `approximate` indica que la silueta no es oficial, mientras que `dataWarning` indica que el conteo de recursos no cuadra (sobran o faltan fichas numeradas/terrenos).
   - **Solución:** Se separaron ambas validaciones, obligando al validador a reportar inconsistencias de conteo sin importar el estado de `approximate`. Además, se dejaron registrados explícitamente en el código 4 escenarios mediante `dataWarning` que presentan discrepancias para futuras revisiones con el reglamento oficial:
     - `riosCatan6`: 25 hexágonos numerables vs 28 números declarados.
     - `ataqueBarbaros4`: 17 numerables vs 18 declarados.
     - `ataqueBarbaros6`: 26 numerables vs 28 declarados.
     - `mercaderesBarbaros6`: 25 numerables vs 28 declarados.


## [2026-10-05] - Mantenimiento y limpieza (Cleanups)

### Modificaciones en main_monolith.js

1. **Corrección de renderizado en caladeros (`assignFisheries`)**
   - **Bug:** Al procesar un subconjunto de caladeros, se usaba el índice local (`bestIdx`) como referencia directa sobre el array global original (`validSpots`) en vez de sobre el array filtrado actual (`candidatePool`), ocasionando que las líneas de las fichas de puerto dibujadas fallaran visualmente o apuntaran a posiciones espurias (Pescadores de Catán).
   - **Solución:** Se corrigió el mapeo apuntando explícitamente a `candidatePool[bestIdx]` asegurando que todo caladero en configuración de 2 hexágonos ancle sus 3 cuerdas directas a las esquinas externas respectivas.

2. **Forzado correcto de Variante en Pruebas (`buildFixedArcIslands`)**
   - **Bug:** El sistema de test (`validateTemplates`) iteraba las variantes estructurales de un mapa inyectando `selectedVariant = i`, pero `buildFixedArcIslands` ignoraba esto seleccionando pseudoaleatoriamente mediante `Math.floor(rng() * ...)`. Como resultado, se probaban repetidamente las mismas variantes y se omitían otras.
   - **Solución:** Se incluyó un condicional para respetar `template.selectedVariant` si este existe. En caso contrario, retiene el comportamiento aleatorio nativo.

3. **Inferencia global de Badge `approximate`**
   - **Bug:** La interfaz de advertencias ('Diseño aproximado, no es el mapa oficial') funcionaba evaluando sobre un listado incrustado de familias (`approxFamilies`), pero recientemente varios mapas (ej. Oceanía, Seis Islas) integraron la bandera `approximate: true` en sus atributos sin mostrar esta advertencia.
   - **Solución:** Se eliminó la evaluación por listado duro. Ahora la advertencia salta de forma universal verificando directamente el estado boleano en el objeto: `if (board.template.approximate)`.

4. **Limpieza de firma en `assignPorts` y ternarios estáticos**
   - **Problema:** Había un uso estático innecesario `true ? assignPorts(...) : []` que ensuciaba la lógica en la ejecución principal, sumado a un uso arcaico de `arguments[5]` para capturar opciones sin estar declaradas formalmente.
   - **Solución:** Se removió el condicional ternario vacío. La firma de la función `assignPorts` ahora declara explícitamente sus parámetros de opciones y generador con valores default (`rng = Math.random, opts = {}`), brindando un mejor soporte IDE y orden de lectura sin depender de variables ocultas.

# Informe de evaluación — Generador de Mapas de Catán (V4_1)

**Archivo evaluado:** `Generador_CATAN_V4_1.html` (5 448 líneas, ~258 KB, un solo archivo autocontenido)
**Fecha del informe:** 3 de octubre de 2026

---

## 0. Cómo se hizo esta evaluación (y sus límites)

- Leí el código completo de la parte de **motor, plantillas y reglas** y revisé por estructura el resto (renderizado, persistencia, estadísticas, historial).
- **Extraje el motor y las 34 plantillas y las ejecuté en Node.js** (no en el navegador): conteos de hexágonos vs. recursos vs. fichas, tasa de éxito de generación, cumplimiento de restricciones y tiempos. Los números de este informe salen de esas ejecuciones.
- **No** probé la interfaz en un navegador, ni el aspecto visual del SVG, ni los flujos de estadísticas más allá de leer el código.
- **No reproduzco de memoria los contornos oficiales** de los escenarios 5–8 de Navegantes: sin el mapa del reglamento delante, cualquier coordenada que inventara sería una suposición. Más abajo propongo cómo hacerlo con certeza (sección 5).

---

## 1. Calificación objetiva

| Área | Nota /10 | Resumen |
|---|---|---|
| Motor de generación (algoritmo) | **8.5** | Backtracking con presupuesto, PRNG con semilla, reintentos, balance de pips. Rápido y determinista. |
| Cobertura de escenarios | **5.5** | 26 de 34 plantillas generan; 10 de las de Navegantes son marcadores de posición, no diseños oficiales. |
| Corrección de datos de plantillas | **4.5** | 8 plantillas fallan siempre y otras 4 generan con una distribución distinta de la declarada. |
| Manejo de errores / feedback al usuario | **4** | El error de generación se traga y muestra un mensaje genérico. |
| Persistencia y respaldo | **8** | `window.storage`/`localStorage`, migraciones de datos, exportar/importar respaldo, aviso de cuota llena. |
| Reproducibilidad (semillas) | **7** | Semilla versionada (`CATAN-41-…`), pero la semilla **no incluye las opciones**. |
| Mantenibilidad / arquitectura | **5.5** | Un archivo de 5.4k líneas; ~20 % son datos de plantillas mezclados con lógica. |
| Rendimiento | **9** | 1–10 ms por mapa; con balance de pips (30 intentos) 7–330 ms. |
| UX / presentación | **7.5** | Pan/zoom, mapa de calor, pips, modo edición, leyenda, toasts. (No verificado visualmente.) |
| **Global** | **6.7** | Muy buena base técnica; lo que baja la nota es lo inconcluso y la falta de validación automática. |

---

## 2. Hallazgos críticos (bugs reales, reproducidos)

### 2.1 Plantillas que NUNCA generan (100 % de fallos en 30 semillas)

| Plantilla | Causa |
|---|---|
| `puebloPerdido4` | 44 hex en el marco pero 49 recursos declarados; 27 hex numerables vs. 18 fichas. |
| `puebloPerdido6` | La región `islote` no tiene `numberCounts`, pero 8 de sus hex son numerables → sin solución. |
| `telasCatan4` | 44 hex vs. 42 recursos; 22 numerables vs. 28 fichas. |
| `telasCatan6` | 57 hex vs. 56 recursos; 28 numerables vs. 38 fichas. |
| `islasPiratas4` | 44 hex vs. 49 recursos; 27 numerables vs. 24 fichas. |
| `unNuevoMundo4` | 44 hex vs. 42 recursos. |
| `riosCatan6` (M&B) | 27 hex libres vs. 25 recursos (sobran 2 hex que no se pueden llenar). |
| `mercaderesBarbaros6` (M&B) | 25 hex libres vs. 23 recursos; 23 numerables vs. 28 fichas. |

**Por qué fallan:** el motor exige asignar *todos* los hexágonos libres usando exactamente los conteos declarados. Si los conteos no suman el número de hexágonos, el backtracking agota las opciones.

### 2.2 Plantillas que generan, pero con una distribución distinta de la declarada

`islasPiratas6` (63 recursos en 57 hex), `maravillas4` (49 en 44), `maravillas6` (63 en 57) y `unNuevoMundo6` (63 en 57): como declaran **más** recursos que hexágonos, el algoritmo termina cuando se acaban los hexágonos y deja sin colocar una parte aleatoria del *pool*. Resultado: la cantidad de mar, desiertos u oro varía de mapa a mapa sin que nadie lo decida.

### 2.3 Error silencioso en la interfaz

En `doGenerate()` el `catch` descarta el error y muestra siempre «No se pudo generar un tablero válido. Inténtalo de nuevo o relaja restricciones.». Para las 8 plantillas rotas, ese mensaje es **engañoso**: reintentar nunca va a funcionar y relajar restricciones tampoco.

### 2.4 Lo que NO es un bug (lo verifiqué para descartarlo)

Mi prueba detectó «recursos iguales adyacentes» en `oceania*`, `desierto*` y `ataqueBarbaros6`. Es **por diseño**: son los hexágonos de niebla, el cinturón de desierto y el castillo/desierto fijos. Las restricciones de rojos adyacentes, números iguales y 2-12 adyacentes se cumplieron en el 100 % de los 150 mapas probados por plantilla funcional, y los puertos salieron completos en todos.

---

## 3. Parche propuesto para 2.1 y 2.2 (probado)

**Idea:** el mar es «el resto». En las plantillas con marco (`waterInPool`), el número de hexágonos de mar se calcula como `hex_libres − recursos_no_mar`, y las fichas se derivan automáticamente por reparto proporcional a la distribución base. Así los conteos **no pueden** volver a desalinearse.

Resultado de probar este parche sobre las 9 plantillas de Navegantes afectadas: **100/100 mapas generados en cada una, 0 fallos.**

```js
// Distribución base (18 fichas) para escalar a cualquier cantidad de hex numerables
const BASE_NUM_WEIGHTS = {2:1,3:2,4:2,5:2,6:2,8:2,9:2,10:2,11:2,12:1};

function autoNumberCounts(m) {
  const total = 18, keys = Object.keys(BASE_NUM_WEIGHTS);
  const raw = keys.map(k => ({ k, exact: BASE_NUM_WEIGHTS[k] * m / total }));
  raw.forEach(r => r.n = Math.floor(r.exact));
  let left = m - raw.reduce((a, r) => a + r.n, 0);
  raw.sort((a, b) => (b.exact - b.n) - (a.exact - a.n));          // mayor resto primero
  for (let i = 0; left > 0; i = (i + 1) % raw.length, left--) raw[i].n++;
  const out = {}; raw.forEach(r => { if (r.n > 0) out[r.k] = r.n; });
  return out;
}

// Llamar una vez tras definir BOARD_TEMPLATES (solo plantillas con regionGroups2)
function normalizeTemplate(t) {
  if (!t.regionGroups2) return;
  const tr = buildTemplateHexes(t, createPRNG('n'));
  for (const rg of t.regionGroups2) {
    const ids  = tr.regionHexIds[rg.region] || [];
    const free = ids.length; // los fijos ya están contados dentro de resourceCounts
    const rc   = rg.resourceCounts;
    const nonWater = Object.entries(rc).filter(([k]) => k !== 'water')
                           .reduce((a, [, b]) => a + b, 0);
    if (free < nonWater) { console.warn(`${t.id}/${rg.region}: más recursos (${nonWater}) que hex libres (${free})`); continue; }
    if (rc.water !== undefined || free > nonWater) rc.water = free - nonWater;
    const noNum = Object.entries(rc).filter(([k]) => NO_NUMBER_TYPES.has(k))
                        .reduce((a, [, b]) => a + b, 0);
    const m   = free - noNum;
    const cur = Object.values(rg.numberCounts || {}).reduce((a, b) => a + b, 0);
    if (cur !== m && !rg.noNumbers) rg.numberCounts = autoNumberCounts(m);
  }
}
Object.values(BOARD_TEMPLATES).forEach(normalizeTemplate);
```

**Aviso importante:** esto hace que *generen*, no que sean *oficiales*. Siguen siendo mapas aleatorios dentro del marco (ver sección 4).

**Para Pueblo Perdido 6** hace falta además una bandera de región `noNumbers: true` (los islotes de la tribu no llevan números ni se construye en ellos, según tu propia `rulesNote`). El motor debe saltarse `assignNumbersRegion` para esa región.

**Para `riosCatan6` y `mercaderesBarbaros6`** el parche anterior no aplica (no usan marco con mar). Hay que corregir los conteos a mano contra el reglamento de Mercaderes y Bárbaros: sobran 2 hexágonos en cada una (27 libres vs. 25 recursos; 25 libres vs. 23).

### 3.1 Validador de plantillas (recomendado para siempre)

Convención del motor: un hexágono fijo (`fixedHexes` / `fixedHexCoords`) se descuenta de `resourceCounts` **solo si su tipo aparece en esos conteos** (p. ej. en Desierto el `desert: 3` ya incluye los 3 desiertos fijos; en Pescadores el lago fijo NO está en los conteos). El validador respeta esa convención:

```js
function validateTemplates() {
  const problems = [];
  for (const [id, t] of Object.entries(BOARD_TEMPLATES)) {
    const tr = buildTemplateHexes(t, createPRNG('v'));
    const groups = t.regionGroups2 || [{ region: '__all', resourceCounts: t.resourceCounts, numberCounts: t.numberCounts }];
    for (const g of groups) {
      const ids = g.region === '__all' ? tr.hexes.map(h => h.id) : (tr.regionHexIds[g.region] || []);
      const FX  = g.region === '__all' ? (t.fixedHexes || {}) : tr.fixedHexes;
      const rc  = g.resourceCounts || {};
      const fixedIds = ids.filter(i => FX[i] !== undefined);
      const free = ids.length - fixedIds.length;
      const consumed = fixedIds.filter(i => rc[FX[i]] !== undefined);
      const eff = Object.values(rc).reduce((a, b) => a + b, 0) - consumed.length;
      const numerable = Object.entries(rc).filter(([k]) => !NO_NUMBER_TYPES.has(k))
                          .reduce((a, [, b]) => a + b, 0)
                        - consumed.filter(i => !NO_NUMBER_TYPES.has(FX[i])).length;
      const nums = Object.values(g.numberCounts || {}).reduce((a, b) => a + b, 0);
      if (free !== eff) problems.push(`${id}[${g.region}]: ${free} hex libres ≠ ${eff} recursos`);
      if (!g.noNumbers && numerable !== nums) problems.push(`${id}[${g.region}]: ${numerable} numerables ≠ ${nums} fichas`);
    }
  }
  return problems;
}
// En desarrollo: console.table(validateTemplates());
```

Probado sobre las 34 plantillas: reporta exactamente las incongruencias reales (20 líneas) y ningún falso positivo. Además de las de Navegantes, marca `riosCatan6` y `mercaderesBarbaros6` (hex libres ≠ recursos) y detecta que `ataqueBarbaros4/6` declaran más fichas numéricas que hex numerables (17 vs 18 y 26 vs 28): generan, pero sobran fichas sin colocar.

Esto habría detectado los problemas de la sección 2 antes de que llegaran al usuario. Es la mejora de mayor valor por línea de código.

---

## 4. Estado real de los escenarios de Navegantes

| # | Escenario | 3j | 4j | 6j | Estado |
|---|---|---|---|---|---|
| 1 | Rumbo a Nuevas Orillas | ✅ | ✅ | ✅ | Diseño fijo con regiones (isla principal + islotes). |
| 2 | Las Islas | ✅ | ✅ | ✅ | Con variantes de forma y validación de islas independientes. |
| 3 | Oceanía | ✅ | ✅ | ✅ | Con niebla (tierra ignota). |
| 4 | A Través del Desierto | ✅ | ✅ | ✅ | Diseño fijo con cinturón de desierto. |
| 5 | El Pueblo Perdido | — | ❌ placeholder, no genera | ❌ diseño fijo, no genera | Falta `noNumbers` y corregir conteos (4j). |
| 6 | Telas para Catán | — | ❌ placeholder, no genera | ❌ placeholder, no genera | Sin diseño: debería ser dos islas + aldeas. |
| 7 | Las Islas Piratas | — | ❌ placeholder, no genera | ⚠️ placeholder, genera sesgado | Sin fortalezas ni ruta de la flota pirata. |
| 8 | Las Maravillas Catanas | — | ⚠️ placeholder, genera sesgado | ⚠️ placeholder, genera sesgado | Sin diseño ni elementos de maravillas. |
| 9 | Un Nuevo Mundo | — | ❌ no genera | ⚠️ genera sesgado | **Es escenario libre**: tras el parche queda funcionalmente completo. |

«Placeholder» = reutiliza el marco de *Rumbo a Nuevas Orillas* y baraja todo al azar; no es el mapa del reglamento.

---

## 5. Cómo terminar los escenarios 5–8 (plan concreto)

### 5.1 El bloqueo real: los contornos oficiales

Los escenarios 5–8 dependen de una geometría precisa (qué hex es islote, dónde van las aldeas, cuántas fortalezas, etc.). Eso **solo se puede hacer bien con el mapa del reglamento Devir delante**. Tienes dos caminos que funcionan:

**Camino A — Me pasas las imágenes (recomendado).**
Sube a esta conversación una foto o captura nítida del diagrama de cada escenario (3–4j y 5–6j). Yo transcribo cada hexágono a coordenadas axiales `(q, r)`, genero el bloque de plantilla y **lo valido con `validateTemplates()` y 100 generaciones antes de entregártelo**. Conviene empezar por un escenario a la vez.

**Camino B — Lo transcribes con tu propia herramienta.**
Ya tienes un modo edición (`openEditModal`). Añadir un botón «Exportar plantilla (JSON)» que vuelque `hexes` con su `(q, r)`, región y terreno fijo te permite «pintar» el mapa oficial en pantalla y copiarlo como plantilla. Es ~40 líneas de código y sirve para todos los escenarios futuros (incluidos Oceanía y los de Mercaderes y Bárbaros).

Convención de coordenadas del archivo: `x = √3·SIZE·(q + r/2)`, `y = 1.5·SIZE·r`, con `SIZE = 50`. Ejemplo: `(0,0)` es el centro y `r` crece hacia abajo.

### 5.2 Qué necesita cada escenario además del mapa

| Escenario | Elementos que el generador debería manejar |
|---|---|
| **5. Pueblo Perdido** | Región de islotes **sin números** y sin construcción (`noNumbers`), marcadores visuales «de regalo»; meta 13 PV (3–4j) / 14 PV (5–6j), como ya declaras. |
| **6. Telas para Catán** | Fichas numéricas sobre las **aldeas indígenas** (islotes centrales) separadas de las de recursos; inicio con 3 poblados; campo de estadísticas `telas` (2 telas = 1 PV). Meta 14 PV. |
| **7. Islas Piratas** | Hexágonos/marcadores de **fortaleza pirata** (1 por jugador en 5–6j, según tu nota), **ruta circular de la flota pirata** dibujada sobre el mapa; campo de estadísticas `fortalezasConquistadas`; victoria = 10 PV **y** fortaleza conquistada. |
| **8. Maravillas Catanas** | Sin mecánica de tablero adicional salvo el mapa; campo de estadísticas `nivelMaravilla` (0–4); condición de fin distinta a «llegar a N PV». |
| **9. Un Nuevo Mundo** | Ya es libre. Añadir opción «puertos libres» (no generar puertos) y enlazar el 1 PV por primer poblado en isla extraña con `foreignIslands` (ya existe en estadísticas). |

### 5.3 Orden recomendado

1. Aplicar el parche de la sección 3 + el validador (≈30 min). **Con esto el 9 y los placeholders dejan de fallar.**
2. Arreglar el `catch` de `doGenerate` (sección 6, punto 1) y añadir una insignia «Diseño aproximado» a las plantillas placeholder.
3. Transcribir **Pueblo Perdido** (Camino A o B) — es el más simple.
4. **Telas** → **Islas Piratas** → **Maravillas**, uno por vez.
5. Añadir los campos de estadísticas nuevos usando el patrón que ya tienes (`ENTRY_NUM_FIELDS` + `migrateEntry`).

---

## 6. Mejoras y optimización (priorizadas)

### Alta prioridad (poco esfuerzo, mucho valor)

1. **Mostrar el error real.** En `doGenerate`: `catch (e) { statsBox.innerHTML = '⚠️ ' + escapeHtml(e.message) }`. Y distinguir «plantilla inválida» (error de datos) de «no hubo solución con estas restricciones».
2. **Insignia «⚠ Diseño aproximado»** para plantillas sin `officialArcLayout`, para que nadie crea que es el mapa oficial.
3. **Avisar cuando se relajan restricciones.** `assignResourcesRegion` y `assignNumbersRegion` recurren en silencio a `noSameAdjacent:false` / `noSameNumberAdjacent:false` si fallan 100 reintentos. Devuelve una bandera `relaxed` y muéstrala junto al badge de calidad.
4. **Incluir las opciones en el código compartible.** Hoy `CATAN-41-XXXX` solo es la semilla; con otras opciones activadas el mapa cambia. Propuesta: `CATAN-41-XXXX-a3f` donde el sufijo codifica las casillas marcadas en bits.
5. **Ejecutar `validateTemplates()` al cargar** en modo desarrollo (por ejemplo con `?debug`).

### Prioridad media

6. **Separar datos de lógica.** Las plantillas son ~1 090 líneas (≈20 %). Aunque quieras seguir con un solo archivo, ponlas en un bloque `<script type="application/json" id="templates">` o en un `templates.js` con un paso de empaquetado. Facilita editarlas y probarlas en Node, como hice aquí.
7. **Prueba automática (`?selftest`).** Un botón que genere N mapas por plantilla y reporte fallos y tiempos; es exactamente la auditoría de este informe, convertida en una herramienta permanente.
8. **Reducir duplicación.** La expresión `exp === 'Ciudades y Caballeros' || exp === 'Ciudades y Caballeros + Navegantes'` se repite en 4 bloques de código (7 comparaciones). Ya tienes `EXPANSION_RULES`: añade banderas (`isCyC`, `isNav`) y consúltalas.
9. **Fuentes locales.** Se cargan de Google Fonts; si abres el archivo sin internet cae a Georgia/Segoe UI (funciona, pero se ve distinto). Puedes incrustarlas en base64 si quieres autonomía total.
10. **Revisar `innerHTML`.** Hay 38 usos y 17 llamadas a `escapeHtml`. No es un riesgo remoto (la app es local), pero conviene confirmar que **todo texto escrito por el usuario** (nombres de jugadores, grupos, notas) pase por `escapeHtml`, sobre todo si algún día compartes archivos de respaldo.

### Prioridad baja / ideas

11. Exportar el mapa a **PNG/SVG** para imprimirlo o compartirlo.
12. **Vista de «mapa de la partida»** vinculada al historial (ya guardas `boardSnapshot`; es solo renderizarlo).
13. En el historial/estadísticas: terminar las vistas de **cartas de desarrollo ampliadas** (pendiente que ya tenías).
14. Comparador de balance: mostrar los 3–5 mejores mapas de N semillas por puntaje de pips.

---

## 7. Rendimiento (medido en Node, con las opciones por defecto de la interfaz)

| Plantilla | Sin balance de pips | Con balance (30 intentos) |
|---|---|---|
| Catán base | 1.5 ms | 17 ms (máx. 28) |
| Extensión 5–6 | 2.2 ms | 28 ms (máx. 60) |
| Rumbo 5–6j | 3.9 ms | 81 ms (máx. 112) |
| Seis Islas | 8.1 ms | 7 ms |
| Oceanía 5–6j | 1.5 ms | 23 ms |
| Desierto 5–6j | 1.8 ms | 27 ms |
| Maravillas 5–6j (placeholder) | 7.0 ms | 61 ms |
| Un Nuevo Mundo 5–6j (placeholder) | 45 ms | 205 ms (máx. 331) |

Conclusión: **no hace falta optimizar el motor**. Todo está por debajo de 350 ms, imperceptible para el usuario. La energía debe ir a corrección y completitud, no a velocidad.

---

## 8. Resumen ejecutivo

- **Lo bueno:** motor sólido, rápido y determinista; persistencia y respaldo bien resueltos; escenarios 1–4 completos y con diseños fijos.
- **Lo urgente:** 8 plantillas que fallan siempre (6 de Navegantes y 2 de Mercaderes y Bárbaros) y 4 que generan con una distribución distinta de la declarada. El parche de la sección 3 resuelve las de Navegantes en ~30 minutos.
- **Lo pendiente de verdad:** los diseños oficiales de 5–8. Es un trabajo de **transcripción**, no de algoritmo, y lo más seguro es hacerlo con las imágenes del reglamento: si me las subes escenario por escenario, los convierto y valido.
- **Lo que haría yo primero:** parche + validador + mensaje de error real. Después, Pueblo Perdido.

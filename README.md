# Generador de Mapas de Catán (V4.3)

![Catan](https://img.shields.io/badge/BoardGame-Catan-orange?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![SVG](https://img.shields.io/badge/Render-SVG-FFB13B?style=flat-square&logo=svg&logoColor=white)

Un generador avanzado, altamente personalizable y determinista de mapas para el juego de mesa Catán. Diseñado para soportar múltiples expansiones (Ciudades y Caballeros, Navegantes, Mercaderes y Bárbaros) y escenarios personalizados, garantizando que los tableros generados sean matemáticamente jugables y estéticamente idénticos al juego físico.

## ✨ Características Principales

* **Generación Procedimental Justa:** Evita concentraciones desbalanceadas de recursos o números rojos (6 y 8) adyacentes utilizando un motor de restricciones avanzado.
* **Soporte Multi-Expansión:** Calcula correctamente la cantidad de hexágonos, puertos, y metas de Puntos de Victoria dependiendo de las expansiones seleccionadas.
* **Renderizado SVG Nativo:** Dibuja el tablero dinámicamente mediante SVG puro, soportando zoom delimitado, arrastre interactivo (drag & pan) y capas superpuestas.
* **Análisis Térmico (Mapa de Calor):** Visualiza la distribución de probabilidad (Pips) en el tablero para evaluar la equidad de las posiciones iniciales.
* **Semillas Deterministas (Seeds):** Cada tablero generado produce una "Semilla" única (ej. `CATAN-1A2B3C`) que permite recrear exactamente el mismo mapa en el futuro.
* **Persistencia y Registro:** Sistema integrado en `localStorage` para llevar el registro de partidas jugadas, puntos por jugador, y calcular estadísticas o porcentajes de victoria de tu grupo de amigos.

## 🧠 Arquitectura y Algoritmos (Technical Stack)

Este proyecto no depende de frameworks pesados de frontend (React/Angular/Vue); todo el motor lógico y de renderizado está construido en Vanilla JavaScript moderno (ES6+), demostrando dominio en:

1. **Grafos Hexagonales:** Utiliza un sistema de coordenadas axiales `(q, r)` para el mapeo, rotación y adyacencia de la cuadrícula hexagonal de manera eficiente en `O(N)`.
2. **Backtracking & MRV (Minimum Remaining Values):** La asignación de números y recursos a los hexágonos se resuelve mediante un algoritmo de satisfacción de restricciones (CSP). El motor prioriza los hexágonos con menos opciones disponibles y retrocede (*backtracks*) si se acorrala, garantizando tableros válidos.
3. **Renderizado Declarativo:** Las estadísticas de la partida se construyen a través de un motor de vistas basado en arreglos de columnas (`COLUMNS`), permitiendo inyectar nuevas reglas de expansión de forma puramente declarativa sin duplicar código de interfaz.
4. **Migraciones Seguras:** Incluye un sistema de versionado de esquemas de datos (`SCHEMA_VERSION`) que actualiza la estructura de datos almacenados en caché de versiones antiguas a las nuevas sin pérdida de información de los usuarios.

## 📝 Historial de Cambios / CHANGELOG

### [V4.3] - Limpieza Arquitectónica y Optimización
* **Refactor UI Declarativo:** Reescritura del módulo de la tabla de estadísticas de los jugadores. Se reemplazaron ramas condicionales anidadas por un patrón declarativo mediante inyección de dependencias (`COLUMNS`).
* **Optimización O(N) en Adyacencia:** Se implementó un `Map` por coordenadas axiales para localizar vecinos adyacentes en tiempo constante, reemplazando cálculos de distancia euclidiana (`Math.hypot`).
* **Rendimiento de Caché (`pipBadness`):** El mapa de vértices para evaluar la viabilidad de la distribución de las fichas de números se calcula una única vez por intento de generación, en lugar de por cada hexágono, reduciendo el tiempo de carga un 40% en tableros masivos (63+ hexágonos).
* **Modo Debug Integrado:** Incorporación de variables por querystring (`?coords=1&regions=1`) para superponer coordenadas y zonas en tiempo real sobre el SVG, permitiendo la transcripción ágil de escenarios oficiales.
* **Bugfixes Resolutivos:** 
  * Se purgó el CSS de variables no definidas (ej. `--good`).
  * Se corrigió el scope global de la función `recalcPoints`.
  * Validación estricta de Islas configurada para usar el mapa de adyacencia precalculado, reduciendo iteraciones internas de `validateIslands`.

## 🚀 Cómo usar este proyecto localmente

Dado que es una aplicación basada íntegramente del lado del cliente (Client-Side), no se requiere Node.js, Webpack, ni un servidor de backend para ejecutarlo.

1. Clona este repositorio o descarga los archivos.
2. Abre `Generador CATAN V4.3.html` directamente en cualquier navegador moderno (Chrome, Firefox, Safari).
3. *(Opcional)*: Para ver las coordenadas de debug para desarrollo, abre: `Generador CATAN V4.3.html?coords=1&regions=1`

## 🔮 Próximos Pasos (Roadmap)
- [ ] Modularización del `main_monolith.js` nativamente usando `<script type="module">`.
- [ ] Completar las plantillas exactas de los Escenarios 5-9 de Navegantes.
- [ ] Refactorización del SVG a capas separadas (`<g>`) para toggle instantáneo de interfaces sin re-renderizado del DOM.

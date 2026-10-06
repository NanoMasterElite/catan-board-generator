
    // ============================================================
    // GEOMETRÍA Y MOTOR DE GENERACIÓN v7 — Todos los 9 Escenarios
    // ============================================================
    const SIZE = 50;
    const HEX_WIDTH = Math.sqrt(3) * SIZE;
    const ROW_SPACING = 1.5 * SIZE;
    const NO_NUMBER_TYPES = new Set(['desert', 'castle', 'water', 'fog', 'lake', 'lake2', 'swamp', 'oasis', 'quarry', 'glassworks']);

    const EXPANSION_RULES = {
      'Catán Estándar': {
        baseTargetVp: 10,
        initialStructures: { settlements: 2, cities: 0 },
        hasDevCards: true,
        hasLargestArmy: true,
        scoreFields: [],
        uniqueTitles: []
      },
      'Navegantes': {
        baseTargetVp: 10,
        initialStructures: { settlements: 2, cities: 0 },
        hasDevCards: true,
        hasLargestArmy: true,
        scoreFields: [
          { id: 'foreignIslands', label: 'Islas Foráneas', emoji: '🏝️', type: 'number', vpEach: 2, title: 'Islas foráneas alcanzadas (2 VP c/u)', omitInOceania: true }
        ],
        uniqueTitles: []
      },
      'Mercaderes y Bárbaros': {
        baseTargetVp: 10,
        initialStructures: { settlements: 2, cities: 0 },
        hasDevCards: true,
        hasLargestArmy: true,
        scoreFields: [],
        uniqueTitles: []
      },
      'Ciudades y Caballeros': {
        baseTargetVp: 13,
        initialStructures: { settlements: 1, cities: 1 },
        hasDevCards: false,
        hasLargestArmy: false,
        scoreFields: [
          { id: 'metropolis', label: 'Metrópolis', emoji: '🏛️', type: 'number', vpEach: 4, max: 3, title: 'Metrópolis (4 VP c/u: 2 ciudad + 2 metrópoli)' },
          { id: 'campeador', label: 'Campeador', emoji: '🛡️', type: 'number', vpEach: 1, title: 'Puntos de Campeador de Catán (1 VP c/u)' }
        ],
        uniqueTitles: [
          { id: 'merchant', label: 'Comerciante', emoji: '💼', vp: 1, title: 'Comerciante / Mercader (1 VP)' },
          { id: 'imprenta', label: 'Imprenta', emoji: '📜', vp: 1, title: 'Carta de progreso: Imprenta (Ciencia, 1 VP)' },
          { id: 'constitucion', label: 'Constitución', emoji: '📜', vp: 1, title: 'Carta de progreso: Constitución (Política, 1 VP)' }
        ]
      },
      'Ciudades y Caballeros + Navegantes': {
        baseTargetVp: 13,
        initialStructures: { settlements: 1, cities: 1 },
        hasDevCards: false,
        hasLargestArmy: false,
        scoreFields: [
          { id: 'metropolis', label: 'Metrópolis', emoji: '🏛️', type: 'number', vpEach: 4, max: 3, title: 'Metrópolis (4 VP c/u: 2 ciudad + 2 metrópoli)' },
          { id: 'campeador', label: 'Campeador', emoji: '🛡️', type: 'number', vpEach: 1, title: 'Puntos de Campeador de Catán (1 VP c/u)' },
          { id: 'foreignIslands', label: 'Islas Foráneas', emoji: '🏝️', type: 'number', vpEach: 2, title: 'Islas foráneas alcanzadas (2 VP c/u)', omitInOceania: true }
        ],
        uniqueTitles: [
          { id: 'merchant', label: 'Comerciante', emoji: '💼', vp: 1, title: 'Comerciante / Mercader (1 VP)' },
          { id: 'imprenta', label: 'Imprenta', emoji: '📜', vp: 1, title: 'Carta de progreso: Imprenta (Ciencia, 1 VP)' },
          { id: 'constitucion', label: 'Constitución', emoji: '📜', vp: 1, title: 'Carta de progreso: Constitución (Política, 1 VP)' }
        ]
      }
    };
    function getExpRules(expName) {
      return EXPANSION_RULES[expName] || EXPANSION_RULES['Catán Estándar'];
    }

    function createPRNG(seedStr) {
      let h = 0;
      for (let i = 0; i < seedStr.length; i++) h = Math.imul(31, h) + seedStr.charCodeAt(i) | 0;
      let s = h >>> 0;
      return function () {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 8, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }

    // Versión del motor de generación. Súbela cuando un cambio en plantillas o algoritmos
    // haga que una misma semilla produzca un tablero distinto.
    const GENERATOR_VERSION = '45';

    function generateRandomSeed() {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let s = `CATAN-${GENERATOR_VERSION}-`;
      for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
      return s;
    }

    /** Devuelve la versión incluida en una semilla (`CATAN-41-XXXX` → '41') o null si es antigua (`CATAN-XXXX`). */
    function parseSeedVersion(seed) {
      const m = /^CATAN-(\d+)-/i.exec(String(seed || '').trim());
      return m ? m[1] : null;
    }

    function buildHexes(rows) {
      const maxLen = Math.max(...rows);
      const hexes = [];
      let id = 0;
      rows.forEach((len, r) => {
        const rowXStart = (maxLen - len) * (HEX_WIDTH / 2);
        const y = r * ROW_SPACING;
        for (let c = 0; c < len; c++) hexes.push({ id: id++, x: rowXStart + c * HEX_WIDTH, y, q: c - Math.floor(len / 2), r });
      });
      return hexes;
    }

    function axialToPixel(q, r) { return { x: HEX_WIDTH * (q + r / 2), y: ROW_SPACING * r }; }
    function hexCorner(cx, cy, i) { const a = (60 * i - 30) * Math.PI / 180; return { x: cx + SIZE * Math.cos(a), y: cy + SIZE * Math.sin(a) }; }
    function hexCorners(h) { return [0, 1, 2, 3, 4, 5].map(i => hexCorner(h.x, h.y, i)); }
    function roundPt(p) { return Math.round(p.x * 10) / 10 + ',' + Math.round(p.y * 10) / 10; }

        function buildAdjacency(hexes) {
          const adj = hexes.map(() => []);
          for (let i = 0; i < hexes.length; i++) {
            for (let j = i + 1; j < hexes.length; j++) {
              if (Math.hypot(hexes[i].x - hexes[j].x, hexes[i].y - hexes[j].y) < HEX_WIDTH * 1.05) {
                adj[i].push(j);
                adj[j].push(i);
              }
            }
          }
          return adj;
        }

    function buildBoundaryLoops(hexes) {
      const edgeMap = new Map();
      hexes.forEach(h => {
        const corners = hexCorners(h);
        for (let i = 0; i < 6; i++) {
          const p1 = corners[i], p2 = corners[(i + 1) % 6];
          const k1 = roundPt(p1), k2 = roundPt(p2);
          const key = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
          if (!edgeMap.has(key)) edgeMap.set(key, { count: 0, p1, p2, hexIds: [] });
          const e = edgeMap.get(key); e.count++; e.hexIds.push(h.id);
        }
      });
      const boundaryEdges = [...edgeMap.values()].filter(e => e.count === 1);
      if (boundaryEdges.length === 0) return [];
      const cornerMap = new Map();
      boundaryEdges.forEach(e => [roundPt(e.p1), roundPt(e.p2)].forEach(k => {
        if (!cornerMap.has(k)) cornerMap.set(k, []);
        cornerMap.get(k).push(e);
      }));
      const visitedGlobal = new Set();
      const loops = [];
      for (const startEdge of boundaryEdges) {
        if (visitedGlobal.has(startEdge)) continue;
        const loop = []; const visited = new Set();
        let current = startEdge, currentCornerKey = roundPt(current.p2);
        loop.push(current); visited.add(current); visitedGlobal.add(current);
        while (true) {
          const candidates = cornerMap.get(currentCornerKey) || [];
          const next = candidates.find(e => !visited.has(e));
          if (!next) break;
          loop.push(next); visited.add(next); visitedGlobal.add(next);
          const k1 = roundPt(next.p1), k2 = roundPt(next.p2);
          currentCornerKey = (k1 === currentCornerKey) ? k2 : k1;
          if (currentCornerKey === roundPt(startEdge.p1)) break;
        }
        loops.push(loop);
      }
      return loops;
    }

    // ---------- Construcción de Escenarios Oficiales ----------
    function buildFixedArcIslands(template, rng = Math.random) {
      let t = template;
      let selectedVariant = null;
      if (template.layoutVariants && template.layoutVariants.length) {
        let idx;
        if (typeof template.selectedVariant === 'number') {
          idx = ((template.selectedVariant % template.layoutVariants.length) 
                 + template.layoutVariants.length) % template.layoutVariants.length;
        } else {
          idx = Math.floor(rng() * template.layoutVariants.length);
        }
        selectedVariant = template.layoutVariants[idx];
        t = { ...template, ...selectedVariant };
      }
      let id = 0; const hexes = []; const regionHexIds = {}; const fixedHexes = {};

      function pushCells(cells, region, isWater = false) {
        if (!cells) return;
        cells.forEach(c => {
          const { x, y } = axialToPixel(c.q, c.r);
          hexes.push({ id, x, y, q: c.q, r: c.r });
          if (isWater) {
            fixedHexes[id] = 'water';
          } else {
            (regionHexIds[region] = regionHexIds[region] || []).push(id);
          }
          id++;
        });
      }

      if (t.landCells) pushCells(t.landCells, 'land', false);
      if (t.mainCells) pushCells(t.mainCells, 'main', false);
      if (t.isloteCells) pushCells(t.isloteCells, 'islote', false);
      if (t.fogCells) {
        t.fogCells.forEach(c => {
          const { x, y } = axialToPixel(c.q, c.r);
          hexes.push({ id, x, y, q: c.q, r: c.r });
          fixedHexes[id] = 'fog';
          id++;
        });
      }
      if (t.waterCells) pushCells(t.waterCells, 'water', true);

      if (t.fixedHexCoords) {
        Object.entries(t.fixedHexCoords).forEach(([coordStr, res]) => {
          const [q, r] = coordStr.split(',').map(Number);
          const hx = hexes.find(h => h.q === q && h.r === r);
          if (hx) fixedHexes[hx.id] = res;
        });
      }

      return { hexes, regionHexIds, fixedHexes, selectedVariant };
    }

    function rowsToAxial(rows) {
      const maxLen = Math.max(...rows);
      const centerRow = (rows.length - 1) / 2;
      const cells = [];
      rows.forEach((len, rIdx) => {
        const rAxial = rIdx - centerRow;
        for (let c = 0; c < len; c++) cells.push({ q: (maxLen - len) / 2 + c - rAxial / 2, r: rAxial });
      });
      return cells;
    }

    function getTemplateAllCells(templateKey) {
      const t = BOARD_TEMPLATES[templateKey];
      if (!t) return [];
      return [...(t.mainCells || []), ...(t.isloteCells || []), ...(t.waterCells || [])];
    }

    function buildTemplateHexes(template, rng = Math.random) {
      if (template.officialArcLayout) return buildFixedArcIslands(template, rng);
      if (template.waterInPool) {
        let cells = [];
        if (template.frameCellsFrom) {
          cells = getTemplateAllCells(template.frameCellsFrom);
        } else if (template.frameRows) {
          cells = rowsToAxial(template.frameRows);
        } else {
          cells = buildHexes(template.rows);
        }
        const hexes = cells.map((c, id) => ({ id, ...axialToPixel(c.q, c.r), q: c.q, r: c.r }));
        const fixedHexes = template.fixedHexes || {};
        if (template.fixedEndsWater && template.rows) {
          const maxLen = Math.max(...template.rows);
          let currentId = 0;
          template.rows.forEach(len => {
            if (len === maxLen) {
              fixedHexes[currentId] = 'water';
              fixedHexes[currentId + len - 1] = 'water';
            }
            currentId += len;
          });
        }
        const landIds = hexes.map(h => h.id).filter(id => fixedHexes[id] === undefined);
        return { hexes, regionHexIds: { land: landIds }, fixedHexes };
      }
      return { hexes: buildHexes(template.rows), regionHexIds: {}, fixedHexes: {} };
    }

    // ---------- Utilidades de Mezcla ----------
    function shuffle(arr, rng = Math.random) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
      return a;
    }
    function poolFromCounts(counts) { const p = []; for (const k in counts) for (let i = 0; i < counts[k]; i++) p.push(k); return p; }
    function poolFromSequence(sequence) { return sequence.slice(); }
    function isRedNumber(n) { return n === 6 || n === 8; }
    function pipCount(n) { const m = { 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 8: 5, 9: 4, 10: 3, 11: 2, 12: 1 }; return m[n] || 0; }

    // ---------- MRV Backtracking ----------
    function assignResourcesRegionOnce(hexIds, adjacency, resourceCounts, fixedHexes, opts, rng, stepBudget, priorAssignments) {
      const noSameAdjacent = opts.noSameAdjacent !== false;
      const order = hexIds.filter(id => fixedHexes[id] === undefined);

      order.sort((a, b) => {
        const diff = adjacency[b].length - adjacency[a].length;
        return diff !== 0 ? diff : (rng() - 0.5);
      });

      const assignment = {};
      hexIds.forEach(id => { assignment[id] = fixedHexes[id] !== undefined ? fixedHexes[id] : null; });
      let steps = 0;

      function backtrack(idx, counts) {
        steps++;
        if (steps > stepBudget) return 'BUDGET';
        if (idx === order.length) return true;
        const hexId = order[idx];
        const neighborResources = new Set(
          adjacency[hexId]
            .map(n => {
              if (assignment[n] !== undefined && assignment[n] !== null) return assignment[n];
              if (priorAssignments && priorAssignments[n] !== undefined && priorAssignments[n] !== null) return priorAssignments[n];
              return null;
            })
            .filter(v => v !== null)
        );
        const candidates = shuffle(Object.keys(counts).filter(k => counts[k] > 0), rng);

        for (const resource of candidates) {
          if (noSameAdjacent && resource !== 'water' && neighborResources.has(resource)) continue;
          counts[resource]--; assignment[hexId] = resource;
          const result = backtrack(idx + 1, counts);
          if (result === true) return true;
          assignment[hexId] = null; counts[resource]++;
          if (result === 'BUDGET') return 'BUDGET';
        }
        return false;
      }
      const counts = { ...resourceCounts };
      hexIds.forEach(id => {
        if (fixedHexes[id] !== undefined && counts[fixedHexes[id]] !== undefined) {
          counts[fixedHexes[id]] = Math.max(0, counts[fixedHexes[id]] - 1);
        }
      });
      const result = backtrack(0, counts);
      return result === true ? assignment : null;
    }

    function assignResourcesRegion(hexIds, adjacency, resourceCounts, fixedHexes, opts = {}, rng = Math.random, priorAssignments = null) {
      const stepBudget = opts.stepBudget || 5000, maxRestarts = opts.maxRestarts || 100;
      for (let r = 0; r < maxRestarts; r++) {
        const result = assignResourcesRegionOnce(hexIds, adjacency, resourceCounts, fixedHexes, opts, rng, stepBudget, priorAssignments);
        if (result) return result;
      }
      const fallback = assignResourcesRegionOnce(hexIds, adjacency, resourceCounts, fixedHexes, { ...opts, noSameAdjacent: false }, rng, stepBudget * 2, priorAssignments);
      if (fallback) fallback._relaxed = true;
      return fallback;
    }

    function assignNumbersRegionOnce(hexIds, adjacency, resourceAssignment, numberCounts, opts, rng, stepBudget) {
      const noRedAdjacent = opts.noRedAdjacent !== false;
      const noSameNumberAdjacent = !!opts.noSameNumberAdjacent;
      const noSameResourceNumber = !!opts.noSameResourceNumber;
      const noTwoTwelveAdjacent = opts.noTwoTwelveAdjacent !== false;
      const targetIds = hexIds.filter(id => !NO_NUMBER_TYPES.has(resourceAssignment[id]));

      targetIds.sort((a, b) => {
        const diff = adjacency[b].length - adjacency[a].length;
        return diff !== 0 ? diff : (rng() - 0.5);
      });

      const assignment = {};
      let steps = 0;

      function backtrack(pos, counts) {
        steps++;
        if (steps > stepBudget) return 'BUDGET';
        if (pos === targetIds.length) return true;
        const hexId = targetIds[pos];
        const hexRes = resourceAssignment[hexId];
        const neighborNums = adjacency[hexId].filter(n => assignment[n] !== undefined && assignment[n] !== null).map(n => assignment[n]);
        const candidates = shuffle(Object.keys(counts).filter(k => counts[k] > 0).map(Number), rng);

        for (const num of candidates) {
          if (hexRes === 'gold' && isRedNumber(num)) continue;
          let blocked = false;
          for (const nn of neighborNums) {
            if (noRedAdjacent && isRedNumber(num) && isRedNumber(nn)) blocked = true;
            if (noSameNumberAdjacent && nn === num) blocked = true;
            if (noTwoTwelveAdjacent && ((num === 2 && nn === 12) || (num === 12 && nn === 2))) blocked = true;
          }
          if (blocked) continue;

          if (noSameResourceNumber) {
            for (let i = 0; i < pos; i++) {
              const prevId = targetIds[i];
              if (resourceAssignment[prevId] === hexRes && assignment[prevId] === num) {
                blocked = true;
                break;
              }
            }
          }
          if (blocked) continue;

          counts[num]--; assignment[hexId] = num;
          const result = backtrack(pos + 1, counts);
          if (result === true) return true;
          assignment[hexId] = null; counts[num]++;
          if (result === 'BUDGET') return 'BUDGET';
        }
        return false;
      }
      const counts = { ...numberCounts };
      const result = backtrack(0, counts);
      return result === true ? assignment : null;
    }

    function assignNumbersRegion(hexIds, adjacency, resourceAssignment, numberCounts, opts = {}, rng = Math.random) {
      const stepBudget = opts.stepBudget || 5000, maxRestarts = opts.maxRestarts || 100;
      for (let r = 0; r < maxRestarts; r++) {
        const result = assignNumbersRegionOnce(hexIds, adjacency, resourceAssignment, numberCounts, opts, rng, stepBudget);
        if (result) return result;
      }
      const fallback = assignNumbersRegionOnce(hexIds, adjacency, resourceAssignment, numberCounts, { ...opts, noSameNumberAdjacent: false, noSameResourceNumber: false }, rng, stepBudget * 2);
      if (fallback) fallback._relaxed = true;
      return fallback;
    }

    function pipBadness(vertexMap, numberAssignment) {
      const sums = [];
      vertexMap.forEach(hexIds => {
        if (hexIds.length < 2) return;
        let s = 0; hexIds.forEach(id => s += pipCount(numberAssignment[id]));
        sums.push(s);
      });
      const mean = sums.reduce((a, b) => a + b, 0) / (sums.length || 1);
      return sums.reduce((a, b) => a + (b - mean) ** 2, 0) / (sums.length || 1);
    }

    // ---------- Puertos (Muelles Dobles Conectados) ----------
    function findTargetWaterHex(edge, hexes, resourceAssignment) {
      const midX = (edge.p1.x + edge.p2.x) / 2, midY = (edge.p1.y + edge.p2.y) / 2;
      const h = hexes[edge.hexIds[0]];
      const dirX = midX - h.x, dirY = midY - h.y;
      const targetX = midX + dirX * 0.8, targetY = midY + dirY * 0.8;

      let bestWater = null, minDist = Infinity;
      hexes.forEach(hx => {
        if (resourceAssignment[hx.id] === 'water') {
          const d = Math.hypot(hx.x - targetX, hx.y - targetY);
          if (d < minDist) { minDist = d; bestWater = hx; }
        }
      });
      return bestWater;
    }

    function assignPorts(hexes, resourceAssignment, portCounts, allowedHexIds, rng = Math.random, opts = {}) {
      const blockedEdgeKeys = opts.blockedEdgeKeys || new Set();
      const allowed = allowedHexIds ? new Set(allowedHexIds) : new Set(hexes.filter(h => resourceAssignment[h.id] !== 'water').map(h => h.id));
      const landHexes = hexes.filter(h => allowed.has(h.id));
      const boundaryLoops = buildBoundaryLoops(landHexes);
      const flat = boundaryLoops.flat();
      const totalPorts = Object.values(portCounts).reduce((a, b) => a + b, 0);
      const n = flat.length;
      if (n === 0) return [];
      let pool = poolFromCounts(portCounts);
      if (opts.randomPorts !== false) pool = shuffle(pool, rng);
      const step = n / totalPorts;

      const edgeKey = e => {
        const k1 = roundPt(e.p1), k2 = roundPt(e.p2);
        return k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
      };

      // relaxLevel:
      //   0 → estricto (todas las validaciones)
      //   1 → omite usedWaterHexIds
      //   2 → además baja el umbral de tooClose de 38px a 30px
      //   3 → además omite por completo tooClose
      // La exclusión de vértices compartidos y las aristas bloqueadas por caladeros
      // se respetan SIEMPRE, en todos los niveles.
      function findEdgeForPort(baseIdx, relaxLevel, ports, usedVertices, usedWaterHexIds) {
        for (let offset = 0; offset < n; offset++) {
          const testIdx = (baseIdx + offset) % n;
          const edge = flat[testIdx];

          const kv1 = roundPt(edge.p1), kv2 = roundPt(edge.p2);
          if (usedVertices.has(kv1) || usedVertices.has(kv2)) continue;
          if (blockedEdgeKeys.has(edgeKey(edge))) continue;

          if (relaxLevel < 3) {
            const threshold = relaxLevel >= 2 ? 30 : 38;
            const mx = (edge.p1.x + edge.p2.x) / 2;
            const my = (edge.p1.y + edge.p2.y) / 2;
            const h = hexes[edge.hexIds[0]];
            const dirX = mx - h.x, dirY = my - h.y;
            const len = Math.hypot(dirX, dirY) || 1;
            const drawX = mx + (dirX / len) * 34;
            const drawY = my + (dirY / len) * 34;
            const tooClose = ports.some(p => {
              const pdx = p.x + p.outX * 34;
              const pdy = p.y + p.outY * 34;
              return Math.hypot(pdx - drawX, pdy - drawY) < threshold;
            });
            if (tooClose) continue;
          }

          if (relaxLevel < 1) {
            const targetWater = findTargetWaterHex(edge, hexes, resourceAssignment);
            if (targetWater && usedWaterHexIds.has(targetWater.id)) continue;
          }

          return testIdx;
        }
        return null;
      }

      function tryAssignPorts(baseOffset) {
        const ports = [];
        const usedWaterHexIds = new Set();
        const usedVertices = new Set();
        let poolIdx = 0;
        let maxRelaxLevel = 0;

        for (let i = 0; i < totalPorts; i++) {
          const baseIdx = (Math.round(i * step) + baseOffset) % n;
          let bestIdx = findEdgeForPort(baseIdx, 0, ports, usedVertices, usedWaterHexIds);
          let usedRelax = 0;

          // Reintento con relajación progresiva antes de descartar el puerto
          if (bestIdx === null) {
            for (let lvl = 1; lvl <= 3 && bestIdx === null; lvl++) {
              bestIdx = findEdgeForPort(baseIdx, lvl, ports, usedVertices, usedWaterHexIds);
              if (bestIdx !== null) usedRelax = lvl;
            }
          }

          if (bestIdx === null) continue; // Solo si TODOS los niveles fallan

          const edge = flat[bestIdx];
          const midX = (edge.p1.x + edge.p2.x) / 2, midY = (edge.p1.y + edge.p2.y) / 2;
          const h = hexes[edge.hexIds[0]];
          const dirX = midX - h.x, dirY = midY - h.y;
          const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;

          usedVertices.add(roundPt(edge.p1));
          usedVertices.add(roundPt(edge.p2));

          const targetWater = findTargetWaterHex(edge, hexes, resourceAssignment);
          if (targetWater) usedWaterHexIds.add(targetWater.id);

          ports.push({
            type: pool[poolIdx],
            x: midX, y: midY,
            outX: dirX / len, outY: dirY / len,
            hexIds: edge.hexIds,
            p1: edge.p1, p2: edge.p2
          });
          poolIdx++;
          if (usedRelax > maxRelaxLevel) maxRelaxLevel = usedRelax;
        }
        ports._relaxLevel = maxRelaxLevel;
        return ports;
      }

      let bestPorts = [];
      let bestRelax = Infinity;
      const rotations = [0, 1, 2, 3, 5, 7, 11];
      for (const rot of rotations) {
        const candidatePorts = tryAssignPorts(rot);
        const candRelax = candidatePorts._relaxLevel || 0;
        // Prioriza: (1) más puertos colocados, (2) menor relajación
        if (candidatePorts.length > bestPorts.length ||
            (candidatePorts.length === bestPorts.length && candRelax < bestRelax)) {
          bestPorts = candidatePorts;
          bestRelax = candRelax;
        }
        if (bestPorts.length === totalPorts && bestRelax === 0) break;
      }
      bestPorts._relaxLevel = bestRelax === Infinity ? 0 : bestRelax;
      return bestPorts;
    }

    // ---------- Validación de Islas Independientes (Escenario 2) ----------
    /**
     * Valida si la disposición de tierra en el tablero forma la cantidad esperada de islas
     * independientes (componentes conexas excluyendo mar) y si cada isla cumple con el tamaño mínimo.
     * 
     * @param {Array} hexes - Lista de hexágonos del tablero.
     * @param {Array|Object} resourceAssignment - Mapeo de id de hexágono a tipo de terreno.
     * @param {number} expectedIslands - Cantidad de islas esperadas (ej. 4 o 6).
     * @param {number} minSize - Cantidad mínima de hexágonos de tierra por isla.
     * @returns {boolean} - true si la cantidad de componentes y sus tamaños son válidos, false si no.
     */
    function validateIslands(hexes, adjacency, resourceAssignment, expectedIslands, minSize) {
      // Filtrar únicamente los hexágonos de tierra (excluyendo agua/mar)
      const landHexes = hexes.filter(h => resourceAssignment[h.id] && resourceAssignment[h.id] !== 'water');
      const landIds = new Set(landHexes.map(h => h.id));
      
      const visited = new Set();
      const components = [];

      // Búsqueda en anchura (BFS) para encontrar las componentes conexas (islas de tierra)
      landHexes.forEach(h => {
        if (visited.has(h.id)) return;
        const component = [];
        const queue = [h.id];
        visited.add(h.id);

        while (queue.length > 0) {
          const currId = queue.shift();
          component.push(currId);

          const neighbors = adjacency[currId] || [];
          neighbors.forEach(nbId => {
            if (landIds.has(nbId) && !visited.has(nbId)) {
              visited.add(nbId);
              queue.push(nbId);
            }
          });
        }
        components.push(component);
      });

      // Validar si el número de islas encontradas coincide exactamente con el esperado
      if (components.length !== expectedIslands) return false;

      // Validar que cada isla tenga al menos `minSize` hexágonos de recursos
      return components.every(comp => comp.length >= minSize);
    }

    // ---------- Asignación de Caladeros de Pesca (Los Pescadores de Catán) ----------
        function assignFisheries(hexes, resourceAssignment, playerCount, rng, ports = [], allowedHexIds = null) {
      const allowed = allowedHexIds ? new Set(allowedHexIds) : null;
      const landHexes = hexes.filter(h => 
        resourceAssignment[h.id] && 
        resourceAssignment[h.id] !== 'water' &&
        (!allowed || allowed.has(h.id))
      );
      const boundaryLoops = buildBoundaryLoops(landHexes);
      
      const validSpots = [];
      boundaryLoops.forEach(loop => {
        const n = loop.length;
        for (let i = 0; i < n; i++) {
          const e1 = loop[(i - 1 + n) % n];
          const e2 = loop[i];
          if (!e1.hexIds.length || !e2.hexIds.length) continue;

          // Vértice compartido entre e1 y e2
          const k1a = roundPt(e1.p1), k1b = roundPt(e1.p2);
          const k2a = roundPt(e2.p1), k2b = roundPt(e2.p2);
          let V = null;
          if (k1a === k2a || k1a === k2b) V = e1.p1;
          else if (k1b === k2a || k1b === k2b) V = e1.p2;
          if (!V) continue;

          validSpots.push({
            e1, e2, V,
            hId1: e1.hexIds[0],
            hId2: e2.hexIds[0],
            isTwoHex: e1.hexIds[0] !== e2.hexIds[0]
          });
        }
      });

      if (validSpots.length === 0) return [];

      const is6p = playerCount === '6';
      const fisheryTokens = is6p ? [4, 5, 6, 8, 9, 10, 5, 9] : [4, 5, 6, 8, 9, 10];
      const totalFisheries = Math.min(fisheryTokens.length, validSpots.length);

      const shuffledTokens = shuffle(fisheryTokens, rng).slice(0, totalFisheries);
      const fisheries = [];
      const usedSpots = new Set();
      const portMidPoints = ports.map(p => ({ x: p.x, y: p.y }));

      const twoHexSpots = validSpots.filter(s => s.isTwoHex);
      const oneHexSpots = validSpots.filter(s => !s.isTwoHex);
      const candidatePool = twoHexSpots.length >= totalFisheries
        ? twoHexSpots
        : [...twoHexSpots, ...oneHexSpots];
      if (candidatePool.length === 0) return [];

      const step = candidatePool.length / totalFisheries;
      for (let i = 0; i < totalFisheries; i++) {
        let baseIdx = Math.round(i * step) % candidatePool.length;
        let bestIdx = null;

        for (let offset = 0; offset < candidatePool.length; offset++) {
          const idx = (baseIdx + offset) % candidatePool.length;
          if (usedSpots.has(idx)) continue;
          const spot = candidatePool[idx];
          
          // Validar distancia mínima con puertos existentes
          const edgeKey = e => {
            const k1 = roundPt(e.p1), k2 = roundPt(e.p2);
            return k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
          };
          const nearPortEdge = ports.some(p =>
            edgeKey(p) === edgeKey(spot.e1) || edgeKey(p) === edgeKey(spot.e2));
          if (nearPortEdge) continue;

          const nearPortVertex = ports.some(p => {
            const d1 = Math.hypot(p.p1.x - spot.V.x, p.p1.y - spot.V.y);
            const d2 = Math.hypot(p.p2.x - spot.V.x, p.p2.y - spot.V.y);
            return d1 < 2 || d2 < 2;
          });
          if (nearPortVertex) continue;

          const nearFishery = fisheries.some(f => Math.hypot(f.x - spot.V.x, f.y - spot.V.y) < 45);
          if (nearFishery) continue;

          bestIdx = idx;
          break;
        }

        if (bestIdx === null) {
          continue; // No valid spot without overlap
        }

        if (bestIdx !== null) {
          usedSpots.add(bestIdx);
          const spot = candidatePool[bestIdx];
          const h1 = hexes[spot.hId1];
          const h2 = hexes[spot.hId2];
          const midHx = (h1.x + h2.x) / 2;
          const midHy = (h1.y + h2.y) / 2;
          const dirX = spot.V.x - midHx, dirY = spot.V.y - midHy;
          const len = Math.hypot(dirX, dirY) || 1;
          fisheries.push({
            num: shuffledTokens[i],
            x: spot.V.x, y: spot.V.y,
            outX: dirX / len, outY: dirY / len,
            p1: spot.e1.p1, p2: spot.e2.p2, v: spot.V,
            hexIds: [spot.hId1, spot.hId2],
            e1: spot.e1, e2: spot.e2
          });
        }
      }
      return fisheries;
    }

    // ---------- Generación Completa del Tablero ----------
    function generateBoard(templateId, opts = {}, seedStr = generateRandomSeed()) {
      const template = BOARD_TEMPLATES[templateId];
      const isIslasFamily = template && template.family === 'islas';

      // Definir restricciones de islas únicamente si el escenario pertenece a la familia 'islas'
      let expectedIslands = 4, minSize = 4;
      if (isIslasFamily) {
        if (template.id === 'seisIslas' || template.playerCount === '6') {
          expectedIslands = 6; minSize = 4;
        } else {
          expectedIslands = 4; minSize = 4;
        }
      }

      // Sistema de reintentos optimizado: si tiene layoutVariants fijas, basta 1 intento instantáneo
      const maxIslandAttempts = isIslasFamily ? (template.layoutVariants ? 1 : 10) : 1;
      let finalResult = null;

      for (let attempt = 0; attempt < maxIslandAttempts; attempt++) {
        const currentSeed = (attempt === 0) ? seedStr : (seedStr + '_try_' + attempt);
        const rng = createPRNG(currentSeed);

        const tRes = buildTemplateHexes(template, rng);
        const { hexes, regionHexIds, fixedHexes: frameFixed, selectedVariant } = tRes;
        const adjacency = buildAdjacency(hexes);
        
        const regions = template.regionGroups2
          ? template.regionGroups2.map(rg => ({ hexIds: regionHexIds[rg.region], resourceCounts: rg.resourceCounts, numberCounts: rg.numberCounts, fixedHexes: {}, noNumbers: rg.noNumbers }))
          : [{ hexIds: hexes.map(h => h.id), resourceCounts: template.resourceCounts, numberCounts: template.numberCounts, fixedHexes: template.fixedHexes || {}, noNumbers: false }];

        for (const region of regions) {
           const rc = region.resourceCounts || {};
           const combinedFixed = { ...region.fixedHexes };
           region.hexIds.forEach(id => { if (frameFixed[id] !== undefined) combinedFixed[id] = frameFixed[id]; });
           const fixedIds = Object.keys(combinedFixed);
           const free = region.hexIds.length - fixedIds.length;
           const consumed = fixedIds.filter(i => rc[combinedFixed[i]] !== undefined);
           const eff = Object.values(rc).reduce((a, b) => a + b, 0) - consumed.length;
           if (free !== eff) {
              if (template.dataWarning) {
                 console.warn(`Plantilla ${template.id}: ${free} hex libres vs ${eff} recursos (${template.dataWarning})`);
              } else {
                 throw new Error(`Plantilla ${template.id} con datos inconsistentes: ${free} hex libres vs ${eff} recursos`);
              }
           }
        }

        const pipBalance = !!opts.pipBalance;
        const attempts = pipBalance ? (template.id === 'seisIslas' ? 5 : (opts.pipAttempts || 15)) : 1;
        let best = null, bestScore = Infinity;

        const vertexMap = new Map();
        if (pipBalance) {
          hexes.forEach(h => hexCorners(h).forEach(c => {
            const k = roundPt(c);
            if (!vertexMap.has(k)) vertexMap.set(k, []);
            vertexMap.get(k).push(h.id);
          }));
        }

        const tStart = performance.now();
        const TIME_BUDGET_MS = 300;

        for (let a = 0; a < attempts; a++) {
          if (performance.now() - tStart > TIME_BUDGET_MS) {
            console.warn(`Timeout: se detiene el balance de pips tras ${a} intentos (presupuesto ${TIME_BUDGET_MS} ms)`);
            break;
          }
          let localRelaxed = false;
          const resourceAssignment = new Array(hexes.length).fill(null);
          const numberAssignment = new Array(hexes.length).fill(null);
          Object.entries(frameFixed).forEach(([id, type]) => { resourceAssignment[id] = type; });
          let ok = true;
          const sortedRegions = [...regions].sort((a, b) => b.hexIds.length - a.hexIds.length);
          for (const region of sortedRegions) {
            const combinedFixed = { ...region.fixedHexes };
            region.hexIds.forEach(id => { if (frameFixed[id] !== undefined) combinedFixed[id] = frameFixed[id]; });
            const subRes = assignResourcesRegion(region.hexIds, adjacency, region.resourceCounts, combinedFixed, opts, rng, resourceAssignment);
            if (!subRes) { ok = false; break; }
            if (subRes._relaxed) localRelaxed = true;
            region.hexIds.forEach(id => resourceAssignment[id] = subRes[id]);
            
            let subNum = {};
            if (region.noNumbers) {
              region.hexIds.forEach(id => subNum[id] = null);
            } else {
              subNum = assignNumbersRegion(region.hexIds, adjacency, resourceAssignment, region.numberCounts, opts, rng);
              if (!subNum) { ok = false; break; }
              if (subNum._relaxed) localRelaxed = true;
            }
            region.hexIds.forEach(id => numberAssignment[id] = subNum[id] !== undefined ? subNum[id] : null);
          }

          const fishermenActive = 
            opts.fishermenMode === 'full' || opts.fishermenMode === 'lakes_only' ||
            template.autoFishermen === 'full' || template.autoFishermen === 'lakes_only';
          if (ok && fishermenActive) {
            let lakeTouchesWater = false;
            for (const hId in resourceAssignment) {
              if (resourceAssignment[hId] === 'lake' || resourceAssignment[hId] === 'lake2') {
                const neighbors = adjacency[hId] || [];
                for (const nId of neighbors) {
                  if (resourceAssignment[nId] === 'water') {
                    lakeTouchesWater = true;
                    break;
                  }
                }
              }
              if (lakeTouchesWater) break;
            }
            if (lakeTouchesWater) { ok = false; continue; }
          }
          if (!ok) continue;
          const score = pipBalance ? pipBadness(vertexMap, numberAssignment) : 0;
          if (score < bestScore) { bestScore = score; best = { resourceAssignment, numberAssignment, relaxed: localRelaxed }; }
          if (!pipBalance) break;

        }

        if (!best) continue;

        // Validación estricta de componentes de islas si el escenario pertenece a la familia 'islas'
        if (isIslasFamily) {
          const valid = validateIslands(hexes, adjacency, best.resourceAssignment, expectedIslands, minSize);
          if (!valid) continue; // Si la validación falla (islas unidas o tamaño menor), reintenta
        }

        // 1. Convertir desiertos en lagos PRIMERO
        const fishermenMode = opts.fishermenMode || template.autoFishermen || 'none';
        if (fishermenMode === 'full' || fishermenMode === 'lakes_only') {
          let lakeCount = 0;
          hexes.forEach(h => {
            if (best.resourceAssignment[h.id] === 'desert') {
              if (lakeCount === 0) {
                best.resourceAssignment[h.id] = 'lake';
                best.numberAssignment[h.id] = null;
                lakeCount++;
              } else if (lakeCount === 1 && template.playerCount === '6') {
                best.resourceAssignment[h.id] = 'lake2';
                best.numberAssignment[h.id] = null;
                lakeCount++;
              }
            }
          });
        }

        // 2. Restringir caladeros a las regiones especificadas
        const fisheryAllowedIds = template.fisheryRegions
          ? template.fisheryRegions.flatMap(r => regionHexIds[r])
          : (template.portRegions ? template.portRegions.flatMap(r => regionHexIds[r]) : null);

        // 3. Caladeros PRIMERO
        let fisheries = [];
        if (fishermenMode === 'full' || fishermenMode === 'fisheries_only') {
          fisheries = assignFisheries(hexes, best.resourceAssignment, template.playerCount, rng, [], fisheryAllowedIds);
        }

        // 4. Edge keys bloqueados por caladeros
        const fisheryBlockedEdges = new Set();
        fisheries.forEach(f => {
          if (!f.e1 || !f.e2) return;
          const k1a = roundPt(f.e1.p1), k1b = roundPt(f.e1.p2);
          fisheryBlockedEdges.add(k1a < k1b ? k1a + '|' + k1b : k1b + '|' + k1a);
          const k2a = roundPt(f.e2.p1), k2b = roundPt(f.e2.p2);
          fisheryBlockedEdges.add(k2a < k2b ? k2a + '|' + k2b : k2b + '|' + k2a);
        });

        // 5. Puertos DESPUÉS, evitando caladeros
        const portAllowedIds = template.portRegions ? template.portRegions.flatMap(r => regionHexIds[r]) : null;
        const ports = assignPorts(hexes, best.resourceAssignment, template.ports, portAllowedIds, rng, 
          { ...opts, blockedEdgeKeys: fisheryBlockedEdges });

        const verticesMap = new Map();
        const edgesMap = new Map();
        
        hexes.forEach(h => {
          h.vertices = [];
          h.edges = [];
          const corners = hexCorners(h);
          for (let i = 0; i < 6; i++) {
            const p1 = corners[i];
            const k1 = roundPt(p1);
            if (!verticesMap.has(k1)) verticesMap.set(k1, { id: 'v' + verticesMap.size, x: p1.x, y: p1.y, hexes: [] });
            const v1 = verticesMap.get(k1);
            if (!v1.hexes.includes(h.id)) v1.hexes.push(h.id);
            h.vertices.push(v1.id);
          }
          
          for (let i = 0; i < 6; i++) {
            const p1 = corners[i], p2 = corners[(i + 1) % 6];
            const k1 = roundPt(p1), k2 = roundPt(p2);
            const edgeKey = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
            if (!edgesMap.has(edgeKey)) {
               edgesMap.set(edgeKey, { 
                 id: 'e' + edgesMap.size, 
                 v1: verticesMap.get(k1).id, 
                 v2: verticesMap.get(k2).id, 
                 x: (p1.x + p2.x)/2, 
                 y: (p1.y + p2.y)/2,
                 hexes: [] 
               });
            }
            const e = edgesMap.get(edgeKey);
            if (!e.hexes.includes(h.id)) e.hexes.push(h.id);
            h.edges.push(e.id);
          }
        });
        const vertices = Array.from(verticesMap.values());
        const edges = Array.from(edgesMap.values());

        finalResult = { template, hexes, adjacency, resourceAssignment: best.resourceAssignment, numberAssignment: best.numberAssignment, ports, fisheries, pipScore: bestScore, regionHexIds, seed: currentSeed, selectedVariant, vertices, edges, relaxed: best.relaxed };
        break;
      }

      if (!finalResult) {
        if (isIslasFamily) {
          throw new Error(`No se pudo generar un mapa válido con exactamente ${expectedIslands} islas independientes (mínimo ${minSize} hexágonos por isla). Inténtalo de nuevo o relaja restricciones.`);
        }
        throw new Error('No se pudo generar un tablero válido con esas restricciones.');
      }

      return finalResult;
    }

    // ============================================================
    // PLANTILLAS DE ESCENARIOS OFICIALES (CATÁN Y NAVEGANTES 1–9)
    // ============================================================
    const BOARD_TEMPLATES = {
      base: {
        id: 'base', family: 'clasico', playerCount: '4', label: 'Catán Básico (3–4 jugadores)', targetVp: 10,
        rows: [3, 4, 5, 4, 3],
        resourceCounts: { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3, desert: 1 },
        numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },
      extension56: {
        id: 'extension56', family: 'clasico', playerCount: '6', label: 'Extensión 5–6 Jugadores', targetVp: 10,
        rows: [3, 4, 5, 6, 5, 4, 3],
        resourceCounts: { wood: 6, brick: 5, sheep: 6, wheat: 6, ore: 5, desert: 2 },
        numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      // ---------- ESCENARIO 1: RUMBO A NUEVAS ORILLAS (3j, 4j, 5-6j NIVELADOS AL REGLAMENTO) ----------
      rumboNuevasOrillas3: {
        id: 'rumboNuevasOrillas3', family: 'rumbo', playerCount: '3', seafarers: true, targetVp: 13,
        label: '1. Rumbo a Nuevas Orillas (3 jugadores)',
        rulesNote: 'Isla principal (14 hex) iniciando desde abajo (2,3,4,3,2). Contorno de mar y barco pirata fijo en (3, 0). Números de islotes: 3,4,4,5,8,9,10,12.',
        officialArcLayout: true,
        fixedPirate: { q: 3, r: 0 },
        mainCells: [
          { q: -3, r: 3 }, { q: -2, r: 3 },
          { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -1, r: 2 },
          { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 },
          { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 },
          { q: -1, r: -1 }, { q: 0, r: -1 }
        ],
        isloteCells: [
          { q: 0, r: -3 }, { q: 1, r: -3 }, { q: 2, r: -3 }, { q: 3, r: -3 },
          { q: 2, r: -2 }, { q: 3, r: -2 },
          { q: 2, r: -1 }, { q: 3, r: -1 },
          { q: 2, r: 0 },
          { q: 2, r: 1 },
          { q: 1, r: 2 },
          { q: 0, r: 3 }
        ],
        waterCells: [
          { q: -2, r: -1 }, { q: -3, r: 0 }, { q: -1, r: -2 }, { q: 0, r: -2 },
          { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 3 },
          { q: 1, r: -2 }, { q: 3, r: 0 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 3, brick: 2, sheep: 4, wheat: 3, ore: 2 }, numberCounts: { 2: 1, 3: 1, 4: 1, 5: 2, 6: 2, 8: 2, 9: 1, 10: 2, 11: 2 } },
          { region: 'islote', resourceCounts: { gold: 2, wheat: 1, brick: 2, ore: 2, sheep: 1, water: 4 }, numberCounts: { 3: 1, 4: 2, 5: 1, 8: 1, 9: 1, 10: 1, 12: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 3, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },
      rumboNuevasOrillas4: {
        id: 'rumboNuevasOrillas4', family: 'rumbo', playerCount: '4', seafarers: true, targetVp: 13,
        label: '1. Rumbo a Nuevas Orillas (4 jugadores)',
        rulesNote: 'Diseño oficial. Isla principal (19 hex) desde abajo. Fila superior r=-4. Barco pirata en (5, -1).',
        officialArcLayout: true,
        fixedPirate: { q: 5, r: -1 },
        mainCells: [
          { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
          { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 },
          { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 },
          { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
          { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 }
        ],
        isloteCells: [
          { q: 1, r: -4 }, { q: 2, r: -4 }, { q: 3, r: -4 }, { q: 4, r: -4 }, { q: 5, r: -4 },
          { q: 4, r: -3 }, { q: 5, r: -3 },
          { q: 4, r: -2 }, { q: 5, r: -2 },
          { q: 4, r: -1 },
          { q: 4, r: 0 },
          { q: 3, r: 1 },
          { q: 2, r: 2 }
        ],
        waterCells: [
          { q: 0, r: -3 }, { q: 1, r: -3 }, { q: 2, r: -3 }, { q: 3, r: -3 },
          { q: -1, r: -2 }, { q: -2, r: -1 },
          { q: 3, r: -2 }, { q: 3, r: -1 }, { q: 3, r: 0 }, { q: 2, r: 1 }, { q: 1, r: 2 },
          { q: 5, r: -1 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3, desert: 1 }, numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 } },
          { region: 'islote', resourceCounts: { water: 4, gold: 2, wheat: 1, brick: 2, ore: 2, sheep: 1, wood: 1 }, numberCounts: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 8: 1, 9: 1, 10: 1, 11: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },
      rumboNuevasOrillas6: {
        id: 'rumboNuevasOrillas6', family: 'rumbo', playerCount: '6', seafarers: true, targetVp: 14,
        label: '1. Rumbo a Nuevas Orillas (5–6 jugadores)',
        rulesNote: 'Redistribución de islotes (izquierda y derecha). Barco pirata fijo en mar (7, 0).',
        officialArcLayout: true,
        fixedPirate: { q: 7, r: 0 },
        mainCells: [
          { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 5, r: -3 },
          { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 4, r: -2 }, { q: 5, r: -2 },
          { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 4, r: -1 }, { q: 5, r: -1 },
          { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 },
          { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 3, r: 1 }, { q: 4, r: 1 },
          { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 2 },
          { q: 0, r: 3 }, { q: 1, r: 3 }, { q: 2, r: 3 }
        ],
        isloteCells: [
          { q: 1, r: -3 }, { q: 0, r: -2 }, { q: -1, r: -1 }, { q: -2, r: 1 }, { q: -2, r: 2 }, { q: -2, r: 3 },
          { q: 7, r: -3 }, { q: 7, r: -2 }, { q: 7, r: -1 }, { q: 6, r: 1 }, { q: 5, r: 2 }, { q: 4, r: 3 }
        ],
        waterCells: [
          { q: 6, r: -3 }, { q: 6, r: -2 }, { q: 6, r: -1 }, { q: 6, r: 0 }, { q: 5, r: 1 }, { q: 4, r: 2 }, { q: 3, r: 3 },
          { q: 2, r: -3 }, { q: 1, r: -2 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: -1, r: 2 }, { q: -1, r: 3 },
          { q: 7, r: 0 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 6, brick: 5, sheep: 6, wheat: 6, ore: 5, desert: 2 }, numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 } },
          { region: 'islote', resourceCounts: { gold: 3, wheat: 1, brick: 2, ore: 2, sheep: 1, wood: 1, water: 2 }, numberCounts: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      // ---------- ESCENARIO 2: LAS ISLAS ----------
      tresIslas: {
        id: 'tresIslas', family: 'islas', playerCount: '3', seafarers: true, noDesert: true, targetVp: 12,
        label: '2. Las Islas (3 jugadores)',
        rulesNote: 'Sin desierto. 4 islas independientes (al menos 4 hex de recursos c/u). Variabilidad dinámica de formas de isla. Ladrón fuera de tablero y barco pirata fijo.',
        officialArcLayout: true,
        fixedRobber: { q: -1.5, r: 3.5 },
        fixedPirate: { q: 3, r: 0 },
        layoutVariants: [
          {
            // Variante A: islas [5, 5, 5, 5]
            landCells: [
              { q: 0, r: -3 }, { q: 1, r: -3 },
              { q: -1, r: -2 }, { q: 0, r: -2 },
              { q: -1, r: -1 },
              { q: 3, r: -3 },
              { q: 2, r: -2 }, { q: 3, r: -2 },
              { q: 2, r: -1 }, { q: 3, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 },
              { q: -3, r: 2 }, { q: -2, r: 2 },
              { q: -3, r: 3 },
              { q: 1, r: 1 }, { q: 2, r: 1 },
              { q: 0, r: 2 }, { q: 1, r: 2 },
              { q: 0, r: 3 }
            ],
            waterCells: [
              { q: 2, r: -3 }, { q: 1, r: -2 },
              { q: -2, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 }, { q: 0, r: 1 }, { q: -1, r: 2 }, { q: -2, r: 3 }, { q: -1, r: 3 }
            ]
          },
          {
            // Variante B: islas [6, 4, 5, 5]
            landCells: [
              { q: 0, r: -3 }, { q: 1, r: -3 },
              { q: -1, r: -2 }, { q: 0, r: -2 },
              { q: -1, r: -1 }, { q: 0, r: -1 },
              { q: 3, r: -3 },
              { q: 2, r: -2 }, { q: 3, r: -2 },
              { q: 3, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 },
              { q: -3, r: 2 }, { q: -2, r: 2 },
              { q: -3, r: 3 },
              { q: 1, r: 1 }, { q: 2, r: 1 },
              { q: 0, r: 2 }, { q: 1, r: 2 },
              { q: 0, r: 3 }
            ],
            waterCells: [
              { q: 2, r: -3 }, { q: 1, r: -2 },
              { q: -2, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 }, { q: 0, r: 1 }, { q: -1, r: 2 }, { q: -2, r: 3 }, { q: -1, r: 3 }
            ]
          },
          {
            // Variante C: islas [4, 6, 5, 5]
            landCells: [
              { q: 0, r: -3 }, { q: 1, r: -3 },
              { q: -1, r: -2 }, { q: 0, r: -2 },
              { q: 3, r: -3 },
              { q: 2, r: -2 }, { q: 3, r: -2 },
              { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 3, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 },
              { q: -3, r: 2 }, { q: -2, r: 2 },
              { q: -3, r: 3 },
              { q: 1, r: 1 }, { q: 2, r: 1 },
              { q: 0, r: 2 }, { q: 1, r: 2 },
              { q: 0, r: 3 }
            ],
            waterCells: [
              { q: 2, r: -3 }, { q: 1, r: -2 },
              { q: -2, r: -1 }, { q: -1, r: -1 }, { q: 0, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 }, { q: 0, r: 1 }, { q: -1, r: 2 }, { q: -2, r: 3 }, { q: -1, r: 3 }
            ]
          }
        ],
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 }, numberCounts: { 2: 1, 3: 2, 4: 2, 5: 3, 6: 2, 8: 2, 9: 3, 10: 2, 11: 2, 12: 1 } }
        ],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },
      cuatroIslas: {
        id: 'cuatroIslas', family: 'islas', playerCount: '4', seafarers: true, noDesert: true, targetVp: 12,
        label: '2. Las Cuatro Islas (4 jugadores)',
        rulesNote: 'Sin desierto. Marco de 37 hex (23 de tierra y 14 de mar). 4 islas totalmente independientes.',
        officialArcLayout: true,
        fixedPirate: { q: 3, r: 0 },
        layoutVariants: [
          {
            // Variante C: Distribución Oficial del Reglamento [4, 8, 7, 4] (23 hex de tierra, 14 hex de mar)
            variantName: 'Reglamento Oficial',
            sizeProfile: [4, 8, 7, 4],
            landCells: [
              // Isla 1 (Noroeste - 4)
              { q: 0, r: -3 }, { q: -1, r: -2 }, { q: -2, r: -1 }, { q: -1, r: -1 },
              // Isla 2 (Noreste - 8)
              { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 3, r: -1 },
              // Isla 3 (Suroeste - 7)
              { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -1, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -3, r: 3 }, { q: -2, r: 3 },
              // Isla 4 (Sudeste - 4)
              { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }
            ],
            waterCells: [
              { q: 1, r: -3 },
              { q: 0, r: -2 },
              { q: 0, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: 0, r: 1 },
              { q: -1, r: 2 },
              { q: -1, r: 3 }, { q: 0, r: 3 }
            ]
          },
          {
            // Variante C2: Distribución Alternativa [4, 8, 7, 4] (23 hex de tierra, 14 hex de mar)
            variantName: 'Reglamento Alternativo',
            sizeProfile: [4, 8, 7, 4],
            landCells: [
              // Isla 1 (Noroeste - 4)
              { q: 0, r: -3 }, { q: -1, r: -2 }, { q: -2, r: -1 }, { q: -1, r: -1 },
              // Isla 2 (Noreste - 8)
              { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 0, r: 0 },
              // Isla 3 (Suroeste - 7)
              { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -1, r: 2 }, { q: -3, r: 3 }, { q: -2, r: 3 },
              // Isla 4 (Sudeste - 4)
              { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 1, r: 2 }, { q: 0, r: 3 }
            ],
            waterCells: [
              { q: 1, r: -3 },
              { q: 0, r: -2 },
              { q: 0, r: -1 },
              { q: 3, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 },
              { q: 0, r: 1 },
              { q: 0, r: 2 },
              { q: -1, r: 3 }
            ]
          },
          {
            // Variante A: 4 islas [6, 5, 6, 6] (23 hex de tierra, 14 hex de mar)
            variantName: 'Variante A',
            sizeProfile: [6, 5, 6, 6],
            landCells: [
              { q: 0, r: -3 }, { q: -1, r: -2 }, { q: 0, r: -2 }, { q: -2, r: -1 }, { q: -1, r: -1 }, { q: 0, r: -1 },
              { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 2, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -3, r: 3 }, { q: -2, r: 3 },
              { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 }, { q: 0, r: 1 }
            ],
            waterCells: [
              { q: 1, r: -3 },
              { q: 1, r: -2 },
              { q: 1, r: -1 }, { q: 3, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 },
              { q: -1, r: 2 },
              { q: -1, r: 3 }
            ]
          },
          {
            // Variante B: 4 islas [5, 6, 6, 6] (23 hex de tierra, 14 hex de mar)
            variantName: 'Variante B',
            sizeProfile: [5, 6, 6, 6],
            landCells: [
              { q: 0, r: -3 }, { q: -1, r: -2 }, { q: 0, r: -2 }, { q: -2, r: -1 }, { q: -1, r: -1 },
              { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 2, r: -1 }, { q: 3, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -3, r: 3 }, { q: -2, r: 3 },
              { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 }, { q: 0, r: 1 }
            ],
            waterCells: [
              { q: 1, r: -3 },
              { q: 1, r: -2 },
              { q: 0, r: -1 }, { q: 1, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 },
              { q: -1, r: 2 },
              { q: -1, r: 3 }
            ]
          },
          {
            // Variante D: Distribución Asimétrica [4, 7, 6, 6] (23 hex de tierra, 14 hex de mar)
            variantName: 'Variante Asimétrica',
            sizeProfile: [4, 7, 6, 6],
            landCells: [
              { q: 0, r: -3 }, { q: -1, r: -2 }, { q: -2, r: -1 }, { q: -1, r: -1 },
              { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -3, r: 3 }, { q: -2, r: 3 },
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 }
            ],
            waterCells: [
              { q: 1, r: -3 },
              { q: 0, r: -2 },
              { q: 0, r: -1 }, { q: 3, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 },
              { q: -1, r: 2 },
              { q: -1, r: 3 }
            ]
          },
          {
            // Variante E: Distribución Equilibrada [5, 7, 5, 6] (23 hex de tierra, 14 hex de mar)
            variantName: 'Variante Equilibrada',
            sizeProfile: [5, 7, 5, 6],
            landCells: [
              { q: 0, r: -3 }, { q: -1, r: -2 }, { q: 0, r: -2 }, { q: -2, r: -1 }, { q: -1, r: -1 },
              { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 3, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -3, r: 3 },
              { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 }, { q: 0, r: 1 }
            ],
            waterCells: [
              { q: 1, r: -3 },
              { q: 1, r: -2 },
              { q: 0, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 },
              { q: -1, r: 2 },
              { q: -2, r: 3 }, { q: -1, r: 3 }
            ]
          },
          {
            // Variante F: Distribución Creciente [5, 5, 6, 6] (22 hex de tierra, 15 hex de mar)
            variantName: 'Variante Creciente',
            sizeProfile: [5, 5, 6, 6],
            landCells: [
              { q: 0, r: -3 }, { q: -1, r: -2 }, { q: 0, r: -2 }, { q: -2, r: -1 }, { q: -1, r: -1 },
              { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 },
              { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -3, r: 3 }, { q: -2, r: 3 },
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 }
            ],
            waterCells: [
              { q: 1, r: -3 },
              { q: 1, r: -2 },
              { q: 0, r: -1 }, { q: 3, r: -1 },
              { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 },
              { q: -1, r: 1 },
              { q: -1, r: 2 },
              { q: -1, r: 3 }
            ]
          }
        ],
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 5, brick: 4, sheep: 5, wheat: 5, ore: 4 }, numberCounts: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 2, 8: 2, 9: 3, 10: 3, 11: 3, 12: 1 } }
        ],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },
      seisIslas: {
        id: 'seisIslas', family: 'islas', playerCount: '6', seafarers: true, noDesert: true, targetVp: 13,
        label: '2. Las Seis Islas (5–6 jugadores)',
        rulesNote: 'Sin desierto. 6 islas independientes de al menos 4 hexágonos de tierra cada una (32 hex de recursos, 26 de mar). Axiales (9,-2) y (3,3) completos.',
        officialArcLayout: true,
        fixedPirate: { q: 0, r: 0 },
        layoutVariants: [
          {
            // Variante A: 6 islas independientes [5, 5, 6, 6, 4, 6] (32 hex de tierra, 26 hex de agua total - Isla 5 = 4)
            variantName: 'Variante A',
            sizeProfile: [5, 5, 6, 6, 4, 6],
            landCells: [
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 },
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 4, r: -1 },
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 7, r: -1 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 },
              { q: 4, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 },
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 5, r: 3 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 },
              { q: 3, r: 1 }, { q: 5, r: 1 }, { q: 6, r: 1 },
              { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 1, r: 3 }, { q: 2, r: 3 }, { q: 4, r: 3 }
            ]
          },
          {
            // Variante B: 6 islas independientes [4, 5, 6, 6, 5, 6] (32 hex de tierra, 26 hex de agua total - Isla 5 = 5)
            variantName: 'Variante B',
            sizeProfile: [4, 5, 6, 6, 5, 6],
            landCells: [
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 },
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 4, r: -1 },
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 7, r: -1 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 0, r: 3 }, { q: 1, r: 3 },
              { q: 4, r: 1 }, { q: 5, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 },
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 5, r: 3 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 },
              { q: 3, r: 1 }, { q: 6, r: 1 },
              { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 2, r: 3 }, { q: 4, r: 3 }
            ]
          },
          {
            // Variante C: 6 islas independientes [5, 5, 6, 5, 6, 5] (32 hex de tierra, 26 hex de agua total)
            variantName: 'Variante C',
            sizeProfile: [5, 5, 6, 5, 6, 5],
            landCells: [
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 },
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 5, r: -1 },
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 7, r: -1 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 },
              { q: 4, r: 1 }, { q: 5, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 }, { q: 4, r: 3 },
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 4, r: -1 }, { q: 6, r: -1 },
              { q: 2, r: 1 }, { q: 3, r: 1 }, { q: 6, r: 1 },
              { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 1, r: 3 }, { q: 2, r: 3 }, { q: 5, r: 3 }
            ]
          },
          {
            // Variante D: 6 islas independientes [4, 6, 6, 6, 4, 6] (32 hex de tierra, 26 hex de agua total - Isla 5 = 4)
            variantName: 'Variante D',
            sizeProfile: [4, 6, 6, 6, 4, 6],
            landCells: [
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 },
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 4, r: -1 }, { q: 5, r: -1 },
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 7, r: -1 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 0, r: 3 }, { q: 1, r: 3 },
              { q: 4, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 },
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 5, r: 3 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 6, r: -1 },
              { q: 3, r: 1 }, { q: 5, r: 1 }, { q: 6, r: 1 },
              { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 2, r: 3 }, { q: 4, r: 3 }
            ]
          },
          {
            // Variante E: 6 islas independientes [5, 5, 5, 6, 6, 5] (32 hex de tierra, 26 hex de agua total - Isla 5 = 6)
            variantName: 'Variante E',
            sizeProfile: [5, 5, 5, 6, 6, 5],
            landCells: [
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 },
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 4, r: -1 },
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 }, { q: 1, r: 3 },
              { q: 4, r: 1 }, { q: 5, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 }, { q: 4, r: 3 },
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 }, { q: 7, r: -1 },
              { q: 2, r: 1 }, { q: 3, r: 1 }, { q: 6, r: 1 },
              { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 2, r: 3 }, { q: 5, r: 3 }
            ]
          },
          {
            // Variante F: 6 islas independientes [6, 4, 6, 6, 4, 6] (32 hex de tierra, 26 hex de agua total - Noroeste = 6)
            variantName: 'Variante F',
            sizeProfile: [6, 4, 6, 6, 4, 6],
            landCells: [
              // Isla 1 (Noroeste - 6)
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 },
              // Isla 2 (Norte central - 4)
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 },
              // Isla 3 (Noreste - 6)
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 7, r: -1 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              // Isla 4 (Suroeste - 6)
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 },
              // Isla 5 (Sur central - 4)
              { q: 4, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 },
              // Isla 6 (Sudeste - 6)
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 5, r: 3 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 3, r: -1 }, { q: 4, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 },
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 3, r: 1 }, { q: 5, r: 1 }, { q: 6, r: 1 },
              { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 1, r: 3 }, { q: 2, r: 3 }, { q: 4, r: 3 }
            ]
          },
          {
            // Variante G: 6 islas independientes [6, 5, 5, 6, 4, 6] (32 hex de tierra, 26 hex de agua total - Noroeste = 6)
            variantName: 'Variante G',
            sizeProfile: [6, 5, 5, 6, 4, 6],
            landCells: [
              // Isla 1 (Noroeste - 6)
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 },
              // Isla 2 (Norte central - 5)
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 4, r: -1 },
              // Isla 3 (Noreste - 5)
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              // Isla 4 (Suroeste - 6)
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 },
              // Isla 5 (Sur central - 4)
              { q: 4, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 },
              // Isla 6 (Sudeste - 6)
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 5, r: 3 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 3, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 }, { q: 7, r: -1 },
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 3, r: 1 }, { q: 5, r: 1 }, { q: 6, r: 1 },
              { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 1, r: 3 }, { q: 2, r: 3 }, { q: 4, r: 3 }
            ]
          },
          {
            // Variante H: 6 islas independientes [6, 5, 5, 5, 5, 6] (32 hex de tierra, 26 hex de agua total - Noroeste = 6)
            variantName: 'Variante H',
            sizeProfile: [6, 5, 5, 5, 5, 6],
            landCells: [
              // Isla 1 (Noroeste - 6)
              { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 }, { q: 2, r: -1 },
              // Isla 2 (Norte central - 5)
              { q: 6, r: -3 }, { q: 7, r: -3 }, { q: 5, r: -2 }, { q: 6, r: -2 }, { q: 4, r: -1 },
              // Isla 3 (Noreste - 5)
              { q: 9, r: -3 }, { q: 8, r: -2 }, { q: 9, r: -2 }, { q: 8, r: -1 }, { q: 9, r: -1 },
              // Isla 4 (Suroeste - 5)
              { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 0, r: 3 },
              // Isla 5 (Sur central - 5)
              { q: 4, r: 1 }, { q: 5, r: 1 }, { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 3, r: 3 },
              // Isla 6 (Sudeste - 6)
              { q: 7, r: 1 }, { q: 8, r: 1 }, { q: 6, r: 2 }, { q: 7, r: 2 }, { q: 5, r: 3 }, { q: 6, r: 3 }
            ],
            waterCells: [
              { q: 5, r: -3 }, { q: 8, r: -3 },
              { q: 4, r: -2 }, { q: 7, r: -2 },
              { q: 3, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 }, { q: 7, r: -1 },
              { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 }, { q: 7, r: 0 }, { q: 8, r: 0 }, { q: 9, r: 0 },
              { q: 2, r: 1 }, { q: 3, r: 1 }, { q: 6, r: 1 },
              { q: 2, r: 2 }, { q: 5, r: 2 },
              { q: 1, r: 3 }, { q: 2, r: 3 }, { q: 4, r: 3 }
            ]
          }
        ],
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 7, brick: 6, sheep: 7, wheat: 6, ore: 6 }, numberCounts: { 2: 2, 3: 3, 4: 4, 5: 4, 6: 4, 8: 3, 9: 4, 10: 4, 11: 2, 12: 2 } }
        ],
        portRegions: ['land'],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      oceania3: {
        id: 'oceania3', family: 'oceania', playerCount: '3', seafarers: true, targetVp: 12,
        label: '3. Oceanía (3 jugadores)',
        rulesNote: 'Fin de juego: 12 PV. Dos islas principales y zona central con niebla (Tierra Ignota). Al construir un barco o carretera y alcanzar la niebla, se toma el hexágono superior de la pila boca abajo; si es de terreno, se coloca también una ficha numerada y se recibe 1 materia prima de ese tipo inmediatamente. El ladrón empieza en el 12 y el pirata en la "x".',
        officialArcLayout: true,
        fixedPirate: { q: 5, r: -1 },
        mainCells: [
          // Isla 1 Noreste (7 hex)
          { q: 4, r: -4 }, { q: 5, r: -4 },
          { q: 4, r: -3 }, { q: 5, r: -3 },
          { q: 4, r: -2 }, { q: 5, r: -2 },
          { q: 4, r: -1 },
          // Isla 2 Suroeste (7 hex)
          { q: -1, r: -1 }, { q: 0, r: -1 },
          { q: -1, r: 0 }, { q: 0, r: 0 },
          { q: -1, r: 1 }, { q: 0, r: 1 },
          { q: -1, r: 2 },
        ],
        fogCells: [
          { q: 1, r: -4 }, { q: 1, r: -3 }, { q: 2, r: -3 }, { q: 2, r: -1 },
          { q: 2, r: -2 }, { q: 2, r: 0 }, { q: 0, r: -3 }, { q: 2, r: -4 },
          { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 1 }, { q: 2, r: 1 },
        ],
        waterCells: [
          { q: 0, r: -2 }, { q: 3, r: -4 },
          { q: 3, r: -3 }, { q: -2, r: 1 },
          { q: -1, r: -2 }, { q: 3, r: -2 }, { q: 1, r: -1 },
          { q: -2, r: -1 }, { q: 3, r: -1 }, { q: 5, r: -1 },
          { q: 1, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 },
          { q: 1, r: 1 }, { q: -2, r: 0 }, { q: 1, r: -2 },
          { q: 0, r: 2 }, { q: -2, r: 2 },
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 4, sheep: 4, wheat: 2, brick: 2, ore: 2 }, numberCounts: { 3: 1, 4: 1, 5: 2, 6: 2, 8: 2, 9: 2, 10: 1, 11: 2, 12: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 3, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      oceania4: {
        id: 'oceania4', family: 'oceania', playerCount: '4', seafarers: true, targetVp: 12,
        label: '3. Oceanía (4 jugadores)',
        rulesNote: 'Fin de juego: 12 PV. Dos islas principales y zona central con niebla (Tierra Ignota). Al construir un barco o carretera y alcanzar la niebla, se toma el hexágono superior de la pila boca abajo; si es de terreno, se coloca también una ficha numerada y se recibe 1 materia prima de ese tipo inmediatamente. El ladrón empieza en el 12 y el pirata en la "x".',
        officialArcLayout: true,
        fixedPirate: { q: 1, r: 3 },
        mainCells: [
          // Isla 1 Noreste (10 hex)
          { q: 3, r: -4 }, { q: 4, r: -4 }, { q: 5, r: -4 },
          { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 5, r: -3 },
          { q: 4, r: -2 }, { q: 5, r: -2 },
          { q: 4, r: -1 },
          { q: 4, r: 0 },
          // Isla 2 Suroeste (7 hex)
          { q: -1, r: -1 },
          { q: -2, r: 0 }, { q: -1, r: 0 },
          { q: -2, r: 1 }, { q: -1, r: 1 },
          { q: -2, r: 2 }, { q: -1, r: 2 }
        ],
        fogCells: [
          { q: 1, r: -4 },
          { q: 0, r: -3 }, { q: 1, r: -3 },
          { q: 1, r: -2 },
          { q: 1, r: -1 }, { q: 2, r: -1 },
          { q: 1, r: 0 }, { q: 2, r: 0 },
          { q: 1, r: 1 }, { q: 2, r: 1 },
          { q: 1, r: 2 }, { q: 2, r: 2 }
        ],
        waterCells: [
          { q: 2, r: -4 },
          { q: 2, r: -3 },
          { q: -1, r: -2 }, { q: 0, r: -2 }, { q: 2, r: -2 }, { q: 3, r: -2 },
          { q: -2, r: -1 }, { q: 0, r: -1 }, { q: 3, r: -1 }, { q: 5, r: -1 },
          { q: 0, r: 0 }, { q: 3, r: 0 },
          { q: 0, r: 1 }, { q: 3, r: 1 },
          { q: 0, r: 2 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 4, sheep: 4, wheat: 3, brick: 3, ore: 3 }, numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 1, 12: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      oceania6: {
        id: 'oceania6', family: 'oceania', playerCount: '6', seafarers: true, targetVp: 12,
        label: '3. Oceanía (5–6 jugadores)',
        rulesNote: 'Fin de juego: 12 PV. Dos grandes islas principales y mar central con niebla (Tierra Ignota). Al construir un barco o carretera y alcanzar la niebla, se toma el hexágono superior de la pila boca abajo; si es de terreno, se coloca también una ficha numerada y se recibe 1 materia prima de ese tipo inmediatamente. El ladrón empieza en el 12 y el pirata en la "x".',
        officialArcLayout: true,
        fixedPirate: { q: 6, r: 0 },
        mainCells: [
          // Isla 1 Noreste (12 hex)
          { q: 8, r: -3 }, { q: 9, r: -3 },
          { q: 8, r: -2 }, { q: 9, r: -2 },
          { q: 8, r: -1 }, { q: 9, r: -1 },
          { q: 7, r: 0 }, { q: 8, r: 0 },
          { q: 7, r: 1 }, { q: 8, r: 1 },
          { q: 7, r: 2 },
          { q: 6, r: 3 },
          // Isla 2 Suroeste (12 hex)
          { q: 3, r: -3 },
          { q: 2, r: -2 },
          { q: 1, r: -1 }, { q: 2, r: -1 },
          { q: 1, r: 0 }, { q: 2, r: 0 },
          { q: 0, r: 1 }, { q: 1, r: 1 },
          { q: 0, r: 2 }, { q: 1, r: 2 },
          { q: 0, r: 3 }, { q: 1, r: 3 }
        ],
        fogCells: [
          { q: 5, r: -3 }, { q: 6, r: -3 },
          { q: 4, r: -2 }, { q: 5, r: -2 }, { q: 6, r: -2 },
          { q: 4, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 },
          { q: 4, r: 0 }, { q: 5, r: 0 },
          { q: 3, r: 1 }, { q: 4, r: 1 }, { q: 5, r: 1 },
          { q: 3, r: 2 }, { q: 4, r: 2 }, { q: 5, r: 2 },
          { q: 3, r: 3 }, { q: 4, r: 3 }
        ],
        waterCells: [
          { q: 4, r: -3 }, { q: 7, r: -3 },
          { q: 3, r: -2 }, { q: 7, r: -2 },
          { q: 3, r: -1 }, { q: 7, r: -1 },
          { q: 0, r: 0 }, { q: 3, r: 0 }, { q: 6, r: 0 }, { q: 9, r: 0 },
          { q: 2, r: 1 }, { q: 6, r: 1 },
          { q: 2, r: 2 }, { q: 6, r: 2 },
          { q: 2, r: 3 }, { q: 5, r: 3 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 5, sheep: 5, wheat: 5, brick: 5, ore: 4 }, numberCounts: { 2: 1, 3: 2, 4: 3, 5: 2, 6: 3, 8: 3, 9: 3, 10: 3, 11: 2, 12: 2 } }
        ],
        portRegions: ['main'],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      desierto3: {
        id: 'desierto3', family: 'desierto', playerCount: '3', seafarers: true, targetVp: 14,
        label: '4. A Través del Desierto (3 jugadores)',
        rulesNote: 'Un gran cinturón desértico separa la isla en dos partes. Territorio extraño más allá del desierto y en los islotes.',
        officialArcLayout: true,
        fixedRobber: { q: 1, r: -3 },
        fixedPirate: { q: 0.5, r: -3.8 },
        fixedHexCoords: { '1,-3': 'desert', '0,-2': 'desert', '-1,-1': 'desert' },
        mainCells: [
          { q: 1, r: -3 }, { q: 0, r: -2 }, { q: -1, r: -1 },
          { q: 1, r: -2 },
          { q: 0, r: -1 }, { q: 1, r: -1 },
          { q: -1, r: 0 }, { q: 0, r: 0 },
          { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 },
          { q: -3, r: 2 }, { q: -2, r: 2 }, { q: -1, r: 2 },
          { q: -3, r: 3 }, { q: -2, r: 3 }
        ],
        isloteCells: [
          { q: 0, r: -3 }, { q: -1, r: -2 }, { q: -2, r: -1 },
          { q: 3, r: -3 },
          { q: 3, r: -2 },
          { q: 3, r: -1 },
          { q: 2, r: 0 },
          { q: 2, r: 1 },
          { q: 1, r: 2 },
          { q: 0, r: 3 }
        ],
        waterCells: [
          { q: 2, r: -3 },
          { q: 2, r: -2 },
          { q: 2, r: -1 },
          { q: -3, r: 0 }, { q: -2, r: 0 }, { q: 1, r: 0 }, { q: 3, r: 0 },
          { q: 1, r: 1 },
          { q: 0, r: 2 },
          { q: -1, r: 3 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 4, brick: 3, sheep: 3, wheat: 2, ore: 2, desert: 3 }, numberCounts: { 2: 1, 3: 1, 4: 2, 5: 1, 6: 2, 8: 2, 9: 2, 10: 2, 11: 1 } },
          { region: 'islote', resourceCounts: { gold: 2, wheat: 2, ore: 2, wood: 1, sheep: 1, water: 2 }, numberCounts: { 3: 1, 4: 1, 5: 2, 6: 1, 8: 1, 9: 1, 12: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 3, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      desierto4: {
        id: 'desierto4', family: 'desierto', playerCount: '4', seafarers: true, targetVp: 14,
        label: '4. A Través del Desierto (4 jugadores)',
        rulesNote: 'Un gran cinturón desértico separa la isla en dos partes. Territorio extraño más allá del desierto y en los islotes.',
        officialArcLayout: true,
        fixedRobber: { q: 2, r: -4 },
        fixedPirate: { q: 5, r: -1 },
        fixedHexCoords: { '2,-4': 'desert', '1,-3': 'desert', '0,-2': 'desert' },
        mainCells: [
          { q: 2, r: -4 }, { q: 1, r: -3 }, { q: 0, r: -2 },
          { q: 3, r: -4 },
          { q: 2, r: -3 }, { q: 3, r: -3 },
          { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 3, r: -2 },
          { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 2, r: -1 },
          { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
          { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 },
          { q: -1, r: 2 }
        ],
        isloteCells: [
          { q: 1, r: -4 }, { q: 0, r: -3 }, { q: -1, r: -2 },
          { q: 5, r: -4 },
          { q: 5, r: -3 },
          { q: 5, r: -2 },
          { q: 4, r: -1 },
          { q: 4, r: 0 },
          { q: 3, r: 1 },
          { q: 2, r: 2 },
          { q: 3, r: 0 },
          { q: 1, r: 2 }
        ],
        waterCells: [
          { q: -2, r: -1 }, { q: -1, r: -1 },
          { q: -2, r: 2 }, { q: 0, r: 2 },
          { q: 1, r: 1 }, { q: 2, r: 1 },
          { q: 2, r: 0 },
          { q: 3, r: -1 },
          { q: 4, r: -2 }, { q: 4, r: -3 }, { q: 4, r: -4 },
          { q: 5, r: -1 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 5, brick: 4, sheep: 4, wheat: 2, ore: 2, desert: 3 }, numberCounts: { 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 } },
          { region: 'islote', resourceCounts: { gold: 2, wheat: 3, brick: 1, ore: 3, sheep: 1, water: 2 }, numberCounts: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 8: 1, 9: 1, 10: 1, 11: 1, 12: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      desierto6: {
        id: 'desierto6', family: 'desierto', playerCount: '6', seafarers: true, targetVp: 14,
        label: '4. A Través del Desierto (5–6 jugadores)',
        rulesNote: 'Cinturón desértico de 5 desiertos del axial (1, -2) al (5, -2). Franja superior y archipiélago este. Fin: 14 PV.',
        officialArcLayout: true,
        fixedRobber: { q: 3, r: -2 },
        fixedPirate: { q: 7, r: 0 },
        fixedHexCoords: { '1,-2': 'desert', '2,-2': 'desert', '3,-2': 'desert', '4,-2': 'desert', '5,-2': 'desert' },
        mainCells: [
          { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 3, r: -2 }, { q: 4, r: -2 }, { q: 5, r: -2 },
          { q: 1, r: -1 }, { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 4, r: -1 },
          { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 },
          { q: -3, r: 1 }, { q: -2, r: 1 }, { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 3, r: 1 },
          { q: -3, r: 2 }, { q: -2, r: 2 },
          { q: -3, r: 3 }
        ],
        isloteCells: [
          { q: 0, r: -3 }, { q: 1, r: -3 }, { q: 2, r: -3 }, { q: 3, r: -3 }, { q: 4, r: -3 }, { q: 5, r: -3 }, { q: 6, r: -3 }, { q: 7, r: -3 },
          { q: -1, r: 3 }, { q: 0, r: 3 }, { q: 1, r: 3 }, { q: 2, r: 3 }, { q: 3, r: 3 }, { q: 4, r: 3 },
          { q: 4, r: 2 }, { q: 5, r: 2 },
          { q: 6, r: 1 },
          { q: 7, r: -2 },
          { q: 7, r: -1 },
          { q: -1, r: -2 }, { q: 0, r: -2 }
        ],
        waterCells: [
          { q: -3, r: 0 },
          { q: 7, r: 0 },
          { q: -2, r: -1 }, { q: -1, r: -1 }, { q: 0, r: -1 },
          { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 2 },
          { q: -2, r: 3 },
          { q: 6, r: -2 },
          { q: 5, r: -1 }, { q: 6, r: -1 },
          { q: 5, r: 0 }, { q: 6, r: 0 },
          { q: 4, r: 1 }, { q: 5, r: 1 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 4, brick: 5, sheep: 4, wheat: 4, ore: 4, desert: 5 }, numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 3, 10: 3, 11: 2, 12: 2 } },
          { region: 'islote', resourceCounts: { wood: 3, brick: 2, sheep: 3, wheat: 3, ore: 3, gold: 3, water: 4 }, numberCounts: { 2: 2, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 1, 10: 1, 11: 2, 12: 1 } }
        ],
        portRegions: ['main'],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      // ---------- ESCENARIOS 5 AL 9 DE NAVEGANTES ----------
      puebloPerdido4: {
        id: 'puebloPerdido4', family: 'pueblo', playerCount: '4', seafarers: true, targetVp: 13,
        label: '5. El Pueblo Perdido (3–4 jugadores)',
        rulesNote: 'Encuentro con la tribu olvidada. La isla principal produce recursos normalmente. En los islotes del norte y sur no se colocan números ni se pueden construir poblados: al llegar con barcos se obtienen regalos (fichas de Catán, cartas de desarrollo y puertos). Fin: 13 PV.',
        frameCellsFrom: 'rumboNuevasOrillas4', waterInPool: true, approximate: true, // TODO(reglamento): Diseño aproximado (no coincide la silueta)
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5, desert: 3, gold: 2, water: 19 }, numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 } }
        ],
        ports: { generic: 1, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      puebloPerdido6: {
        id: 'puebloPerdido6', family: 'pueblo', playerCount: '6', seafarers: true, targetVp: 14,
        approximate: true, // TODO(reglamento): conteos pendientes de verificar contra el reglamento y posibles fichas sobrantes
        label: '5. El Pueblo Perdido (5–6 jugadores)',
        rulesNote: 'Gran isla central con 29 hexágonos numerados y 6 islotes del pueblo perdido en las costas norte y sur. Al alcanzar los islotes se obtienen regalos (fichas de Catán, cartas de desarrollo y puertos). Fin: 14 PV.',
        officialArcLayout: true,
        mainCells: [
          { q: 3, r: -2 }, { q: 4, r: -2 }, { q: 5, r: -2 },
          { q: 2, r: -1 }, { q: 3, r: -1 }, { q: 4, r: -1 }, { q: 5, r: -1 }, { q: 6, r: -1 },
          { q: 0, r: 0 }, { q: 1, r: 0 }, { q: 2, r: 0 }, { q: 3, r: 0 }, { q: 4, r: 0 }, { q: 5, r: 0 }, { q: 6, r: 0 },
          { q: 0, r: 1 }, { q: 1, r: 1 }, { q: 2, r: 1 }, { q: 3, r: 1 }, { q: 4, r: 1 }, { q: 5, r: 1 },
          { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }, { q: 3, r: 2 }, { q: 4, r: 2 },
          { q: 0, r: 3 }, { q: 1, r: 3 }, { q: 2, r: 3 }
        ],
        isloteCells: [
          { q: 1, r: -3 }, { q: 2, r: -3 },
          { q: 4, r: -3 }, { q: 5, r: -3 },
          { q: 7, r: -3 }, { q: 7, r: -2 },
          { q: -2, r: 1 }, { q: -2, r: 2 },
          { q: -2, r: 3 }, { q: -1, r: 3 },
          { q: 4, r: 3 }, { q: 5, r: 2 }
        ],
        waterCells: [
          { q: 0, r: -3 }, { q: 3, r: -3 }, { q: 6, r: -3 },
          { q: -1, r: -2 }, { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 }, { q: 6, r: -2 },
          { q: -2, r: -1 }, { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 7, r: -1 },
          { q: -3, r: 0 }, { q: -2, r: 0 }, { q: -1, r: 0 }, { q: 7, r: 0 },
          { q: -3, r: 1 }, { q: -1, r: 1 }, { q: 6, r: 1 },
          { q: -3, r: 2 }, { q: -1, r: 2 },
          { q: -3, r: 3 }, { q: 3, r: 3 }
        ],
        regionGroups2: [
          { region: 'main', resourceCounts: { wood: 6, brick: 6, sheep: 6, wheat: 6, ore: 5 }, numberCounts: { 2: 1, 3: 4, 4: 4, 5: 4, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 1 } },
          { region: 'islote', resourceCounts: { desert: 4, gold: 3, wheat: 1, brick: 1, ore: 1, sheep: 1, wood: 1 }, noNumbers: true }
        ],
        portRegions: ['main'],
        ports: { generic: 3, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      telasCatan4: {
        id: 'telasCatan4', family: 'telas', playerCount: '4', seafarers: true, targetVp: 14,
        label: '6. Telas para Catán (3–4 jugadores)',
        rulesNote: 'Dos islas principales (norte y sur) y 4 aldeas indígenas en los islotes centrales. Se inicia con 3 poblados. Al conectar rutas a las aldeas se comercian balas de tela (fichas Catán, 2 telas = 1 PV). No se usa Gran Ruta Comercial. Fin: 14 PV.',
        frameCellsFrom: 'rumboNuevasOrillas4', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 4, brick: 3, sheep: 4, wheat: 5, ore: 4, desert: 2, gold: 2, water: 18 }, numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 } }
        ],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      telasCatan6: {
        id: 'telasCatan6', family: 'telas', playerCount: '6', seafarers: true, targetVp: 14,
        label: '6. Telas para Catán (5–6 jugadores)',
        rulesNote: 'Dos grandes islas principales (norte y sur) y canal central con 12 aldeas indígenas en islotes. Se inicia con 3 poblados. Las rutas conectadas a las aldeas permiten comerciar balas de tela (2 telas = 1 PV). Fin: 14 PV.',
        frameCellsFrom: 'rumboNuevasOrillas6', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 6, brick: 4, sheep: 5, wheat: 6, ore: 5, desert: 4, gold: 2, water: 24 }, numberCounts: { 2: 3, 3: 4, 4: 4, 5: 4, 6: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 3 } }
        ],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      islasPiratas4: {
        id: 'islasPiratas4', family: 'piratas', playerCount: '4', seafarers: true, targetVp: 10,
        label: '7. Las Islas Piratas (3–4 jugadores)',
        rulesNote: 'Tierra natal de los colonos en el este y archipiélago de fortalezas piratas en el oeste. Flota pirata móvil que asalta poblados costeros. Convierte barcos en barcos de guerra con caballeros para vencer la fortaleza pirata. Fin: 10 PV y fortaleza conquistada.',
        frameCellsFrom: 'rumboNuevasOrillas4', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5, desert: 3, gold: 2, water: 19 }, numberCounts: { 2: 1, 3: 2, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 2, 12: 1 } }
        ],
        ports: { generic: 3, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      islasPiratas6: {
        id: 'islasPiratas6', family: 'piratas', playerCount: '6', seafarers: true, targetVp: 10,
        label: '7. Las Islas Piratas (5–6 jugadores)',
        rulesNote: 'Gran isla oriental para los 6 jugadores y 6 fortalezas piratas en las islas occidentales. Flota pirata circular que realiza incursiones. Construye barcos de guerra para asaltar tu fortaleza asignada. Fin: 10 PV y fortaleza conquistada.',
        frameCellsFrom: 'rumboNuevasOrillas6', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 6, brick: 4, sheep: 6, wheat: 5, ore: 7, desert: 5, gold: 4, water: 26 }, numberCounts: { 2: 1, 3: 4, 4: 4, 5: 4, 6: 4, 8: 4, 9: 3, 10: 3, 11: 4, 12: 1 } }
        ],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      maravillas4: {
        id: 'maravillas4', family: 'maravillas', playerCount: '4', seafarers: true, targetVp: 10,
        label: '8. Las Maravillas Catanas (3–4 jugadores)',
        rulesNote: 'Construcción de monumentos arquitectónicos de 4 fases (5 cartas de maravilla disponibles). Cada fase cuesta 5 materias primas. Fin: completar la maravilla (fase 4) o alcanzar 10 PV con maravilla más avanzada que los rivales.',
        frameCellsFrom: 'rumboNuevasOrillas4', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 5, brick: 5, sheep: 5, wheat: 5, ore: 5, desert: 3, gold: 2, water: 19 }, numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 1 } }
        ],
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      maravillas6: {
        id: 'maravillas6', family: 'maravillas', playerCount: '6', seafarers: true, targetVp: 10,
        label: '8. Las Maravillas Catanas (5–6 jugadores)',
        rulesNote: 'Competición monumental con 7 maravillas disponibles (incluyendo Gran Puente y Gran Biblioteca). Gran continente sur y archipiélago septentrional. Fin: completar maravilla o 10 PV con nivel superior.',
        frameCellsFrom: 'rumboNuevasOrillas6', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 7, brick: 6, sheep: 7, wheat: 6, ore: 6, desert: 4, gold: 3, water: 24 }, numberCounts: { 2: 2, 3: 3, 4: 4, 5: 4, 6: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 2 } }
        ],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      unNuevoMundo4: {
        id: 'unNuevoMundo4', family: 'nuevomundo', playerCount: '4', seafarers: true, noDesert: true, targetVp: 12,
        label: '9. Un Nuevo Mundo (3–4 jugadores)',
        rulesNote: 'Generación libre y exploración: todos los hexágonos y fichas numeradas se mezclan al azar. Los jugadores eligen libremente la ubicación de los puertos en la costa al inicio. 1 PV extra por primer poblado en isla extraña. Fin: 12 PV.',
        frameCellsFrom: 'rumboNuevasOrillas4', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 5, brick: 4, sheep: 5, wheat: 5, ore: 4, water: 19 }, numberCounts: { 2: 1, 3: 3, 4: 3, 5: 3, 6: 2, 8: 2, 9: 3, 10: 3, 11: 2, 12: 1 } }
        ],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      unNuevoMundo6: {
        id: 'unNuevoMundo6', family: 'nuevomundo', playerCount: '6', seafarers: true, targetVp: 12,
        label: '9. Un Nuevo Mundo (5–6 jugadores)',
        rulesNote: 'Modo libre para 5-6 jugadores en marco completo de 63 hexágonos. Mezcla total de terrenos, desiertos, ríos auríferos y mar. Elección por turnos de colocación de puertos en las costas. Fin: 12 PV.',
        frameCellsFrom: 'rumboNuevasOrillas6', waterInPool: true, approximate: true, // TODO(reglamento): diseño aproximado y verificar fichas sobrantes
        regionGroups2: [
          { region: 'land', resourceCounts: { wood: 7, brick: 7, sheep: 7, wheat: 7, ore: 7, desert: 3, gold: 4, water: 21 }, numberCounts: { 2: 2, 3: 3, 4: 4, 5: 5, 6: 5, 8: 5, 9: 5, 10: 4, 11: 4, 12: 2 } }
        ],
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      // ---------- ESCENARIOS DE MERCADERES Y BÁRBAROS (1 AL 5) ----------
      pescadores4: {
        id: 'pescadores4', family: 'pescadores', playerCount: '4', targetVp: 10, autoFishermen: 'full',
        label: '1. Los Pescadores de Catán (3–4 jugadores)',
        rulesNote: 'El desierto/lago se coloca aleatoriamente (montaje variable del reglamento sección 4). 6 caladeros de pesca en costas (4, 5, 6, 8, 9, 10). El ladrón empieza fuera del tablero. Fin: 10 PV (11 con Bota Vieja).',
        rows: [3, 4, 5, 4, 3],
        fixedHexes: {},
        resourceCounts: { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3, desert: 1 },
        numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      pescadores6: {
        id: 'pescadores6', family: 'pescadores', playerCount: '6', targetVp: 10, autoFishermen: 'full',
        label: '1. Los Pescadores de Catán (5–6 jugadores)',
        rulesNote: 'Dos lagos interiores (el 1° produce con 2, 3, 11, 12; el 2° con 4 y 10). 8 caladeros costeros (4, 5, 6, 8, 9, 10, 5, 9). El ladrón empieza fuera del tablero. Fin: 10 PV (11 con Bota Vieja).',
        rows: [3, 4, 5, 6, 5, 4, 3],
        fixedHexes: {},
        resourceCounts: { wood: 6, brick: 5, sheep: 6, wheat: 6, ore: 5, desert: 2 },
        numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      riosCatan4: {
        id: 'riosCatan4', family: 'rios', playerCount: '4', targetVp: 10,
        label: '2. Los Ríos de Catán (3–4 jugadores)',
        approximate: true, // TODO(reglamento): conteos pendientes de verificar contra el reglamento
        rulesNote: '2 ríos con 2 pantanos fijos (sin números) y pasos de puentes. Construir en el río o puentes da oro (2 oro = 1 recurso). Fichas "Colono más rico" (+1 PV) y "Colono pobre" (-2 PV). Fin: 10 PV.',
        rows: [3, 4, 5, 4, 3],
        fixedHexes: { 1: 'swamp', 17: 'swamp' },
        resourceCounts: { wood: 4, brick: 2, sheep: 4, wheat: 4, ore: 3 },
        numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2 },
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      riosCatan6: {
        id: 'riosCatan6', family: 'rios', playerCount: '6', targetVp: 10,
        label: '2. Los Ríos de Catán (5–6 jugadores)',
        dataWarning: 'Fichas numeradas: 25 numerables vs 28 declaradas', // TODO(reglamento): conteos pendientes de verificar contra el reglamento
        rulesNote: '3 ríos y 3 pantanos en la isla grande. Puentes, oro y fichas de Colono más rico (+1 PV) y Colono pobre (-2 PV). Fin: 10 PV.',
        rows: [3, 4, 5, 6, 5, 4, 3],
        fixedHexes: { 1: 'swamp', 14: 'swamp', 28: 'swamp' },
        resourceCounts: { wood: 6, brick: 5, sheep: 5, wheat: 5, ore: 4, desert: 2 },
        numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      caravanas4: {
        id: 'caravanas4', family: 'caravanas', playerCount: '4', targetVp: 12,
        label: '3. La Ruta de las Caravanas (3–4 jugadores)',
        rulesNote: 'Oasis central fijo. Al fundar o ampliar a ciudades se vota con lana y trigo para colocar camellos. Poblados entre dos camellos valen +1 PV. Carreteras con camello valen doble para Gran Ruta. Fin: 12 PV.',
        rows: [3, 4, 5, 4, 3],
        fixedHexes: { 7: 'oasis' },
        resourceCounts: { wood: 4, brick: 3, sheep: 4, wheat: 4, ore: 3 },
        numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      caravanas6: {
        id: 'caravanas6', family: 'caravanas', playerCount: '6', targetVp: 12,
        label: '3. La Ruta de las Caravanas (5–6 jugadores)',
        rulesNote: 'Dos Oasis centrales con hasta 6 rutas de caravanas de camellos. Poblados entre camellos valen +1 PV. Fin: 12 PV.',
        rows: [3, 4, 5, 6, 5, 4, 3],
        fixedHexes: { 9: 'oasis', 18: 'oasis' },
        resourceCounts: { wood: 6, brick: 5, sheep: 6, wheat: 6, ore: 5 },
        numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      ataqueBarbaros4: {
        id: 'ataqueBarbaros4', family: 'ataquebarbaros', playerCount: '4', noRobber: true, targetVp: 12,
        dataWarning: '1 ficha sobrante', // TODO(reglamento): conteos pendientes de verificar contra el reglamento
        label: '4. El Ataque de los Bárbaros (3–4 jugadores)',
        rulesNote: 'Castillo y desierto fijos. Los bárbaros invaden las costas al construir poblados/ciudades y bloquean la producción. Los jugadores arman caballeros en el castillo para expulsarlos. Cada 2 prisioneros = 1 PV. Sin ladrón. Fin: 12 PV.',
        rows: [3, 4, 5, 4, 3],
        fixedHexes: { 1: 'desert', 17: 'castle' },
        resourceCounts: { wood: 3, brick: 3, sheep: 4, wheat: 4, ore: 3 },
        numberCounts: { 2: 1, 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 1 },
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      ataqueBarbaros6: {
        id: 'ataqueBarbaros6', family: 'ataquebarbaros', playerCount: '6', noRobber: true, targetVp: 12,
        dataWarning: '2 fichas sobrantes', // TODO(reglamento): conteos pendientes de verificar contra el reglamento
        label: '4. El Ataque de los Bárbaros (5–6 jugadores)',
        rulesNote: '2 Castillos y 2 Desiertos fijos. Ataques bárbaros a gran escala en las costas. Caballeros armados para expulsar invasores. Cada 2 prisioneros = 1 PV. Sin ladrón. Fin: 12 PV.',
        rows: [3, 4, 5, 6, 5, 4, 3],
        fixedHexes: { 1: 'desert', 5: 'desert', 24: 'castle', 28: 'castle' },
        resourceCounts: { wood: 5, brick: 5, sheep: 5, wheat: 6, ore: 5 },
        numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      },

      mercaderesBarbaros4: {
        id: 'mercaderesBarbaros4', family: 'mercaderes', playerCount: '4', noRobber: true, targetVp: 13,
        label: '5. Mercaderes y Bárbaros (3–4 jugadores)',
        rulesNote: '3 Hexágonos de destino: El Castillo, La Cantera de Mármol y La Fábrica de Vidrio. Los carromatos transportan mercancías por carreteras y caminos. Cada entrega = oro + 1 PV. Carromato nivel 5 = +1 PV. Sin ladrón ni Gran Ruta. Fin: 13 PV.',
        rows: [3, 4, 5, 4, 3],
        fixedHexes: { 0: 'quarry', 2: 'glassworks', 17: 'castle' },
        resourceCounts: { wood: 3, brick: 3, sheep: 3, wheat: 4, ore: 3 },
        numberCounts: { 3: 2, 4: 2, 5: 2, 6: 2, 8: 2, 9: 2, 10: 2, 11: 2 },
        ports: { generic: 4, wood: 1, brick: 1, sheep: 1, wheat: 1, ore: 1 }
      },

      mercaderesBarbaros6: {
        id: 'mercaderesBarbaros6', family: 'mercaderes', playerCount: '6', noRobber: true, targetVp: 13,
        dataWarning: '3 fichas sobrantes', // TODO(reglamento): conteos pendientes de verificar contra el reglamento
        label: '5. Mercaderes y Bárbaros (5–6 jugadores)',
        rulesNote: '3 Grandes Hexágonos de Destino dobles (Castillo, Canteras, Fábricas). Carromatos, oro por peajes y entregas de mercancías (1 PV c/u). Bárbaros en caminos. Sin ladrón. Fin: 13 PV.',
        rows: [3, 4, 5, 6, 5, 4, 3],
        fixedHexes: { 0: 'quarry', 2: 'glassworks', 27: 'castle', 14: 'desert', 15: 'desert' },
        resourceCounts: { wood: 6, brick: 5, sheep: 5, wheat: 5, ore: 4 },
        numberCounts: { 2: 2, 3: 3, 4: 3, 5: 3, 6: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 2 },
        ports: { generic: 5, wood: 1, brick: 1, sheep: 2, wheat: 1, ore: 1 }
      }
    };

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
    Object.keys(BOARD_TEMPLATES).forEach(id => {
      const original = BOARD_TEMPLATES[id];
      if (!original.regionGroups2) return;
      const clone = JSON.parse(JSON.stringify(original));
      normalizeTemplate(clone);
      BOARD_TEMPLATES[id] = clone;
    });

    function detectDuplicateCells(hexes) {
      const seen = new Set();
      const duplicates = [];
      for (const h of hexes) {
        const key = `${h.q},${h.r}`;
        if (seen.has(key)) duplicates.push(key);
        seen.add(key);
      }
      return duplicates;
    }

    function validateTemplates() {
      const problems = [];
      const checkTemplate = (id, templateDef, variantLabel = null) => {
        const tr = buildTemplateHexes(templateDef, createPRNG('v'));
        if (typeof templateDef.selectedVariant === 'number') {
          const expectedVariant = templateDef.layoutVariants[templateDef.selectedVariant];
          if (expectedVariant && tr.selectedVariant !== expectedVariant) {
            problems.push({ id: label, region: 'N/A', error: 'Variante forzada no respetada' });
          }
        }
        const dups = detectDuplicateCells(tr.hexes);
        const label = variantLabel ? `${id} (${variantLabel})` : id;
        if (dups.length > 0) problems.push({ id: label, region: 'N/A', error: `Duplicados: ${dups.join(' | ')}` });

        const groups = templateDef.regionGroups2 || [{ region: '__all', resourceCounts: templateDef.resourceCounts, numberCounts: templateDef.numberCounts }];
        for (const g of groups) {
          const ids = g.region === '__all' ? tr.hexes.map(h => h.id) : (tr.regionHexIds[g.region] || []);
          const FX  = g.region === '__all' ? (templateDef.fixedHexes || {}) : tr.fixedHexes;
          const rc  = g.resourceCounts || {};
          const fixedIds = ids.filter(i => FX[i] !== undefined);
          const free = ids.length - fixedIds.length;
          const consumed = fixedIds.filter(i => rc[FX[i]] !== undefined);
          const eff = Object.values(rc).reduce((a, b) => a + b, 0) - consumed.length;
          const numerable = Object.entries(rc).filter(([k]) => !NO_NUMBER_TYPES.has(k))
                              .reduce((a, [, b]) => a + b, 0)
                            - consumed.filter(i => !NO_NUMBER_TYPES.has(FX[i])).length;
          const nums = Object.values(g.numberCounts || {}).reduce((a, b) => a + b, 0);
          
          // No warning for free !== eff if dataWarning is true, we allow it (handled in generateBoard)
          if (!templateDef.dataWarning && free !== eff) {
            problems.push({ id: label, region: g.region, error: `${free} hex libres ≠ ${eff} recursos` });
          }
          if (!g.noNumbers && !templateDef.dataWarning && numerable !== nums) {
            problems.push({ id: label, region: g.region, error: `${numerable} numerables ≠ ${nums} fichas` });
          }
        }
      };

      for (const [id, t] of Object.entries(BOARD_TEMPLATES)) {
        if (t.layoutVariants) {
          t.layoutVariants.forEach((v, i) => {
            // override selectedVariant if handled by RNG inside buildFixedArcIslands
            // For buildFixedArcIslands, we might need a way to force variant. 
            // In buildFixedArcIslands, it does: const vIndex = typeof template.selectedVariant === 'number' ? template.selectedVariant : rng() ...
            const tCopy = { ...t, selectedVariant: i };
            checkTemplate(id, tCopy, v.variantName);
          });
        } else {
          checkTemplate(id, t);
        }
      }
      return problems;
    }

    const EXPANSIONS = [
      { id: 'clasico', label: '🏠 Catán Básico', desc: 'Juego base original' },
      { id: 'navegantes', label: '⛵ Navegantes', desc: 'Escenarios marítimos 1–9' },
      { id: 'barbaros', label: '🏰 Mercaderes & Bárbaros', desc: '5 Escenarios de campaña' }
    ];

    const FAMILIES = [
      // Catán Básico
      { id: 'clasico', expansion: 'clasico', label: 'Catán Básico', sublabel: 'El original', variants: { '4': 'base', '6': 'extension56' } },

      // Navegantes (1 al 9)
      { id: 'rumbo', expansion: 'navegantes', label: '1. Rumbo a Nuevas Orillas', sublabel: 'Navegantes', variants: { '3': 'rumboNuevasOrillas3', '4': 'rumboNuevasOrillas4', '6': 'rumboNuevasOrillas6' } },
      { id: 'islas', expansion: 'navegantes', label: '2. Las Islas', sublabel: 'Navegantes', variants: { '3': 'tresIslas', '4': 'cuatroIslas', '6': 'seisIslas' } },
      { id: 'oceania', expansion: 'navegantes', label: '3. Oceanía', sublabel: 'Navegantes', variants: { '3': 'oceania3', '4': 'oceania4', '6': 'oceania6' } },
      { id: 'desierto', expansion: 'navegantes', label: '4. A Través del Desierto', sublabel: 'Navegantes', variants: { '3': 'desierto3', '4': 'desierto4', '6': 'desierto6' } },
      { id: 'pueblo', expansion: 'navegantes', label: '5. El Pueblo Perdido', sublabel: 'Navegantes', variants: { '4': 'puebloPerdido4', '6': 'puebloPerdido6' } },
      { id: 'telas', expansion: 'navegantes', label: '6. Telas para Catán', sublabel: 'Navegantes', variants: { '4': 'telasCatan4', '6': 'telasCatan6' } },
      { id: 'piratas', expansion: 'navegantes', label: '7. Las Islas Piratas', sublabel: 'Navegantes', variants: { '4': 'islasPiratas4', '6': 'islasPiratas6' } },
      { id: 'maravillas', expansion: 'navegantes', label: '8. Las Maravillas Catanas', sublabel: 'Navegantes', variants: { '4': 'maravillas4', '6': 'maravillas6' } },
      { id: 'nuevomundo', expansion: 'navegantes', label: '9. Un Nuevo Mundo', sublabel: 'Navegantes · libre', variants: { '4': 'unNuevoMundo4', '6': 'unNuevoMundo6' } },

      // Mercaderes & Bárbaros (1 al 5)
      { id: 'pescadores', expansion: 'barbaros', label: '1. Los Pescadores de Catán', sublabel: 'M&B · Lago y Caladeros', variants: { '4': 'pescadores4', '6': 'pescadores6' } },
      { id: 'rios', expansion: 'barbaros', label: '2. Los Ríos de Catán', sublabel: 'M&B · Pantanos y Oro', variants: { '4': 'riosCatan4', '6': 'riosCatan6' } },
      { id: 'caravanas', expansion: 'barbaros', label: '3. La Ruta de las Caravanas', sublabel: 'M&B · Oasis y Camellos', variants: { '4': 'caravanas4', '6': 'caravanas6' } },
      { id: 'ataquebarbaros', expansion: 'barbaros', label: '4. El Ataque de los Bárbaros', sublabel: 'M&B · Castillo e Invasión', variants: { '4': 'ataqueBarbaros4', '6': 'ataqueBarbaros6' } },
      { id: 'mercaderes', expansion: 'barbaros', label: '5. Mercaderes y Bárbaros', sublabel: 'M&B · Carromatos y Destinos', variants: { '4': 'mercaderesBarbaros4', '6': 'mercaderesBarbaros6' } }
    ];

    // ============================================================
    // RENDERIZADO E INTERACTIVIDAD DE LA VISTA PREVIA (SVG)
    // ============================================================
    const RESOURCE_META = {
      wood: { terrain: 'Bosque', icon: '🌲' }, brick: { terrain: 'Colinas', icon: '🧱' },
      sheep: { terrain: 'Pastos', icon: '🐑' }, wheat: { terrain: 'Campos', icon: '🌾' },
      ore: { terrain: 'Montañas', icon: '⛰️' }, desert: { terrain: 'Desierto', icon: '🏜️' },
      gold: { terrain: 'Río Aurífero', icon: '🪙' }, castle: { terrain: 'Castillo', icon: '🏰' },
      lake: { terrain: 'Lago', icon: '🐟' }, lake2: { terrain: 'Lago (4/10)', icon: '🐟' },
      swamp: { terrain: 'Pantano', icon: '🌾' }, oasis: { terrain: 'Oasis', icon: '🌴' },
      quarry: { terrain: 'Cantera Mármol', icon: '⛏️' }, glassworks: { terrain: 'Fábrica Vidrio', icon: '🧪' },
      fog: { terrain: 'Tierra Ignota (Niebla)', icon: '🌫️' },
      water: { terrain: 'Mar', icon: '' }
    };

    const HEX_FILL_HEX = { wood: '#2F5233', brick: '#A6541D', sheep: '#8FAE68', wheat: '#D9A62E', ore: '#6B7280', desert: '#DCC898', gold: '#B8860B', castle: '#6E6875', lake: '#185A74', lake2: '#185A74', swamp: '#5E6B4E', oasis: '#B3984C', quarry: '#8A7E72', glassworks: '#507A7E', fog: '#4A5568', water: '#1B5A70' };
    const HEX_FILL_LIGHT = { wood: '#4A7350', brick: '#C97A3E', sheep: '#ABC989', wheat: '#EFC658', ore: '#9298A2', desert: '#EEDFB8', gold: '#D4AF37', castle: '#8F8894', lake: '#2A7A9E', lake2: '#2A7A9E', swamp: '#7A8C66', oasis: '#CFB56E', quarry: '#A4998E', glassworks: '#6E9BA0', fog: '#718096', water: '#2C7A94' };

    let currentExpansion = 'clasico';
    let currentFamilyIdx = 0;
    let currentPlayerCount = '4';
    let currentFishermenMode = 'none';
    let currentBoard = null;
    let viewState = { panX: 0, panY: 0, zoom: 1, isDragging: false, startX: 0, startY: 0 };
    let activeHeatmap = false;
    let activePipsOverlay = false;
    let activeEditMode = false;
    let selectedHexId = null;
    let swapHexId = null;
    let highlightedTerrain = null;

    function templateHasResource(template, key) {
      if (template.resourceCounts && template.resourceCounts[key]) return true;
      if (template.regionGroups2 && template.regionGroups2.some(rd => rd.resourceCounts && rd.resourceCounts[key])) return true;
      if (template.fixedHexes && Object.values(template.fixedHexes).includes(key)) return true;
      return false;
    }

    function pickPirateWaterHex(hexes, resourceAssignment, template) {
      if (template && template.fixedPirate) {
        const h = hexes.find(hx => hx.q === template.fixedPirate.q && hx.r === template.fixedPirate.r);
        if (h) return h;
        return { ...axialToPixel(template.fixedPirate.q, template.fixedPirate.r), q: template.fixedPirate.q, r: template.fixedPirate.r };
      }
      const waterHexes = hexes.filter(h => resourceAssignment[h.id] === 'water');
      const landHexes = hexes.filter(h => resourceAssignment[h.id] !== 'water');
      if (waterHexes.length === 0 || landHexes.length === 0) return null;
      let best = waterHexes[0], bestMinDist = -1;
      waterHexes.forEach(w => {
        let minDist = Infinity;
        landHexes.forEach(l => { const d = Math.hypot(w.x - l.x, w.y - l.y); if (d < minDist) minDist = d; });
        if (minDist > bestMinDist) { bestMinDist = minDist; best = w; }
      });
      return best;
    }

    function renderBoardSVG(board) {
      const { hexes, resourceAssignment, numberAssignment, ports } = board;
      const xs = hexes.map(h => h.x), ys = hexes.map(h => h.y);
      const margin = SIZE * 2.6;
      const minX = Math.min(...xs) - margin, maxX = Math.max(...xs) + margin;
      const minY = Math.min(...ys) - margin, maxY = Math.max(...ys) + margin;
      const w = maxX - minX, h = maxY - minY;

      let defs = '<defs>';
      Object.keys(HEX_FILL_HEX).forEach(res => {
        defs += `<radialGradient id="grad-${res}" cx="35%" cy="30%" r="75%"><stop offset="0%" stop-color="${HEX_FILL_LIGHT[res]}"/><stop offset="100%" stop-color="${HEX_FILL_HEX[res]}"/></radialGradient>`;
      });
      defs += `<radialGradient id="grad-token" cx="35%" cy="30%" r="75%"><stop offset="0%" stop-color="#FBF3DC"/><stop offset="100%" stop-color="#E7D6A8"/></radialGradient>`;
      defs += `<filter id="hexShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#000" flood-opacity="0.35"/></filter>`;
      defs += `<filter id="glowSelect" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#E0B65A" flood-opacity="0.9"/></filter>`;
      defs += '</defs>';

      let waterSvg = '', hexesSvg = '';
      hexes.forEach(hex => {
        const res = resourceAssignment[hex.id];
        const corners = hexCorners(hex);
        const points = corners.map(c => c.x.toFixed(1) + ',' + c.y.toFixed(1)).join(' ');
        const isSelected = selectedHexId === hex.id || swapHexId === hex.id;
        const isDimmed = highlightedTerrain && highlightedTerrain !== res;

        if (res === 'water') {
          waterSvg += `<polygon points="${points}" fill="url(#grad-water)" stroke="#0A2A35" stroke-width="1" stroke-linejoin="round" opacity="${isDimmed ? .25 : .9}" data-hex-id="${hex.id}"/>`;
          return;
        }

        const num = numberAssignment[hex.id];
        const filterAttr = isSelected ? 'filter="url(#glowSelect)"' : 'filter="url(#hexShadow)"';
        const opacityAttr = isDimmed ? 'opacity="0.25"' : 'opacity="1"';

        hexesSvg += `<g ${filterAttr} ${opacityAttr} class="hex-group" data-hex-id="${hex.id}">`;
        hexesSvg += `<polygon points="${points}" fill="url(#grad-${res})" stroke="${isSelected ? '#E0B65A' : '#1c1712'}" stroke-width="${isSelected ? '3.5' : '2.2'}" stroke-linejoin="round"/>`;

        if (res === 'gold') {
          hexesSvg += `<path d="M ${hex.x - 28},${hex.y - 25} Q ${hex.x},${hex.y + 5} ${hex.x + 28},${hex.y + 25}" stroke="#00B4D8" stroke-width="10" fill="none" opacity="0.85" stroke-linecap="round" pointer-events="none"/>`;
          hexesSvg += `<path d="M ${hex.x - 28},${hex.y - 25} Q ${hex.x},${hex.y + 5} ${hex.x + 28},${hex.y + 25}" stroke="#90E0EF" stroke-width="4" fill="none" opacity="0.95" stroke-linecap="round" pointer-events="none"/>`;
        }

        if (activeHeatmap && num) {
          const p = pipCount(num);
          const heatmapColor = p >= 5 ? 'rgba(230,50,40,0.45)' : p >= 3 ? 'rgba(230,160,30,0.35)' : 'rgba(80,180,220,0.25)';
          hexesSvg += `<polygon points="${points}" fill="${heatmapColor}" pointer-events="none"/>`;
        }

        hexesSvg += `<text x="${hex.x}" y="${hex.y - 16}" text-anchor="middle" font-size="24" style="pointer-events:none">${RESOURCE_META[res].icon}</text>`;
        hexesSvg += `<text x="${hex.x}" y="${hex.y - 1}" text-anchor="middle" font-family="Inter,sans-serif" font-size="8.5" font-weight="700" letter-spacing="0.5" fill="${res === 'gold' ? '#FFF' : '#1c1712'}" opacity="0.9" style="pointer-events:none">${RESOURCE_META[res].terrain}</text>`;

        if (NO_NUMBER_TYPES.has(res)) {
          if (res === 'lake') {
            const lakeNums = [
              { num: 2, ox: -16, oy: 15 },
              { num: 12, ox: 16, oy: 15 },
              { num: 3, ox: -16, oy: 28 },
              { num: 11, ox: 16, oy: 28 }
            ];
            lakeNums.forEach(({ num, ox, oy }) => {
              hexesSvg += `<circle cx="${hex.x + ox}" cy="${hex.y + oy}" r="7.5" fill="#FAF6EC" stroke="#8A7539" stroke-width="1" pointer-events="none"/>`;
              hexesSvg += `<text x="${hex.x + ox}" y="${hex.y + oy + 3.2}" text-anchor="middle" font-family="Inter,sans-serif" font-size="8.5" font-weight="800" fill="#2A2620" pointer-events="none">${num}</text>`;
            });
          } else if (res === 'lake2') {
            const lakeNums = [
              { num: 4, ox: -13, oy: 22 },
              { num: 10, ox: 13, oy: 22 }
            ];
            lakeNums.forEach(({ num, ox, oy }) => {
              hexesSvg += `<circle cx="${hex.x + ox}" cy="${hex.y + oy}" r="8.5" fill="#FAF6EC" stroke="#8A7539" stroke-width="1.1" pointer-events="none"/>`;
              hexesSvg += `<text x="${hex.x + ox}" y="${hex.y + oy + 3.5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="9.5" font-weight="800" fill="#2A2620" pointer-events="none">${num}</text>`;
            });
          }

          if (board.robberHexId === hex.id) {
            hexesSvg += `<g transform="translate(${hex.x},${hex.y + 21})" pointer-events="none">
          <ellipse cx="0" cy="9" rx="12" ry="4" fill="#000" opacity="0.3"/>
          <path d="M0,-13 C7,-13 9,-5 8,3 C11,5 11,10 6,11 L-6,11 C-11,10 -11,5 -8,3 C-9,-5 -7,-13 0,-13 Z" fill="#2A2620" stroke="#000" stroke-width="0.6"/>
          <circle cx="0" cy="-15" r="5.2" fill="#2A2620" stroke="#000" stroke-width="0.6"/>
        </g>`;
          }
        } else {
          const isRed = (num === 6 || num === 8);
          const cy = hex.y + 22;
          hexesSvg += `<circle cx="${hex.x}" cy="${cy}" r="16" fill="url(#grad-token)" stroke="${isRed ? '#9E2B1F' : '#8a7539'}" stroke-width="${isRed ? '2' : '1.3'}" pointer-events="none"/>`;
          hexesSvg += `<text x="${hex.x}" y="${cy + 6.5}" text-anchor="middle" font-family="Inter,sans-serif" font-size="17" font-weight="800" fill="${isRed ? '#9E2B1F' : '#2A2620'}" pointer-events="none">${num}</text>`;
          const pips = pipCount(num);
          const dotSpacing = 4.3, startX = hex.x - (dotSpacing * (pips - 1)) / 2;
          for (let i = 0; i < pips; i++) hexesSvg += `<circle cx="${(startX + i * dotSpacing).toFixed(1)}" cy="${cy + 11.5}" r="1.15" fill="${isRed ? '#9E2B1F' : '#2A2620'}" pointer-events="none"/>`;
        }
        
        if (window.DEBUG_COORDS) {
          hexesSvg += `<text x="${hex.x}" y="${hex.y + 42}" text-anchor="middle" font-size="9" font-family="monospace" fill="#FFD700" style="pointer-events:none">${hex.q},${hex.r}</text>`;
        }
        if (window.DEBUG_REGIONS) {
          const regionColors = { main: '#FF6B6B', islote: '#4ECDC4', water: '#1B5A70', fog: '#718096', land: '#FFD700' };
          const region = Object.entries(board.regionHexIds).find(([k, ids]) => ids.includes(hex.id))?.[0];
          if (region) hexesSvg += `<polygon points="${points}" fill="${regionColors[region]}" opacity="0.35" pointer-events="none"/>`;
        }
        hexesSvg += `</g>`;
      });

      if (board.robberHexId === null && board.template && board.template.fixedRobber) {
        const { x, y } = axialToPixel(board.template.fixedRobber.q, board.template.fixedRobber.r);
        hexesSvg += `<g transform="translate(${x},${y})" pointer-events="none">
          <ellipse cx="0" cy="9" rx="12" ry="4" fill="#000" opacity="0.3"/>
          <path d="M0,-13 C7,-13 9,-5 8,3 C11,5 11,10 6,11 L-6,11 C-11,10 -11,5 -8,3 C-9,-5 -7,-13 0,-13 Z" fill="#2A2620" stroke="#000" stroke-width="0.6"/>
          <circle cx="0" cy="-15" r="5.2" fill="#2A2620" stroke="#000" stroke-width="0.6"/>
        </g>`;
      }

      // Renderizado de Caladeros de Pesca (Los Pescadores de Catán)
      let fisheriesSvg = '';
      if (board.fisheries && board.fisheries.length) {
        board.fisheries.forEach(f => {
          const dist = 32;
          const fx = f.x + f.outX * dist, fy = f.y + f.outY * dist;
          const isRed = (f.num === 6 || f.num === 8);
          const pips = pipCount(f.num);

          if (f.p1 && f.p2 && f.v) {
            fisheriesSvg += `<line x1="${f.p1.x.toFixed(1)}" y1="${f.p1.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
            fisheriesSvg += `<line x1="${f.v.x.toFixed(1)}" y1="${f.v.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
            fisheriesSvg += `<line x1="${f.p2.x.toFixed(1)}" y1="${f.p2.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
          }

          fisheriesSvg += `<g transform="translate(${fx.toFixed(1)},${fy.toFixed(1)})" pointer-events="none">
            <rect x="-18" y="-18" width="36" height="36" rx="8" fill="#185A74" stroke="#DCE7EA" stroke-width="1.5" filter="url(#hexShadow)"/>
            <text x="0" y="-4" text-anchor="middle" font-size="12">🐟</text>
            <circle cx="0" cy="8" r="9.5" fill="#FAF6EC" stroke="${isRed ? '#9E2B1F' : '#8A7539'}" stroke-width="1.2"/>
            <text x="0" y="12" text-anchor="middle" font-family="Inter,sans-serif" font-size="10.5" font-weight="800" fill="${isRed ? '#9E2B1F' : '#2A2620'}">${f.num}</text>
          </g>`;
        });
      }

      // Renderizado de Puertos con Muelles Dobles
      let portsSvg = '';
      const PORT_ICONS = { generic: '⚓', wood: '🌲', brick: '🧱', sheep: '🐑', wheat: '🌾', ore: '⛰️' };
      ports.forEach(p => {
        const dist = 34;
        const bx = p.x + p.outX * dist, by = p.y + p.outY * dist;
        const fillColor = p.type === 'generic' ? '#C0912E' : HEX_FILL_HEX[p.type];
        if (p.p1 && p.p2) {
          portsSvg += `<line x1="${p.p1.x.toFixed(1)}" y1="${p.p1.y.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#E0B65A" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>`;
          portsSvg += `<line x1="${p.p2.x.toFixed(1)}" y1="${p.p2.y.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="#E0B65A" stroke-width="2.2" stroke-linecap="round" opacity="0.85"/>`;
        }
        portsSvg += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="16" fill="${fillColor}" stroke="#1c1712" stroke-width="1.6" filter="url(#hexShadow)"/>`;
        portsSvg += `<text x="${bx.toFixed(1)}" y="${(by - 3).toFixed(1)}" text-anchor="middle" font-size="13">${PORT_ICONS[p.type]}</text>`;
        portsSvg += `<text x="${bx.toFixed(1)}" y="${(by + 10).toFixed(1)}" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="800" fill="#1c1712">${p.type === 'generic' ? '3:1' : '2:1'}</text>`;
      });

      // Renderizado del Ladrón / Pirata
      let pirateSvg = '';
      if (board.template.seafarers) {
        const pirateHex = pickPirateWaterHex(hexes, resourceAssignment, board.template);
        const cx = pirateHex ? pirateHex.x : hexes.reduce((a, h) => a + h.x, 0) / hexes.length;
        const cy = pirateHex ? pirateHex.y : hexes.reduce((a, h) => a + h.y, 0) / hexes.length;
        pirateSvg = `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})" pointer-events="none">
      <ellipse cx="0" cy="7" rx="16" ry="3.2" fill="#000" opacity="0.3"/>
      <path d="M-14,4 L14,4 L9,11 L-9,11 Z" fill="#2A2620" stroke="#000" stroke-width="0.6"/>
      <line x1="0" y1="4" x2="0" y2="-14" stroke="#2A2620" stroke-width="1.6"/>
      <path d="M0,-13 L11,-3 L0,-3 Z" fill="#9E2B1F" stroke="#000" stroke-width="0.5"/>
      <text x="0" y="23" text-anchor="middle" font-family="Inter,sans-serif" font-size="8" font-weight="700" fill="#DCE7EA">PIRATA</text>
    </g>`;
      }

      // Pips Overlay en Vértices / Intersecciones
      let pipsOverlaySvg = '';
      if (activePipsOverlay) {
        const vertexMap = new Map();
        hexes.forEach(h => {
          if (resourceAssignment[h.id] === 'water') return;
          hexCorners(h).forEach(c => {
            const k = roundPt(c);
            if (!vertexMap.has(k)) vertexMap.set(k, { pt: c, hexIds: [] });
            vertexMap.get(k).hexIds.push(h.id);
          });
        });
        vertexMap.forEach(v => {
          let sumPips = 0;
          v.hexIds.forEach(id => {
            const num = numberAssignment[id];
            if (num) sumPips += pipCount(num);
          });
          if (sumPips > 0) {
            const color = sumPips >= 11 ? '#9E2B1F' : sumPips >= 8 ? '#C0912E' : '#2A2620';
            pipsOverlaySvg += `<circle cx="${v.pt.x.toFixed(1)}" cy="${v.pt.y.toFixed(1)}" r="10" fill="#FBF3DC" stroke="${color}" stroke-width="1.5" pointer-events="none"/>`;
            pipsOverlaySvg += `<text x="${v.pt.x.toFixed(1)}" y="${(v.pt.y + 3.5).toFixed(1)}" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" font-weight="800" fill="${color}" pointer-events="none">${sumPips}</text>`;
          }
        });
      }

      return `<svg id="catanSvg" viewBox="${minX} ${minY} ${w} ${h}" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    <g id="viewportGroup" transform="translate(${viewState.panX},${viewState.panY}) scale(${viewState.zoom})">
      <rect x="${minX - 500}" y="${minY - 500}" width="${w + 1000}" height="${h + 1000}" fill="#0d3542"/>
      ${waterSvg}${portsSvg}${fisheriesSvg}${hexesSvg}${pirateSvg}${pipsOverlaySvg}
    </g>
  </svg>`;
    }

    // ============================================================
    // INTERFAZ DE VISTA PREVIA INTERACTIVA (Zoom Delimitado 1.05x–1.75x)
    // ============================================================
    const ZOOM_MIN = 0.85;
    const ZOOM_MAX = 1.75;
    function clampZoom(z) { return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z)); }

    function setupInteractiveControls() {
      const viewport = document.getElementById('svgViewport');
      const tooltip = document.getElementById('hexTooltip');

      // Pointer Events: un mismo código para ratón, lápiz y pantallas táctiles.
      // 1 dedo/ratón = arrastrar · 2 dedos = pellizcar para hacer zoom.
      const activePointers = new Map();
      let pinchStartDist = 0;
      let pinchStartZoom = 1;

      function beginDrag(x, y) {
        viewState.isDragging = true;
        viewState.startX = x - viewState.panX;
        viewState.startY = y - viewState.panY;
      }

      function pointerDistance() {
        const [a, b] = [...activePointers.values()];
        return Math.hypot(a.x - b.x, a.y - b.y);
      }

      viewport.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size === 1) {
          if (e.target.closest('.hex-group') && activeEditMode) return;
          beginDrag(e.clientX, e.clientY);
        } else if (activePointers.size === 2) {
          viewState.isDragging = false;
          pinchStartDist = pointerDistance();
          pinchStartZoom = viewState.zoom;
          tooltip.style.display = 'none';
        }
      });

      window.addEventListener('pointermove', (e) => {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activePointers.size >= 2 && pinchStartDist > 0) {
          viewState.zoom = clampZoom(pinchStartZoom * (pointerDistance() / pinchStartDist));
          updateViewportTransform();
        } else if (viewState.isDragging) {
          viewState.panX = e.clientX - viewState.startX;
          viewState.panY = e.clientY - viewState.startY;
          updateViewportTransform();
        }
      });

      function endPointer(e) {
        if (!activePointers.has(e.pointerId)) return;
        activePointers.delete(e.pointerId);
        if (activePointers.size === 1) {
          // Al soltar un dedo del pellizco, se continúa arrastrando con el otro sin saltos.
          pinchStartDist = 0;
          const p = [...activePointers.values()][0];
          beginDrag(p.x, p.y);
        } else if (activePointers.size === 0) {
          pinchStartDist = 0;
          viewState.isDragging = false;
        }
      }
      window.addEventListener('pointerup', endPointer);
      window.addEventListener('pointercancel', endPointer);

      // RANGO DE ZOOM ESTRICTAMENTE DELIMITADO (0.82x a 1.75x)
      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        viewState.zoom = clampZoom(viewState.zoom * zoomFactor);
        updateViewportTransform();
      }, { passive: false });

      // Hover & Tooltip
      viewport.addEventListener('mousemove', (e) => {
        const hexGroup = e.target.closest('[data-hex-id]');
        if (hexGroup && currentBoard) {
          const hexId = parseInt(hexGroup.dataset.hexId, 10);
          const hex = currentBoard.hexes[hexId];
          const res = currentBoard.resourceAssignment[hexId];
          const num = currentBoard.numberAssignment[hexId];
          const isRobber = currentBoard.robberHexId === hexId;

          const pips = num ? pipCount(num) : 0;
          let html = `<b>${RESOURCE_META[res].icon} ${RESOURCE_META[res].terrain}</b><br>`;
          if (num) html += `Ficha: <b>${num}</b> (${pips} pips)<br>`;
          if (isRobber) html += `🥷 <b>El Ladrón está aquí</b><br>`;
          html += `<span style="font-size:10px;opacity:.7">Axial: (${hex.q}, ${hex.r})</span>`;

          tooltip.innerHTML = html;
          tooltip.style.display = 'block';
          const rect = viewport.getBoundingClientRect();
          tooltip.style.left = (e.clientX - rect.left + 15) + 'px';
          tooltip.style.top = (e.clientY - rect.top + 15) + 'px';
        } else {
          tooltip.style.display = 'none';
        }
      });

      viewport.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

      viewport.addEventListener('click', (e) => {
        const hexGroup = e.target.closest('[data-hex-id]');
        if (!hexGroup || !currentBoard) return;
        const hexId = parseInt(hexGroup.dataset.hexId, 10);

        if (swapHexId !== null && swapHexId !== hexId) {
          const r1 = currentBoard.resourceAssignment[swapHexId];
          const n1 = currentBoard.numberAssignment[swapHexId];
          currentBoard.resourceAssignment[swapHexId] = currentBoard.resourceAssignment[hexId];
          currentBoard.numberAssignment[swapHexId] = currentBoard.numberAssignment[hexId];
          currentBoard.resourceAssignment[hexId] = r1;
          currentBoard.numberAssignment[hexId] = n1;

          swapHexId = null;
          selectedHexId = null;
          renderCurrentBoard();
          return;
        }

        if (activeEditMode) {
          selectedHexId = hexId;
          openEditModal(hexId);
          renderCurrentBoard();
        }
      });

      document.getElementById('btnZoomIn').addEventListener('click', () => { viewState.zoom = clampZoom(viewState.zoom * 1.15); updateViewportTransform(); });
      document.getElementById('btnZoomOut').addEventListener('click', () => { viewState.zoom = clampZoom(viewState.zoom * 0.85); updateViewportTransform(); });
      document.getElementById('btnResetView').addEventListener('click', () => { viewState.zoom = 1; viewState.panX = 0; viewState.panY = 0; updateViewportTransform(); });

      document.getElementById('btnToggleHeatmap').addEventListener('click', (e) => {
        activeHeatmap = !activeHeatmap;
        e.target.classList.toggle('active', activeHeatmap);
        renderCurrentBoard();
      });

      document.getElementById('btnTogglePips').addEventListener('click', (e) => {
        activePipsOverlay = !activePipsOverlay;
        e.target.classList.toggle('active', activePipsOverlay);
        renderCurrentBoard();
      });

      document.getElementById('btnToggleEdit').addEventListener('click', (e) => {
        activeEditMode = !activeEditMode;
        e.target.classList.toggle('active', activeEditMode);
        if (!activeEditMode) { selectedHexId = null; closeEditModal(); }
        renderCurrentBoard();
      });
    }

    function updateViewportTransform() {
      const g = document.getElementById('viewportGroup');
      if (g) g.setAttribute('transform', `translate(${viewState.panX},${viewState.panY}) scale(${viewState.zoom})`);
    }

    function openEditModal(hexId) {
      const modal = document.getElementById('editModal');
      const terrainGrid = document.getElementById('terrainEditGrid');
      const numberGrid = document.getElementById('numberEditGrid');

      const terrains = ['wood', 'brick', 'sheep', 'wheat', 'ore', 'desert', 'gold', 'lake', 'swamp', 'oasis', 'quarry', 'glassworks', 'castle', 'water'];
      terrainGrid.innerHTML = terrains.map(t => `<button data-edit-res="${t}">${RESOURCE_META[t].icon} ${RESOURCE_META[t].terrain}</button>`).join('');

      const numbers = [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, null];
      numberGrid.innerHTML = numbers.map(n => `<button data-edit-num="${n === null ? 'none' : n}">${n === null ? 'Sin n°' : n}</button>`).join('');

      modal.style.display = 'block';

      terrainGrid.querySelectorAll('[data-edit-res]').forEach(btn => {
        btn.addEventListener('click', () => {
          currentBoard.resourceAssignment[hexId] = btn.dataset.editRes;
          renderCurrentBoard();
        });
      });

      numberGrid.querySelectorAll('[data-edit-num]').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.dataset.editNum;
          currentBoard.numberAssignment[hexId] = val === 'none' ? null : parseInt(val, 10);
          renderCurrentBoard();
        });
      });

      document.getElementById('btnMoveRobber').onclick = () => {
        currentBoard.robberHexId = hexId;
        renderCurrentBoard();
      };

      document.getElementById('btnStartSwap').onclick = () => {
        swapHexId = hexId;
        closeEditModal();
        renderCurrentBoard();
      };
    }

    function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }
    document.getElementById('btnCloseEditModal').addEventListener('click', closeEditModal);

    function renderCurrentBoard() {
      if (!currentBoard) return;
      document.getElementById('svgViewport').innerHTML = renderBoardSVG(currentBoard);
    }

    // ============================================================
    // UI LOGIC & CONTROLES
    // ============================================================
    function currentTemplateId() {
      const fam = FAMILIES[currentFamilyIdx];
      return fam.variants[currentPlayerCount] || fam.variants['4'] || Object.values(fam.variants)[0];
    }

    function renderExpansionSeg() {
      const el = document.getElementById('expansionSeg');
      if (!el) return;
      // La visibilidad de fishermenModuleContainer se maneja en renderFishermenSeg
      el.innerHTML = EXPANSIONS.map(exp => `
        <button data-exp="${exp.id}" class="${currentExpansion === exp.id ? 'active' : ''}">
          <div>
            <span>${exp.label}</span>
            <span class="exp-desc">${exp.desc}</span>
          </div>
        </button>
      `).join('');

      el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          if (currentExpansion === btn.dataset.exp) return;
          currentExpansion = btn.dataset.exp;
          const firstIdx = FAMILIES.findIndex(f => f.expansion === currentExpansion);
          if (firstIdx !== -1) {
            currentFamilyIdx = firstIdx;
          }
          renderExpansionSeg();
          renderFamilySeg();
          renderPlayerCountSeg();
          renderFishermenSeg();
          doGenerate();
        });
      });
    }

    function renderFamilySeg() {
      const el = document.getElementById('familySeg');
      if (!el) return;
      const filtered = FAMILIES.map((f, idx) => ({ ...f, globalIdx: idx })).filter(f => f.expansion === currentExpansion);

      el.innerHTML = filtered.map(f => `
        <button data-idx="${f.globalIdx}" class="${currentFamilyIdx === f.globalIdx ? 'active' : ''}">
          ${f.label}
          <span style="font-weight:400;opacity:.7;display:block;font-size:10.5px;margin-top:1px;">${f.sublabel}</span>
        </button>
      `).join('');

      el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          currentFamilyIdx = parseInt(btn.dataset.idx, 10);
          renderFamilySeg();
          renderPlayerCountSeg();
          renderFishermenSeg();
          doGenerate();
        });
      });
    }

    function renderFishermenSeg() {
      const el = document.getElementById('fishermenSeg');
      if (!el) return;
      
      const fishContainer = document.getElementById('fishermenModuleContainer');
      const fam = FAMILIES[currentFamilyIdx];
      const isClasico = currentExpansion === 'clasico';
      const isPescadores = fam && fam.id === 'pescadores';

      if (fishContainer) {
        fishContainer.style.display = (isClasico || isPescadores) ? 'none' : 'block';
      }

      if (isClasico) {
        currentFishermenMode = 'none';
      } else if (isPescadores) {
        currentFishermenMode = 'full';
      }

      const modes = [
        { id: 'none', label: '⚪ Desactivado' },
        { id: 'full', label: '🐟 Lagos y Caladeros' },
        { id: 'fisheries_only', label: '🎣 Solo Caladeros' },
        { id: 'lakes_only', label: '🌊 Solo Lagos' }
      ];
      el.innerHTML = modes.map(m => `
        <button data-mode="${m.id}" class="${currentFishermenMode === m.id ? 'active' : ''}">
          ${m.label}
        </button>
      `).join('');

      el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          currentFishermenMode = btn.dataset.mode;
          renderFishermenSeg();
          doGenerate();
        });
      });
    }

    function renderPlayerCountSeg() {
      const fam = FAMILIES[currentFamilyIdx];
      const el = document.getElementById('playerCountSeg');
      if (!fam.variants[currentPlayerCount]) {
        currentPlayerCount = fam.variants['4'] ? '4' : Object.keys(fam.variants)[0];
      }
      el.innerHTML = `
        <button data-pc="3" class="${currentPlayerCount === '3' ? 'active' : ''}" ${!fam.variants['3'] ? 'disabled' : ''}>3 jugadores</button>
        <button data-pc="4" class="${currentPlayerCount === '4' ? 'active' : ''}" ${!fam.variants['4'] ? 'disabled' : ''}>4 jugadores</button>
        <button data-pc="6" class="${currentPlayerCount === '6' ? 'active' : ''}" ${!fam.variants['6'] ? 'disabled' : ''}>5–6 jugadores</button>
      `;
      el.querySelectorAll('button:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => { currentPlayerCount = btn.dataset.pc; renderPlayerCountSeg(); doGenerate(); });
      });

      const noteBox = document.getElementById('scenarioNote');
      const tpl = BOARD_TEMPLATES[currentTemplateId()];
      if (tpl && tpl.rulesNote) {
        noteBox.style.display = 'block';
        noteBox.innerHTML = '<b style="color:var(--ink)">📜 Notas del escenario:</b> ' + tpl.rulesNote;
      } else {
        noteBox.style.display = 'none';
      }
    }

    function getOpts() {
      return {
        noSameAdjacent: document.getElementById('optNoSameAdjacent').checked,
        noRedAdjacent: document.getElementById('optNoRedAdjacent').checked,
        noSameNumberAdjacent: document.getElementById('optNoSameNumber').checked,
        noSameResourceNumber: document.getElementById('optNoSameResourceNumber').checked,
        noTwoTwelveAdjacent: document.getElementById('optNoTwoTwelveAdjacent').checked,
        pipBalance: document.getElementById('optPipBalance').checked,
        randomPorts: document.getElementById('optRandomPorts') ? document.getElementById('optRandomPorts').checked : true,
        
        fishermenMode: currentFishermenMode,
        pipAttempts: 30
      };
    }

    function qualityBadge(score, hasWater) {
      const good = hasWater ? 6 : 4, mid = hasWater ? 10 : 7;
      if (score < good) return '<span class="badge good">Excelente</span>';
      if (score < mid) return '<span class="badge mid">Buena</span>';
      return '<span class="badge low">Irregular</span>';
    }

    function computeRobberHexId(board) {
      if (board.template.noRobber) return null;
      if (board.template.autoFishermen === 'full' && board.fisheries && board.fisheries.length > 0) {
        // En Pescadores de Catán (puro), el ladrón empieza fuera del tablero
        return null;
      }
      if (board.template.fixedRobber) {
        const h = board.hexes.find(hx => hx.q === board.template.fixedRobber.q && hx.r === board.template.fixedRobber.r);
        if (h) return h.id;
        return null;
      }
      const deserts = board.hexes.filter(h => board.resourceAssignment[h.id] === 'desert');
      if (deserts.length) return deserts[0].id;
      const twelve = board.hexes.find(h => board.numberAssignment[h.id] === 12);
      return twelve ? twelve.id : null;
    }

    function countConnectedGroups(hexIds, adjacency) {
      const idSet = new Set(hexIds);
      const visited = new Set();
      let groups = 0;
      hexIds.forEach(id => {
        if (visited.has(id)) return;
        groups++;
        const stack = [id]; visited.add(id);
        while (stack.length) {
          const cur = stack.pop();
          adjacency[cur].forEach(nb => { if (idSet.has(nb) && !visited.has(nb)) { visited.add(nb); stack.push(nb); } });
        }
      });
      return groups;
    }

    function doGenerate(customSeed) {
      const opts = getOpts();
      const tplId = currentTemplateId();
      const seed = customSeed || generateRandomSeed();
      document.getElementById('seedInput').value = seed;

      let board;
      try { board = generateBoard(tplId, opts, seed); }
      catch (e) { 
        document.getElementById('statsBox').innerHTML = '⚠️ ' + (escapeHtml(e.message) || 'No se pudo generar un tablero válido.'); 
        return; 
      }

      board.robberHexId = computeRobberHexId(board);
      board.templateId = tplId;
      board.opts = opts;
      currentBoard = board;

      renderCurrentBoard();

      const deserts = board.hexes.filter(h => board.resourceAssignment[h.id] === 'desert').length;
      const castles = board.hexes.filter(h => board.resourceAssignment[h.id] === 'castle').length;
      const fogs = board.hexes.filter(h => board.resourceAssignment[h.id] === 'fog').length;
      const lakes = board.hexes.filter(h => board.resourceAssignment[h.id] === 'lake' || board.resourceAssignment[h.id] === 'lake2').length;
      const waterCount = board.hexes.filter(h => board.resourceAssignment[h.id] === 'water').length;
      const landHexes = board.hexes.length - waterCount - fogs;
      const totalNumbers = landHexes - deserts - castles - lakes;
      const scoreDisplay = opts.pipBalance ? qualityBadge(board.pipScore, waterCount > 0) : '<span class="badge mid">No evaluado</span>';

      let islandLine = '';
      if (board.template.family === 'islas') {
        const landHexesList = board.hexes.filter(h => board.resourceAssignment[h.id] && board.resourceAssignment[h.id] !== 'water');
        const landIds = new Set(landHexesList.map(h => h.id));
        const visited = new Set();
        const sizes = [];

        landHexesList.forEach(h => {
          if (visited.has(h.id)) return;
          let sz = 0;
          const q = [h.id]; visited.add(h.id);
          while (q.length) {
            const curr = q.shift(); sz++;
            (board.adjacency[curr] || []).forEach(nid => {
              if (landIds.has(nid) && !visited.has(nid)) {
                visited.add(nid); q.push(nid);
              }
            });
          }
          sizes.push(sz);
        });

        let varStr = '';
        if (board.selectedVariant && board.selectedVariant.variantName) {
          varStr = ` (${board.selectedVariant.variantName}: tamaños ${sizes.join(' / ')})`;
        } else if (sizes.length) {
          varStr = ` (tamaños ${sizes.join(' / ')})`;
        }

        islandLine = `${sizes.length} islas separadas por mar${varStr} · `;
      } else if (board.template.family === 'rumbo') {
        const n = board.regionHexIds.islote ? countConnectedGroups(board.regionHexIds.islote, board.adjacency) : 0;
        islandLine = `Isla principal + ${n} islote${n === 1 ? '' : 's'} · `;
      } else if (board.template.family === 'oceania') {
        islandLine = `2 islas principales + ${fogs} niebla (tierra ignota) · `;
      }

      const fogLine = fogs > 0 ? ` · ${fogs} niebla (tierra ignota)` : '';
      const waterLine = waterCount > 0 ? ` · ${waterCount} hex. de mar` : '';
      const fishLine = (board.fisheries && board.fisheries.length > 0) ? ` · ${board.fisheries.length} caladeros 🐟` : '';
      const targetVpBadge = `<span class="badge" style="background:rgba(224,182,90,.3);color:var(--brass-dark);font-weight:700;margin-left:4px;" title="Meta de Puntos de Victoria">🎯 Meta: ${board.template.targetVp || 10} PV</span>`;
      
      const expectedPorts = Object.values(board.template.ports).reduce((a, b) => a + b, 0);
      const portsShortfall = expectedPorts - board.ports.length;

      let warningsHtml = '';
      if (portsShortfall > 0) {
        warningsHtml += ` <span class="badge low" title="Algunas aristas no eran válidas para colocar puertos">⚠ ${board.ports.length}/${expectedPorts} puertos</span>`;
      }
      if (board.ports && board.ports._relaxLevel > 0) {
        warningsHtml += ` <span class="badge mid" title="Algunos puertos se colocaron relajando la separación visual para no perder ninguno">⚠ Puertos con separación reducida</span>`;
      }
      if (board.relaxed) warningsHtml += ' <span class="badge low">⚠ Restricciones relajadas</span>';
      if (board.template.approximate) {
        warningsHtml += ' <span class="badge low">⚠ Diseño aproximado, no es el mapa oficial</span>';
      }

      document.getElementById('statsBox').innerHTML =
        `<b>${board.template.label}</b> ${targetVpBadge}${warningsHtml}<br>${islandLine}${landHexes} hexágonos de tierra${fogLine}${waterLine}${fishLine} · ${totalNumbers} fichas numéricas · ${board.ports.length} puertos<br>Equilibrio: ${scoreDisplay} · Semilla: <code>${seed}</code>`;

      renderLegend(board);
    }

    function renderLegend(board) {
      const template = board ? board.template : BOARD_TEMPLATES[currentTemplateId()];
      const items = [['wood', 'Bosque'], ['brick', 'Colinas'], ['sheep', 'Pastos'], ['wheat', 'Campos'], ['ore', 'Montañas']];
      if (templateHasResource(template, 'desert') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'desert'))) items.push(['desert', 'Desierto']);
      if (templateHasResource(template, 'gold') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'gold'))) items.push(['gold', 'Río Aurífero (río azul en fondo dorado)']);
      if (templateHasResource(template, 'castle') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'castle'))) items.push(['castle', 'Castillo']);
      if (templateHasResource(template, 'lake') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'lake' || board.resourceAssignment[h.id] === 'lake2'))) items.push(['lake', 'Lago de Pesca']);
      if (templateHasResource(template, 'swamp') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'swamp'))) items.push(['swamp', 'Pantano']);
      if (templateHasResource(template, 'oasis') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'oasis'))) items.push(['oasis', 'Oasis']);
      if (templateHasResource(template, 'quarry') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'quarry'))) items.push(['quarry', 'Cantera Mármol']);
      if (templateHasResource(template, 'glassworks') || (board && board.hexes.some(h => board.resourceAssignment[h.id] === 'glassworks'))) items.push(['glassworks', 'Fábrica Vidrio']);
      if (template.family === 'oceania' || template.fogCells || templateHasResource(template, 'fog')) items.push(['fog', 'Tierra Ignota (Niebla)']);
      if (template.proceduralIslands || template.islands || template.waterInPool || template.proceduralFixedSizeIslands || template.officialArcLayout) items.push(['water', 'Mar']);

      let html = items.map(([k, label]) => `<div class="legend-item" data-terrain="${k}"><span class="legend-swatch" style="background:${HEX_FILL_HEX[k]}"></span>${label}</div>`).join('');
      html += `<div class="legend-item">⚓ Puerto genérico 3:1</div><div class="legend-item">🎯 Puerto específico 2:1</div>`;
      if (board && board.fisheries && board.fisheries.length > 0) {
        html += `<div class="legend-item">🐟 Caladero de pesca</div>`;
      }

      const legendEl = document.getElementById('legend');
      legendEl.innerHTML = html;

      legendEl.querySelectorAll('[data-terrain]').forEach(item => {
        item.addEventListener('click', () => {
          const terrain = item.dataset.terrain;
          if (highlightedTerrain === terrain) {
            highlightedTerrain = null;
            legendEl.querySelectorAll('[data-terrain]').forEach(i => i.classList.remove('dimmed'));
          } else {
            highlightedTerrain = terrain;
            legendEl.querySelectorAll('[data-terrain]').forEach(i => i.classList.toggle('dimmed', i.dataset.terrain !== terrain));
          }
          renderCurrentBoard();
        });
      });
    }

    document.getElementById('btnGenerate').addEventListener('click', () => {
      const newSeed = generateRandomSeed();
      document.getElementById('seedInput').value = newSeed;
      doGenerate(newSeed);
    });

    document.getElementById('btnApplySeed').addEventListener('click', () => {
      const s = document.getElementById('seedInput').value.trim();
      if (!s) return;
      doGenerate(s);
      const v = parseSeedVersion(s);
      if (v && v !== GENERATOR_VERSION) {
        showToast(`⚠️ Esta semilla se creó con la versión ${v} del generador (actual: ${GENERATOR_VERSION}). El mapa puede no ser idéntico al original.`, 'warn', 8000);
      }
    });

    document.getElementById('btnDownload').addEventListener('click', () => {
      const svgEl = document.getElementById('catanSvg');
      if (!svgEl) return;
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = 1600; canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#0d3542'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          const link = document.createElement('a');
          link.download = `mapa-catan-${currentBoard?.seed || 'custom'}.png`;
          link.href = URL.createObjectURL(blob);
          link.click();
        });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });

    document.getElementById('btnRegisterFromSeed')?.addEventListener('click', () => {
      const seed = document.getElementById('seedInput').value.trim() || currentBoard?.seed || '';
      const tplId = currentTemplateId();
      const tpl = BOARD_TEMPLATES[tplId];

      document.querySelectorAll('#topTabs button').forEach(b => b.classList.remove('active'));
      const statsTabBtn = document.querySelector('#topTabs button[data-tab="stats"]');
      if (statsTabBtn) statsTabBtn.classList.add('active');
      document.getElementById('view-mapgen').style.display = 'none';
      document.getElementById('view-stats').style.display = '';

      pendingBoardSnapshot = makeBoardSnapshot(currentBoard, seed);
      editingGameId = null;
      switchStatsSub('newgame');

      if (tplId) {
        const boardEl = document.getElementById('ngBoard');
        if (boardEl) boardEl.value = tplId;
      }
      if (seed) {
        const seedEl = document.getElementById('ngSeed');
        if (seedEl) seedEl.value = seed;
      }

      const expEl = document.getElementById('ngExpansion');
      if (expEl) {
                const fam = FAMILIES.find(f => f.id === tpl?.family);
        if (fam && fam.expansion) {
          expEl.value = fam.expansion;
        } else {
          expEl.value = 'Catán Estándar';
        }
        expEl.dispatchEvent(new Event('change'));
      }

      const vpInput = document.getElementById('ngTargetVp');
      if (vpInput) {
        vpInput._userCustomized = false;
        vpInput.value = getEffectiveTargetVp(tplId, expEl ? expEl.value : 'Catán Estándar');
        const badge = document.getElementById('targetVpBadge');
        if (badge) badge.textContent = `Oficial (${vpInput.value} PV)`;
      }
    });

    ['optNoSameAdjacent', 'optNoRedAdjacent', 'optNoSameNumber', 'optNoSameResourceNumber', 'optNoTwoTwelveAdjacent', 'optPipBalance'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => doGenerate());
    });

    document.querySelectorAll('#topTabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#topTabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('view-mapgen').style.display = tab === 'mapgen' ? '' : 'none';
        document.getElementById('view-stats').style.display = tab === 'stats' ? '' : 'none';
      });
    });

    // ============================================================
    // SISTEMA DE JUGADORES / GRUPOS / PARTIDAS (CÁLCULO AUTOMÁTICO DE GRAN EJÉRCITO & EXPANSIONES)
    // ============================================================
    const PLAYER_COLORS = ['#B33A3A', '#2E5C8A', '#E8DCC0', '#D97B29', '#3E7A45', '#6B4226', '#7A4B8A', '#33323A'];
    let players = [], groups = [], games = [];
    let editingGameId = null;
    let editingPlayerId = null;
    let editingGroupId = null;

    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

    function wireConfirmDelete(btn, onConfirm) {
      let armed = false;
      let timer = null;
      const original = btn.innerHTML;
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!armed) {
          armed = true;
          btn.innerHTML = '¿Seguro?';
          btn.classList.add('btn-icon-confirm');
          timer = setTimeout(() => { armed = false; btn.innerHTML = original; btn.classList.remove('btn-icon-confirm'); }, 3000);
          return;
        }
        clearTimeout(timer);
        await onConfirm();
      });
    }

    function showInlineMessage(containerId, text) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.textContent = text;
      el.style.display = 'block';
      clearTimeout(el._hideTimer);
      el._hideTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
    function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

    // ============================================================
    // PERSISTENCIA, AVISOS, MIGRACIONES Y RESPALDO
    // ============================================================
    // Versión del esquema de datos guardados. Súbela y amplía migrateGame() cuando
    // se añadan o cambien campos de las partidas.
    const SCHEMA_VERSION = 2;
    let lastBackup = null;            // { date, gameIds }
    let pendingBoardSnapshot = null;  // mapa capturado al pulsar "Registrar partida con este mapa"

    function showToast(text, type = 'info', ms = 4500) {
      const host = document.getElementById('toastHost');
      if (!host) { console.warn(text); return; }
      const el = document.createElement('div');
      el.className = `toast toast-${type}`;
      el.setAttribute('role', type === 'error' ? 'alert' : 'status');
      el.textContent = text;
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        el.classList.add('toast-out');
        setTimeout(() => el.remove(), 260);
      };
      el.addEventListener('click', close);
      host.appendChild(el);
      setTimeout(close, ms);
    }

    async function loadKey(key, fallback) {
      try {
        if (window.storage && window.storage.get) {
          const r = await window.storage.get(key, false);
          return r ? JSON.parse(r.value) : fallback;
        }
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : fallback;
      } catch (e) { return fallback; }
    }

    /** Guarda un valor. Devuelve true/false y avisa visiblemente si falla (salvo { silent: true }). */
    async function saveKey(key, val, { silent = false } = {}) {
      try {
        if (window.storage && window.storage.set) {
          await window.storage.set(key, JSON.stringify(val), false);
        } else {
          localStorage.setItem(key, JSON.stringify(val));
        }
        return true;
      } catch (e) {
        console.error('Error guardando ' + key, e);
        if (!silent) {
          const quota = e && (e.name === 'QuotaExceededError' || e.code === 22);
          showToast(quota
            ? '⚠️ El almacenamiento del navegador está lleno y no se pudo guardar. Exporta un respaldo desde 💾 Respaldo.'
            : '⚠️ No se pudieron guardar los cambios. Exporta un respaldo desde 💾 Respaldo para no perder datos.', 'error', 10000);
        }
        return false;
      }
    }

    // ---------- Migraciones de datos ----------
    const ENTRY_NUM_FIELDS = ['points', 'settlements', 'cities', 'metropolis', 'campeador', 'entreAmigos', 'foreignIslands',
      'devCards', 'knights', 'monopolies', 'inventions', 'roadCards', 'vpDev'];
    const ENTRY_BOOL_FIELDS = ['botaVieja', 'merchant', 'imprenta', 'constitucion', 'longestRoad', 'largestArmy', 'portCaptain', 'winner'];

    function toInt(v) {
      if (typeof v === 'boolean') return v ? 1 : 0;
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    }

    function migrateEntry(e) {
      const out = { ...(e || {}) };
      out.playerId = out.playerId || null;
      out.name = out.name || 'Jugador';
      ENTRY_NUM_FIELDS.forEach(f => { out[f] = toInt(out[f]); });
      ENTRY_BOOL_FIELDS.forEach(f => { out[f] = !!out[f]; });
      return out;
    }

    function migrateGame(g) {
      if (!g || typeof g !== 'object') return null;
      const out = { ...g };
      out.id = out.id || uid();
      out.date = out.date || '';
      out.groupId = out.groupId || null;
      out.boardId = out.boardId || null;
      if (out.boardLabel === undefined) out.boardLabel = out.boardId ? (BOARD_TEMPLATES[out.boardId]?.label || null) : null;
      out.expansion = out.expansion || 'Catán Estándar';
      out.entreAmigos = !!out.entreAmigos;
      out.botaVieja = !!out.botaVieja;
      out.portCaptain = !!out.portCaptain;
      out.seed = out.seed || null;
      out.targetVp = toInt(out.targetVp) || getEffectiveTargetVp(out.boardId, out.expansion, out.entreAmigos, out.portCaptain);
      out.entries = Array.isArray(out.entries) ? out.entries.map(migrateEntry) : [];
      out.boardSnapshot = out.boardSnapshot || null;
      out.schemaVersion = SCHEMA_VERSION;
      return out;
    }

    function migratePlayer(p) {
      if (!p || typeof p !== 'object') return null;
      return { ...p, id: p.id || uid(), name: String(p.name || 'Jugador'), color: p.color || PLAYER_COLORS[0] };
    }

    function migrateGroup(g) {
      if (!g || typeof g !== 'object') return null;
      return { ...g, id: g.id || uid(), name: String(g.name || 'Grupo'), playerIds: Array.isArray(g.playerIds) ? g.playerIds : [] };
    }

    function migrateCollection(list, fn) {
      const src = Array.isArray(list) ? list : [];
      let changed = !Array.isArray(list);
      const out = [];
      src.forEach(item => {
        const m = fn(item);
        if (!m) { changed = true; return; }
        if (JSON.stringify(m) !== JSON.stringify(item)) changed = true;
        out.push(m);
      });
      return { out, changed };
    }

    async function loadAllData() {
      const rawPlayers = await loadKey('catan_players', []);
      const rawGroups = await loadKey('catan_groups', []);
      const rawGames = await loadKey('catan_games', []);
      lastBackup = await loadKey('catan_last_backup', null);

      const p = migrateCollection(rawPlayers, migratePlayer);
      const gr = migrateCollection(rawGroups, migrateGroup);
      const ga = migrateCollection(rawGames, migrateGame);
      players = p.out; groups = gr.out; games = ga.out;

      if (p.changed || gr.changed || ga.changed) {
        // Copia de seguridad única de los datos tal como estaban antes de la primera migración.
        const safety = await loadKey('catan_premigration_backup', null);
        if (!safety) {
          await saveKey('catan_premigration_backup', { date: new Date().toISOString(), players: rawPlayers, groups: rawGroups, games: rawGames }, { silent: true });
        }
        if (p.changed) await saveKey('catan_players', players);
        if (gr.changed) await saveKey('catan_groups', groups);
        if (ga.changed) await saveKey('catan_games', games);
      }
    }

    // ---------- Instantánea del mapa de una partida ----------
    const OPT_CHECKBOXES = {
      optNoSameAdjacent: 'noSameAdjacent', optNoRedAdjacent: 'noRedAdjacent', optNoSameNumber: 'noSameNumberAdjacent',
      optNoSameResourceNumber: 'noSameResourceNumber', optNoTwoTwelveAdjacent: 'noTwoTwelveAdjacent',
      optPipBalance: 'pipBalance'
    };

    function makeBoardSnapshot(board, inputSeed) {
      if (!board) return null;
      return {
        v: GENERATOR_VERSION,
        templateId: board.templateId,
        seed: board.seed,
        inputSeed: inputSeed || board.seed,
        opts: board.opts || null,
        res: [...board.resourceAssignment],
        num: [...board.numberAssignment],
        ports: (board.ports || []).map(pt => pt.type),
        robberHexId: board.robberHexId ?? null
      };
    }

    function restoreBoardSnapshot(snap, label) {
      const famIdx = FAMILIES.findIndex(f => Object.values(f.variants).includes(snap.templateId));
      if (famIdx === -1) { showToast('❌ El escenario de esta partida ya no existe en el generador.', 'error'); return; }
      const fam = FAMILIES[famIdx];
      currentExpansion = fam.expansion;
      currentFamilyIdx = famIdx;
      currentPlayerCount = Object.keys(fam.variants).find(k => fam.variants[k] === snap.templateId) || currentPlayerCount;
      if (snap.opts) {
        Object.entries(OPT_CHECKBOXES).forEach(([elId, key]) => {
          const el = document.getElementById(elId);
          if (el && key in snap.opts) el.checked = !!snap.opts[key];
        });
        const tpl = BOARD_TEMPLATES[snap.templateId];
        currentFishermenMode = snap.opts.fishermenMode || (tpl && tpl.autoFishermen ? 'lakes_only' : 'none');
      }
      renderExpansionSeg();
      renderFamilySeg();
      renderPlayerCountSeg();
      renderFishermenSeg();

      document.querySelectorAll('#topTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === 'mapgen'));
      document.getElementById('view-mapgen').style.display = '';
      document.getElementById('view-stats').style.display = 'none';

      doGenerate(snap.seed);
      const title = label ? ` (${label})` : '';
      if (!currentBoard || currentBoard.templateId !== snap.templateId) {
        showToast('❌ No se pudo regenerar el mapa de esta partida.', 'error');
        return;
      }
      if (snap.approx || !Array.isArray(snap.res)) {
        showToast(`🗺️ Mapa regenerado desde la semilla${title}. Si se usaron otras restricciones o se editó a mano, puede diferir.`, 'warn', 7000);
        return;
      }
      if (currentBoard.hexes.length !== snap.res.length) {
        showToast(`⚠️ El generador cambió desde que se registró esta partida${title}; se muestra el mapa regenerado desde la semilla.`, 'warn', 8000);
        return;
      }
      currentBoard.resourceAssignment = [...snap.res];
      currentBoard.numberAssignment = [...snap.num];
      if (Array.isArray(snap.ports) && snap.ports.length === currentBoard.ports.length) {
        currentBoard.ports.forEach((pt, i) => { pt.type = snap.ports[i]; });
      }
      currentBoard.robberHexId = snap.robberHexId;
      renderCurrentBoard();
      renderLegend(currentBoard);
      showToast(`🗺️ Mapa exacto restaurado${title}.`, 'ok');
    }

    // ---------- Exportar / importar respaldo ----------
    function gamesSinceBackup() {
      const ids = new Set(lastBackup?.gameIds || []);
      return games.filter(g => !ids.has(g.id)).length;
    }

    async function exportBackup() {
      const payload = {
        app: 'Generador CATAN', appVersion: '4.5', generatorVersion: GENERATOR_VERSION, schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(), players, groups, games
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const a = document.createElement('a');
      a.download = `catan-respaldo-${stamp}.json`;
      a.href = URL.createObjectURL(blob);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1500);
      lastBackup = { date: payload.exportedAt, gameIds: games.map(g => g.id) };
      await saveKey('catan_last_backup', lastBackup);
      showToast(`✅ Respaldo exportado: ${players.length} jugadores, ${groups.length} grupos y ${games.length} partidas.`, 'ok');
    }

    async function importBackup(file, mode) {
      let data;
      try { data = JSON.parse(await file.text()); }
      catch (e) { showToast('❌ El archivo no es un JSON válido.', 'error'); return; }
      if (!data || !Array.isArray(data.players) || !Array.isArray(data.games)) {
        showToast('❌ El archivo no parece un respaldo del Generador CATAN.', 'error');
        return;
      }
      if (data.schemaVersion && data.schemaVersion > SCHEMA_VERSION) {
        showToast('⚠️ El respaldo viene de una versión más nueva del generador; algunos datos podrían no mostrarse.', 'warn', 8000);
      }
      const inPlayers = migrateCollection(data.players, migratePlayer).out;
      const inGroups = migrateCollection(data.groups || [], migrateGroup).out;
      const inGames = migrateCollection(data.games, migrateGame).out;

      let summary;
      if (mode === 'replace') {
        if (!confirm(`Se reemplazarán TODOS los datos actuales (${players.length} jugadores, ${games.length} partidas) por los del archivo (${inPlayers.length} jugadores, ${inGames.length} partidas). ¿Continuar?`)) return;
        await saveKey('catan_autobackup_before_import', { date: new Date().toISOString(), players, groups, games }, { silent: true });
        players = inPlayers; groups = inGroups; games = inGames;
        summary = `✅ Datos reemplazados: ${players.length} jugadores, ${groups.length} grupos y ${games.length} partidas.`;
      } else {
        // Combinar: los jugadores con el mismo id o el mismo nombre se unifican.
        const idMap = {};
        const newPlayers = [];
        inPlayers.forEach(p => {
          const byId = players.find(x => x.id === p.id);
          const byName = players.find(x => x.name.trim().toLowerCase() === p.name.trim().toLowerCase());
          const match = byId || byName;
          idMap[p.id] = match ? match.id : p.id;
          if (!match) newPlayers.push(p);
        });
        const remap = id => idMap[id] || id;
        const groupIds = new Set(groups.map(g => g.id));
        const newGroups = inGroups.filter(g => !groupIds.has(g.id)).map(g => ({ ...g, playerIds: [...new Set(g.playerIds.map(remap))] }));
        const gameIds = new Set(games.map(g => g.id));
        const newGames = inGames.filter(g => !gameIds.has(g.id)).map(g => ({ ...g, entries: g.entries.map(e => ({ ...e, playerId: remap(e.playerId) })) }));
        players = [...players, ...newPlayers];
        groups = [...groups, ...newGroups];
        games = [...games, ...newGames];
        const skipped = inGames.length - newGames.length;
        summary = `✅ Importado: ${newPlayers.length} jugadores, ${newGroups.length} grupos y ${newGames.length} partidas nuevas` + (skipped ? ` (${skipped} ya existían).` : '.');
      }
      const ok = (await saveKey('catan_players', players)) & (await saveKey('catan_groups', groups)) & (await saveKey('catan_games', games));
      if (ok) showToast(summary, 'ok', 7000);
      renderBackupView();
    }

    function renderBackupView() {
      const el = document.getElementById('sub-backup');
      if (!el) return;
      const since = gamesSinceBackup();
      const last = lastBackup?.date ? new Date(lastBackup.date).toLocaleString('es-MX') : 'Nunca';
      el.innerHTML = `
        <div class="game-card backup-card">
          <h2 class="backup-title">💾 Respaldo de datos</h2>
          <p class="backup-text">Tus jugadores, grupos y partidas se guardan solo en este navegador. Si se borra la caché o cambias de equipo, se pierden. Exporta un respaldo de vez en cuando y guárdalo en la nube o en tu correo.</p>
          <div class="backup-stats">
            <div><b>${players.length}</b><span>Jugadores</span></div>
            <div><b>${groups.length}</b><span>Grupos</span></div>
            <div><b>${games.length}</b><span>Partidas</span></div>
            <div class="${since > 0 ? 'warn' : ''}"><b>${since}</b><span>Sin respaldar</span></div>
          </div>
          <p class="backup-text">Último respaldo: <b>${escapeHtml(last)}</b></p>
          <button class="btn btn-primary" id="btnExportData">⤓ Exportar respaldo (JSON)</button>
        </div>
        <div class="game-card backup-card">
          <h3 class="backup-title">⤒ Importar respaldo</h3>
          <div class="backup-modes">
            <label><input type="radio" name="importMode" value="merge" checked> <span><b>Combinar</b> — añade lo que no exista. Los jugadores con el mismo nombre se unifican.</span></label>
            <label><input type="radio" name="importMode" value="replace"> <span><b>Reemplazar todo</b> — sustituye los datos actuales por los del archivo (se guarda una copia automática antes).</span></label>
          </div>
          <input type="file" id="importFile" accept=".json,application/json" hidden>
          <button class="btn btn-secondary" id="btnImportData">📂 Elegir archivo de respaldo…</button>
        </div>`;
      document.getElementById('btnExportData').addEventListener('click', async () => { await exportBackup(); renderBackupView(); });
      const fileInput = document.getElementById('importFile');
      document.getElementById('btnImportData').addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const mode = el.querySelector('input[name="importMode"]:checked')?.value || 'merge';
        await importBackup(file, mode);
        fileInput.value = '';
      });
    }

    function renderPlayersView() {
      const el = document.getElementById('sub-players');
      const editPlayer = editingPlayerId ? players.find(p => p.id === editingPlayerId) : null;
      if (editingPlayerId && !editPlayer) editingPlayerId = null;

      const editBanner = editPlayer ? `
        <div style="margin-bottom:12px;padding:8px 12px;background:rgba(224,182,90,.18);border:1px solid var(--brass-light);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;color:var(--brass-dark);font-size:13px;">✏️ Editando jugador</span>
          <button id="btnCancelEditPlayer" style="background:rgba(0,0,0,.08);border:none;border-radius:5px;padding:4px 8px;cursor:pointer;font-weight:700;color:var(--ink);font-size:11.5px;">✕ Cancelar</button>
        </div>` : '';

      el.innerHTML = `
    <div class="panel" style="max-width:520px">
      ${editBanner}
      <div class="section-title">${editPlayer ? 'Editar jugador' : 'Añadir jugador'}</div>
      <div class="form-row"><input type="text" id="newPlayerName" placeholder="Nombre del jugador" maxlength="40"></div>
      <div class="section-title" style="margin-top:2px;font-size:11px;">Color</div>
      <div class="color-picker" id="colorPicker" style="margin-bottom:14px"></div>
      <button class="btn btn-primary" id="btnAddPlayer">${editPlayer ? '💾 Guardar cambios' : '+ Añadir jugador'}</button>
    </div>
    <div class="list-cards" id="playersList"></div>`;

      const input = document.getElementById('newPlayerName');
      if (editPlayer) input.value = editPlayer.name;

      let selectedColor = editPlayer ? editPlayer.color : PLAYER_COLORS[0];
      const colorPicker = document.getElementById('colorPicker');
      colorPicker.innerHTML = PLAYER_COLORS.map(c => `<span class="color-dot ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background:${c}"></span>`).join('');

      colorPicker.querySelectorAll('.color-dot').forEach(dot => {
        dot.addEventListener('click', () => {
          colorPicker.querySelectorAll('.color-dot').forEach(d => d.classList.remove('selected'));
          dot.classList.add('selected'); selectedColor = dot.dataset.color;
        });
      });

      if (editPlayer) {
        document.getElementById('btnCancelEditPlayer')?.addEventListener('click', () => {
          editingPlayerId = null;
          renderPlayersView();
        });
      }

      document.getElementById('btnAddPlayer').addEventListener('click', async () => {
        const name = input.value.trim();
        if (!name) return;
        if (editingPlayerId) {
          const idx = players.findIndex(p => p.id === editingPlayerId);
          if (idx !== -1) {
            players[idx].name = name;
            players[idx].color = selectedColor;
          }
          editingPlayerId = null;
        } else {
          players.push({ id: uid(), name, color: selectedColor });
        }
        await saveKey('catan_players', players);
        renderPlayersView();
      });

      const listEl = document.getElementById('playersList');
      if (players.length === 0) { listEl.innerHTML = '<div class="empty-state">Todavía no has añadido jugadores.</div>'; return; }
      listEl.innerHTML = players.map(p => `
    <div class="list-card">
      <span class="color-dot" style="background:${p.color}"></span>
      <span class="list-card-name" style="flex:1">${escapeHtml(p.name)}</span>
      <div style="display:flex;gap:6px;align-items:center;">
        <button class="btn-icon" data-edit-player="${p.id}" title="Editar jugador" style="font-size:13px">✏️</button>
        <button class="btn-icon" data-del-player="${p.id}" title="Eliminar">✕</button>
      </div>
    </div>`).join('');

      listEl.querySelectorAll('[data-edit-player]').forEach(btn => {
        btn.addEventListener('click', () => {
          editingPlayerId = btn.dataset.editPlayer;
          renderPlayersView();
        });
      });

      listEl.querySelectorAll('[data-del-player]').forEach(btn => {
        wireConfirmDelete(btn, async () => {
          if (editingPlayerId === btn.dataset.delPlayer) editingPlayerId = null;
          players = players.filter(p => p.id !== btn.dataset.delPlayer);
          await saveKey('catan_players', players);
          renderPlayersView();
        });
      });
    }

    function renderGroupsView() {
      const el = document.getElementById('sub-groups');
      const editGroup = editingGroupId ? groups.find(g => g.id === editingGroupId) : null;
      if (editingGroupId && !editGroup) editingGroupId = null;

      const editBanner = editGroup ? `
        <div style="margin-bottom:12px;padding:8px 12px;background:rgba(224,182,90,.18);border:1px solid var(--brass-light);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;color:var(--brass-dark);font-size:13px;">✏️ Editando grupo</span>
          <button id="btnCancelEditGroup" style="background:rgba(0,0,0,.08);border:none;border-radius:5px;padding:4px 8px;cursor:pointer;font-weight:700;color:var(--ink);font-size:11.5px;">✕ Cancelar</button>
        </div>` : '';

      const memberOptions = players.length === 0
        ? '<div class="empty-state">Añade jugadores primero.</div>'
        : players.map(p => {
          const checked = editGroup ? editGroup.playerIds.includes(p.id) : false;
          return `<label class="checkbox-row"><input type="checkbox" value="${p.id}" ${checked ? 'checked' : ''}><span class="color-dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</label>`;
        }).join('');

      el.innerHTML = `
    <div class="panel" style="max-width:520px">
      ${editBanner}
      <div class="section-title">${editGroup ? 'Editar grupo' : 'Crear grupo'}</div>
      <input type="text" id="newGroupName" placeholder="Nombre del grupo (ej. Noches de juego)" maxlength="60" style="margin-bottom:12px" value="${editGroup ? escapeHtml(editGroup.name) : ''}">
      <div class="section-title" style="margin-top:2px;font-size:11px;">Miembros</div>
      <div id="groupMembersPicker" class="checkbox-list">${memberOptions}</div>
      <button class="btn btn-primary" id="btnAddGroup" style="margin-top:10px">${editGroup ? '💾 Guardar cambios' : '+ Crear grupo'}</button>
      <div class="inline-message" id="groupFormMsg"></div>
    </div>
    <div class="list-cards" id="groupsList"></div>`;

      if (editGroup) {
        document.getElementById('btnCancelEditGroup')?.addEventListener('click', () => {
          editingGroupId = null;
          renderGroupsView();
        });
      }

      document.getElementById('btnAddGroup').addEventListener('click', async () => {
        const name = document.getElementById('newGroupName').value.trim();
        const checked = [...document.querySelectorAll('#groupMembersPicker input:checked')].map(cb => cb.value);
        if (!name || checked.length === 0) { showInlineMessage('groupFormMsg', 'Ponle un nombre al grupo y selecciona al menos un jugador.'); return; }
        if (editingGroupId) {
          const idx = groups.findIndex(g => g.id === editingGroupId);
          if (idx !== -1) {
            groups[idx].name = name;
            groups[idx].playerIds = checked;
          }
          editingGroupId = null;
        } else {
          groups.push({ id: uid(), name, playerIds: checked });
        }
        await saveKey('catan_groups', groups);
        renderGroupsView();
      });

      const listEl = document.getElementById('groupsList');
      if (groups.length === 0) { listEl.innerHTML = '<div class="empty-state">Todavía no has creado grupos.</div>'; return; }
      listEl.innerHTML = groups.map(g => {
        const names = g.playerIds.map(id => { const p = players.find(pl => pl.id === id); return p ? p.name : '(eliminado)'; }).join(', ');
        return `<div class="list-card">
      <div style="flex:1"><div class="list-card-name">${escapeHtml(g.name)}</div><div class="list-card-sub">${escapeHtml(names)}</div></div>
      <div style="display:flex;gap:6px;align-items:center;">
        <button class="btn-icon" data-edit-group="${g.id}" title="Editar grupo" style="font-size:13px">✏️</button>
        <button class="btn-icon" data-del-group="${g.id}" title="Eliminar">✕</button>
      </div>
    </div>`;
      }).join('');

      listEl.querySelectorAll('[data-edit-group]').forEach(btn => {
        btn.addEventListener('click', () => {
          editingGroupId = btn.dataset.editGroup;
          renderGroupsView();
        });
      });

      listEl.querySelectorAll('[data-del-group]').forEach(btn => {
        wireConfirmDelete(btn, async () => {
          if (editingGroupId === btn.dataset.delGroup) editingGroupId = null;
          groups = groups.filter(g => g.id !== btn.dataset.delGroup);
          await saveKey('catan_groups', groups);
          renderGroupsView();
        });
      });
    }

    function getEffectiveTargetVp(boardId, expansion, useEntreAmigos = false, usePortCaptain = false) {
      const tpl = boardId ? BOARD_TEMPLATES[boardId] : null;
      let rules = getExpRules(expansion);
      let baseVp = tpl?.targetVp || rules.baseTargetVp;
      
      // Ajuste específico si es escenario clásico jugado con CyC
      if (expansion.includes('Ciudades y Caballeros')) {
        if (!tpl || tpl.family === 'clasico') {
          baseVp = 13;
        } else {
          baseVp = Math.max(13, baseVp + 2); // escenarios de Navegantes jugados con CyC suman +2
        }
      }
      
      if (useEntreAmigos) baseVp += 1;
      if (usePortCaptain) baseVp += 1;
      return baseVp;
    }

    function startEditGame(id) {
      editingGameId = id;
      switchStatsSub('newgame');
    }

    function renderNewGameView() {
      let recalcPoints = () => {};
      const el = document.getElementById('sub-newgame');
      if (players.length === 0) { el.innerHTML = '<div class="empty-state">Añade al menos un jugador antes de registrar una partida.</div>'; return; }

      const editGame = editingGameId ? games.find(g => g.id === editingGameId) : null;
      if (editingGameId && !editGame) editingGameId = null;

      const boardOptions = Object.values(BOARD_TEMPLATES).map(t => `<option value="${t.id}">${t.label}</option>`).join('');
      const expansionOptions = [
        'Catán Estándar',
        'Ciudades y Caballeros',
        'Navegantes',
        'Ciudades y Caballeros + Navegantes',
        'Mercaderes y Bárbaros',
        'Personalizado'
      ].map(e => `<option value="${e}">${e}</option>`).join('');
      const groupOptions = groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

      const editBanner = editGame ? `
        <div style="margin-bottom:14px;padding:9px 13px;background:rgba(224,182,90,.18);border:1px solid var(--brass-light);border-radius:8px;display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;color:var(--brass-dark);font-size:13px;">✏️ Editando partida registrada (${editGame.date || 'Sin fecha'})</span>
          <button id="btnCancelEdit" style="background:rgba(0,0,0,.08);border:none;border-radius:5px;padding:4px 8px;cursor:pointer;font-weight:700;color:var(--ink);font-size:11.5px;">✕ Cancelar edición</button>
        </div>` : '';

      el.innerHTML = `
    <div class="panel" style="max-width:980px;flex:1 1 100%">
      ${editBanner}
      <div class="section-title">Datos de la partida</div>
      <div class="form-grid-2">
        <div><label>Fecha</label><input type="date" id="ngDate"></div>
        <div><label>Tablero usado</label><select id="ngBoard"><option value="">(sin especificar)</option>${boardOptions}</select></div>
      </div>
      <div class="form-grid-2" style="margin-top:12px">
        <div><label>Escenario / Reglas Jugadas</label><select id="ngExpansion">${expansionOptions}</select></div>
        <div><label>Semilla de Mapa / Seed (opcional)</label><input type="text" id="ngSeed" placeholder="Ej. CATAN-XXXX"></div>
      </div>
      <div class="form-grid-2" style="margin-top:12px">
        <div><label>Grupo (opcional)</label><select id="ngGroup"><option value="">— Elegir jugadores manualmente —</option>${groupOptions}</select></div>
        <div>
          <label style="display:flex;justify-content:space-between;align-items:center;">
            <span>🎯 Meta de Puntos de Victoria</span>
            <span id="targetVpBadge" style="font-size:11px;color:var(--brass-dark);font-weight:700;"></span>
          </label>
          <input type="number" id="ngTargetVp" min="5" max="30" value="10">
        </div>
      </div>

      <div class="section-title" style="margin-top:16px">Jugadores en esta partida</div>
      <div id="ngPlayerPicker" class="checkbox-list"></div>

      <div class="section-title" id="ngRulesTitle" style="margin-top:16px">Reglas y Restricciones</div>
      <div class="checkbox-list" id="ngRulesList" style="margin-bottom:12px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <label class="checkbox-row" id="ngOptPortCaptainRow"><input type="checkbox" id="ngOptPortCaptain" checked>Usar Capitán de Puerto (+1 PV a la meta, vale 2 VP)</label>
        <label class="checkbox-row" id="ngOptEntreAmigosRow"><input type="checkbox" id="ngOptEntreAmigos">Miniexpansión Entre amigos (+1 PV)</label>
        <label class="checkbox-row" id="ngOptBotaViejaRow"><input type="checkbox" id="ngOptBotaVieja">🐟 Pescadores de Catán (incluye Bota Vieja)</label>
      </div>

      <div class="section-title" style="margin-top:16px">Estadísticas por jugador</div>
      <div id="ngStatsTable"></div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:14px;">
        <button class="btn btn-primary" id="btnSaveGame" style="max-width:260px">${editGame ? '💾 Actualizar partida' : '💾 Guardar partida'}</button>
      </div>
      <div class="inline-message" id="newGameMsg"></div>
    </div>`;

      document.getElementById('ngDate').value = editGame?.date || new Date().toISOString().slice(0, 10);
      if (editGame?.boardId) document.getElementById('ngBoard').value = editGame.boardId;
      if (editGame?.expansion) document.getElementById('ngExpansion').value = editGame.expansion;
      if (editGame?.groupId) document.getElementById('ngGroup').value = editGame.groupId;
      if (editGame?.seed) document.getElementById('ngSeed').value = editGame.seed;
      if (editGame) {
        const hasPC = editGame.entries.some(e => e.portCaptain);
        document.getElementById('ngOptPortCaptain').checked = hasPC;
        const hasEA = !!editGame.entreAmigos || editGame.entries.some(e => e.entreAmigos);
        document.getElementById('ngOptEntreAmigos').checked = hasEA;
        const hasBV = !!editGame.botaVieja || editGame.entries.some(e => e.botaVieja);
        document.getElementById('ngOptBotaVieja').checked = hasBV;
      }

      function updateTargetVp(force = false) {
        const boardId = document.getElementById('ngBoard')?.value;
        const exp = document.getElementById('ngExpansion')?.value;
        const useEA = document.getElementById('ngOptEntreAmigos')?.checked;
        const useBV = document.getElementById('ngOptBotaVieja')?.checked;
        const usePC = document.getElementById('ngOptPortCaptain')?.checked;
        const vpInput = document.getElementById('ngTargetVp');
        const badge = document.getElementById('targetVpBadge');
        if (!vpInput) return;
        const defVp = getEffectiveTargetVp(boardId, exp, useEA, usePC);
        if (force || !vpInput._userCustomized) {
          vpInput.value = defVp;
        }
        if (badge) {
          const isCyC = exp && exp.includes('Ciudades');
          const extras = [];
          if (isCyC) extras.push('CyC +2');
          if (useEA) extras.push('Entre amigos +1');
          if (usePC) extras.push('Capitán +1');
          if (useBV) extras.push('Pescadores');
          badge.textContent = extras.length ? `Oficial (${defVp} PV · ${extras.join(', ')})` : `Oficial (${defVp} PV)`;
        }
        recalcPoints();
      }

      const vpInput = document.getElementById('ngTargetVp');
      if (editGame?.targetVp && vpInput) {
        vpInput.value = editGame.targetVp;
        vpInput._userCustomized = true;
      }
      updateTargetVp(false);

      if (editGame) {
        document.getElementById('btnCancelEdit')?.addEventListener('click', () => {
          editingGameId = null;
          renderNewGameView();
        });
      }

      const pickerEl = document.getElementById('ngPlayerPicker');
      function renderPicker(selectedIds) {
        pickerEl.innerHTML = players.map(p => `<label class="checkbox-row"><input type="checkbox" value="${p.id}" ${selectedIds.includes(p.id) ? 'checked' : ''}><span class="color-dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</label>`).join('');
        pickerEl.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => renderStatsTable()));
      }

      const initialSelectedIds = editGame ? editGame.entries.map(e => e.playerId) : [];
      renderPicker(initialSelectedIds);

      document.getElementById('ngGroup').addEventListener('change', (e) => {
        const g = groups.find(g => g.id === e.target.value);
        renderPicker(g ? g.playerIds : []);
        renderStatsTable();
      });

      document.getElementById('ngBoard').addEventListener('change', () => {
        updateTargetVp();
        renderStatsTable();
      });

      document.getElementById('ngExpansion').addEventListener('change', () => {
        updateTargetVp();
        renderStatsTable();
      });

      document.getElementById('ngTargetVp').addEventListener('input', (e) => {
        e.target._userCustomized = true;
        recalcPoints();
      });

      document.getElementById('ngOptPortCaptain').addEventListener('change', (e) => {
        const show = e.target.checked;
        updateTargetVp();
        const table = document.getElementById('ngStatsTable');
        if (!table) return;
        table.querySelectorAll('.col-portcaptain').forEach(el => el.style.display = show ? '' : 'none');
        if (!show) {
          table.querySelectorAll('.ng-portcaptain').forEach(cb => {
            if (cb.checked) {
              cb.checked = false;
              cb.dispatchEvent(new Event('change', { bubbles: true }));
            }
          });
        }
        recalcPoints();
      });

      document.getElementById('ngOptEntreAmigos').addEventListener('change', (e) => {
        const show = e.target.checked;
        updateTargetVp();
        const table = document.getElementById('ngStatsTable');
        if (table) {
          table.querySelectorAll('.col-entreamigos').forEach(el => el.style.display = show ? '' : 'none');
          if (!show) {
            table.querySelectorAll('.ng-entreamigos').forEach(inp => {
              if (inp.value && inp.value !== '0') {
                inp.value = 0;
                inp.dispatchEvent(new Event('input', { bubbles: true }));
              }
            });
          }
        }
        recalcPoints();
      });

      document.getElementById('ngOptBotaVieja')?.addEventListener('change', (e) => {
        const show = e.target.checked;
        updateTargetVp();
        const table = document.getElementById('ngStatsTable');
        if (table) {
          table.querySelectorAll('.col-botavieja').forEach(el => el.style.display = show ? '' : 'none');
          if (!show) {
            table.querySelectorAll('.ng-botavieja').forEach(cb => {
              if (cb.checked) {
                cb.checked = false;
                cb.dispatchEvent(new Event('change', { bubbles: true }));
              }
            });
          }
        }
        recalcPoints();
      });

      function getSelectedIds() { return [...pickerEl.querySelectorAll('input:checked')].map(cb => cb.value); }

      function renderStatsTable() {
        const ids = getSelectedIds();
        const tableEl = document.getElementById('ngStatsTable');
        if (ids.length === 0) { tableEl.innerHTML = '<div class="empty-state">Selecciona los jugadores de la partida.</div>'; return; }

        const exp = document.getElementById('ngExpansion').value;
        const isCyC = (exp === 'Ciudades y Caballeros' || exp === 'Ciudades y Caballeros + Navegantes');
        const isNav = (exp === 'Navegantes' || exp === 'Ciudades y Caballeros + Navegantes');
        const isNavOnly = (exp === 'Navegantes');
        const isCyCNav = (exp === 'Ciudades y Caballeros + Navegantes');

        const boardId = document.getElementById('ngBoard')?.value;
        const isOceania = (boardId === 'oceania3' || boardId === 'oceania4' || boardId === 'oceania6' || BOARD_TEMPLATES[boardId]?.family === 'oceania');

        const is56p = ids.length >= 5 || (boardId && (boardId.includes('6') || boardId.includes('5') || BOARD_TEMPLATES[boardId]?.maxPlayers === 6));
        const maxKnights = is56p ? 20 : 14;
        const maxMonopolies = is56p ? 3 : 2;
        const maxInventions = is56p ? 3 : 2;
        const maxRoads = is56p ? 3 : 2;
        const maxVpDev = 5;
        const maxDevCards = is56p ? 34 : 25;

        const defaultSettlements = isCyC ? 1 : 2;
        const defaultCities = isCyC ? 1 : 0;

        const usePC = document.getElementById('ngOptPortCaptain').checked;
        const pcStyle = usePC ? '' : 'display: none;';
        const useEA = document.getElementById('ngOptEntreAmigos').checked;
        const eaStyle = useEA ? '' : 'display: none;';
        const useBV = document.getElementById('ngOptBotaVieja')?.checked || false;
        const bvStyle = useBV ? '' : 'display: none;';

        const COLUMNS = [
          { key: 'player', label: 'Jugador', type: 'readonly',
            renderTh: () => `<th>Jugador</th>`,
            renderTd: (p, id, eData) => `<td><span class="color-dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</td>`
          },
          { key: 'settlements', label: 'Poblados', type: 'number', def: defaultSettlements, min: 0, title: 'Poblados restantes en mesa al finalizar (los poblados totales construidos se calculan automáticamente)' },
          { key: 'cities', label: 'Ciudades', type: 'number', def: defaultCities, min: 0, title: 'Ciudades construidas' },
          { key: 'metropolis', label: '🏛️ Metrópolis', type: 'number', def: 0, min: 0, max: 3, title: 'Metrópolis (4 VP c/u: 2 ciudad + 2 metrópoli)', when: () => isCyC },
          { key: 'campeador', label: '🛡️ Campeador', type: 'number', def: 0, min: 0, title: 'Puntos de Campeador de Catán (1 VP c/u)', when: () => isCyC,
            valueGetter: (eData) => {
              if (!eData || eData.campeador === undefined || eData.campeador === null) return 0;
              return typeof eData.campeador === 'number' ? eData.campeador : (eData.campeador ? 1 : 0);
            }
          },
          { key: 'foreignIslands', label: '🏝️ Islas Foráneas', type: 'number', def: 0, min: 0, title: 'Islas foráneas alcanzadas (2 VP c/u)', when: () => isNav && !isOceania, inputClass: 'ng-foreign-islands' },
          { key: 'entreAmigos', label: '🤝 Entre amigos', type: 'number', def: 0, min: 0, title: 'Fichas de Miniexpansión Entre amigos (1 VP c/u)', className: 'col-entreamigos', style: eaStyle, inputClass: 'ng-entreamigos' },
          { key: 'botaVieja', label: '👢 Bota', type: 'checkbox', def: false, title: 'Bota Vieja: Quien la posee necesita +1 PV por encima de la meta para ganar', className: 'col-botavieja', style: bvStyle, tdStyle: 'text-align:center;', inputClass: 'ng-botavieja' },
          { key: 'merchant', label: '💼 Comerciante', type: 'checkbox', def: false, title: 'Comerciante / Mercader (1 VP)', when: () => isCyC, tdStyle: 'text-align:center', inputClass: 'ng-merchant' },
          { key: 'imprenta', label: '📜 Imprenta', type: 'checkbox', def: false, title: 'Carta de progreso: Imprenta (Ciencia, 1 VP)', when: () => isCyC, tdStyle: 'text-align:center', inputClass: 'ng-imprenta' },
          { key: 'constitucion', label: '📜 Constitución', type: 'checkbox', def: false, title: 'Carta de progreso: Constitución (Política, 1 VP)', when: () => isCyC, tdStyle: 'text-align:center', inputClass: 'ng-constitucion' },
          { key: 'knights', label: '⚔️ Caballeros', type: 'number', def: 0, min: 0, max: maxKnights, title: 'Caballeros / Alianzas jugados (máx ' + maxKnights + ')', when: () => !isCyC },
          { key: 'monopolies', label: '💰 Monopolios', type: 'number', def: 0, min: 0, max: maxMonopolies, title: 'Monopolios jugados (máx ' + maxMonopolies + ')', when: () => !isCyC },
          { key: 'inventions', label: '📜 Invención', type: 'number', def: 0, min: 0, max: maxInventions, title: 'Invenciones/Progresos (máx ' + maxInventions + ')', when: () => !isCyC },
          { key: 'roadCards', label: '🛣️ Carreteras', type: 'number', def: 0, min: 0, max: maxRoads, title: 'Carreteras / Construcción de carreteras (máx ' + maxRoads + ')', when: () => !isCyC, inputClass: 'ng-roadcards' },
          { key: 'vpDev', label: '🏛️ Puntos Dev', type: 'number', def: 0, min: 0, max: maxVpDev, title: 'Puntos de victoria en cartas (máx ' + maxVpDev + ')', when: () => !isCyC, inputClass: 'ng-vpdev' },
          { key: 'devCards', label: 'Dev. Totales', type: 'number', def: 0, min: 0, max: maxDevCards, title: 'Cartas totales compradas/usadas (máx ' + maxDevCards + ')', when: () => !isCyC, inputClass: 'ng-devcards' },
          { key: 'longestRoad', label: '🛣️ Gran Ruta', type: 'checkbox', def: false, title: 'Gran Ruta comercial (2 VP)', inputClass: 'ng-longestroad', tdStyle: 'text-align:center' },
          { key: 'largestArmy', label: '⚔️ Gran Ejército', type: 'checkbox', def: false, title: 'Gran Ejército de Caballería (2 VP)', when: () => !isCyC, inputClass: 'ng-largestarmy', tdStyle: 'text-align:center' },
          { key: 'portCaptain', label: '⚓ Capitán', type: 'checkbox', def: false, title: 'Capitán de Puerto (2 VP)', className: 'col-portcaptain', style: pcStyle, tdStyle: 'text-align:center;', inputClass: 'ng-portcaptain' },
          { key: 'points', label: 'Puntos Totales', type: 'number', def: 0, min: 0, inputStyle: 'font-weight:700;color:var(--brass-dark)' },
          { key: 'goalPct', label: '% Meta', type: 'readonly', title: 'Porcentaje de puntos alcanzados respecto a la meta de victoria',
            renderTh: (col) => `<th title="${col.title}">${col.label}</th>`,
            renderTd: () => `<td style="text-align:center;font-weight:700;" class="ng-goal-pct">0%</td>`
          },
          { key: 'winner', label: '🏆 Ganador', type: 'checkbox', def: false, tdStyle: 'text-align:center' }
        ];

        const activeColumns = COLUMNS.filter(c => !c.when || c.when());

        const theadHtml = '<tr>' + activeColumns.map(col => {
          if (col.renderTh) return col.renderTh(col);
          const styleAttr = col.style ? ` style="${col.style}"` : '';
          const classAttr = col.className ? ` class="${col.className}"` : '';
          const titleAttr = col.title ? ` title="${col.title}"` : '';
          return `<th${classAttr}${styleAttr}${titleAttr}>${col.label}</th>`;
        }).join('') + '</tr>';

        const rowsHtml = ids.map(id => {
          const p = players.find(pl => pl.id === id);
          // Fix bug E (preloadEntries removed):
          const eData = editGame ? editGame.entries.find(e => e.playerId === id) : null;
          
          let rowStr = `<tr data-player-row="${id}">`;
          activeColumns.forEach(col => {
            if (col.renderTd) {
              rowStr += col.renderTd(p, id, eData);
              return;
            }
            const val = col.valueGetter ? col.valueGetter(eData) : (eData && eData[col.key] !== undefined && eData[col.key] !== null ? eData[col.key] : col.def);
            const inputClass = col.inputClass || `ng-${col.key.toLowerCase()}`;
            const tdStyle = col.tdStyle ? ` style="${col.tdStyle}"` : '';
            const tdClass = col.className ? ` class="${col.className}"` : '';
            const inStyle = col.inputStyle ? ` style="${col.inputStyle}"` : '';
            const titleAttr = col.title ? ` title="${col.title}"` : '';

            if (col.type === 'number') {
              const maxAttr = col.max !== undefined ? ` max="${col.max}"` : '';
              rowStr += `<td${tdClass}${tdStyle}><input type="number" min="${col.min || 0}"${maxAttr} class="${inputClass}" value="${val}"${titleAttr}${inStyle}></td>`;
            } else if (col.type === 'checkbox') {
              rowStr += `<td${tdClass}${tdStyle}><input type="checkbox" class="${inputClass}" ${val ? 'checked' : ''}${titleAttr}${inStyle}></td>`;
            }
          });
          rowStr += '</tr>';
          return rowStr;
        }).join('');

        tableEl.innerHTML = `<div class="stats-table-wrap"><table class="data-table">
          <thead>${theadHtml}</thead>
          <tbody>${rowsHtml}</tbody>
        </table></div>`;

        // Auto-reduce poblados al aumentar ciudades (salvo Ciudades y Caballeros)
        if (!isCyC) {
          tableEl.querySelectorAll('.ng-cities').forEach(input => {
            input._prevVal = parseInt(input.value, 10) || 0;
            input.addEventListener('input', (e) => {
              const row = e.target.closest('tr');
              const newCities = parseInt(e.target.value, 10) || 0;
              const oldCities = e.target._prevVal !== undefined ? e.target._prevVal : newCities;
              if (newCities > oldCities && row) {
                const diff = newCities - oldCities;
                const settInput = row.querySelector('.ng-settlements');
                if (settInput) {
                  const curSett = parseInt(settInput.value, 10) || 0;
                  settInput.value = Math.max(0, curSett - diff);
                }
              }
              e.target._prevVal = newCities;
            });
          });
        }

        // Auto-sumar Dev Totales (caballeros + monopolios + invención + carreteras + puntos dev)
        if (!isCyC) {
          tableEl.querySelectorAll('.ng-knights, .ng-monopolies, .ng-inventions, .ng-roadcards, .ng-vpdev').forEach(input => {
            input.addEventListener('input', (e) => {
              const row = e.target.closest('tr');
              if (row) {
                const k = parseInt(row.querySelector('.ng-knights')?.value, 10) || 0;
                const m = parseInt(row.querySelector('.ng-monopolies')?.value, 10) || 0;
                const inv = parseInt(row.querySelector('.ng-inventions')?.value, 10) || 0;
                const r = parseInt(row.querySelector('.ng-roadcards')?.value, 10) || 0;
                const vp = parseInt(row.querySelector('.ng-vpdev')?.value, 10) || 0;
                const devInput = row.querySelector('.ng-devcards');
                if (devInput) devInput.value = k + m + inv + r + vp;
              }
            });
          });
        }

        if (isCyC) {
          ['.ng-merchant', '.ng-imprenta', '.ng-constitucion'].forEach(selector => {
            tableEl.querySelectorAll(selector).forEach(cb => {
              cb.addEventListener('change', (e) => {
                if (e.target.checked) {
                  tableEl.querySelectorAll(selector).forEach(other => {
                    if (other !== e.target) other.checked = false;
                  });
                }
                recalcPoints();
              });
            });
          });
        }

        // Exclusividad para Gran Ruta, Gran Ejército, Capitán de Puerto y Bota Vieja
        ['.ng-longestroad', '.ng-largestarmy', '.ng-portcaptain', '.ng-botavieja'].forEach(selector => {
          tableEl.querySelectorAll(selector).forEach(cb => {
            cb.addEventListener('change', (e) => {
              if (e.target.checked) {
                tableEl.querySelectorAll(selector).forEach(other => {
                  if (other !== e.target) other.checked = false;
                });
              }
              recalcPoints();
            });
          });
        });

        if (!isCyC) {
          tableEl.querySelectorAll('.ng-knights').forEach(input => {
            input.addEventListener('input', () => {
              let maxK = -1;
              const knightVals = ids.map(id => {
                const row = tableEl.querySelector(`[data-player-row="${id}"]`);
                const v = row ? (parseInt(row.querySelector('.ng-knights')?.value, 10) || 0) : 0;
                if (v > maxK) maxK = v;
                return { id, v };
              });

              if (maxK >= 3) {
                const topPlayers = knightVals.filter(k => k.v === maxK);
                if (topPlayers.length === 1) {
                  ids.forEach(id => {
                    const row = tableEl.querySelector(`[data-player-row="${id}"]`);
                    if (row) {
                      const cb = row.querySelector('.ng-largestarmy');
                      if (cb && cb.checked !== (id === topPlayers[0].id)) {
                        cb.checked = (id === topPlayers[0].id);
                      }
                    }
                  });
                  recalcPoints();
                }
              }
            });
          });
        }

        recalcPoints = () => {
          const currentExp = document.getElementById('ngExpansion').value;
          const currentCyC = (currentExp === 'Ciudades y Caballeros' || currentExp === 'Ciudades y Caballeros + Navegantes');
          const currentNav = (currentExp === 'Navegantes' || currentExp === 'Ciudades y Caballeros + Navegantes');
          const currentBoardId = document.getElementById('ngBoard')?.value;
          const currentIsOceania = (currentBoardId === 'oceania3' || currentBoardId === 'oceania4' || currentBoardId === 'oceania6' || BOARD_TEMPLATES[currentBoardId]?.family === 'oceania');
          const useEA = document.getElementById('ngOptEntreAmigos')?.checked;
          const targetVp = parseInt(document.getElementById('ngTargetVp')?.value, 10) || 10;

          let maxPts = -1;
          const playerTotals = [];

          ids.forEach(id => {
            const row = tableEl.querySelector(`[data-player-row="${id}"]`);
            if (!row) return;
            const num = sel => {
              const el = row.querySelector(sel);
              return el ? (parseInt(el.value, 10) || 0) : 0;
            };
            const bool = sel => {
              const el = row.querySelector(sel);
              return el ? el.checked : false;
            };

            let pts = (num('.ng-settlements') * 1) +
              (num('.ng-cities') * 2) +
              (bool('.ng-longestroad') ? 2 : 0) +
              (bool('.ng-portcaptain') ? 2 : 0);

            if (useEA) {
              pts += (num('.ng-entreamigos') * 1);
            }
            if (currentCyC) {
              pts += (num('.ng-metropolis') * 4) +
                (num('.ng-campeador') * 1) +
                (bool('.ng-merchant') ? 1 : 0) +
                (bool('.ng-imprenta') ? 1 : 0) +
                (bool('.ng-constitucion') ? 1 : 0);
            }
            if (currentNav && !currentIsOceania) {
              pts += (num('.ng-foreign-islands') * 2);
            }
            if (!currentCyC) {
              pts += (num('.ng-vpdev') * 1) +
                (bool('.ng-largestarmy') ? 2 : 0);
            }

            const ptsInput = row.querySelector('.ng-points');
            if (ptsInput) ptsInput.value = pts;

            const settInput = row.querySelector('.ng-settlements');
            if (settInput) {
              const pob = num('.ng-settlements');
              const ciu = num('.ng-cities');
              const met = num('.ng-metropolis');
              const built = currentCyC ? (pob + Math.max(0, (ciu + met) - 1)) : (pob + ciu);
              settInput.title = `${pob} poblados en mesa (${built} fundados en total a lo largo de la partida)`;
            }

            const hasBoot = bool('.ng-botavieja');
            const personalTarget = hasBoot ? (targetVp + 1) : targetVp;
            const reached = (pts >= personalTarget);
            row.classList.toggle('target-reached', reached);

            if (ptsInput) {
              const bootNote = hasBoot ? ' · Bota Vieja +1 PV' : '';
              ptsInput.title = reached ? `🎯 Meta alcanzada (${pts}/${personalTarget} PV${bootNote})` : `${pts}/${personalTarget} PV (Meta: ${personalTarget} PV${bootNote})`;
            }

            const pct = personalTarget > 0 ? Math.round((pts / personalTarget) * 100) : 0;
            const pctEl = row.querySelector('.ng-goal-pct');
            if (pctEl) {
              pctEl.textContent = `${pct}%`;
              pctEl.style.color = reached ? '#2e7d32' : (pct >= 80 ? 'var(--brass-dark)' : 'var(--ink)');
              pctEl.title = `${pts} de ${personalTarget} PV necesarios (${pct}%)`;
            }

            if (reached && pts > maxPts) maxPts = pts;
            playerTotals.push({ id, pts, personalTarget, reached, row });
          });

          const winners = playerTotals.filter(p => p.reached && p.pts === maxPts);
          if (winners.length === 1) {
            const anyChecked = [...tableEl.querySelectorAll('.ng-winner')].some(cb => cb.checked);
            if (!anyChecked) {
              const winRow = tableEl.querySelector(`[data-player-row="${winners[0].id}"]`);
              const winCb = winRow?.querySelector('.ng-winner');
              if (winCb) winCb.checked = true;
            }
          }
        }

        tableEl.addEventListener('change', recalcPoints);
        tableEl.addEventListener('input', recalcPoints);
        recalcPoints();
      }

      renderStatsTable();

      document.getElementById('btnSaveGame').addEventListener('click', async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) { showInlineMessage('newGameMsg', 'Selecciona al menos un jugador.'); return; }
        const entries = ids.map(id => {
          const row = document.querySelector(`[data-player-row="${id}"]`);
          const num = sel => {
            const el = row.querySelector(sel);
            return el ? (parseInt(el.value, 10) || 0) : 0;
          };
          const bool = sel => {
            const el = row.querySelector(sel);
            return el ? el.checked : false;
          };
          return {
            playerId: id,
            name: players.find(p => p.id === id).name,
            points: num('.ng-points'),
            settlements: num('.ng-settlements'),
            cities: num('.ng-cities'),
            metropolis: num('.ng-metropolis'),
            campeador: num('.ng-campeador'),
            entreAmigos: num('.ng-entreamigos'),
            botaVieja: bool('.ng-botavieja'),
            merchant: bool('.ng-merchant'),
            imprenta: bool('.ng-imprenta'),
            constitucion: bool('.ng-constitucion'),
            foreignIslands: num('.ng-foreign-islands'),
            devCards: num('.ng-devcards'),
            knights: num('.ng-knights'),
            monopolies: num('.ng-monopolies'),
            inventions: num('.ng-inventions'),
            roadCards: num('.ng-roadcards'),
            vpDev: num('.ng-vpdev'),
            longestRoad: bool('.ng-longestroad'),
            largestArmy: bool('.ng-largestarmy'),
            portCaptain: bool('.ng-portcaptain'),
            winner: bool('.ng-winner')
          };
        });

        entries.sort((a, b) => {
          if (b.winner !== a.winner) return (b.winner ? 1 : 0) - (a.winner ? 1 : 0);
          return b.points - a.points;
        });

        const boardId = document.getElementById('ngBoard').value;
        const expansion = document.getElementById('ngExpansion').value;
        const seed = document.getElementById('ngSeed').value.trim() || null;
        const useEA = document.getElementById('ngOptEntreAmigos')?.checked || false;
        const useBV = document.getElementById('ngOptBotaVieja')?.checked || false;
        const usePC = document.getElementById('ngOptPortCaptain')?.checked || false;
        const targetVp = parseInt(document.getElementById('ngTargetVp')?.value, 10) || getEffectiveTargetVp(boardId, expansion, useEA, usePC);

        // Instantánea del mapa: se conserva al editar (si no cambió la semilla) o se toma del mapa
        // con el que se pulsó "Registrar partida con este mapa".
        let boardSnapshot = null;
        const isNewGame = !editingGameId;
        if (editingGameId) {
          const prev = games.find(g => g.id === editingGameId);
          if (prev?.boardSnapshot && prev.seed === seed) boardSnapshot = prev.boardSnapshot;
        }
        if (!boardSnapshot && pendingBoardSnapshot && seed &&
          (pendingBoardSnapshot.inputSeed === seed || pendingBoardSnapshot.seed === seed)) {
          boardSnapshot = pendingBoardSnapshot;
        }

        if (editingGameId) {
          const idx = games.findIndex(g => g.id === editingGameId);
          if (idx !== -1) {
            games[idx] = {
              schemaVersion: SCHEMA_VERSION,
              id: editingGameId,
              date: document.getElementById('ngDate').value,
              groupId: document.getElementById('ngGroup').value || null,
              boardId: boardId || null,
              boardLabel: boardId ? BOARD_TEMPLATES[boardId]?.label : null,
              expansion: expansion || 'Catán Estándar',
              entreAmigos: useEA,
              botaVieja: useBV,
              portCaptain: usePC,
              seed,
              targetVp,
              boardSnapshot,
              entries
            };
          }
          editingGameId = null;
        } else {
          games.push({
            schemaVersion: SCHEMA_VERSION,
            id: uid(),
            date: document.getElementById('ngDate').value,
            groupId: document.getElementById('ngGroup').value || null,
            boardId: boardId || null,
            boardLabel: boardId ? BOARD_TEMPLATES[boardId]?.label : null,
            expansion: expansion || 'Catán Estándar',
            entreAmigos: useEA,
            botaVieja: useBV,
            portCaptain: usePC,
            seed,
            targetVp,
            boardSnapshot,
            entries
          });
        }

        pendingBoardSnapshot = null;
        await saveKey('catan_games', games);
        switchStatsSub('history');

        // Recordatorio de respaldo cada 5 partidas nuevas sin exportar.
        const unsaved = gamesSinceBackup();
        if (isNewGame && unsaved >= 5 && unsaved % 5 === 0) {
          showToast(`💾 Llevas ${unsaved} partidas sin respaldar. Exporta un respaldo en la pestaña 💾 Respaldo.`, 'warn', 9000);
        }
      });
    }

    function renderHistoryView() {
      const el = document.getElementById('sub-history');
      if (games.length === 0) { el.innerHTML = '<div class="empty-state">Todavía no hay partidas registradas.</div>'; return; }
      const sorted = [...games].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      el.innerHTML = sorted.map(g => `
    <div class="game-card">
      <div class="game-card-head">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
          <b>${g.date || 'Sin fecha'}</b>
          ${g.expansion ? ` <span class="badge good">${escapeHtml(g.expansion)}</span>` : ''}
          ${g.boardLabel ? ` <span class="badge mid">${escapeHtml(g.boardLabel)}</span>` : ''}
          ${g.entreAmigos ? ` <span class="badge" style="background:rgba(62,122,69,.18);color:#2d6333;font-weight:700;">🤝 Entre amigos</span>` : ''}
          ${g.botaVieja ? ` <span class="badge" style="background:rgba(122,60,30,.18);color:#8A3A1A;font-weight:700;">🐟 Pescadores</span>` : ''}
          <span class="badge" style="background:rgba(46,92,138,.18);color:#2E5C8A;font-weight:700;" title="Meta de victoria">🎯 ${g.targetVp || 10} PV</span>
          ${g.seed ? ` <span class="badge" style="background:rgba(224,182,90,.22);color:var(--brass-dark);font-family:monospace;font-weight:700;" title="Semilla de mapa">🎲 ${escapeHtml(g.seed)}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          ${(g.boardSnapshot || (g.seed && g.boardId)) ? `<button class="btn-icon" data-view-map="${g.id}" title="${g.boardSnapshot ? 'Ver el mapa exacto de esta partida' : 'Regenerar el mapa desde la semilla (aproximado)'}" style="font-size:13px">🗺️</button>` : ''}
          <button class="btn-icon" data-edit-game="${g.id}" title="Editar partida" style="font-size:13px">✏️</button>
          <button class="btn-icon" data-del-game="${g.id}" title="Eliminar">✕</button>
        </div>
      </div>
      <div class="game-card-body">
        ${g.entries.map(e => {
        const isCyC = (g.expansion === 'Ciudades y Caballeros' || g.expansion === 'Ciudades y Caballeros + Navegantes');
        const personalTarget = (g.targetVp || 10) + (e.botaVieja ? 1 : 0);
        const pts = e.points || 0;
        const pct = personalTarget ? Math.round((pts / personalTarget) * 100) : 0;
        const pob = e.settlements || 0;
        const ciu = e.cities || 0;
        const met = e.metropolis || 0;
        const built = isCyC ? (pob + Math.max(0, (ciu + met) - 1)) : (pob + ciu);
        let details = `${pts} PV <span style="font-size:11px;opacity:0.75;font-weight:600;" title="Meta de victoria: ${personalTarget} PV ${e.botaVieja ? '(con Bota Vieja +1)' : ''} (${pct}%)">(${pct}%)</span> · ${pob} <span style="font-size:11px;opacity:0.8;color:var(--brass-dark);" title="${pob} en mesa (${built} construidos en total)">(${built})</span> pob · ${ciu} ciu`;
        if (e.metropolis) details += ` · 🏛️ ${e.metropolis} met.`;
        if (e.campeador) details += ` · 🛡️ ${typeof e.campeador === 'number' ? e.campeador : 1} camp.`;
        if (e.botaVieja) details += ` · 👢 Bota Vieja`;
        if (e.entreAmigos) details += ` · 🤝 ${e.entreAmigos} amigos`;
        if (e.foreignIslands) details += ` · 🏝️ ${e.foreignIslands} islas for.`;
        if (e.merchant) details += ` · 💼 Comerciante`;
        if (e.imprenta) details += ` · 📜 Imprenta`;
        if (e.constitucion) details += ` · 📜 Constitución`;
        if (e.devCards || e.knights || e.monopolies || e.inventions || e.roadCards || e.vpDev) {
          details += ` · ⚔️${e.knights || 0} 💰${e.monopolies || 0} 📜${e.inventions || 0} 🛣️${e.roadCards || 0} 🏛️${e.vpDev || 0} (${e.devCards || 0} dev. tot.)`;
        }
        if (e.longestRoad) details += ` · 🛣️`;
        if (e.largestArmy) details += ` · ⚔️`;
        if (e.portCaptain) details += ` · ⚓`;
        return `<div class="game-entry ${e.winner ? 'is-winner' : ''}">
            <span>${e.winner ? '🏆 ' : ''}${escapeHtml(e.name)}</span>
            <span>${details}</span>
          </div>`;
      }).join('')}
      </div>
    </div>`).join('');

      el.querySelectorAll('[data-view-map]').forEach(btn => {
        btn.addEventListener('click', () => {
          const g = games.find(x => x.id === btn.dataset.viewMap);
          if (!g) return;
          const snap = g.boardSnapshot || { templateId: g.boardId, seed: g.seed, opts: null, approx: true };
          restoreBoardSnapshot(snap, g.date || null);
        });
      });

      el.querySelectorAll('[data-edit-game]').forEach(btn => {
        btn.addEventListener('click', () => {
          startEditGame(btn.dataset.editGame);
        });
      });

      el.querySelectorAll('[data-del-game]').forEach(btn => {
        wireConfirmDelete(btn, async () => {
          if (editingGameId === btn.dataset.delGame) editingGameId = null;
          games = games.filter(g => g.id !== btn.dataset.delGame);
          await saveKey('catan_games', games);
          renderHistoryView();
        });
      });
    }

    function computePlayerStats(playerId) {
      const entries = games.flatMap(g => g.entries.filter(e => e.playerId === playerId));
      const gamesPlayed = entries.length;
      const wins = entries.filter(e => e.winner).length;
      const sum = k => entries.reduce((a, e) => a + (e[k] || 0), 0);
      const sumCamp = entries.reduce((a, e) => a + (typeof e.campeador === 'number' ? e.campeador : (e.campeador ? 1 : 0)), 0);

      let totalSettlementsBuilt = 0;
      let sumGoalPct = 0;
      games.forEach(g => {
        const isCyC = (g.expansion === 'Ciudades y Caballeros' || g.expansion === 'Ciudades y Caballeros + Navegantes');
        const baseTargetVp = g.targetVp || 10;
        g.entries.forEach(e => {
          if (e.playerId === playerId) {
            const pob = e.settlements || 0;
            const ciu = e.cities || 0;
            const met = e.metropolis || 0;
            if (isCyC) {
              totalSettlementsBuilt += pob + Math.max(0, (ciu + met) - 1);
            } else {
              totalSettlementsBuilt += pob + ciu;
            }
            const personalTarget = e.botaVieja ? (baseTargetVp + 1) : baseTargetVp;
            if (personalTarget > 0) {
              sumGoalPct += ((e.points || 0) / personalTarget) * 100;
            }
          }
        });
      });

      const goalPct = gamesPlayed ? (sumGoalPct / gamesPlayed) : 0;

      return {
        gamesPlayed, wins, winPct: gamesPlayed ? wins / gamesPlayed * 100 : 0,
        goalPct,
        avgPoints: gamesPlayed ? sum('points') / gamesPlayed : 0,
        totalCities: sum('cities'), totalSettlements: sum('settlements'),
        totalSettlementsBuilt,
        totalMetropolis: sum('metropolis'), totalCampeador: sumCamp,
        totalEntreAmigos: sum('entreAmigos'),
        totalMerchants: entries.filter(e => e.merchant).length,
        totalImprenta: entries.filter(e => e.imprenta).length, totalConstitucion: entries.filter(e => e.constitucion).length,
        totalForeignIslands: sum('foreignIslands'),
        totalDev: sum('devCards'), totalKnights: sum('knights'), totalMonopolies: sum('monopolies'), totalInventions: sum('inventions'), totalRoadCards: sum('roadCards'), totalVpDev: sum('vpDev'),
        longestRoads: entries.filter(e => e.longestRoad).length, largestArmies: entries.filter(e => e.largestArmy).length, portCaptains: entries.filter(e => e.portCaptain).length,
        totalBotaVieja: entries.filter(e => e.botaVieja).length
      };
    }

    let statsSortKey = 'gamesPlayed';
    let statsSortDir = 'desc';

    function renderStatsAggView() {
      const el = document.getElementById('sub-stats');
      if (players.length === 0) { el.innerHTML = '<div class="empty-state">Añade jugadores y registra partidas para ver estadísticas.</div>'; return; }

      const playerStats = players.map(p => {
        const s = computePlayerStats(p.id);
        return { player: p, stats: s };
      });

      playerStats.sort((a, b) => {
        let valA, valB;
        if (statsSortKey === 'name') {
          valA = a.player.name.toLowerCase();
          valB = b.player.name.toLowerCase();
          return statsSortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else if (statsSortKey === 'totalSettlements') {
          valA = (a.stats.totalSettlementsBuilt * 1000) + a.stats.totalSettlements;
          valB = (b.stats.totalSettlementsBuilt * 1000) + b.stats.totalSettlements;
          return statsSortDir === 'asc' ? valA - valB : valB - valA;
        } else {
          valA = a.stats[statsSortKey] ?? 0;
          valB = b.stats[statsSortKey] ?? 0;
          return statsSortDir === 'asc' ? valA - valB : valB - valA;
        }
      });

      const thSort = (key, label, title = '') => {
        const isActive = statsSortKey === key;
        const arrow = isActive ? (statsSortDir === 'asc' ? ' ▲' : ' ▼') : '';
        const activeStyle = isActive ? 'color:var(--brass-dark);font-weight:800;' : '';
        return `<th data-sort-key="${key}" title="${title || 'Haz clic para ordenar'}" style="${activeStyle}">${label}${arrow}</th>`;
      };

      el.innerHTML = `<div class="stats-table-wrap"><table class="data-table stats-sortable-table">
    <thead>
      <tr>
        ${thSort('name', 'Jugador')}
        ${thSort('gamesPlayed', 'Partidas')}
        ${thSort('wins', 'Victorias')}
        ${thSort('winPct', '% Vict.')}
        ${thSort('goalPct', '% Meta PV', 'Porcentaje promedio de puntos alcanzados respecto a la meta de victoria de cada partida')}
        ${thSort('avgPoints', 'Puntos prom.')}
        ${thSort('totalCities', 'Ciudades')}
        ${thSort('totalSettlements', 'Poblados', 'Poblados finales en mesa (Total de poblados fundados a lo largo de las partidas)')}
        ${thSort('totalMetropolis', '🏛️ Metróp.', 'Metrópolis')}
        ${thSort('totalCampeador', '🛡️ Camp.', 'Campeador de Catán')}
        ${thSort('totalEntreAmigos', '🤝 E. Amigos', 'Fichas de Miniexpansión Entre amigos')}
        ${thSort('totalForeignIslands', '🏝️ Islas For.', 'Islas Foráneas')}
        ${thSort('totalMerchants', '💼 Com.', 'Comerciante')}
        ${thSort('totalImprenta', '📜 Impr.', 'Imprenta')}
        ${thSort('totalConstitucion', '📜 Const.', 'Constitución')}
        ${thSort('totalKnights', '⚔️ Caballeros')}
        ${thSort('totalMonopolies', '💰 Monopolios')}
        ${thSort('totalInventions', '📜 Invención')}
        ${thSort('totalRoadCards', '🛣️ Carreteras', 'Cartas de Carreteras / Construcción de carreteras')}
        ${thSort('totalVpDev', '🏛️ Puntos Dev')}
        ${thSort('totalDev', 'Dev. Totales')}
        ${thSort('longestRoads', '🛣️', 'Gran Ruta comercial')}
        ${thSort('largestArmies', '⚔️', 'Gran Ejército')}
        ${thSort('portCaptains', '⚓', 'Capitán de Puerto')}
        ${thSort('totalBotaVieja', '👢', 'Veces que terminó con la Bota Vieja (Pescadores de Catán)')}
      </tr>
    </thead>
    <tbody>${playerStats.map(({ player: p, stats: s }) => {
        return `<tr>
          <td><span class="color-dot" style="background:${p.color}"></span>${escapeHtml(p.name)}</td>
          <td>${s.gamesPlayed}</td><td>${s.wins}</td><td>${s.winPct.toFixed(0)}%</td>
          <td><b>${s.goalPct.toFixed(1)}%</b></td>
          <td>${s.avgPoints.toFixed(1)}</td>
          <td>${s.totalCities}</td><td>${s.totalSettlements} <span style="font-size:11px;font-weight:700;color:var(--brass-dark);" title="${s.totalSettlements} en mesa (${s.totalSettlementsBuilt} construidos en total)">(${s.totalSettlementsBuilt})</span></td>
          <td>${s.totalMetropolis}</td><td>${s.totalCampeador}</td><td>${s.totalEntreAmigos || 0}</td><td>${s.totalForeignIslands}</td>
          <td>${s.totalMerchants}</td><td>${s.totalImprenta}</td><td>${s.totalConstitucion}</td>
          <td>${s.totalKnights}</td><td>${s.totalMonopolies}</td><td>${s.totalInventions}</td><td>${s.totalRoadCards || 0}</td><td>${s.totalVpDev}</td>
          <td>${s.totalDev}</td>
          <td>${s.longestRoads}</td><td>${s.largestArmies}</td><td>${s.portCaptains}</td>
          <td>${s.totalBotaVieja || 0}</td>
        </tr>`;
      }).join('')}</tbody></table></div>`;

      el.querySelectorAll('th[data-sort-key]').forEach(th => {
        th.addEventListener('click', () => {
          const key = th.dataset.sortKey;
          if (statsSortKey === key) {
            statsSortDir = statsSortDir === 'desc' ? 'asc' : 'desc';
          } else {
            statsSortKey = key;
            statsSortDir = (key === 'name') ? 'asc' : 'desc';
          }
          renderStatsAggView();
        });
      });
    }

    function switchStatsSub(sub) {
      document.querySelectorAll('#statsSubnav button').forEach(b => b.classList.toggle('active', b.dataset.sub === sub));
      ['players', 'groups', 'newgame', 'history', 'stats', 'backup'].forEach(s => {
        document.getElementById('sub-' + s).style.display = s === sub ? '' : 'none';
      });
      if (sub === 'backup') renderBackupView();
      if (sub === 'players') { editingPlayerId = null; renderPlayersView(); }
      if (sub === 'groups') { editingGroupId = null; renderGroupsView(); }
      if (sub === 'newgame') renderNewGameView();
      if (sub === 'history') renderHistoryView();
      if (sub === 'stats') renderStatsAggView();
    }
    document.querySelectorAll('#statsSubnav button').forEach(btn => btn.addEventListener('click', () => {
      if (btn.dataset.sub === 'newgame') editingGameId = null;
      switchStatsSub(btn.dataset.sub);
    }));

    async function runSelftest() {
      console.log('--- RUNNING SELFTEST ---');
      const results = [];
      const templates = Object.keys(BOARD_TEMPLATES);
      for (const id of templates) {
        let successes = 0;
        let fails = 0;
        let portDeficit = 0;
        let totalTime = 0;
        for (let i = 0; i < 20; i++) {
          const t0 = performance.now();
          try {
            const b = generateBoard(id, { pipBalance: true }, 'TEST-' + i);
            if (b) {
              successes++;
              const expected = Object.values(b.template.ports).reduce((a, c) => a + c, 0);
              if (b.ports.length < expected) portDeficit++;
            } else fails++;
          } catch (e) {
            fails++;
          }
          totalTime += (performance.now() - t0);
        }
        results.push({ id, successes, fails, port_deficit: portDeficit, avg_ms: (totalTime / 20).toFixed(1) });
      }
      console.table(results);
    }

    // ============================================================
    // INICIALIZACIÓN
    // ============================================================
    (async function init() {
      try {
        if (window.location.search.includes('debug')) { console.table(validateTemplates()); }
        if (window.location.search.includes('selftest')) { await runSelftest(); }
        renderExpansionSeg();
        renderFamilySeg();
        renderPlayerCountSeg();
        renderFishermenSeg();
        setupInteractiveControls();
        doGenerate();
        await loadAllData();
        switchStatsSub('players');
      } catch (err) {
        console.error('INIT ERROR:', err);
      }
    })();
  
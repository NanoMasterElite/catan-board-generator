import re

with open('main_monolith.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Force random ports
js = js.replace('opts.randomPorts !== false', 'true')
js = js.replace('randomPorts: document.getElementById(\'optRandomPorts\').checked,', '')
# Remove from toggles
js = js.replace('\'optPipBalance\', \'optRandomPorts\'', '\'optPipBalance\'')
js = js.replace('optPipBalance: \'pipBalance\', optRandomPorts: \'randomPorts\'', 'optPipBalance: \'pipBalance\'')

with open('Generador CATAN V4.3.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove UI toggle for random ports
html = re.sub(r'<label class="switch"><input type="checkbox" id="optRandomPorts" checked><span class="slider"></span></label>\s*<label class="txt" for="optRandomPorts">Puertos aleatorios \(donde sea válido\)</label>', '', html)

with open('Generador CATAN V4.3.html', 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update assignFisheries
old_fisheries = """    function assignFisheries(hexes, resourceAssignment, playerCount, rng, ports = []) {"""

new_fisheries = """    function assignFisheries(hexes, resourceAssignment, playerCount, rng, ports = []) {
      const landHexes = hexes.filter(h => resourceAssignment[h.id] && resourceAssignment[h.id] !== 'water');
      const boundaryLoops = buildBoundaryLoops(landHexes);
      
      const validSpots = [];
      boundaryLoops.forEach(loop => {
        const n = loop.length;
        for (let i = 0; i < n; i++) {
          const e1 = loop[(i - 1 + n) % n];
          const e2 = loop[i];
          if (e1.hexIds[0] === e2.hexIds[0]) {
            validSpots.push({ e1, e2, V: e2.p1, hId: e1.hexIds[0] });
          }
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

      const step = validSpots.length / totalFisheries;
      for (let i = 0; i < totalFisheries; i++) {
        let baseIdx = Math.round(i * step) % validSpots.length;
        let bestIdx = null;

        for (let offset = 0; offset < validSpots.length; offset++) {
          const idx = (baseIdx + offset) % validSpots.length;
          if (usedSpots.has(idx)) continue;
          const spot = validSpots[idx];
          
          const nearPort = portMidPoints.some(pm => Math.hypot(pm.x - spot.V.x, pm.y - spot.V.y) < 30);
          if (nearPort) continue;

          const nearFishery = fisheries.some(f => Math.hypot(f.x - spot.V.x, f.y - spot.V.y) < 55);
          if (nearFishery) continue;

          bestIdx = idx;
          break;
        }

        if (bestIdx === null) {
          for (let offset = 0; offset < validSpots.length; offset++) {
            const idx = (baseIdx + offset) % validSpots.length;
            if (!usedSpots.has(idx)) { bestIdx = idx; break; }
          }
        }

        if (bestIdx !== null) {
          usedSpots.add(bestIdx);
          const spot = validSpots[bestIdx];
          const h = hexes[spot.hId];
          const dirX = spot.V.x - h.x, dirY = spot.V.y - h.y;
          const len = Math.hypot(dirX, dirY) || 1;
          fisheries.push({
            num: shuffledTokens[i],
            x: spot.V.x, y: spot.V.y,
            outX: dirX / len, outY: dirY / len,
            p1: spot.e1.p1, p2: spot.e2.p2, v: spot.V,
            hexIds: [spot.hId]
          });
        }
      }
      return fisheries;
    }"""

js = re.sub(r'function assignFisheries\(.*?return fisheries;\n\s*\}', new_fisheries, js, flags=re.DOTALL)

# 3. Update fisheriesSvg
old_svg = """          if (f.p1 && f.p2) {
            fisheriesSvg += `<line x1="${f.p1.x.toFixed(1)}" y1="${f.p1.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
            fisheriesSvg += `<line x1="${f.p2.x.toFixed(1)}" y1="${f.p2.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
          }"""

new_svg = """          if (f.p1 && f.p2 && f.v) {
            fisheriesSvg += `<line x1="${f.p1.x.toFixed(1)}" y1="${f.p1.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
            fisheriesSvg += `<line x1="${f.v.x.toFixed(1)}" y1="${f.v.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
            fisheriesSvg += `<line x1="${f.p2.x.toFixed(1)}" y1="${f.p2.y.toFixed(1)}" x2="${fx.toFixed(1)}" y2="${fy.toFixed(1)}" stroke="#3A889F" stroke-width="2" stroke-linecap="round" stroke-dasharray="3,2" opacity="0.85"/>`;
          }"""
js = js.replace(old_svg, new_svg)

# 4. Bug 4: Lakes adjacent to the coast
# We add a check in generateBoard after assigning resources: if family is pescadores, check lakes.
lake_check = """
            if (template.family === 'pescadores') {
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
"""
# Find where subRes is evaluated. After the regions loop, we check `if (!ok) continue;`
# Let's insert the lake check right before `if (!ok) continue;` at line ~642.
js = js.replace('if (!ok) continue;', f'if (ok) {{{lake_check}}}\n          if (!ok) continue;')


with open('main_monolith.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("Changes applied.")

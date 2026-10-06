import sys

file_js = 'main_monolith.js'
file_html = 'Generador CATAN V4.3.html'

with open(file_js, 'r', encoding='utf-8') as f:
    js = f.read()

# Change 1: Scope of recalcPoints
# We need to insert `let recalcPoints = () => {};` inside `function renderNewGameView() {`
js = js.replace('function renderNewGameView() {', 'function renderNewGameView() {\n      let recalcPoints = () => {};')
# Replace `if (typeof recalcPoints === 'function') recalcPoints();` with `recalcPoints();`
js = js.replace("if (typeof recalcPoints === 'function') recalcPoints();", "recalcPoints();")

# Change 2: Update V4.1 to V4.3 in JS
js = js.replace("appVersion: '4.1'", "appVersion: '4.3'")

# Change 3 & 4: validateIslands adjacency and buildAdjacency refactor
# Refactor buildAdjacency
old_build_adj = """    function buildAdjacency(hexes) {
      const byId = {};
      hexes.forEach(h => byId[h.id] = h);
      const adj = hexes.map(() => []);
      hexes.forEach((h, i) => {
        hexes.forEach((o, j) => {
          if (i !== j) {
            const dx = h.x - o.x, dy = h.y - o.y;
            if (Math.hypot(dx, dy) < SIZE * 1.95) adj[h.id].push(o.id);
          }
        });
      });
      return adj;
    }"""
new_build_adj = """    function buildAdjacency(hexes) {
      const byCoord = new Map();
      hexes.forEach(h => byCoord.set(`${h.q},${h.r}`, h.id));
      const NEIGHBORS = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];
      const adj = hexes.map(() => []);
      hexes.forEach(h => {
        NEIGHBORS.forEach(([dq, dr]) => {
          const nb = byCoord.get(`${h.q + dq},${h.r + dr}`);
          if (nb !== undefined) adj[h.id].push(nb);
        });
      });
      return adj;
    }"""
if old_build_adj in js:
    js = js.replace(old_build_adj, new_build_adj)
else:
    # Use generic replacement if spacing is off
    import re
    js = re.sub(r'function buildAdjacency\(hexes\) \{.*?return adj;\n\s*\}', new_build_adj, js, flags=re.DOTALL)

# Refactor validateIslands
old_val_isl_sig = "function validateIslands(hexes, resourceAssignment, expectedIslands, minSize) {"
new_val_isl_sig = "function validateIslands(hexes, adjacency, resourceAssignment, expectedIslands, minSize) {"
js = js.replace(old_val_isl_sig, new_val_isl_sig)

js = js.replace("const adjacency = buildAdjacency(hexes);\n", "")

old_val_isl_call = "const islandOk = validateIslands(hexes, best.resourceAssignment, template.islandCount, template.minIslandSize);"
new_val_isl_call = "const islandOk = validateIslands(hexes, adjacency, best.resourceAssignment, template.islandCount, template.minIslandSize);"
js = js.replace(old_val_isl_call, new_val_isl_call)

# Change 5: Debug Mode (?coords, ?regions)
# Add URL parsing at the top of the file somewhere, e.g. after 'const GENERATOR_VERSION'
qs_code = """
    const qs = new URLSearchParams(location.search);
    window.DEBUG_COORDS = qs.has('coords');
    window.DEBUG_REGIONS = qs.has('regions');
"""
js = js.replace("const GENERATOR_VERSION = 3;", f"const GENERATOR_VERSION = 3;\n{qs_code}")

# Inject rendering
debug_render = """
        if (window.DEBUG_COORDS) {
          hexesSvg += `<text x="${hex.x}" y="${hex.y + 42}" text-anchor="middle" font-size="9" font-family="monospace" fill="#FFD700" style="pointer-events:none">${hex.q},${hex.r}</text>`;
        }
        if (window.DEBUG_REGIONS) {
          const regionColors = { main: '#FF6B6B', islote: '#4ECDC4', water: '#1B5A70', fog: '#718096', land: '#FFD700' };
          const region = Object.entries(board.regionHexIds).find(([k, ids]) => ids.includes(hex.id))?.[0];
          if (region) hexesSvg += `<polygon points="${points}" fill="${regionColors[region]}" opacity="0.35" pointer-events="none"/>`;
        }
        hexesSvg += `</g>`;"""
js = js.replace("hexesSvg += `</g>`;", debug_render)

with open(file_js, 'w', encoding='utf-8') as f:
    f.write(js)

# HTML Updates
with open(file_html, 'r', encoding='utf-8') as f:
    html = f.read()
html = html.replace('V4.1', 'V4.3')
with open(file_html, 'w', encoding='utf-8') as f:
    f.write(html)

print("Applied 5 fast-track changes.")

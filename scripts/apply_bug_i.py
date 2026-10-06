import re

js_file = 'main_monolith.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update pipBadness signature and body
old_pip = """    function pipBadness(hexes, numberAssignment) {
      const vertexMap = new Map();
      hexes.forEach(h => hexCorners(h).forEach(c => {
        const k = roundPt(c);
        if (!vertexMap.has(k)) vertexMap.set(k, []);
        vertexMap.get(k).push(h.id);
      }));
      const sums = [];
      vertexMap.forEach(hexIds => {
        if (hexIds.length < 2) return;
        let s = 0; hexIds.forEach(id => s += pipCount(numberAssignment[id]));
        sums.push(s);
      });
      const mean = sums.reduce((a, b) => a + b, 0) / (sums.length || 1);
      return sums.reduce((a, b) => a + (b - mean) ** 2, 0) / (sums.length || 1);
    }"""

new_pip = """    function pipBadness(vertexMap, numberAssignment) {
      const sums = [];
      vertexMap.forEach(hexIds => {
        if (hexIds.length < 2) return;
        let s = 0; hexIds.forEach(id => s += pipCount(numberAssignment[id]));
        sums.push(s);
      });
      const mean = sums.reduce((a, b) => a + b, 0) / (sums.length || 1);
      return sums.reduce((a, b) => a + (b - mean) ** 2, 0) / (sums.length || 1);
    }"""

js = js.replace(old_pip, new_pip)

# 2. Add vertexMap generation right before the attempts loop
old_loop = """        const pipBalance = !!opts.pipBalance;
        const attempts = pipBalance ? (template.id === 'seisIslas' ? 5 : (opts.pipAttempts || 15)) : 1;
        let best = null, bestScore = Infinity;

        for (let a = 0; a < attempts; a++) {"""

new_loop = """        const pipBalance = !!opts.pipBalance;
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

        for (let a = 0; a < attempts; a++) {"""

js = js.replace(old_loop, new_loop)

# 3. Update pipBadness call inside the loop
old_call = "const score = pipBalance ? pipBadness(hexes, numberAssignment) : 0;"
new_call = "const score = pipBalance ? pipBadness(vertexMap, numberAssignment) : 0;"
js = js.replace(old_call, new_call)

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)

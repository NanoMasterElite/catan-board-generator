import re

# 1. Update HTML CSS (Bug H)
html_file = 'Generador CATAN V4.3.html'
with open(html_file, 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('.svg-viewport {\n      width: 100%;\n      height: 620px;\n      cursor: grab;\n      touch-action: none;', 
                    '.svg-viewport {\n      width: 100%;\n      height: 620px;\n      cursor: grab;\n      touch-action: pan-y;')
# Also do a general replace just in case indentation differs
html = re.sub(r'(\.svg-viewport\s*{[^}]*)touch-action:\s*none;', r'\1touch-action: pan-y;', html)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(html)

# 2. Update JS (Bugs A, B, C, D, E, F, G, I)
js_file = 'main_monolith.js'
with open(js_file, 'r', encoding='utf-8') as f:
    js = f.read()

# Bug A: ZOOM_MIN
js = re.sub(r'const ZOOM_MIN = 1\.05;', 'const ZOOM_MIN = 0.85;', js)

# Bug B: var(--good)
js = js.replace("var(--good, #2e7d32)", "#2e7d32")

# Bug C: recalcPoints scopes
# Add 'let recalcPoints = () => {};' at the start of renderNewGameView
js = re.sub(r'(function renderNewGameView\(editGame = null\) {)', r'\1\n      let recalcPoints = () => {};', js)
# Change 'function recalcPoints() {' to 'recalcPoints = () => {'
js = re.sub(r'function recalcPoints\(\)\s*{', r'recalcPoints = () => {', js)

# Bug D: getEffectiveTargetVp CyC + Nav
target_vp_old = """      const isCyC = expansion.includes('Caballeros');
      if (isCyC) {
        if (!tpl || tpl.family === 'clasico') baseVp = 13;
        else baseVp = Math.max(13, baseVp + 2);
      }"""
target_vp_new = """      const isCyC = expansion.includes('Caballeros');
      if (isCyC) {
        if (tpl && tpl.targetVpCyC !== undefined) baseVp = tpl.targetVpCyC;
        else if (!tpl || tpl.family === 'clasico') baseVp = 13;
        else baseVp = Math.max(13, baseVp + 2);
      }"""
js = js.replace(target_vp_old, target_vp_new)

# Bug E: renderStatsTable parameter
js = js.replace("function renderStatsTable(preloadEntries) {", "function renderStatsTable() {")

# Bug F: btnRegisterFromSeed FAMILIES mapping
families_old = """        if (tpl?.family === 'islas' || tpl?.family === 'rumbo' || tpl?.family === 'oceania' || tpl?.family === 'desierto' || tpl?.family === 'maravillas' || tpl?.family === 'pueblo' || tpl?.family === 'telas' || tpl?.family === 'piratas' || tpl?.family === 'nuevomundo') {
          expEl.value = 'Navegantes';
        } else if (tpl?.family === 'pescadores' || tpl?.family === 'rios' || tpl?.family === 'caravanas' || tpl?.family === 'barbaros' || tpl?.family === 'mercaderes') {
          expEl.value = 'Mercaderes y Bárbaros';
        } else {
          expEl.value = 'Catán Estándar';
        }"""
families_new = """        const fam = FAMILIES.find(f => f.id === tpl?.family);
        if (fam && fam.expansion) {
          expEl.value = fam.expansion;
        } else {
          expEl.value = 'Catán Estándar';
        }"""
# Need to use regex to handle any potential encoding issues like 'Bárbaros'
js = re.sub(r'if \(tpl\?\.family === \'islas\'.*?expEl\.value = \'Cat.n Est.ndar\';\n\s*\}', families_new, js, flags=re.DOTALL)


# Bug G: restoreBoardSnapshot currentFishermenMode
fish_old = "currentFishermenMode = snap.opts.fishermenMode || 'none';"
fish_new = """const tpl = BOARD_TEMPLATES[snap.template];
        currentFishermenMode = snap.opts.fishermenMode || (tpl && tpl.autoFishermen ? 'lakes_only' : 'none');"""
js = js.replace(fish_old, fish_new)

# Bug I: pipBadness
# Change pipBadness to accept vertexMap, OR just cache it per generation.
# We will just change pipBadness to cache it globally or take it as a parameter.
# The feedback says "pipBadness recalcula vértices por intento. Cachear vertexMap una vez por generateBoard".
# Since generateBoard calls assignNumbersRegion which calls assignNumbersRegionOnce which calls ... wait, pipBadness is used WHERE?
# Let's find where pipBadness is called first. I'll just write it to the file and do it manually if needed.

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(js)
print("Applied fixes A-G to main_monolith.js and H to HTML.")

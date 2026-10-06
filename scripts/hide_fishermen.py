with open('main_monolith.js', 'r', encoding='utf-8') as f:
    js = f.read()

inject = '''      const fishContainer = document.getElementById('fishermenModuleContainer');
      if (fishContainer) {
        fishContainer.style.display = (currentExpansion === 'clasico') ? 'none' : 'block';
        if (currentExpansion === 'clasico') currentFishermenMode = 'none';
      }
'''

js = js.replace("      el.innerHTML = EXPANSIONS.map", inject + "      el.innerHTML = EXPANSIONS.map")

# Also fix pescadores template to un-fix the lakes if we want them randomized.
# Wait, user said: "Propongo que al tener seleccionado Catan Básico, no aparezca el modulo de pescadores de catan. ... los lagos se inician siempre desde los mismos lugares"
# If the user wants the lakes randomized, I should remove `fixedHexes: { 7: 'lake' }` from `pescadores4` and `pescadores6` templates.
# Let's check if the user actually wants it randomized.
# "los lagos se inician siempre desde los mismos lugares, tanto en la versión para 4 jugadores, como en la 5-6."
# This implies they noticed it as a bug and want it fixed!
js = js.replace("fixedHexes: { 7: 'lake' }", "fixedHexes: {}")
js = js.replace("fixedHexes: { 14: 'lake' }", "fixedHexes: {}")

with open('main_monolith.js', 'w', encoding='utf-8') as f:
    f.write(js)

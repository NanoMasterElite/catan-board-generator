import re

with open('Generador CATAN V4.3.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace using string find/replace safely
target = '<div class="section-title">🐟 Módulo Pescadores de Catán</div>\n          <div class="fishermen-seg" id="fishermenSeg"></div>'
replacement = '<div id="fishermenModuleContainer">\n            <div class="section-title">🐟 Módulo Pescadores de Catán</div>\n            <div class="fishermen-seg" id="fishermenSeg"></div>\n          </div>'
html = html.replace(target, replacement)

with open('Generador CATAN V4.3.html', 'w', encoding='utf-8') as f:
    f.write(html)

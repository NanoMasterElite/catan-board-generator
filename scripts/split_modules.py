import re
import os

# Define the chunks based on approximate line numbers and logical grouping
CHUNKS = {
    'geometry.js': (1, 160),
    'generator.js': (161, 734),
    'templates.js': (735, 1923),
    'render.js': (1924, 2380),
    'ui.js': (2381, 2762),
    'stats.js': (2763, 2801),
    'storage.js': (2802, 3300),  # approximation
    'main.js': (3301, 4302)      # approximation
}

# Actually, let's use a regex-based splitter that searches for section comments
# to be perfectly safe, or just read the lines directly.
with open('main_monolith.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def find_line(pattern, start=0):
    for i in range(start, len(lines)):
        if re.search(pattern, lines[i]):
            return i
    return len(lines)

# Fine-tune the boundaries dynamically
b_geometry = 0
b_generator = find_line(r'// ---------- Construcci.n de Escenarios Oficiales ----------')
b_templates = find_line(r'// ---------- ESCENARIO 1: RUMBO A NUEVAS ORILLAS') - 3
b_render = find_line(r'const RESOURCE_META') - 3
b_ui = find_line(r'function currentTemplateId') - 3
b_stats = find_line(r'const PLAYER_COLORS') - 3
b_storage = find_line(r'// ---------- Migraciones de datos ----------') - 3
b_main = find_line(r'// ---------- Eventos Iniciales ----------') - 3
if b_main == len(lines):
    b_main = find_line(r'document\.addEventListener\(') - 5

bounds = {
    'geometry.js': (b_geometry, b_generator),
    'generator.js': (b_generator, b_templates),
    'templates.js': (b_templates, b_render),
    'render.js': (b_render, b_ui),
    'ui.js': (b_ui, b_stats),
    'stats.js': (b_stats, b_storage),
    'storage.js': (b_storage, b_main),
    'main.js': (b_main, len(lines))
}

# 1. Extract content for each module and find its defined symbols
modules = {}
export_regex = re.compile(r'^(?:export\s+)?(?:const|let|var|function|class)\s+([a-zA-Z0-9_]+)')

for mod_name, (start, end) in bounds.items():
    content_lines = lines[start:end]
    content_str = "".join(content_lines)
    
    # Find defined symbols (rudimentary but works for top-level well-formatted code)
    symbols = set()
    for line in content_lines:
        line = line.strip()
        m = export_regex.match(line)
        if m:
            symbols.add(m.group(1))
            
    modules[mod_name] = {
        'lines': content_lines,
        'content': content_str,
        'exports': symbols,
        'imports': {}  # mod_name -> set of symbols
    }

# Make sure we don't treat JS built-ins as our symbols
builtins = {'Math', 'Object', 'Set', 'Map', 'Array', 'document', 'window', 'console', 'String', 'Number', 'JSON', 'localStorage', 'URLSearchParams', 'location', 'Date', 'setTimeout', 'clearTimeout'}
all_exports = {}
for mod_name, data in modules.items():
    for sym in data['exports']:
        if sym not in builtins:
            all_exports[sym] = mod_name

# 2. Resolve imports
usage_regex = re.compile(r'\b([a-zA-Z0-9_]+)\b')
for mod_name, data in modules.items():
    used_symbols = set(usage_regex.findall(data['content']))
    for sym in used_symbols:
        if sym in all_exports and all_exports[sym] != mod_name:
            source_mod = all_exports[sym]
            if source_mod not in data['imports']:
                data['imports'][source_mod] = set()
            data['imports'][source_mod].add(sym)

# 3. Write files with imports and exports
for mod_name, data in modules.items():
    with open(mod_name, 'w', encoding='utf-8') as f:
        # Write imports
        for source_mod, syms in data['imports'].items():
            if syms:
                f.write(f"import {{ {', '.join(sorted(list(syms)))} }} from './{source_mod}';\n")
        f.write("\n")
        
        # Write content, injecting 'export ' for all defined symbols
        # (Only top-level declarations that we identified)
        for line in data['lines']:
            stripped = line.strip()
            m = export_regex.match(stripped)
            if m and m.group(1) in data['exports']:
                if not stripped.startswith('export '):
                    line = re.sub(r'^(const|let|var|function|class)\b', r'export \1', line)
            f.write(line)

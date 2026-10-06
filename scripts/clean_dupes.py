with open('main_monolith.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if line.strip() == 'if (ok) {':
        skip = True
    
    if skip and 'if (!ok) continue;\\n' in line:
        skip = False
        continue
        
    if not skip:
        new_lines.append(line)

with open('main_monolith.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

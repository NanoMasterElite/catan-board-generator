import re

html_file = 'Generador CATAN V4.3.html'
with open(html_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Find all script tags
scripts = list(re.finditer(r'<script\b[^>]*>(.*?)</script>', content, re.DOTALL | re.IGNORECASE))
if not scripts:
    print('No scripts found')
    exit(1)

# Find the largest script tag by content length
main_script_match = max(scripts, key=lambda m: len(m.group(1)))
script_inner = main_script_match.group(1)
full_script_tag = main_script_match.group(0)

# Write inner JS to a temporary monolith file
with open('main_monolith.js', 'w', encoding='utf-8') as f:
    f.write(script_inner)

# Replace the giant script tag with our new module entry point
new_script_tag = '<script type="module" src="main.js"></script>'
new_content = content.replace(full_script_tag, new_script_tag)

with open(html_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Extracted {len(script_inner.splitlines())} lines of JS into main_monolith.js")

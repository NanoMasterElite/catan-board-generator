with open('Generador CATAN V4.3.html', 'r', encoding='utf-8') as f:
    content = f.read()
new_content = content.replace('<script type="module" src="main.js"></script>', '<script src="main_monolith.js"></script>')
with open('Generador CATAN V4.3.html', 'w', encoding='utf-8') as f:
    f.write(new_content)

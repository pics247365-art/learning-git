with open('puzzle-roxy.html', 'r', encoding='utf-8') as f:
    html = f.read()

html = html.replace('<span>✅ <span id="ok">0</span>/64</span>', '<span>✅ <span id="ok">0</span>/36</span>')

with open('puzzle-roxy.html', 'w', encoding='utf-8') as f:
    f.write(html)

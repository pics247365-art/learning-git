with open('puzzle-roxy.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Since 400 doesn't divide by 6 evenly (66.666...), let's make SZ=360 and SPX=60 so it divides nicely into 6 pieces
html = html.replace('const GRID=6, SPX=50, SZ=400;', 'const GRID=6, SPX=60, SZ=360;')

with open('puzzle-roxy.html', 'w', encoding='utf-8') as f:
    f.write(html)

import re

with open('puzzle-roxy.html', 'r', encoding='utf-8') as f:
    html = f.read()

assert "const GRID=6, SPX=60, SZ=360;" in html, "Grid setup is missing"
assert "length:36" in html, "Array initialization is missing"
assert "ok/36" in html, "Progress calculation is missing"
assert "36 חלקים" in html, "Header text is missing"
assert "id=\"ok\">0</span>/36" in html, "OK status text is missing"
assert "const B64" in html, "B64 string is missing"

print("All sanity check assertions passed!")

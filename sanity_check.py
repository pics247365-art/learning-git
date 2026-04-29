from bs4 import BeautifulSoup

with open('puzzle-roxy.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

print("Title:", soup.title.string)
print("Stats ok span:", soup.find(id='ok').parent.text)

# Check script variables roughly
script_tag = soup.find_all('script')[-1]
script_content = script_tag.string

assert "const GRID=6, SPX=60, SZ=360;" in script_content
assert "length:36" in script_content
assert "ok/36" in script_content

print("All sanity checks passed!")

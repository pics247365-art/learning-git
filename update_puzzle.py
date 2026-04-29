import re
import base64

with open('/tmp/file_attachments/IMG_20260414_211700.JPEG.jpg', 'rb') as f:
    img_data = f.read()
    b64_str = base64.b64encode(img_data).decode('utf-8')

with open('puzzle-roxy.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the B64 string
html = re.sub(r"const B64='[^']+';", f"const B64='{b64_str}';", html)

# Change grid and size
html = html.replace('GRID=8', 'GRID=6')
html = html.replace('64 חלקים', '36 חלקים')
html = html.replace('length:64', 'length:36')
html = html.replace('ok/64', 'ok/36')
html = html.replace('0/64', '0/36')

with open('puzzle-roxy.html', 'w', encoding='utf-8') as f:
    f.write(html)

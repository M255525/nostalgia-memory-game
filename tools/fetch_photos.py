# 依 photo_list.json（題目 id → Commons 檔名）下載照片，縮成寬 1000 的 JPG，並寫出 photos.js（作者／授權／來源）。
# 只收 CC0／公有領域／CC BY／CC BY-SA；授權不符就中止，不要放寬。
import html, io, json, os, re, sys, time, urllib.parse, urllib.request
from PIL import Image
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', line_buffering=True)
UA = {'User-Agent': 'nostalgia-memory-game-build/1.0 (https://github.com/M255525)'}
OK = re.compile(r'^(CC0|Public domain|PD.*|CC BY(-SA)? [0-9.]+.*)$', re.I)
here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, '..')

def get(url):
    for i in range(5):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read()
        except Exception as e:
            if i == 4: raise
            time.sleep(3 + i * 3)

picks = json.load(open(os.path.join(here, 'photo_list.json'), encoding='utf-8'))
out = {}
for pid, title in picks.items():
    q = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata', 'iiurlwidth': 1000, 'titles': title})
    pg = next(iter(json.loads(get(q))['query']['pages'].values()))
    ii = pg['imageinfo'][0]; md = ii.get('extmetadata', {})
    lic = md.get('LicenseShortName', {}).get('value', '')
    if not OK.match(lic): sys.exit('授權不符 ' + pid + ' ' + lic)
    art = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', md.get('Artist', {}).get('value', '')))).strip()[:60] or '佚名'
    if art.lower().startswith('unknown'): sys.exit('作者不明，不收 ' + pid)
    im = Image.open(io.BytesIO(get(ii['thumburl']))).convert('RGB')
    im.thumbnail((1000, 1000), Image.LANCZOS)
    im.save(os.path.join(root, 'photos', pid + '.jpg'), quality=80, optimize=True, progressive=True)
    out[pid] = {'title': re.sub(r'\.[a-zA-Z]+$', '', title[5:]), 'author': art, 'license': lic, 'licenseUrl': md.get('LicenseUrl', {}).get('value', ''), 'page': ii['descriptionurl'], 'w': im.width, 'h': im.height}
    print(pid, im.size, lic, art)
    time.sleep(.4)
js = '/* 照片取自 Wikimedia Commons，由 tools/fetch_photos.py 產生，不要手改。 */\nvar PHOTOS = ' + json.dumps(out, ensure_ascii=False, indent=0) + ';\n'
open(os.path.join(root, 'photos.js'), 'w', encoding='utf-8', newline='\n').write(js)
print('total', len(out))

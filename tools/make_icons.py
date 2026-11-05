# 產生 PWA 圖示：紅色戳戳樂紙，九個洞，中間一個戳開露出糖果
import os
from PIL import Image, ImageDraw

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')


def draw(size, pad):
    s = 4 * size
    im = Image.new('RGB', (s, s), '#B5121B')
    d = ImageDraw.Draw(im)
    x0, x1 = pad * s, (1 - pad) * s
    w = x1 - x0
    d.rounded_rectangle([x0, x0, x1, x1], radius=w * .07, fill='#FFF4D9')
    cols = ['#B5121B', '#00796B', '#C2185B', '#0D5AA7']
    r = w * .125
    for i in range(9):
        cx = x0 + w * (.2 + .3 * (i % 3))
        cy = x0 + w * (.2 + .3 * (i // 3))
        if i == 4:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#472810')
            k = r * .5
            d.ellipse([cx - k, cy - k, cx + k, cy + k], fill='#FFC928')
        else:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=cols[i % 4])
    return im.resize((size, size), Image.LANCZOS)


draw(192, .08).save(os.path.join(out, 'icon-192.png'))
draw(512, .08).save(os.path.join(out, 'icon-512.png'))
draw(512, .18).save(os.path.join(out, 'icon-maskable-512.png'))

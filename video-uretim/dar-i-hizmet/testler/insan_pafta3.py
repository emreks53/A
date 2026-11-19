"""Pafta 3: yürüyüş döngüsü, 8 faz (ayaklar yerde kaymasın diye figür YURUYUS_ADIM hızıyla ilerletilir)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
boy = int(sys.argv[1]) if len(sys.argv) > 1 else 500
s = boy / 600
parca = []
for i in range(8):
    f = i / 8
    p = insan.yuruyus(f)
    img, c, dt = tek(p, boy, x=540, y=H - 300)
    parca.append(kirp(img, int(540 - 150 * s), int(H - 300 - 640 * s), int(540 + 190 * s), int(H - 300 + 40 * s)))
pafta(parca, f'insan_pafta3_yuruyus_{boy}', [f'faz {i}/8' for i in range(8)], sutun=8)
# ayak kayması denetimi: basan ayağın dünya x'i sabit mi?
xs = []
for i in range(0, 33):
    f = i / 32
    sk = insan.iskelet(insan.yuruyus(f))
    yer = insan.YURUYUS_ADIM * f
    top = insan._nokta(sk['M_ayak_on'], (insan.TOP_X, 26.0)) + (yer, 0)
    top2 = insan._nokta(sk['M_ayak_on'], (insan.TOPUK_X, 26.0)) + (yer, 0)
    xs.append((round(f, 3), round(top[0], 1), round(top[1], 1), round(top2[0], 1), round(top2[1], 1)))
for r in xs[:22]:
    print(r)

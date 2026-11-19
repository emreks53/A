"""Ek karışım denetimi: kiyam->ruku (ayak sabit), ayakta->sula, yuruyus->ayakta, oturus_hasta->oturus_dik."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
P = insan.POZLAR
satirlar = [('kiyam->ruku', lambda t: insan.poz_karistir(P['kiyam'], P['ruku'], t, sabit='ayak_on')),
            ('ayakta->sula', lambda t: insan.poz_karistir(P['ayakta'], P['sula'], t, sabit='ayak_on')),
            ('yuruyus(0.5)->ayakta', lambda t: insan.poz_karistir(insan.yuruyus(0.5), P['ayakta'], t)),
            ('ruku->secde', lambda t: insan.poz_yolu([P['ruku'], P['kiyam']], t))]
boy = 300
s = boy / 600
parca, et = [], []
for ad, fn in satirlar[:3]:
    for i in range(5):
        t = i / 4
        img, c, dt = tek(fn(t), boy, x=500, y=H - 300)
        parca.append(kirp(img, int(500 - 160 * s), int(H - 300 - 640 * s), int(500 + 330 * s), int(H - 300 + 30 * s)))
        et.append(f'{ad} {t:.2f}')
pafta(parca, 'insan_karisim', et, sutun=5)

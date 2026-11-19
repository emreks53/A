"""insan.py test yardımcıları: pozları tek tek tuvale çizip kırpar, yan yana pafta yapar."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import Tuval, M_bilesik, M_oteleme, M_olcek, son_islem, rgb8, yol_dikdortgen, W, H
import insan

CIKTI = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler'


def zemin(T, y, x0=0, x1=W):
    T.lavi(yol_dikdortgen(x0 - 20, y, x1 + 20, y + 26), np.eye(3), '#E2D3BB', yog=0.55, kenar=1.4, dalga=0.12,
           islak=0.5, islak_gen=4, gran=0.14, akis=0.12, tohum=3)


def tek(poz, boy_px, x=540, y=None, yon=1, isik=(-0.6, -0.8), zemin_ciz=True, **kw):
    """Figürü boy_px yüksekliğinde (ayakta boy) çizer; dönüş: (rgb, capalar, süre)."""
    T = Tuval()
    s = boy_px / insan.BOY
    y = y if y is not None else H - 260
    M = M_bilesik(M_oteleme(x, y), M_olcek(s))
    t0 = time.time()
    c = insan.ciz_insan(T, M, poz, yon=yon, isik=isik, **kw)
    dt = time.time() - t0
    if zemin_ciz:
        zemin(T, y)
    return rgb8(son_islem(T.R, vinyet=False)), c, dt


def kirp(img, x0, y0, x1, y1):
    return img[max(0, y0):y1, max(0, x0):x1]


def pafta(parcalar, ad, etiketler=None, bosluk=10, arka=(244, 240, 233), sutun=None):
    if sutun and len(parcalar) > sutun:
        satirlar = []
        for i in range(0, len(parcalar), sutun):
            et = etiketler[i:i + sutun] if etiketler else None
            satirlar.append(pafta(parcalar[i:i + sutun], None, et, bosluk, arka))
        w = max(r.shape[1] for r in satirlar)
        satirlar = [np.hstack([r, np.full((r.shape[0], w - r.shape[1], 3), arka, np.uint8)]) for r in satirlar]
        out = np.vstack(satirlar)
        if ad:
            cv2.imwrite(f'{CIKTI}/{ad}.png', cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
        return out
    h = max(p.shape[0] for p in parcalar)
    cols = []
    for i, p in enumerate(parcalar):
        if p.shape[0] < h:
            pad = np.full((h - p.shape[0], p.shape[1], 3), arka, np.uint8)
            p = np.vstack([pad, p])
        p = p.copy()
        if etiketler:
            cv2.putText(p, etiketler[i], (6, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (90, 80, 80), 1, cv2.LINE_AA)
        cols.append(p)
        cols.append(np.full((h, bosluk, 3), arka, np.uint8))
    out = np.hstack(cols[:-1])
    if ad:
        cv2.imwrite(f'{CIKTI}/{ad}.png', cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
    return out

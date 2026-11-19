"""esyalar.py test yardımcıları."""
import sys, time
sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import Tuval, M_bilesik, M_oteleme, M_olcek, M_donme, son_islem, rgb8, yol_dikdortgen, W, H
import importlib
import esyalar
importlib.reload(esyalar)

CIKTI = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler'


def bitir(T):
    return rgb8(son_islem(T.R, vinyet=False))


def kirp(img, x0, y0, x1, y1):
    return img[max(0, y0):y1, max(0, x0):x1]


def etiket(img, s):
    img = img.copy()
    cv2.putText(img, s, (8, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (90, 80, 80), 1, cv2.LINE_AA)
    return img


def pafta(parcalar, ad, sutun=None, bosluk=8, arka=(244, 240, 233)):
    if sutun is None:
        sutun = len(parcalar)
    satirlar = []
    for i in range(0, len(parcalar), sutun):
        ps = parcalar[i:i + sutun]
        h = max(p.shape[0] for p in ps)
        cols = []
        for p in ps:
            if p.shape[0] < h:
                p = np.vstack([p, np.full((h - p.shape[0], p.shape[1], 3), arka, np.uint8)])
            cols += [p, np.full((h, bosluk, 3), arka, np.uint8)]
        satirlar.append(np.hstack(cols[:-1]))
    w = max(r.shape[1] for r in satirlar)
    satirlar = [np.hstack([r, np.full((r.shape[0], w - r.shape[1], 3), arka, np.uint8)]) for r in satirlar]
    rows = []
    for r in satirlar:
        rows += [r, np.full((bosluk, w, 3), arka, np.uint8)]
    out = np.vstack(rows[:-1])
    cv2.imwrite(f'{CIKTI}/{ad}.png', cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
    return out


def zum(img, x0, y0, x1, y1, f=3, ad=None):
    c = img[y0:y1, x0:x1]
    c = cv2.resize(c, None, fx=f, fy=f, interpolation=cv2.INTER_CUBIC)
    if ad:
        cv2.imwrite(f'{CIKTI}/{ad}.png', cv2.cvtColor(c, cv2.COLOR_RGB2BGR))
    return c


class Sure:
    def __init__(self, ad):
        self.ad = ad

    def __enter__(self):
        self.t = time.time()

    def __exit__(self, *a):
        print(f'{self.ad}: {time.time() - self.t:.3f} s')

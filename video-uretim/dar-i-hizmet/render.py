"""Kareleri çok çekirdekte üretir.

python3 render.py --bas 0 --son 1020 [--adim 1] [--is 4] [--cikti DIZIN]
Her kare: sahne.kare(V) -> son işlem -> mana altyazıları -> PNG.
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from multiprocessing import Pool

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

VARSAYILAN = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/kareler'


def _bir_kare(args):
    i, cikti, ustune_yaz = args
    yol = os.path.join(cikti, f'{i:05d}.png')
    if os.path.exists(yol) and not ustune_yaz:
        return i, 0.0
    import sahne  # her işçide bir kez yüklenir
    t0 = time.time()
    rgb = sahne.kare_son(i / sahne.FPS)
    cv2.imwrite(yol, cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_PNG_COMPRESSION, 1])
    return i, time.time() - t0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bas', type=int, default=0)
    ap.add_argument('--son', type=int, default=None)
    ap.add_argument('--adim', type=int, default=1)
    ap.add_argument('--is', dest='isci', type=int, default=4)
    ap.add_argument('--cikti', default=VARSAYILAN)
    ap.add_argument('--ustune', action='store_true')
    ap.add_argument('--kareler', default=None, help='virgülle ayrılmış kare numaraları')
    a = ap.parse_args()
    os.makedirs(a.cikti, exist_ok=True)
    import sahne
    son = a.son if a.son is not None else sahne.KARE_SAYISI
    if a.kareler:
        liste = [int(x) for x in a.kareler.split(',')]
    else:
        liste = list(range(a.bas, son, a.adim))
    t0 = time.time()
    with Pool(a.isci) as p:
        for n, (i, s) in enumerate(p.imap_unordered(_bir_kare, [(i, a.cikti, a.ustune) for i in liste])):
            if n % 20 == 0:
                print(f'{n + 1}/{len(liste)} kare {i} {s:.2f}s  toplam {time.time() - t0:.0f}s', flush=True)
    print(f'bitti: {len(liste)} kare, {time.time() - t0:.0f}s', flush=True)


if __name__ == '__main__':
    main()

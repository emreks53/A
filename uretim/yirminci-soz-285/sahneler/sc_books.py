# -*- coding: utf-8 -*-
"""S13: Kaynak — gerçek çekim (Blender/Cycles) üzerine zarif künye: Risale-i Nur · Sözler · Yirminci Söz · 285. Sayfa."""
import glob, math, os
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, features
from wc import srgb2lin, lin2srgb, ease, ramp, sstep

PHOTO = True
HERE = os.path.dirname(os.path.abspath(__file__))
BOOKS = os.path.join(HERE, '..', 'books')
FONTS = os.path.join(HERE, '..', 'fonts')
T0 = 36.1
W, H = 1080, 1920
FPS = 30


def _font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size,
                              layout_engine=ImageFont.Layout.RAQM if features.check('raqm') else None)


def _text_sprite(text, font, size, spacing=0.0):
    f = _font(font, size)
    if spacing:
        # harf aralığı: karakter karakter
        widths = [f.getlength(c) for c in text]
        total = sum(widths) + spacing * size * (len(text) - 1)
        asc, desc = f.getmetrics()
        w, h = int(total + 80), int(asc + desc + 80)
        im = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(im)
        x = 40
        for c, cw in zip(text, widths):
            d.text((x, 40), c, font=f, fill=255)
            x += cw + spacing * size
    else:
        l, t, r, b = f.getbbox(text)
        w, h = r - l + 80, b - t + 80
        im = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(im)
        d.text((40 - l, 40 - t), text, font=f, fill=255)
    m = np.asarray(im).astype(np.float32) / 255.0
    ys, xs = np.nonzero(m > 0.05)
    cy = (ys.min() + ys.max()) / 2 if len(ys) else h / 2
    return m, cy


LINES = [  # (metin, yazı tipi, boy, harf aralığı, merkez y, renk, belirme)
    ('RİSALE-İ NUR', 'EBGaramond-SemiBold.ttf', 54, 0.2, 1322, (244, 228, 190), 36.78),
    ('Sözler', 'EBGaramond-SemiBold.ttf', 124, 0.0, 1448, (253, 247, 234), 37.08),
    ('Yirminci Söz', 'EBGaramond-MediumItalic.ttf', 74, 0.0, 1566, (250, 240, 220), 37.38),
    ('285. Sayfa', 'EBGaramond-SemiBold.ttf', 58, 0.1, 1656, (244, 228, 190), 37.68),
]


BOOKS2 = os.path.join(HERE, '..', 'books2')


def load():
    A = {}
    hero2 = os.path.join(BOOKS2, 'hero.png')
    if os.path.exists(hero2):
        A['frames'] = []
        A['hero'] = hero2
    else:
        A['frames'] = sorted(glob.glob(os.path.join(BOOKS, 'frames', 'f_*.png')))
        hero = os.path.join(BOOKS, 'hero.png')
        A['hero'] = hero if os.path.exists(hero) else None
    A['lines'] = []
    for text, font, size, sp, y, col, t0 in LINES:
        m, cy = _text_sprite(text, font, size, sp)
        sh = cv2.GaussianBlur(cv2.dilate(m, np.ones((3, 3), np.uint8)), (0, 0), 9)
        A['lines'].append(dict(m=m, sh=sh, cy=cy, y=y, col=np.array(col, np.float32) / 255.0, t0=t0))
    A['cache'] = {}
    return A


def _photo(t, A):
    fr = A['frames']
    if fr:
        i = int(round((t - T0) * FPS))
        i = min(max(i, 0), len(fr) - 1)
        if i not in A['cache']:
            if len(A['cache']) > 6:
                A['cache'].clear()
            A['cache'][i] = cv2.imread(fr[i])[..., ::-1].astype(np.float32) / 255.0
        return A['cache'][i]
    if A['hero']:
        if 'hero_img' not in A:
            A['hero_img'] = cv2.imread(A['hero'])[..., ::-1].astype(np.float32) / 255.0
        img = A['hero_img']
        u = ease(ramp(t, T0, T0 + 7.2, 'lin'), 'io')
        h, w = img.shape[:2]
        # yavaş, dengeli kamera itişi (kaynak 1296x2304 → 1080x1920 kırpma), hafif yatay kayma
        base = W / w * 1.0 if w <= W * 1.05 else 1.0
        z0 = W / w * 1.001
        z1 = W / w * 1.068
        z = z0 + (z1 - z0) * u
        cx = w / 2 + 8 * u
        cy = 1152 + 48 * u
        M = np.array([[z, 0, W / 2 - z * cx], [0, z, H / 2 - z * cy]], np.float32)
        out = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_AREA if z < 1 else cv2.INTER_CUBIC,
                             borderMode=cv2.BORDER_REFLECT)
        # hafif sinema renk ayarı: sıcak orta tonlar, yumuşak S eğrisi
        out = np.clip(out, 0, 1)
        out = out + 0.06 * (out - out ** 2) * (out - 0.5) * 4 * 0 + 0.035 * np.sin(np.pi * out) * (out - 0.45)
        out = out * np.array([1.012, 1.0, 0.982], np.float32)
        # kare kare değişen ince film greni
        rng = np.random.default_rng(int(t * FPS) + 7)
        g = rng.normal(0, 1, (H // 2, W // 2)).astype(np.float32)
        g = cv2.resize(g, (W, H), interpolation=cv2.INTER_LINEAR)
        return np.clip(out + g[..., None] * 0.010, 0, 1)
    return np.full((H, W, 3), 0.85, np.float32)


def draw_photo(t, A):
    img = _photo(t, A).copy()
    # alt yazı bölgesi için yumuşak karartma (masaya doğru), yazının okunurluğu
    yy = np.arange(H, dtype=np.float32)[:, None, None]
    dim = sstep(1150, 1520, yy) * 0.46 * ramp(t, 36.6, 37.3, 'io')
    img = img * (1 - dim)
    for L in A['lines']:
        a = ease(ramp(t, L['t0'], L['t0'] + 0.55, 'lin'), 'o')
        if a <= 0:
            continue
        m, sh = L['m'], L['sh']
        sharp = ease(ramp(t, L['t0'], L['t0'] + 0.45, 'lin'), 'o')
        mm = cv2.GaussianBlur(m, (0, 0), 2.6) * (1 - sharp) + m * sharp
        h, w = m.shape
        x0 = int(W / 2 - w / 2)
        y0 = int(L['y'] - L['cy'] + (1 - a) * 18)
        ys0, ys1 = max(0, y0), min(H, y0 + h)
        xs0, xs1 = max(0, x0), min(W, x0 + w)
        sub_m = mm[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0][..., None] * a
        sub_s = sh[ys0 - y0:ys1 - y0, xs0 - x0:xs1 - x0][..., None] * a * 0.75
        R = img[ys0:ys1, xs0:xs1]
        R[:] = R * (1 - sub_s)
        R[:] = R * (1 - sub_m) + L['col'][None, None, :] * sub_m
    # ince altın çizgi (RİSALE-İ NUR altında), ortadan dışa çizilir
    g = ease(ramp(t, 36.98, 37.5, 'lin'), 'io')
    if g > 0:
        half = int(78 * g)
        y = 1374
        col = np.array([233, 211, 160], np.float32) / 255.0
        img[y - 1:y + 1, 540 - half:540 + half] = img[y - 1:y + 1, 540 - half:540 + half] * 0.25 + col * 0.75
        img[y + 1:y + 3, 540 - half:540 + half] *= 0.85
    return srgb2lin(np.clip(img, 0, 1))

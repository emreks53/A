# -*- coding: utf-8 -*-
"""Lügat (günümüz Türkçesi karşılığı): kutusuz, zarif alt yazı; ilk sesle birlikte belirir."""
import json, math, os
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont, features
from wc import sstep, ease, ramp, srgb2lin, hex2rgb

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, '..', 'fonts')
W, H = 1080, 1920

FONT = os.path.join(FONT_DIR, 'CormorantGaramond-SemiBoldItalic.ttf')
SIZE = 78
INK = np.array([33, 29, 58], np.float32) / 255.0      # mürekkep laciverdi
PAPER = np.array([251, 250, 245], np.float32) / 255.0
BASE_Y = 1428          # ilk satırın orta çizgisi (%74)
LINE_H = 92
LEAD = 0.04            # ilk sesten bu kadar önce başlar
FADE_IN = 0.2
OUT = 0.14             # yeni lügat gelince eskisinin sönme süresi
HOLD = 2.5


class GlossSprite:
    def __init__(self, text, size=SIZE, font=FONT):
        f = ImageFont.truetype(font, size, layout_engine=ImageFont.Layout.RAQM if features.check('raqm') else None)
        l, t, r, b = f.getbbox(text)
        pad = 48
        w, h = r - l + 2 * pad, b - t + 2 * pad
        im = Image.new('L', (w, h), 0)
        d = ImageDraw.Draw(im)
        d.text((pad - l, pad - t), text, font=f, fill=255)
        m = np.asarray(im).astype(np.float32) / 255.0
        self.mask = m
        # ortalama: x harf kutusunun ortası, y x-yüksekliğinin ortası
        asc = f.getbbox('x')
        self.cx = w / 2
        self.cy = pad - t + (asc[1] + asc[3]) / 2 - t * 0  # yaklaşık
        k = np.ones((3, 3), np.uint8)
        dil = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
        self.halo = np.clip(cv2.GaussianBlur(dil, (0, 0), 14) * 1.25, 0, 1)
        self.soft = cv2.GaussianBlur(m, (0, 0), 2.2)
        self.w, self.h = w, h


class Glosses:
    def __init__(self, timing_path):
        d = json.load(open(timing_path))
        self.items = []
        for g in d['glosses']:
            self.items.append(dict(text=g['text'], on=g['onset'] - LEAD, sprite=GlossSprite(g['text'])))
        self.items.sort(key=lambda x: x['on'])
        for i, it in enumerate(self.items):
            it['end'] = it['on'] + HOLD

    def overlay(self, rgb, t):
        """rgb: float32 sRGB (H,W,3) 0..1 — yerinde değiştirir."""
        for i, it in enumerate(self.items):
            on = it['on']
            if t < on or t > it['end'] + 0.5:
                continue
            a_in = ease(min(1.0, (t - on) / FADE_IN), 'o')
            # yeni lügat gelirken eskisi ekrandan gider: aynı anda hafifçe yukarı kayıp söner (yığılma yok)
            leave = 0.0
            if i + 1 < len(self.items) and t >= self.items[i + 1]['on']:
                leave = ease(min(1.0, (t - self.items[i + 1]['on']) / OUT), 'o')
                if leave >= 1.0:
                    continue
            a_out = 1.0 - ramp(t, it['end'], it['end'] + 0.45, 'io')
            alpha = max(0.0, a_in * a_out * (1.0 - leave))
            if alpha <= 0.003:
                continue
            sc = 1.0
            y = BASE_Y + (1 - a_in) * 34 - leave * 26
            sp = it['sprite']
            sharp = ease(min(1.0, (t - on) / 0.26), 'o')
            mask = sp.soft * (1 - sharp) + sp.mask * sharp
            self._blit(rgb, sp, mask, 540, y, sc, alpha)

    @staticmethod
    def _blit(rgb, sp, mask, cx, cy, sc, alpha):
        M = np.array([[sc, 0, cx - sp.cx * sc], [0, sc, cy - sp.cy * sc]], np.float32)
        x0 = int(max(0, math.floor(cx - sp.cx * sc) - 2))
        y0 = int(max(0, math.floor(cy - sp.cy * sc) - 2))
        x1 = int(min(W, math.ceil(cx + (sp.w - sp.cx) * sc) + 2))
        y1 = int(min(H, math.ceil(cy + (sp.h - sp.cy) * sc) + 2))
        if x1 <= x0 or y1 <= y0:
            return
        M[0, 2] -= x0
        M[1, 2] -= y0
        st = np.stack([mask, sp.halo], 2)
        out = cv2.warpAffine(st, M, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderValue=0)
        a_t = (out[..., 0] * alpha)[..., None]
        a_h = (out[..., 1] * alpha * 0.82)[..., None]
        R = rgb[y0:y1, x0:x1]
        R[:] = R * (1 - a_h) + PAPER[None, None, :] * a_h
        R[:] = R * (1 - a_t) + INK[None, None, :] * a_t

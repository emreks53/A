#!/usr/bin/env python3
"""Finish the AI-generated ending photo so every detail is exact (colours, lettering, page text).

python3 ending/finish_photo.py PHOTO SPEC.json OUT.png [--debug DIR]

All coordinates in SPEC are pixels of PHOTO. Steps, in this order:

 1. "regions": recolour a polygon to an exact hex colour while keeping the photo's light.
      {"poly": [[x,y],...], "hex": "#D68661", "flatten": 0, "feather": 2.0, "grain": 0.8, "pct": 70, "spec": 0.6}
    The region's lit level (pct-th percentile of L*) is mapped to the target's L*; hue and chroma become the target's
    (chroma follows the shading, so shadows stay natural); bright desaturated speculars are partly kept (spec).
    flatten=k (odd px) first removes AI lettering / ornaments (median of L* with a k px kernel) and adds back a fine
    grain (grain = L* amplitude). "hex": null with flatten>0 only cleans the region (keeps its own colour), e.g. to
    wipe gibberish text off a page before real text is set.

 2. "decals": stamp a mask onto a surface quad in perspective.
      {"tex": "ending/tex/quran_cover.png", "channel": 0, "height": 1, "src": [x0,y0,x1,y1],
       "quad": [TL,TR,BR,BL], "kind": "white"|"gold"|"ink", "ink": "#F6F3EC", "emboss": 0.25, "blur": 0, "opacity": 1}
    white: ink lit by the surface's own light (Qur'an calligraphy and ornaments); gold: foil lit by the surface light
    with a little sparkle; ink: print on paper (multiply). emboss darkens the pressed halo (height channel, 1 = surface).

 3. "titles": like decals, but the mask is typeset here: {"lines": ["SÖZLER"], "quad": [...], "kind": "gold",
    "font": "EBGaramondSemiBold.ttf", "frame": true, "track": 0.08}.

 4. "pages": typeset real text on a curved open page: {"top": [[x,y],...], "bottom": [[x,y],...] (both left→right),
    "text": "...", "side": "right", "pageno": "155", "header": "...", "size": 44, "lines_from": 0, "blur": 0}.
    The text is laid out flat (justified, paragraph indents, Arabic lines centred with correct shaping) and mapped
    through a ruled-surface mesh between the two edge polylines (piecewise affine), so lines follow the page's curl.

Everything is antialiased (masks built at 3-4x and resampled down) and softened by 0.35 px to sit in the photo's own
sharpness; use "blur" for areas out of focus."""
import argparse
import json
import math
import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FONTS = os.path.join(ROOT, 'fonts')
RNG = np.random.default_rng(155)


# ------------------------------------------------------------------ colour helpers
def hex2rgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


def to_lab(rgb):
    return cv2.cvtColor(np.ascontiguousarray(rgb, np.float32), cv2.COLOR_RGB2Lab)


def to_rgb(lab):
    return np.clip(cv2.cvtColor(np.ascontiguousarray(lab, np.float32), cv2.COLOR_Lab2RGB), 0, 1)


def hex2lab(h):
    return to_lab(hex2rgb(h)[None, None])[0, 0]


# ------------------------------------------------------------------ geometry helpers
def bbox(pts, W, H, m=6):
    p = np.asarray(pts, np.float32)
    x0, y0 = np.floor(p.min(0)) - m
    x1, y1 = np.ceil(p.max(0)) + m
    return int(max(0, x0)), int(max(0, y0)), int(min(W, x1)), int(min(H, y1))


def poly_mask(shape, poly, feather=1.5, S=4):
    """Antialiased, feathered polygon mask (float 0..1, full image size)."""
    H, W = shape
    x0, y0, x1, y1 = bbox(poly, W, H, m=int(3 * feather) + 4)
    m = np.zeros(((y1 - y0) * S, (x1 - x0) * S), np.uint8)
    p = ((np.asarray(poly, np.float64) - [x0, y0]) * S).round().astype(np.int32)
    cv2.fillPoly(m, [p], 255, lineType=cv2.LINE_AA)
    m = cv2.resize(m, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA).astype(np.float32) / 255
    if feather > 0:
        m = cv2.GaussianBlur(m, (0, 0), feather)
    out = np.zeros((H, W), np.float32)
    out[y0:y1, x0:x1] = m
    return out


def polyline_at(pl, u):
    """Point at arclength fraction u (array) of a polyline."""
    pl = np.asarray(pl, np.float64)
    seg = np.hypot(*np.diff(pl, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    s = np.asarray(u) * cum[-1]
    x = np.interp(s, cum, pl[:, 0])
    y = np.interp(s, cum, pl[:, 1])
    return np.stack([x, y], -1)


def warp_quad(mask, src_quad, dst_quad, shape, ss=3):
    """Perspective-warp a float mask (src_quad corners TL,TR,BR,BL in mask px) onto dst_quad (image px)."""
    H, W = shape
    x0, y0, x1, y1 = bbox(dst_quad, W, H, m=4)
    src = np.asarray(src_quad, np.float32)
    dst = ((np.asarray(dst_quad, np.float32) - [x0, y0]) * ss).astype(np.float32)
    e_src = max(np.hypot(*(src[1] - src[0])), np.hypot(*(src[3] - src[0])))
    e_dst = max(np.hypot(*(dst[1] - dst[0])), np.hypot(*(dst[3] - dst[0])))
    f = e_dst / max(e_src, 1)
    if f < 0.6:                                   # pre-shrink the source (area filter) to avoid aliasing
        k = min(1.0, f * 1.6)
        mask = cv2.resize(mask, (max(1, int(mask.shape[1] * k)), max(1, int(mask.shape[0] * k))), interpolation=cv2.INTER_AREA)
        src = src * k
    M = cv2.getPerspectiveTransform(src, dst)
    big = cv2.warpPerspective(mask.astype(np.float32), M, ((x1 - x0) * ss, (y1 - y0) * ss), flags=cv2.INTER_LINEAR,
                              borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    small = cv2.resize(big, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    return small, (x0, y0, x1, y1)


def mesh_warp(mask, top, bottom, shape, nu=36, nv=30, ss=2):
    """Map a flat mask (H x W) onto the ruled surface between polylines top and bottom (left→right)."""
    H, W = shape
    mh, mw = mask.shape
    us = np.linspace(0, 1, nu + 1)
    vs = np.linspace(0, 1, nv + 1)
    T = polyline_at(top, us)
    B = polyline_at(bottom, us)
    allp = np.concatenate([T, B])
    x0, y0, x1, y1 = bbox(allp, W, H, m=4)
    cw, ch = (x1 - x0) * ss, (y1 - y0) * ss
    acc = np.zeros((ch, cw), np.float32)
    dst = np.zeros((nv + 1, nu + 1, 2), np.float32)
    src = np.zeros((nv + 1, nu + 1, 2), np.float32)
    for j, v in enumerate(vs):
        dst[j] = ((1 - v) * T + v * B - [x0, y0]) * ss
        src[j, :, 0] = us * (mw - 1)
        src[j, :, 1] = v * (mh - 1)
    for j in range(nv):
        for i in range(nu):
            quads = [(src[j, i], src[j, i + 1], src[j + 1, i + 1]), (src[j, i], src[j + 1, i + 1], src[j + 1, i])]
            quadd = [(dst[j, i], dst[j, i + 1], dst[j + 1, i + 1]), (dst[j, i], dst[j + 1, i + 1], dst[j + 1, i])]
            for ts, td in zip(quads, quadd):
                ts = np.float32(ts)
                td = np.float32(td)
                sx0, sy0 = np.floor(ts.min(0)).astype(int) - 2
                sx1, sy1 = np.ceil(ts.max(0)).astype(int) + 3
                sx0, sy0 = max(0, sx0), max(0, sy0)
                sub = mask[sy0:sy1, sx0:sx1]
                dx0, dy0 = np.floor(td.min(0)).astype(int) - 1
                dx1, dy1 = np.ceil(td.max(0)).astype(int) + 2
                dx0, dy0 = max(0, dx0), max(0, dy0)
                dx1, dy1 = min(cw, dx1), min(ch, dy1)
                if dx1 <= dx0 or dy1 <= dy0 or sub.size == 0:
                    continue
                M = cv2.getAffineTransform(np.float32(ts - [sx0, sy0]), np.float32(td - [dx0, dy0]))
                w = cv2.warpAffine(sub, M, (dx1 - dx0, dy1 - dy0), flags=cv2.INTER_LINEAR, borderValue=0)
                tm = np.zeros((dy1 - dy0, dx1 - dx0), np.uint8)
                cv2.fillConvexPoly(tm, np.round(td - [dx0, dy0]).astype(np.int32), 1)
                tm = cv2.dilate(tm, np.ones((3, 3), np.uint8))
                region = acc[dy0:dy1, dx0:dx1]
                np.copyto(region, np.maximum(region, w), where=tm.astype(bool))
    small = cv2.resize(acc, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
    return small, (x0, y0, x1, y1)


# ------------------------------------------------------------------ 1. regions
def recolor(lab, reg):
    H, W = lab.shape[:2]
    m = poly_mask((H, W), reg['poly'], reg.get('feather', 2.0))
    x0, y0, x1, y1 = bbox(reg['poly'], W, H, m=int(3 * reg.get('feather', 2.0)) + 8)
    sub = lab[y0:y1, x0:x1].copy()
    ms = m[y0:y1, x0:x1]
    core = ms > 0.9
    if not core.any():
        return lab
    L = sub[..., 0]
    k = int(reg.get('flatten', 0))
    if k > 0:
        k |= 1
        def med(ch, lo, hi):
            u8 = np.clip((ch - lo) / (hi - lo) * 255, 0, 255).astype(np.uint8)
            return cv2.medianBlur(u8, k).astype(np.float32) / 255 * (hi - lo) + lo
        Lsrc = med(L, 0, 100)
        g = cv2.GaussianBlur(RNG.normal(0, 1, L.shape).astype(np.float32), (0, 0), 0.7)
        Lsrc = Lsrc + g * reg.get('grain', 0.8)
        if reg.get('hex') is None:
            sub[..., 0] = Lsrc
            sub[..., 1] = med(sub[..., 1], -60, 60)
            sub[..., 2] = med(sub[..., 2], -60, 60)
            lab[y0:y1, x0:x1] = sub * ms[..., None] + lab[y0:y1, x0:x1] * (1 - ms[..., None])
            return lab
    else:
        Lsrc = L
    Lt, at, bt = hex2lab(reg['hex'])
    Lref = max(1.0, float(np.percentile(Lsrc[core], reg.get('pct', 70))))
    Ln = Lsrc * (Lt / Lref)
    s = np.clip(Ln / max(Lt, 1), 0.2, 1.3) ** 0.8          # chroma follows the shading
    new = np.stack([Ln, at * s, bt * s], -1)
    keep = reg.get('spec', 0.6)
    if keep > 0 and k == 0:                                 # keep real specular glints
        chroma = np.hypot(sub[..., 1], sub[..., 2])
        spec = np.clip((L - Lref * 1.2) / 10, 0, 1) * np.clip(1 - chroma / 30, 0, 1) * keep
        new = new * (1 - spec[..., None]) + sub * spec[..., None]
    lab[y0:y1, x0:x1] = new * ms[..., None] + lab[y0:y1, x0:x1] * (1 - ms[..., None])
    return lab


# ------------------------------------------------------------------ 2./3. decals and titles
def stamp(rgb, a, box, kind, ink, emboss_dep=None, emboss=0.0, blur=0.0, opacity=1.0, sparkle=0.25):
    x0, y0, x1, y1 = box
    a = np.clip(a, 0, 1) * opacity
    if blur > 0:
        a = cv2.GaussianBlur(a, (0, 0), blur)
    a = cv2.GaussianBlur(a, (0, 0), 0.35)
    sub = rgb[y0:y1, x0:x1]
    lab = to_lab(sub)
    Lb = cv2.GaussianBlur(lab[..., 0], (0, 0), 5)
    sel = cv2.dilate((a > 0.2).astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool)
    Lref = float(np.percentile(Lb[sel], 75)) if sel.any() else float(Lb.mean())
    shade = np.clip(Lb / max(Lref, 1), 0.25, 1.35)[..., None]
    if emboss_dep is not None and emboss > 0:
        d = cv2.GaussianBlur(emboss_dep, (0, 0), 0.6)
        sub = sub * (1 - emboss * d[..., None])
    c = hex2rgb(ink)[None, None]
    A = a[..., None]
    if kind == 'white':
        col = np.clip(c * (0.18 + 0.82 * shade), 0, 1)
        out = sub * (1 - A) + col * A
    elif kind == 'gold':
        tone = 0.5 + 0.62 * shade ** 1.4
        col = c * tone
        hi = np.clip((shade - 1.0) * 2.5, 0, 1) * sparkle
        col = col + hi * (1 - col)
        out = sub * (1 - A) + np.clip(col, 0, 1) * A
    else:  # ink on paper
        out = sub * (1 - A * (1 - c))
    rgb[y0:y1, x0:x1] = np.clip(out, 0, 1)
    return rgb


def load_tex(path, channel=0, src=None):
    im = np.asarray(Image.open(path if os.path.isabs(path) else os.path.join(ROOT, path)).convert('RGB')).astype(np.float32) / 255
    if src:
        x0, y0, x1, y1 = src
        im = im[y0:y1, x0:x1]
    return im


def title_mask(lines, w, h, font='EBGaramondSemiBold.ttf', frame=True, track=0.08, S=6):
    """White-on-black mask of centred title lines filling a w x h panel (px, aspect of the quad)."""
    W, H = int(w * S), int(h * S)
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    pad = 0.12 * min(W, H) if frame else 0.06 * min(W, H)
    if frame:
        lw = max(1, int(0.012 * min(W, H)))
        d.rectangle([lw, lw, W - lw - 1, H - lw - 1], outline=255, width=lw)
        g = int(3.2 * lw)
        d.rectangle([g, g, W - g - 1, H - g - 1], outline=255, width=max(1, lw // 2))
    avail_w, avail_h = W - 2 * pad, H - 2 * pad
    n = len(lines)
    fp = os.path.join(FONTS, font)
    size = int(avail_h / (n * 1.25))
    def width(f, s):
        return sum(f.getlength(ch) for ch in s) + track * f.size * (len(s) - 1)
    while size > 6:
        f = ImageFont.truetype(fp, size)
        if max(width(f, s) for s in lines) <= avail_w:
            break
        size -= 1
    f = ImageFont.truetype(fp, size)
    asc, desc = f.getmetrics()
    lh = size * 1.18
    ytop = H / 2 - lh * n / 2
    for i, s in enumerate(lines):
        x = W / 2 - width(f, s) / 2
        y = ytop + i * lh + (lh - (asc + desc)) / 2
        for ch in s:
            d.text((x, y), ch, font=f, fill=255)
            x += f.getlength(ch) + track * size
    m = np.asarray(im).astype(np.float32) / 255
    return cv2.resize(m, (int(w), int(h)), interpolation=cv2.INTER_AREA) if S != 1 else m


def quad_size(q):
    q = np.asarray(q, np.float64)
    w = (np.hypot(*(q[1] - q[0])) + np.hypot(*(q[2] - q[3]))) / 2
    h = (np.hypot(*(q[3] - q[0])) + np.hypot(*(q[2] - q[1]))) / 2
    return w, h


# ------------------------------------------------------------------ 4. pages
def is_arabic(s):
    return any('؀' <= ch <= 'ۿ' or 'ݐ' <= ch <= 'ࣿ' or 'ﭐ' <= ch <= '﻿' for ch in s)


def page_mask(spec, W=1500, H=2150):
    """Typeset a Risale page (flat, white-on-black ink mask)."""
    size = spec.get('size', 44)
    f = ImageFont.truetype(os.path.join(FONTS, spec.get('font', 'EBGaramondRegular.ttf')), size)
    fh = ImageFont.truetype(os.path.join(FONTS, 'EBGaramondMedium.ttf'), int(size * 0.72))
    fa = ImageFont.truetype(os.path.join(FONTS, 'ScheherazadeNew-Regular.ttf'), int(size * 1.15))
    im = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(im)
    side = spec.get('side', 'right')
    mx_in, mx_out = int(W * 0.13), int(W * 0.10)
    left = mx_in if side == 'right' else mx_out
    right = W - (mx_out if side == 'right' else mx_in)
    top = int(H * 0.075)
    lead = size * spec.get('lead', 1.42)
    # running head + page number, then a hairline
    if spec.get('pageno'):
        pn = spec['pageno']
        x = right - fh.getlength(pn) if side == 'right' else left
        d.text((x, top), pn, font=fh, fill=255)
    if spec.get('header'):
        hd = spec['header']
        d.text(((left + right) / 2 - fh.getlength(hd) / 2, top), hd, font=fh, fill=255)
    y = top + size * 1.45
    d.line([(left, y), (right, y)], fill=200, width=2)
    y += size * 0.9
    space = f.getlength(' ')
    lines_out = []
    for para in spec['text'].split('\n'):
        para = para.strip()
        if not para:
            continue
        if is_arabic(para):
            lines_out.append(('ar', para))
            continue
        words = para.split()
        first = True
        cur, curw = [], 0
        for w in words:
            ww = f.getlength(w)
            indent = size * 1.6 if first else 0
            if cur and indent + curw + space + ww > right - left:
                lines_out.append(('j', cur, indent))
                cur, curw, first = [w], ww, False
            else:
                curw = ww if not cur else curw + space + ww
                cur.append(w)
        if cur:
            lines_out.append(('l', cur, size * 1.6 if first else 0))
    for ln in lines_out[spec.get('lines_from', 0):]:
        if y + lead > H - H * 0.07:
            break
        if ln[0] == 'ar':
            tw = fa.getlength(ln[1], direction='rtl', language='ar')
            d.text(((left + right) / 2 - tw / 2, y - size * 0.25), ln[1], font=fa, fill=255, direction='rtl', language='ar')
            y += lead * 1.25
            continue
        kind, words, indent = ln
        x = left + indent
        if kind == 'j' and len(words) > 1:
            tot = sum(f.getlength(w) for w in words)
            gap = (right - left - indent - tot) / (len(words) - 1)
        else:
            gap = space
        for w in words:
            d.text((x, y), w, font=f, fill=255)
            x += f.getlength(w) + gap
        y += lead
    return np.asarray(im).astype(np.float32) / 255


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('photo')
    ap.add_argument('spec')
    ap.add_argument('out')
    ap.add_argument('--debug')
    a = ap.parse_args()
    spec = json.load(open(a.spec))
    rgb = np.asarray(Image.open(a.photo).convert('RGB')).astype(np.float32) / 255
    H, W = rgb.shape[:2]

    if spec.get('regions'):
        lab = to_lab(rgb)
        for reg in spec['regions']:
            lab = recolor(lab, reg)
        rgb = to_rgb(lab)

    for dc in spec.get('decals', []):
        tex = load_tex(dc['tex'], src=dc.get('src'))
        m = tex[..., dc.get('channel', 0)]
        h, w = m.shape
        sq = [[0, 0], [w, 0], [w, h], [0, h]]
        mw, box = warp_quad(m, sq, dc['quad'], (H, W))
        dep = None
        if dc.get('height') is not None and dc.get('emboss', 0) > 0:
            hm = 1 - tex[..., dc['height']]
            dep, _ = warp_quad(hm, sq, dc['quad'], (H, W))
        rgb = stamp(rgb, mw, box, dc.get('kind', 'white'), dc.get('ink', '#F6F3EC'), dep, dc.get('emboss', 0),
                    dc.get('blur', 0), dc.get('opacity', 1))

    for tt in spec.get('titles', []):
        w, h = quad_size(tt['quad'])
        S = 4
        m = title_mask(tt['lines'], w * S, h * S, tt.get('font', 'EBGaramondSemiBold.ttf'), tt.get('frame', True),
                       tt.get('track', 0.08), S=2)
        mh, mw_ = m.shape
        mw, box = warp_quad(m, [[0, 0], [mw_, 0], [mw_, mh], [0, mh]], tt['quad'], (H, W))
        rgb = stamp(rgb, mw, box, tt.get('kind', 'gold'), tt.get('ink', '#D9B66A'), None, 0, tt.get('blur', 0),
                    tt.get('opacity', 1))

    for pg in spec.get('pages', []):
        m = page_mask(pg)
        mw, box = mesh_warp(m, pg['top'], pg['bottom'], (H, W))
        rgb = stamp(rgb, mw, box, 'ink', pg.get('ink', '#2A2420'), None, 0, pg.get('blur', 0), pg.get('opacity', 0.92))

    Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8)).save(a.out)
    if a.debug:
        os.makedirs(a.debug, exist_ok=True)
        dbg = (np.clip(rgb, 0, 1) * 255).astype(np.uint8).copy()
        for reg in spec.get('regions', []):
            cv2.polylines(dbg, [np.int32(reg['poly'])], True, (0, 255, 0), 1, cv2.LINE_AA)
        for dc in spec.get('decals', []) + spec.get('titles', []):
            cv2.polylines(dbg, [np.int32(dc['quad'])], True, (255, 0, 255), 1, cv2.LINE_AA)
        for pg in spec.get('pages', []):
            cv2.polylines(dbg, [np.int32(pg['top'])], False, (0, 128, 255), 1, cv2.LINE_AA)
            cv2.polylines(dbg, [np.int32(pg['bottom'])], False, (0, 128, 255), 1, cv2.LINE_AA)
        Image.fromarray(dbg).save(os.path.join(a.debug, 'overlay.png'))
    print('wrote', a.out)


if __name__ == '__main__':
    main()

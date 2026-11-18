#!/usr/bin/env python3
"""
Relight / recombine the source-card plate from its scene-linear light passes.  numpy only.

    python3 recombine.py --w fill=1,key=1,accent=1,quran=1 --out relit.png            # == plates/beauty.png
    python3 recombine.py --w fill=1,key=1,accent=0,quran=0 --out base.png --size 1080x1920
    python3 recombine.py --w accent=2.5 --ev -0.3 --out moody.png                     # unnamed passes keep weight 1

beauty_linear = sum_i  w_i * light_i        (scene-linear Rec.709, all weights 1 = the delivered beauty)
beauty_srgb   = VIEW( beauty_linear * 2**ev )   VIEW = AgX "High Contrast" + print white-point lift, baked as the
                                                97^3 LUT plates/linear/view_lut.npy (see README.md)

As a module:
    from recombine import load_light, apply_view, save_png
    L = {g: load_light(g) for g in ('fill', 'key', 'accent', 'quran')}
    img16 = apply_view(L['fill'] + L['key'] + 0.5 * L['accent'] + L['quran'])     # uint16 sRGB, (H, W, 3)
    save_png('out.png', img16)
"""
import argparse
import json
import os
import struct
import zlib

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
PLATES = os.path.join(HERE, 'plates')
LIN = os.path.join(PLATES, 'linear')
GROUPS = ('fill', 'key', 'accent', 'quran')
LIN16_SCALE = 8.0                      # light_*_lin16.png: linear = code / 65535 * 8
LUT_LMIN, LUT_STOPS = 2.0 ** -14, 20.0  # LUT index = log2(L / LMIN + 1) / STOPS * (N - 1)


def read_png(path):
    """8/16-bit gray / RGB / RGBA PNG -> ndarray (H, W, C).  Handles filter types 0-2 (what our writer and most
    16-bit encoders emit for these plates); falls back to Pillow for anything else (8-bit only there)."""
    with open(path, 'rb') as f:
        data = f.read()
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    pos, idat, hdr = 8, [], None
    while pos < len(data):
        n, tag = struct.unpack('>I4s', data[pos:pos + 8])
        if tag == b'IHDR':
            hdr = struct.unpack('>IIBBBBB', data[pos + 8:pos + 8 + n])
        elif tag == b'IDAT':
            idat.append(data[pos + 8:pos + 8 + n])
        pos += 12 + n
    w, h, depth, ctype, _, _, interlace = hdr
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ctype]
    assert interlace == 0 and depth in (8, 16)
    bpp = ch * depth // 8
    raw = np.frombuffer(zlib.decompress(b''.join(idat)), np.uint8).reshape(h, 1 + w * bpp)
    filt, rows = raw[:, 0], raw[:, 1:].copy()
    if filt.any():
        prev = np.zeros(w * bpp, np.uint8)
        for y in range(h):
            if filt[y] == 1:      # Sub
                rows[y] = np.cumsum(rows[y].reshape(w, bpp), axis=0, dtype=np.uint8).reshape(-1)
            elif filt[y] == 2:    # Up
                rows[y] = rows[y] + prev
            elif filt[y] != 0:
                raise NotImplementedError('PNG filter %d: re-save the file with filter 0' % filt[y])
            prev = rows[y]
    if depth == 16:
        return rows.reshape(h, w, ch, 2).astype(np.uint16) @ np.array([256, 1], np.uint16)
    return rows.reshape(h, w, ch)


def save_png(path, arr):
    """uint8 / uint16 ndarray (H, W) or (H, W, 3) -> PNG."""
    arr = np.asarray(arr)
    if arr.ndim == 2:
        arr = arr[:, :, None]
    h, w, ch = arr.shape
    depth = 16 if arr.dtype == np.uint16 else 8
    raw = arr.astype('>u2' if depth == 16 else np.uint8).reshape(h, -1)
    raw = np.concatenate([np.zeros((h, 1), np.uint8), raw.view(np.uint8).reshape(h, -1)], axis=1).tobytes()

    def chunk(tag, d):
        return struct.pack('>I', len(d)) + tag + d + struct.pack('>I', zlib.crc32(tag + d) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, depth, {1: 0, 3: 2, 4: 6}[ch], 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 6)) + chunk(b'IEND', b''))


def load_light(group, lin_dir=LIN):
    """Scene-linear float32 (H, W, 3) of one light pass."""
    return read_png(os.path.join(lin_dir, f'light_{group}_lin16.png')).astype(np.float32) * (LIN16_SCALE / 65535.0)


_lut = {}


def apply_view(lin, ev=0.0, lut_path=None, bits=16):
    """Scene-linear (H, W, 3) -> display sRGB through the plate's view transform (trilinear 97^3 LUT)."""
    lut_path = lut_path or os.path.join(LIN, 'view_lut.npy')
    if lut_path not in _lut:
        _lut[lut_path] = np.load(lut_path)
    lut = _lut[lut_path]
    n = lut.shape[0]
    out = np.empty(lin.shape, np.float32)
    flat_lut = lut.reshape(-1, 3)
    for y0 in range(0, lin.shape[0], 256):            # in bands, to keep memory low
        L = np.clip(lin[y0:y0 + 256].astype(np.float32) * (2.0 ** ev), 0, None)
        s = np.clip(np.log2(L / LUT_LMIN + 1) / LUT_STOPS * (n - 1), 0, n - 1 - 1e-4)
        i = np.floor(s).astype(np.int32)
        f = s - i
        acc = 0
        for dr in (0, 1):
            wr = f[..., 0] if dr else 1 - f[..., 0]
            for dg in (0, 1):
                wg = f[..., 1] if dg else 1 - f[..., 1]
                for db in (0, 1):
                    wb = f[..., 2] if db else 1 - f[..., 2]
                    idx = ((i[..., 0] + dr) * n + (i[..., 1] + dg)) * n + (i[..., 2] + db)
                    acc = acc + (wr * wg * wb)[..., None] * flat_lut[idx]
        out[y0:y0 + 256] = acc
    mx = 65535 if bits == 16 else 255
    return np.clip(out * mx + 0.5, 0, mx).astype(np.uint16 if bits == 16 else np.uint8)


def recombine(weights=None, ev=0.0, lin_dir=LIN):
    weights = dict(weights or {})
    lin = 0
    for g in GROUPS:
        w = float(weights.get(g, 1.0))
        if w != 0.0:
            lin = lin + w * load_light(g, lin_dir)
    return apply_view(lin, ev)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--w', default='', help='weights, e.g. fill=1,key=1,accent=0,quran=0.5 (default 1 each)')
    ap.add_argument('--ev', type=float, default=0.0, help='exposure offset in stops, applied in linear light')
    ap.add_argument('--out', required=True)
    ap.add_argument('--size', default='', help='optional WxH (Lanczos, needs Pillow; output is then 8-bit)')
    a = ap.parse_args()
    w = {k: float(v) for k, v in (kv.split('=') for kv in a.w.split(',') if kv)}
    for k in w:
        if k not in GROUPS:
            raise SystemExit(f'unknown light group {k}; choose from {GROUPS}')
    img = recombine(w, a.ev)
    if a.size:
        from PIL import Image
        W, H = (int(v) for v in a.size.lower().split('x'))
        Image.fromarray((img >> 8).astype(np.uint8)).resize((W, H), Image.LANCZOS).save(a.out)
    else:
        save_png(a.out, img)
    print(json.dumps({'out': a.out, 'weights': {g: w.get(g, 1.0) for g in GROUPS}, 'ev': a.ev}))


if __name__ == '__main__':
    main()

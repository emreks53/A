#!/usr/bin/env python3
"""
END CARD comp bake — ONE command rebuilds every derived image of the end card from ../plates/:

    python3 /home/user/work/endcard/comp/bake.py            # ~1 min, numpy + pillow only

Reads   ../plates/linear/light_{fill,key,accent,quran}_lin16.png, ../plates/linear/view_lut.npy,
        ../plates/plate_meta.json
Writes  (all next to this file; the film's src/acts/endcard.js fetches them as /endcard/comp/...)
  base.u16      the photograph in its BASE light, VIEW(fill + key), through the lens part of finish.py
                (softening, lateral CA, halation) at plate resolution; raw little-endian uint16 RGB,
                interleaved, sRGB-encoded 0..65535, W x H = plate size (1350 x 2400)
  dq.i16        (state with the Qur'an light) - base : raw little-endian int16 RGB crop
  da.i16        (state with the Sozler accent light) - base : raw little-endian int16 RGB crop
  meta.json     sizes, crops, the light weights, the positions of plate_meta.json (the runtime reads
                every position from here, nothing is hard-coded), check numbers
  look_*.jpg    1080 x 1920 previews of the four light states (for the eye only; not used by the film)

Why 16-bit raw files and not PNG: the browser decodes PNG to 8 bits. The film's comp works in float
and dithers with its per-frame grain when it quantises to 8 bits, so the cream wall never bands.

Why the deltas: the two effect lights are light-linked to one object each, so in display space
    VIEW(fill + key + a*accent + q*quran)  ~=  base + a * da + q * dq
(the script measures the error of that against the true VIEW of all four passes and stores it in
meta.json -> check). The runtime animates a and q; vignette and grain belong to the frame, not to
the plate, and are applied per frame by endcard.js.

Options: --quran 1.0 --accent 1.0 (linear-light weights of the two effect lights at full strength),
         --soften 0.57 --ca 0.0015 --bloom 0.04 (finish.py's lens numbers, for a 1080-wide frame; the softening
         is 0.57 instead of 0.6 because the runtime resample adds the rest - see the comment at the option).
"""
import argparse
import json
import os
import sys
import time

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                      # /home/user/work/endcard
sys.path.insert(0, ROOT)
import recombine as rc                            # noqa: E402  (numpy-only helpers of the plate team)
import finish as fin                              # noqa: E402  (camera finishing reference)


def lens(img16, soften, ca, bloom, bloom_sigma=12.0, bloom_thr=0.9):
    """finish.py steps 1-3 (softening, lateral CA, halation) at plate resolution.  uint16 sRGB -> float sRGB 0..1."""
    img = img16.astype(np.float32) / 65535.0
    h, w = img.shape[:2]
    k = w / 1080.0
    lin = fin._s2l(img).astype(np.float32)
    if soften > 0:
        lin = fin._gauss(lin, soften * k)
    if ca > 0:
        lin[..., 0] = fin._scale_about_centre(lin[..., 0], 1 + ca / 2)
        lin[..., 2] = fin._scale_about_centre(lin[..., 2], 1 - ca / 2)
    if bloom > 0:
        t = float(fin._s2l(np.float32(bloom_thr)))
        hi = np.clip((lin - t) / (1 - t), 0, None)
        glow = fin._gauss(hi.max(-1), bloom_sigma * k)
        lin = lin + bloom * glow[..., None] * np.array([1.0, 0.93, 0.82], np.float32)
    return np.clip(fin._l2s(lin), 0, 1).astype(np.float32)


def crop_of(delta, thr, margin, feather):
    """Bounding box of |delta| > thr (in 0..1 units), grown by margin; the delta is feathered to 0 on the box edge."""
    m = np.abs(delta).max(-1) > thr
    ys, xs = np.where(m.any(1))[0], np.where(m.any(0))[0]
    h, w = m.shape
    y0, y1 = max(0, ys[0] - margin), min(h, ys[-1] + 1 + margin)
    x0, x1 = max(0, xs[0] - margin), min(w, xs[-1] + 1 + margin)
    # even origin and size: the runtime halves the plate for small preview scales
    x0, y0 = x0 - x0 % 2, y0 - y0 % 2
    x1, y1 = min(w, x1 + (x1 - x0) % 2), min(h, y1 + (y1 - y0) % 2)
    c = delta[y0:y1, x0:x1].copy()
    fy = np.clip(np.minimum(np.arange(y1 - y0) + 0.5, (y1 - y0) - np.arange(y1 - y0) - 0.5) / feather, 0, 1)
    fx = np.clip(np.minimum(np.arange(x1 - x0) + 0.5, (x1 - x0) - np.arange(x1 - x0) - 0.5) / feather, 0, 1)
    # no feather on a side that is the plate border itself
    if y0 == 0: fy[: (y1 - y0) // 2] = 1
    if y1 == h: fy[(y1 - y0) // 2:] = 1
    if x0 == 0: fx[: (x1 - x0) // 2] = 1
    if x1 == w: fx[(x1 - x0) // 2:] = 1
    c *= (fy[:, None] * fx[None, :])[..., None]
    return [int(x0), int(y0), int(x1 - x0), int(y1 - y0)], c


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--quran', type=float, default=1.0)
    ap.add_argument('--accent', type=float, default=1.0)
    # 0.57 px here + the cubic resample of the push-in = finish.py's 0.6 px at delivery size (measured on the film's
    # frames against finish.py --no-grain: gradient energy of the spine titles / the Qur'an / the ornaments within 1 %)
    ap.add_argument('--soften', type=float, default=0.57)
    ap.add_argument('--ca', type=float, default=0.0015)
    ap.add_argument('--bloom', type=float, default=0.04)
    ap.add_argument('--no-looks', action='store_true')
    a = ap.parse_args()
    t0 = time.time()

    with open(os.path.join(rc.PLATES, 'plate_meta.json'), encoding='utf-8') as f:
        pm = json.load(f)
    L = {g: rc.load_light(g) for g in rc.GROUPS}
    H, W = L['fill'].shape[:2]
    fk = L['fill'] + L['key']

    def state(q, ac):
        lin = fk
        if q: lin = lin + q * L['quran']
        if ac: lin = lin + ac * L['accent']
        return lens(rc.apply_view(lin), a.soften, a.ca, a.bloom)

    base = state(0, 0)
    sq = state(a.quran, 0)
    sa = state(0, a.accent)
    full = state(a.quran, a.accent)
    del L, fk
    dq_full, da_full = sq - base, sa - base
    thr = 0.08 / 255.0                                   # below a twelfth of an 8-bit level the delta is dropped
    q_crop, dq = crop_of(dq_full, thr, 24, 16)
    a_crop, da = crop_of(da_full, thr, 24, 16)

    # check: base + dq + da against the true state with both lights (8-bit levels)
    approx = base.copy()
    for (x0, y0, w, h), d in ((q_crop, dq), (a_crop, da)):
        approx[y0:y0 + h, x0:x0 + w] += d
    err = np.abs(approx - full) * 255.0
    check = {
        'both_lights_vs_true_8bit': {'mean': float(err.mean()), 'p999': float(np.percentile(err, 99.9)), 'max': float(err.max())},
        'dropped_quran_8bit_max': float(_outside_max(dq_full, q_crop) * 255),
        'dropped_accent_8bit_max': float(_outside_max(da_full, a_crop) * 255),
    }

    def u16(x):
        return np.clip(x * 65535.0 + 0.5, 0, 65535).astype('<u2')

    def i16(x):
        return np.clip(np.round(x * 65535.0), -32768, 32767).astype('<i2')

    u16(base).tofile(os.path.join(HERE, 'base.u16'))
    i16(dq).tofile(os.path.join(HERE, 'dq.i16'))
    i16(da).tofile(os.path.join(HERE, 'da.i16'))

    pos = pm['positions_1080x1920']
    meta = {
        'about': 'written by endcard/comp/bake.py - do not edit; re-run the script after the plates change',
        'plate': {'w': int(W), 'h': int(H), 'scale': W / 1080.0},
        'frame': {'w': 1080, 'h': 1920},
        'files': {
            'base': {'file': 'base.u16', 'dtype': 'uint16le', 'channels': 3, 'w': int(W), 'h': int(H), 'encoding': 'sRGB 0..65535'},
            'dq': {'file': 'dq.i16', 'dtype': 'int16le', 'channels': 3, 'crop': q_crop, 'light': 'quran', 'weight': a.quran},
            'da': {'file': 'da.i16', 'dtype': 'int16le', 'channels': 3, 'crop': a_crop, 'light': 'accent', 'weight': a.accent},
        },
        'lens': {'soften_px_at_1080': a.soften, 'ca': a.ca, 'bloom': a.bloom, 'bloom_sigma_px_at_1080': 12.0, 'bloom_thr': 0.9},
        'positions_1080x1920': {k: pos[k] for k in (
            'quran_medallion_centre', 'quran_bbox', 'row_bbox', 'sozler_spine_bbox', 'sozler_volume_bbox', 'shelf_bbox',
            'quran_stand_bbox', 'console_top_front_edge_y', 'console_slab_bottom_y', 'drawer1_top_y', 'drawer1_bottom_y',
            'drawer2_top_y', 'row_centre_x', 'suggested_text_block') if k in pos},
        'check': check,
        'plates_mtime': os.path.getmtime(os.path.join(rc.LIN, 'light_key_lin16.png')),
        'baked_at': time.strftime('%Y-%m-%d %H:%M:%S'),
    }
    # walnut colours behind the text block (8-bit sRGB, base state) - for the contrast report in NOTES.md
    x0, y0, x1, y1 = [int(round(v * W / 1080.0)) for v in pos['suggested_text_block']]
    blk = base[y0:y1, x0:x1]
    rows = np.linspace(0, blk.shape[0] - 1, 9).astype(int)
    meta['walnut_rows_srgb8'] = {str(int(round((y0 + r) / (W / 1080.0)))): [float(v) for v in (blk[r].mean(0) * 255).round(1)] for r in rows}
    with open(os.path.join(HERE, 'meta.json'), 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)

    if not a.no_looks:
        from PIL import Image
        for name, img in (('base', base), ('quran', sq), ('accent', sa), ('both', full)):
            im = Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8)).resize((1080, 1920), Image.LANCZOS)
            im.save(os.path.join(HERE, f'look_{name}.jpg'), quality=95, subsampling=0)
    print(json.dumps({'plate': [int(W), int(H)], 'dq_crop': q_crop, 'da_crop': a_crop, 'check': check,
                      'seconds': round(time.time() - t0, 1)}, indent=1))


def _outside_max(d, crop):
    x0, y0, w, h = crop
    m = np.abs(d).max(-1).copy()
    m[y0:y0 + h, x0:x0 + w] = 0
    return float(m.max())


if __name__ == '__main__':
    main()

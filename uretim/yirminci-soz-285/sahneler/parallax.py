# -*- coding: utf-8 -*-
"""Tek bir fotoğraftan gerçek kamera hareketi: derinlik tahmini (Depth Anything V2) + kenar duyarlı yumuşatma,
çok yavaş ileri itiş ve hafif yanal yay (paralaks). Örtülen bölgeler çok küçük tutulur; kenarlar yumuşak doldurulur.
Kullanım: python3 parallax.py girdi.png cikti_klasoru [kare sayısı]"""
import sys, os, math
import numpy as np
import cv2


def depth_map(img_rgb, cache_path=None):
    if cache_path and os.path.exists(cache_path):
        return np.load(cache_path)
    import torch
    from transformers import pipeline
    from PIL import Image
    pipe = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Large-hf', device=-1)
    torch.set_num_threads(4)
    out = pipe(Image.fromarray(img_rgb))
    d = np.asarray(out['predicted_depth'], np.float32)
    if d.ndim == 3:
        d = d[0]
    d = cv2.resize(d, (img_rgb.shape[1], img_rgb.shape[0]), interpolation=cv2.INTER_CUBIC)
    # Depth Anything: büyük değer = yakın (ters derinlik). 0..1'e getir (1 = yakın)
    d = (d - np.percentile(d, 1)) / (np.percentile(d, 99.5) - np.percentile(d, 1) + 1e-6)
    d = np.clip(d, 0, 1).astype(np.float32)
    if cache_path:
        np.save(cache_path, d)
    return d


def refine(d, img_rgb):
    """Kenar duyarlı yumuşatma (renk kılavuzlu), nesne sınırlarında kesin geçiş."""
    g = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
    try:
        gf = cv2.ximgproc.guidedFilter(g, d, 8, 1e-4)
    except Exception:
        gf = cv2.bilateralFilter(d, 9, 0.08, 7)
    return np.clip(gf, 0, 1).astype(np.float32)


def render(img_rgb, disp, t, out_w=1080, out_h=1920, push=(1.0, 1.065), arc=10.0, par=14.0, focus=0.55,
           center=None, drift=(0.0, -18.0)):
    """t: 0..1. disp: 0..1 (1 = yakın). par: yakın-uzak arası en büyük paralaks (px, kaynak ölçeğinde)."""
    h, w = disp.shape
    u = t * t * (3 - 2 * t)
    z = push[0] + (push[1] - push[0]) * u
    cx, cy = (w / 2, h / 2) if center is None else center
    cx += drift[0] * u
    cy += drift[1] * u
    # yanal yay: kamera sağa doğru hafif kayar → yakın nesneler sola, uzak nesneler daha az
    lat = arc * math.sin(math.pi * (u - 0.5)) / 1.0
    # ileri itişte yakın nesneler daha çok büyür (dolly etkisi)
    yy, xx = np.mgrid[0:out_h, 0:out_w].astype(np.float32)
    base = min(out_w / w, out_h / h)
    s = base * z
    # çıktı pikselinden kaynak koordinatı (paralakssız)
    sx = (xx - out_w / 2) / s + cx
    sy = (yy - out_h / 2) / s + cy
    dd = cv2.remap(disp, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    k = dd - focus
    # dolly: yakın düzlem merkezden uzaklaşır (kaynakta merkeze doğru örnekle)
    dol = (z - push[0]) / max(1e-6, push[1] - push[0]) * par / max(w, h)
    sx2 = sx - (sx - cx) * dol * k * 1.6 + lat * k * par / 14.0
    sy2 = sy - (sy - cy) * dol * k * 1.6
    out = cv2.remap(img_rgb, sx2.astype(np.float32), sy2.astype(np.float32), cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REFLECT)
    return out


if __name__ == '__main__':
    src, outdir = sys.argv[1], sys.argv[2]
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 60
    os.makedirs(outdir, exist_ok=True)
    img = cv2.imread(src)[..., ::-1].copy()
    d = depth_map(img, os.path.join(outdir, 'depth.npy'))
    d = refine(d, img)
    cv2.imwrite(os.path.join(outdir, 'depth.png'), (d * 255).astype(np.uint8))
    for i in range(n):
        t = i / max(1, n - 1)
        fr = render(img, d, t)
        cv2.imwrite(os.path.join(outdir, f'p_{i:04d}.png'), fr[..., ::-1])

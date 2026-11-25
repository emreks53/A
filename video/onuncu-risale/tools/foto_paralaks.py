"""Son sahne fotoğrafından derinlik haritasıyla 2.5B kızak (dolly) çekimi kareleri üretir.

python tools/foto_paralaks.py <foto.png> <derinlik.npy> <cikis_klasoru> [kare_sayisi=160]
Yakın nesneler (açık kitap, ciltler) uzaktakilerden (pencere manzarası) biraz daha fazla büyür ve kayar;
hareket çok küçük tutulur ki kenarlarda bozulma görünmesin. Çıkış 1080x1920 JPEG (q=96).
"""
import sys, os
import numpy as np
from PIL import Image


def smoothstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


def main():
    src, dep, out = sys.argv[1], sys.argv[2], sys.argv[3]
    n = int(sys.argv[4]) if len(sys.argv) > 4 else 160
    os.makedirs(out, exist_ok=True)
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
    H0, W0 = im.shape[:2]
    d = np.load(dep).astype(np.float32)
    if d.shape != (H0, W0):
        d = np.asarray(Image.fromarray(d).resize((W0, H0), Image.BICUBIC))
    # derinliği hafifçe yumuşat (kenar titremesini önler)
    from scipy.ndimage import gaussian_filter, map_coordinates
    d = gaussian_filter(d, 2.0)
    OW, OH = 1080, 1920
    base = OW / W0  # 0.9375
    fx, fy = 0.476 * W0, 0.47 * H0  # odak: Kur'an'ın biraz altı
    ys, xs = np.mgrid[0:OH, 0:OW].astype(np.float32)
    for i in range(n):
        p = smoothstep(i / max(1, n - 1)) * 0.75 + (i / max(1, n - 1)) * 0.25  # yumuşak başlayan, sabit akan
        # çıkış pikselinin kaynak koordinatı (yaklaşık ters eşleme: derinlik çıkış konumundan örneklenir)
        zoom = 1.0 + 0.032 * p
        sx = fx + (xs / base - fx) / zoom
        sy = fy + (ys / base - fy) / zoom - 6 * p  # hafif yukarı kayış (kamera hafifçe alçalır)
        dd = map_coordinates(d, [sy.ravel(), sx.ravel()], order=1, mode='nearest').reshape(OH, OW)
        par = (dd - 0.35)  # uzak <0, yakın >0
        k = 1.0 / (1.0 + 0.022 * p * par)  # yakın nesneler biraz daha büyür
        sx2 = fx + (sx - fx) * k + 4.0 * p * par   # yakınlar hafif sola kayar (kamera sağa)
        sy2 = fy + (sy - fy) * k
        frame = np.stack([map_coordinates(im[..., c], [sy2.ravel(), sx2.ravel()], order=3, mode='nearest').reshape(OH, OW) for c in range(3)], -1)
        Image.fromarray(np.clip(frame, 0, 255).astype(np.uint8)).save(os.path.join(out, f'k{i:03d}.jpg'), quality=96, subsampling=0)
        if i % 20 == 0: print('kare', i)
    print('bitti', n)


if __name__ == '__main__':
    main()

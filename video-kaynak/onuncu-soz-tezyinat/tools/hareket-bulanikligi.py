"""Optik akıştan hareket bulanıklığı planı → out/mb.json {kare: alt_kare_sayısı}.

Her kare için ardışık karelerle yoğun optik akış (Farneback, 270x480) hesaplanır; dokulu piksellerdeki yer
değiştirmenin 99.5. yüzdeliği "en hızlı görünen nesnenin" kare başına piksel hızıdır. Örtücü sabit (0.5 kare),
yani iz uzunluğu = 0.5 x hız: bulanıklık kendiliğinden hızla orantılı büyür ve küçülür. Alt kare sayısı izi
~1.5 px aralıkla örnekleyecek kadar seçilir (az alt kare = hayalet kopya). İz 2 px'in altındaysa bulanıklık yok
(o kadar kısa iz görünmez, açılıp kapanma fark edilmez). Küçük ama hızlı nesneler de (tüm karenin ortalama
farkında kaybolanlar) böylece bulanıklık alır.

Gerekli: opencv-python-headless, numpy.  Kullanım: python3 tools/hareket-bulanikligi.py [kareler_dizini]
Önce bulanıklıksız (ya da önceki planla) render: out/kareler; sonra: node tools/render.mjs --mb out/mb.json ...
"""
import json, os, sys
import numpy as np
import cv2

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
K = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, 'out', 'kareler')
F0, F1 = 63, 2043   # A->B ışık geçişinin başından J sonuna (A ve K'nin Blender kareleri kendi bulanıklığını taşır)
SC = 4              # akış 270x480'de; hızlar tam çözünürlüğe çevrilir
SHUT = 0.5

def gray(i):
    im = cv2.imread(os.path.join(K, f'{i:05d}.png'), cv2.IMREAD_GRAYSCALE)
    return cv2.resize(im, (1080 // SC, 1920 // SC), interpolation=cv2.INTER_AREA)

def speed(a, b):
    fl = cv2.calcOpticalFlowFarneback(a, b, None, 0.5, 4, 21, 3, 5, 1.1, 0)
    mag = np.hypot(fl[..., 0], fl[..., 1]) * SC
    gx = cv2.Sobel(a, cv2.CV_32F, 1, 0); gy = cv2.Sobel(a, cv2.CV_32F, 0, 1)
    tex = np.hypot(gx, gy) > 12          # akışın güvenilir olduğu dokulu pikseller
    if tex.sum() < 200: return 0.0
    return float(np.percentile(mag[tex], 99.5))

g = {i: gray(i) for i in range(F0 - 1, F1 + 1)}
sp = {i: speed(g[i], g[i + 1]) for i in range(F0 - 1, F1)}   # i -> i+1
mb, hiz = {}, {}
for i in range(F0, F1):
    v = max(sp.get(i - 1, 0.0), sp.get(i, 0.0))
    hiz[i] = round(v, 1)
    iz = SHUT * v
    if iz >= 2.0: mb[i] = int(min(48, max(4, np.ceil(iz / 1.5) + 1)))
# Akışın yetişemediği çok hızlı, büyüyen kenar: H'deki kafes yıldız çerçevesi alt kenardan çıkarken (~150-200 px/kare)
for i in range(1126, 1135): mb[i] = max(mb.get(i, 0), 40)
json.dump(mb, open(os.path.join(D, 'out', 'mb.json'), 'w'))
json.dump(hiz, open(os.path.join(D, 'out', 'hiz.json'), 'w'))
print(len(mb), 'kare hareket bulanıklığı alacak; toplam alt kare', sum(mb.values()))

# -*- coding: utf-8 -*-
"""
Logodaki "idealist" yazısının "ideal" kısmını vektöre (SVG) çevirir → araclar/logo-ideal/ideal-logo.svg
(kullanıcı isteği 10.11.2026: ana sayfa başlığındaki "ideal" kelimesi yerine logodaki "ideal" yazısı).

Kaynak: sitedeki logo (site/logo/idealist-gyo-logo-330.jpg) küçük olduğu için aynı logonun şirket belgesindeki büyük
kopyası kullanıldı: site/belgeler/2019/ozel-durum-aciklamalari/Faaliyet_Raporu_Mart2019docdocson.pdf, 1. sayfa üst
bilgi görseli (965×433 JPEG; "idealist" ~410 px genişlik, sitedeki logonun ~4,5 katı). Harf biçimleri sitedeki logoyla
aynı; renk sitede ayrıca verilir (sitedeki logonun gri tonu).

Adımlar: kırmızı olmayan koyu pikseller → bağlantılı bileşenler (i gövdesi + noktası, d, e, a, l) → yumuşak kenar
(alfa) → 8× büyütme → d ve l'nin uzun çıkıntıları (logoda "GYO"yu çevrelemek için uzatılmış) standart boya kısaltılır:
kullanıcı isteği 10.11.2026, çıkıntı x yüksekliğinin ASC_ORAN katı (başlık yazı tipi Frank Ruhl Libre: 0,703/0,484)
→ hafif bulanıklaştırma (köşeler logodaki gibi hafif yuvarlak) → eşik → potrace (CLI: apt-get install potrace)
→ viewBox: harflerin dış sınırı + her yanda PAY birim boşluk (kenara değen yuvarlak altlar ve "l"nin ucu bazı
tarayıcılarda kırpılmasın). SVG'de data-taban (taban çizgisi y) ve data-x (x yüksekliği) yazılır; kur.py bunlarla
yerleştirir.
Çalıştırma: python3 araclar/logo-ideal/ciz.py   (çıktı aynı dosyanın üstüne yazılır)
"""
import os, re, subprocess, tempfile
from collections import deque
import numpy as np
from PIL import Image, ImageFilter

KOK = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF = os.path.join(KOK, 'site/belgeler/2019/ozel-durum-aciklamalari/Faaliyet_Raporu_Mart2019docdocson.pdf')
CIKTI = os.path.join(KOK, 'araclar/logo-ideal/ideal-logo.svg')
K = 8
TABAN, XUST = 1115, 559        # 8× kırpık uzayda taban çizgisi ve x yüksekliği üstü (i gövdesi üstü, düz)
ASC_ORAN = 0.703 / 0.484       # çıkıntı / x yüksekliği (Frank Ruhl Libre ile aynı oran)
PAY = 24
# İnceltme: rapor kopyası sitedeki logodan kalın basılmış (gövde / x yüksekliği: sitedeki logo 0,264, rapor 0,296;
# kullanıcı 10.11.2026: "orijinal logoda harfler biraz daha ince"). Harfler her yandan INCELT birim aşındırılır
# (8× uzay; 11 birimde ölçülen oran 0,263); taban çizgisi ve x yüksekliği buna göre data-taban / data-x yazılır.
INCELT = 11

with tempfile.TemporaryDirectory() as g:
    subprocess.run(['pdfimages', '-f', '1', '-l', '1', '-j', PDF, os.path.join(g, 'r')], check=True)
    im = np.asarray(Image.open(os.path.join(g, 'r-000.jpg')).convert('RGB')).astype(float)
    assert im.shape[:2] == (433, 965), im.shape
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.299 * R + 0.587 * G + 0.114 * B
    kirmizi = (R - np.maximum(G, B)) > 30
    harf = (lum < 200) & ~((R - np.maximum(G, B)) > 45)
    # bağlantılı bileşenler (üst bölge); "ideal" = soldan ilk beş harf (i noktası ayrı bileşen)
    H, W = 215, im.shape[1]
    lab = np.zeros((H, W), int); bil = []; n = 0
    for y in range(H):
        for x in range(W):
            if harf[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n; pts = []
                while q:
                    cy, cx = q.popleft(); pts.append((cy, cx))
                    for dy in (-1, 0, 1):
                        for dx in (-1, 0, 1):
                            yy, xx = cy + dy, cx + dx
                            if 0 <= yy < H and 0 <= xx < W and harf[yy, xx] and not lab[yy, xx]:
                                lab[yy, xx] = n; q.append((yy, xx))
                p = np.array(pts)
                if len(p) > 30:
                    bil.append((p[:, 1].min(), p[:, 1].max(), n))
    bil.sort()
    # i gövdesi, i noktası, d, e, a, l (x başlangıcına göre ilk altı bileşen; l'nin sağ kenarı ≤ 450)
    sec_id = [b[2] for b in bil if b[1] <= 450][:6]
    assert len(sec_id) == 6, bil
    sec = np.zeros(im.shape[:2], bool); sec[:H] = np.isin(lab, sec_id)
    m = np.asarray(Image.fromarray((sec * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5))) > 0
    alfa = np.clip((255 - lum) / (255 - 116), 0, 1) * m * (~kirmizi)
    x0, x1, y0, y1 = 154, 452, 12, 158
    A = Image.fromarray((alfa[y0:y1, x0:x1] * 255).astype('uint8'))
    A = A.resize((A.width * K, A.height * K), Image.BICUBIC)
    # d ve l çıkıntılarının yeni üstü (bu satırın üstü silinir); aşındırma sonrası çıkıntı / x yüksekliği = ASC_ORAN
    kes = round(TABAN - ((TABAN - XUST - 2 * INCELT) * ASC_ORAN + 2 * INCELT))
    a8 = np.asarray(A).copy(); a8[:kes] = 0
    A = Image.fromarray(a8).filter(ImageFilter.GaussianBlur(K * 0.6))
    b = np.asarray(A) >= 128
    # aşındırma: kare (3×3) ve artı (+) adımları dönüşümlü → yaklaşık daire, her adım ~1 birim
    for adim in range(INCELT):
        p_ = np.pad(b, 1, constant_values=False); h, w = b.shape
        komsu = [(0, 1), (1, 0), (1, 1), (1, 2), (2, 1)] + ([(0, 0), (0, 2), (2, 0), (2, 2)] if adim % 2 == 0 else [])
        b = np.logical_and.reduce([p_[dy:dy + h, dx:dx + w] for dy, dx in komsu])
    pbm = os.path.join(g, 'i.pbm'); svg = os.path.join(g, 'i.svg')
    Image.fromarray(((~b) * 255).astype('uint8')).convert('1').save(pbm)
    subprocess.run(['potrace', pbm, '-s', '-o', svg, '--alphamax', '1.15', '--opttolerance', '0.6',
                    '--turdsize', '60', '-u', '1'], check=True)
    ds = [re.sub(r'\s+', ' ', d).strip() for d in re.findall(r'<path d="([^"]+)"', open(svg).read())]
    yuk = A.height  # potrace y ekseni yukarı; aşağıdaki dönüşüm ters çevirir (dış koordinat = 8× kırpık piksel)
    ys, xs = np.nonzero(b)
# viewBox: harflerin dış sınırı (i alt-sol … l üst-sağ; d/l üstü … e/a alt taşması) + PAY
vb = (xs.min() - PAY, ys.min() - PAY, xs.max() + 1 - xs.min() + 2 * PAY, ys.max() + 1 - ys.min() + 2 * PAY)
out = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d" data-taban="%d" data-x="%d">' % (vb + (TABAN - INCELT, TABAN - XUST - 2 * INCELT))
       + '<g transform="translate(0 %d) scale(1 -1)">' % yuk + ''.join('<path d="%s"/>' % d for d in ds) + '</g></svg>\n')
open(CIKTI, 'w').write(out)
print('yazıldı', CIKTI, len(out))

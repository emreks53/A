"""İbrik: büyük (egim 0, ~600 px) + kullanım ölçeğinde 0/30/55 derece su akışıyla; aynalı (sahnedeki gibi)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
import math
from motor import yol_elips

parca = []
# büyük
T = Tuval()
M = M_bilesik(M_oteleme(380, 900), M_olcek(4.0))
with Sure('ibrik buyuk'):
    uc = esyalar.ciz_ibrik(T, M, egim=0.0, tohum=1)
img = bitir(T)
parca.append(etiket(kirp(img, 330, 520, 980, 1260), 'egim 0, x4'))
# büyük aynalı (sahnedeki gibi sola bakan adam eli)
T = Tuval()
M = M_bilesik(M_oteleme(700, 900), M_olcek(-4.0, 4.0))
esyalar.ciz_ibrik(T, M, egim=0.0, tohum=1)
img = bitir(T)
parca.append(etiket(kirp(img, 100, 520, 750, 1260), 'aynali x4'))
pafta(parca, 'esyalar_ibrik_buyuk')

# kullanım ölçeği: 0 / 30 / 55 derece + su
parca = []
for egim in (0, 30, 55):
    T = Tuval()
    M = M_bilesik(M_oteleme(360, 700), M_olcek(1.0))
    with Sure(f'ibrik {egim}'):
        uc = esyalar.ciz_ibrik(T, M, egim=egim, tohum=1)
    uc2, yon = esyalar.ibrik_agzi(M, egim)
    hedef = (uc[0] + 150, 1000)
    with Sure(f'su {egim}'):
        esyalar.ciz_su_akisi(T, np.eye(3), uc, hedef, zaman=0.4, debi=1.0 if egim > 0 else 0.0, yon=yon,
                             kalinlik=6.5, tohum=2)
    T.lavi(yol_dikdortgen(0, 1000, W, 1100), np.eye(3), '#C9B79C', yog=0.45, kenar=1.4, dalga=0.12, islak=0.5,
           islak_gen=4, gran=0.14, akis=0.12, tohum=3)
    img = bitir(T)
    parca.append(etiket(kirp(img, 300, 560, 720, 1040), f'egim {egim}'))
# debi ve zaman çeşitlemeleri
for (debi, z, cephe, kuyruk) in ((0.35, 0.4, 1.0, 0.0), (1.0, 0.43, 1.0, 0.0), (1.0, 0.4, 0.55, 0.0),
                                 (1.0, 0.4, 1.0, 0.5)):
    T = Tuval()
    M = M_bilesik(M_oteleme(360, 700), M_olcek(1.0))
    uc = esyalar.ciz_ibrik(T, M, egim=50, tohum=1)
    uc2, yon = esyalar.ibrik_agzi(M, 50)
    esyalar.ciz_su_akisi(T, np.eye(3), uc, (uc[0] + 150, 1000), zaman=z, debi=debi, yon=yon, kalinlik=6.5,
                         tohum=2, cephe=cephe, kuyruk=kuyruk)
    T.lavi(yol_dikdortgen(0, 1000, W, 1100), np.eye(3), '#C9B79C', yog=0.45, kenar=1.4, dalga=0.12, islak=0.5,
           islak_gen=4, gran=0.14, akis=0.12, tohum=3)
    img = bitir(T)
    parca.append(etiket(kirp(img, 300, 560, 720, 1040), f'debi {debi} z {z} c {cephe} k {kuyruk}'))
pafta(parca, 'esyalar_ibrik_su', sutun=4)

# büyük ölçekte su (x3) ayrıntı
T = Tuval()
M = M_bilesik(M_oteleme(250, 600), M_olcek(2.6))
uc = esyalar.ciz_ibrik(T, M, egim=48, tohum=1)
uc2, yon = esyalar.ibrik_agzi(M, 48)
esyalar.ciz_su_akisi(T, np.eye(3), uc, (uc[0] + 330, 1350), zaman=0.4, debi=1.0, yon=yon, kalinlik=16, tohum=2)
T.lavi(yol_dikdortgen(0, 1350, W, 1500), np.eye(3), '#C9B79C', yog=0.45, kenar=1.4, dalga=0.12, islak=0.5,
       islak_gen=4, gran=0.14, akis=0.12, tohum=3)
img = bitir(T)
cv2.imwrite(f'{CIKTI}/esyalar_ibrik_su_buyuk.png', cv2.cvtColor(kirp(img, 150, 250, 1000, 1450), cv2.COLOR_RGB2BGR))
